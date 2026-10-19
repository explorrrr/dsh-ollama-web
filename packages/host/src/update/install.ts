import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { cp, mkdir, readFile, readdir, rename, rm, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UpdateFailure } from './errors.js';
import { fetchBytes } from './http.js';
import { extractPackageTarball } from './tar.js';
import { clearJournal, readJournal, writeJournal } from './state.js';
import { LEGACY_CLIENT_PACKAGE } from './types.js';
import type {
  PackageInstall,
  ProfileInfo,
  PublishedPackage,
  ReleaseTarget,
} from './types.js';

const TARBALL_MAX_BYTES = 16 * 1024 * 1024;
const TARBALL_TIMEOUT_MS = 60_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isInside(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

function canonicalPath(path: string): string {
  const resolved = resolve(path);
  try {
    return realpathSync(resolved);
  } catch {
    // Canonicalize the existing parent so a missing lock/journal leaf still
    // compares correctly with a realpath-based profile root.
    try {
      return join(realpathSync(dirname(resolved)), basename(resolved));
    } catch {
      return resolved;
    }
  }
}

/** Parse a DSH profile directory from a file URL (the loader's ctx.baseUrl). */
export function profileFromBaseUrl(baseUrl: unknown): ProfileInfo | undefined {
  if (typeof baseUrl !== 'string' || !baseUrl.startsWith('file:')) return undefined;
  let directory: string;
  try {
    directory = canonicalPath(resolve(fileURLToPath(baseUrl)));
  } catch {
    return undefined;
  }
  const profilesRoot = dirname(directory);
  const name = basename(directory);
  if (name.length === 0 || basename(profilesRoot) !== 'profiles') return undefined;
  return {
    dir: directory,
    name,
    profilesRoot,
    restartKind: name === 'desktop' ? 'app' : 'host',
  };
}

/** Read a package manifest version without trusting the package name. */
export function readPackageVersion(directory: string): string | null {
  try {
    const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')) as unknown;
    if (isRecord(manifest) && typeof manifest.version === 'string' && manifest.version.length > 0) {
      return manifest.version;
    }
  } catch {
    return null;
  }
  return null;
}

interface CandidateResult {
  readonly dirs: string[];
  readonly linked: boolean;
  readonly resolved: string | null;
}

function candidates(profile: ProfileInfo, name: string, extra: readonly string[]): CandidateResult {
  const root = canonicalPath(profile.profilesRoot);
  const seen = new Set<string>();
  let linked = false;
  let resolved: string | null = null;
  const add = (candidate: string, isResolved = false): void => {
    if (!existsSync(join(candidate, 'package.json'))) return;
    let real: string;
    try {
      real = realpathSync(candidate);
    } catch {
      return;
    }
    if (basename(real) !== name) return;
    if (!isInside(root, real)) {
      linked = true;
      return;
    }
    seen.add(real);
    if (isResolved) resolved = real;
  };
  add(join(profile.dir, 'node_modules', name));
  add(join(profile.profilesRoot, 'node_modules', name));
  add(join(profile.dir, '.dsh-module-fallback', 'node_modules', name));
  try {
    const resolver = createRequire(join(profile.dir, 'package.json'));
    add(dirname(resolver.resolve(`${name}/package.json`)), true);
  } catch {
    // The package is not installed or exposes no package.json; candidates above may still exist.
  }
  for (const directory of extra) add(directory);
  return { dirs: [...seen], linked, resolved };
}

/** Detect the installed copies and the version the next start will load. */
export function detectPackageInstall(
  profile: ProfileInfo,
  name: string,
  extra: readonly string[] = [],
): PackageInstall {
  const found = candidates(profile, name, extra);
  const versionDir = found.resolved ?? found.dirs[0];
  return {
    name,
    version: versionDir === undefined ? null : readPackageVersion(versionDir),
    dirs: found.dirs,
    linked: found.linked,
  };
}

/** Verify an npm SHA-512 SRI integrity string against downloaded bytes. */
export function verifyIntegrity(bytes: Uint8Array, integrity: string): boolean {
  const hashes = integrity.trim().split(/\s+/);
  const expectedText = hashes.find((entry) => entry.startsWith('sha512-'));
  if (expectedText === undefined) return false;
  const expected = Buffer.from(expectedText.slice('sha512-'.length), 'base64');
  if (expected.length === 0) return false;
  const actual = createHash('sha512').update(bytes).digest();
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function downloadAndVerify(
  pkg: PublishedPackage,
  options: { readonly signal?: AbortSignal; readonly fetchImpl: typeof fetch },
): Promise<Uint8Array> {
  const bytes = await fetchBytes({
    url: pkg.tarball,
    headers: { 'user-agent': `dsh-ollama-web/${pkg.version}` },
    timeoutMs: TARBALL_TIMEOUT_MS,
    maxBytes: TARBALL_MAX_BYTES,
    tooLargeCode: 'archive',
    label: `${pkg.name} tarball`,
    fetchImpl: options.fetchImpl,
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  });
  if (!verifyIntegrity(bytes, pkg.integrity)) {
    throw new UpdateFailure('integrity', 'downloaded package failed integrity verification');
  }
  return bytes;
}

export interface StagedPackage {
  readonly targetDir: string;
  readonly stageDir: string;
  readonly packageName: string;
  readonly version: string;
  readonly backupDir?: string;
}

function clientExportPath(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (isRecord(value) && typeof value.default === 'string') return value.default;
  return undefined;
}

function validateManifest(value: unknown, pkg: PublishedPackage): void {
  if (!isRecord(value)) {
    throw new UpdateFailure('package-invalid', 'downloaded package has no readable manifest');
  }
  if (value.name !== pkg.name || value.version !== pkg.version) {
    throw new UpdateFailure('package-invalid', 'downloaded package manifest does not match the release');
  }
  const dsh = value.dsh;
  if (!isRecord(dsh) || !isRecord(dsh.bundle) || typeof dsh.bundle.patch !== 'string') {
    throw new UpdateFailure('package-invalid', 'downloaded package does not declare a DSH bundle patch');
  }
  if (!isRecord(dsh.client) || dsh.client.platform !== 'web') {
    throw new UpdateFailure('package-invalid', 'downloaded package does not declare a web client bundle');
  }
  const exports = value.exports;
  if (!isRecord(exports) || clientExportPath(exports['./client']) !== './client.js') {
    throw new UpdateFailure('package-invalid', 'downloaded package does not export its client bundle');
  }
}

async function validateRequiredFiles(stageDir: string): Promise<void> {
  const required = ['dist/index.js', 'client.js', 'cordis.patch.yml'];
  for (const file of required) {
    const path = join(stageDir, file);
    let info;
    try {
      info = await stat(path);
    } catch (error) {
      throw new UpdateFailure('package-invalid', `downloaded package is missing ${file}`, error);
    }
    if (!info.isFile()) {
      throw new UpdateFailure('package-invalid', `downloaded package has a non-file ${file}`);
    }
  }
}

async function preserveNodeModules(targetDir: string, stageDir: string): Promise<void> {
  const previous = join(targetDir, 'node_modules');
  const next = join(stageDir, 'node_modules');
  if (!existsSync(previous) || existsSync(next)) return;
  try {
    await cp(previous, next, {
      recursive: true,
      force: true,
      errorOnExist: false,
      dereference: true,
    });
  } catch (error) {
    throw new UpdateFailure('package-invalid', 'could not preserve the installed dependency tree', error);
  }
}

async function validateDependencies(stageDir: string, packageName: string): Promise<void> {
  let manifest: unknown;
  try {
    manifest = JSON.parse(await readFile(join(stageDir, 'package.json'), 'utf8')) as unknown;
  } catch (error) {
    throw new UpdateFailure('package-invalid', `could not read the new ${packageName} manifest`, error);
  }
  if (!isRecord(manifest) || !isRecord(manifest.dependencies)) return;
  const resolver = createRequire(join(stageDir, 'package.json'));
  for (const dependency of Object.keys(manifest.dependencies)) {
    try {
      resolver.resolve(dependency);
    } catch (error) {
      throw new UpdateFailure(
        'package-invalid',
        `new ${packageName} cannot resolve dependency ${dependency}; reinstall it manually`,
        error,
      );
    }
  }
}

export async function stagePackage(
  pkg: PublishedPackage,
  bytes: Uint8Array,
  targetDir: string,
  profile: ProfileInfo,
): Promise<StagedPackage> {
  const target = canonicalPath(targetDir);
  const stageDir = join(dirname(target), `.dsh-ollama-web-next-${pkg.name}-${randomUUID()}`);
  try {
    if (!isInside(canonicalPath(profile.profilesRoot), target)) {
      throw new UpdateFailure('linked', 'installed package is outside the profile');
    }
    await rm(stageDir, { recursive: true, force: true });
    await mkdir(stageDir, { recursive: true, mode: 0o755 });
    await extractPackageTarball(bytes, stageDir);
    let manifest: unknown;
    try {
      manifest = JSON.parse(await readFile(join(stageDir, 'package.json'), 'utf8')) as unknown;
    } catch (error) {
      throw new UpdateFailure('package-invalid', 'downloaded package has no readable package.json', error);
    }
    validateManifest(manifest, pkg);
    await validateRequiredFiles(stageDir);
    await preserveNodeModules(target, stageDir);
    await validateDependencies(stageDir, pkg.name);
    return { targetDir: target, stageDir, packageName: pkg.name, version: pkg.version };
  } catch (error) {
    await rm(stageDir, { recursive: true, force: true }).catch(() => undefined);
    if (error instanceof UpdateFailure) throw error;
    const code = isRecord(error) && (error.code === 'EACCES' || error.code === 'EPERM')
      ? 'permission'
      : 'package-invalid';
    throw new UpdateFailure(code, `could not stage ${pkg.name}`, error);
  }
}

export interface SwapOps {
  rename(from: string, to: string): Promise<void>;
  rm(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}

export const defaultSwapOps: SwapOps = {
  rename: (from, to) => rename(from, to),
  rm: (path) => rm(path, { recursive: true, force: true }),
  exists: (path) => Promise.resolve(existsSync(path)),
};

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, milliseconds);
  });
}

function retryable(error: unknown): boolean {
  const code = isRecord(error) && typeof error.code === 'string' ? error.code : '';
  return code === 'EPERM' || code === 'EBUSY' || code === 'EACCES' || code === 'ENOTEMPTY';
}

async function renameWithRetry(from: string, to: string, ops: SwapOps): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await ops.rename(from, to);
      return;
    } catch (error) {
      if (!retryable(error) || attempt === 4) throw error;
      await sleep(100 * (attempt + 1));
    }
  }
}

async function restore(entry: StagedPackage, backup: string, ops: SwapOps): Promise<void> {
  if (!(await ops.exists(backup))) return;
  if (await ops.exists(entry.targetDir)) await ops.rm(entry.targetDir);
  await renameWithRetry(backup, entry.targetDir, ops);
}

/** Replace every staged target, restoring all earlier targets if any rename fails. */
export async function swapStaged(
  entries: readonly StagedPackage[],
  ops: SwapOps = defaultSwapOps,
): Promise<string[]> {
  const completed: { entry: StagedPackage; backup: string }[] = [];
  const backups: string[] = [];
  const rollbackCompleted = async (): Promise<void> => {
    for (const item of [...completed].reverse()) {
      await restore(item.entry, item.backup, ops).catch(() => undefined);
    }
  };
  for (const entry of entries) {
    const backup = entry.backupDir ?? join(
      dirname(entry.targetDir),
      `.dsh-ollama-web-bak-${entry.packageName}-${randomUUID()}`,
    );
    if (await ops.exists(backup)) {
      await rollbackCompleted();
      await cleanupStages(entries);
      throw new UpdateFailure('install-failed', 'a previous update backup still exists');
    }
    try {
      await renameWithRetry(entry.targetDir, backup, ops);
    } catch (error) {
      await rollbackCompleted();
      await cleanupStages(entries);
      throw new UpdateFailure('permission', 'could not move the installed package aside', error);
    }
    try {
      await renameWithRetry(entry.stageDir, entry.targetDir, ops);
    } catch (error) {
      await restore(entry, backup, ops).catch(() => undefined);
      await rollbackCompleted();
      await cleanupStages(entries);
      throw new UpdateFailure('install-failed', 'could not install the staged package', error);
    }
    completed.push({ entry, backup });
    backups.push(backup);
  }
  return backups;
}

async function cleanupStages(staged: readonly StagedPackage[]): Promise<void> {
  for (const entry of staged) {
    await rm(entry.stageDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export interface InstallReleaseOptions {
  readonly target: ReleaseTarget;
  readonly profile: ProfileInfo;
  readonly dataDir: string;
  readonly packageName: string;
  readonly runningDir: string;
  readonly fetchImpl: typeof fetch;
  readonly signal?: AbortSignal;
  readonly swapOps?: SwapOps;
}

export interface InstallResult {
  readonly version: string;
  readonly backups: string[];
}

/** Download, verify, stage and atomically install the package. */
export async function installRelease(options: InstallReleaseOptions): Promise<InstallResult> {
  const install = detectPackageInstall(options.profile, options.packageName, [options.runningDir]);
  if (install.linked) {
    throw new UpdateFailure('linked', 'linked development installs cannot be updated from the card');
  }
  if (install.dirs.length === 0) {
    throw new UpdateFailure('no-install', 'the package is not installed in this profile');
  }
  const bytes = await downloadAndVerify(options.target.pkg, {
    fetchImpl: options.fetchImpl,
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  });
  const staged: StagedPackage[] = [];
  try {
    for (const directory of install.dirs) {
      staged.push(await stagePackage(options.target.pkg, bytes, directory, options.profile));
    }
  } catch (error) {
    await cleanupStages(staged);
    throw error;
  }
  const planned = staged.map((entry) => ({
    ...entry,
    backupDir: join(
      dirname(entry.targetDir),
      `.dsh-ollama-web-bak-${entry.packageName}-${randomUUID()}`,
    ),
  }));
  try {
    await writeJournal(options.dataDir, {
      schemaVersion: 1,
      id: randomUUID(),
      startedAt: new Date().toISOString(),
      targets: planned.map((entry) => ({
        packageName: entry.packageName,
        targetDir: entry.targetDir,
        stageDir: entry.stageDir,
        backupDir: entry.backupDir,
      })),
    });
    const backups = await swapStaged(planned, options.swapOps);
    try {
      await clearJournal(options.dataDir);
    } catch (error) {
      throw new UpdateFailure('state-write', 'could not finalize the update journal', error);
    }
    return {
      version: options.target.version,
      backups,
    };
  } catch (error) {
    await clearJournal(options.dataDir).catch(() => undefined);
    await cleanupStages(staged);
    throw error;
  }
}

/**
 * Roll back a package swap that was interrupted after the journal was
 * written. Backups are restored to their target directories and staged copies
 * are removed. Paths outside the profile or with unexpected names are ignored.
 * The 1.x client target is still recoverable so an interrupted upgrade from
 * 1.x does not strand its backup.
 */
export async function recoverInterruptedInstall(
  profile: ProfileInfo,
  dataDir: string,
): Promise<boolean> {
  const journal = await readJournal(dataDir);
  if (journal === undefined) return false;
  const root = canonicalPath(profile.profilesRoot);
  const recoverable = new Set(['dsh-ollama-web', LEGACY_CLIENT_PACKAGE]);
  let restored = false;
  for (const entry of journal.targets) {
    if (!recoverable.has(entry.packageName)) continue;
    const targetDir = canonicalPath(resolve(entry.targetDir));
    const stageDir = canonicalPath(resolve(entry.stageDir));
    const backupDir = canonicalPath(resolve(entry.backupDir));
    if (!isInside(root, targetDir) || basename(targetDir) !== entry.packageName) continue;
    if (!isInside(root, stageDir) || !basename(stageDir).startsWith('.dsh-ollama-web-next-')) continue;
    if (!isInside(root, backupDir) || !basename(backupDir).startsWith('.dsh-ollama-web-bak-')) continue;
    if (existsSync(backupDir)) {
      if (existsSync(targetDir)) await rm(targetDir, { recursive: true, force: true });
      await rename(backupDir, targetDir);
      restored = true;
    }
    if (existsSync(stageDir)) {
      await rm(stageDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
  await clearJournal(dataDir);
  return restored;
}

/** Remove backups recorded by a completed install after the new code has started. */
export async function cleanupBackups(
  profile: ProfileInfo,
  backups: readonly string[],
): Promise<void> {
  const root = canonicalPath(profile.profilesRoot);
  for (const backup of backups) {
    const target = canonicalPath(resolve(backup));
    if (!isInside(root, target)) continue;
    if (!basename(target).startsWith('.dsh-ollama-web-bak-')) continue;
    await rm(target, { recursive: true, force: true }).catch(() => undefined);
  }
}

/** Remove abandoned staging directories older than one hour. */
export async function cleanupStaleArtifacts(
  profile: ProfileInfo,
  directories: readonly string[],
  now: number,
): Promise<void> {
  const parents = new Set<string>([
    join(profile.dir, 'node_modules'),
    join(profile.profilesRoot, 'node_modules'),
  ]);
  for (const directory of directories) parents.add(dirname(directory));
  for (const parent of parents) {
    let entries;
    try {
      entries = await readdir(parent, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith('.dsh-ollama-web-next-')) continue;
      const path = join(parent, entry.name);
      try {
        const info = await stat(path);
        if (now - info.mtimeMs > 60 * 60_000) {
          await rm(path, { recursive: true, force: true });
        }
      } catch {
        // A concurrent install may have renamed or removed it.
      }
    }
  }
}
