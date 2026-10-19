import { chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { basename, dirname, join } from 'node:path';
import { UpdateFailure } from './errors.js';
import { isAllowedReleaseUrl } from './registry.js';
import { parseVersion } from './semver.js';
import type { StoredUpdateJournal, JournalTarget, StoredUpdateState, UpdateError, UpdatePrefs } from './types.js';

const PREFS_FILE = 'update-prefs.json';
const STATE_FILE = 'update-state.json';
const JOURNAL_FILE = 'update-journal.json';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function prefsPath(dataDir: string): string {
  return join(dataDir, PREFS_FILE);
}

export function statePath(dataDir: string): string {
  return join(dataDir, STATE_FILE);
}

export function journalPath(dataDir: string): string {
  return join(dataDir, JOURNAL_FILE);
}

export async function ensureDataDir(dataDir: string): Promise<void> {
  try {
    await mkdir(dataDir, { recursive: true, mode: 0o700 });
    await chmod(dataDir, 0o700).catch(() => undefined);
  } catch (error) {
    throw new UpdateFailure('state-write', 'could not create the update data directory', error);
  }
}

async function readJson(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as unknown;
  } catch {
    return undefined;
  }
}

async function atomicWriteJson(path: string, value: unknown): Promise<void> {
  const directory = dirname(path);
  await ensureDataDir(directory);
  const temporary = join(directory, `.${basename(path)}.${String(process.pid)}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
      flag: 'wx',
    });
    await chmod(temporary, 0o600).catch(() => undefined);
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => undefined);
    throw new UpdateFailure('state-write', 'could not write update state', error);
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined);
  }
}

function normalizeJournalTarget(value: unknown): JournalTarget | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.packageName !== 'string') return undefined;
  if (typeof value.targetDir !== 'string' || typeof value.stageDir !== 'string') return undefined;
  if (typeof value.backupDir !== 'string') return undefined;
  return {
    packageName: value.packageName,
    targetDir: value.targetDir,
    stageDir: value.stageDir,
    backupDir: value.backupDir,
  };
}

function normalizeJournal(value: unknown): StoredUpdateJournal | undefined {
  if (!isRecord(value) || value.schemaVersion !== 1) return undefined;
  if (typeof value.id !== 'string' || typeof value.startedAt !== 'string') return undefined;
  if (!Array.isArray(value.targets)) return undefined;
  const targets: JournalTarget[] = [];
  for (const entry of value.targets) {
    const target = normalizeJournalTarget(entry);
    if (target === undefined) return undefined;
    targets.push(target);
  }
  return { schemaVersion: 1, id: value.id, startedAt: value.startedAt, targets };
}

export async function readJournal(dataDir: string): Promise<StoredUpdateJournal | undefined> {
  return normalizeJournal(await readJson(journalPath(dataDir)));
}

export async function writeJournal(dataDir: string, journal: StoredUpdateJournal): Promise<void> {
  await atomicWriteJson(journalPath(dataDir), { ...journal, schemaVersion: 1 });
}

export async function clearJournal(dataDir: string): Promise<void> {
  await rm(journalPath(dataDir), { force: true });
}

export async function readPrefs(dataDir: string): Promise<UpdatePrefs> {
  const raw = await readJson(prefsPath(dataDir));
  return { autoUpdate: isRecord(raw) && raw.autoUpdate === true };
}

export async function writePrefs(dataDir: string, prefs: UpdatePrefs): Promise<void> {
  await atomicWriteJson(prefsPath(dataDir), { autoUpdate: prefs.autoUpdate === true });
}

function normalizeError(value: unknown): UpdateError | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.code !== 'string' || typeof value.message !== 'string') return undefined;
  const code = value.code === 'release-mismatch' ? 'unknown' : value.code;
  if (!Object.prototype.hasOwnProperty.call(ERROR_CODES, code)) return undefined;
  return { code: code as UpdateError['code'], message: value.message };
}

const ERROR_CODES: Record<UpdateError['code'], true> = {
  unavailable: true,
  'no-profile': true,
  linked: true,
  'no-install': true,
  busy: true,
  network: true,
  timeout: true,
  'registry-status': true,
  'registry-json': true,
  'registry-mismatch': true,
  integrity: true,
  archive: true,
  'package-invalid': true,
  permission: true,
  'install-failed': true,
  'state-write': true,
  'age-limited': true,
  'major-blocked': true,
  'no-update': true,
  'invalid-payload': true,
  unknown: true,
};

function normalizeLatest(value: unknown): StoredUpdateState['latest'] {
  if (!isRecord(value)) return undefined;
  const version = typeof value.version === 'string'
    ? value.version
    : (typeof value.host === 'string' && value.host === value.client ? value.host : undefined);
  if (version === undefined) return undefined;
  if (typeof value.releaseUrl !== 'string' || typeof value.provenance !== 'boolean') return undefined;
  if (parseVersion(version) === undefined) return undefined;
  if (!isAllowedReleaseUrl(value.releaseUrl)) return undefined;
  return {
    version,
    publishedAt: typeof value.publishedAt === 'string' ? value.publishedAt : null,
    eligibleAt: typeof value.eligibleAt === 'string' ? value.eligibleAt : null,
    releaseUrl: value.releaseUrl,
    provenance: value.provenance,
  };
}

function normalizeState(raw: unknown): StoredUpdateState {
  const state: StoredUpdateState = { schemaVersion: 2 };
  if (!isRecord(raw) || (raw.schemaVersion !== 1 && raw.schemaVersion !== 2)) return state;
  if (typeof raw.lastCheckAt === 'string') state.lastCheckAt = raw.lastCheckAt;
  const latest = normalizeLatest(raw.latest);
  if (latest !== undefined) state.latest = latest;
  if (typeof raw.installedAt === 'string') state.installedAt = raw.installedAt;
  if (isRecord(raw.installed)) {
    const version = typeof raw.installed.version === 'string'
      ? raw.installed.version
      : (typeof raw.installed.host === 'string' ? raw.installed.host : undefined);
    if (version !== undefined) state.installed = { version };
  }
  if (raw.needsRestart === true) state.needsRestart = true;
  if (typeof raw.lastAutoUpdateAt === 'string') state.lastAutoUpdateAt = raw.lastAutoUpdateAt;
  const error = normalizeError(raw.lastError);
  if (error !== undefined) state.lastError = error;
  if (Array.isArray(raw.backups)) {
    state.backups = raw.backups.filter((entry): entry is string => typeof entry === 'string');
  }
  return state;
}

export async function readState(dataDir: string): Promise<StoredUpdateState> {
  return normalizeState(await readJson(statePath(dataDir)));
}

export async function writeState(dataDir: string, state: StoredUpdateState): Promise<void> {
  await atomicWriteJson(statePath(dataDir), { ...state, schemaVersion: 2 });
}
