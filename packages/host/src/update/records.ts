import { readFileSync } from 'node:fs';
import { chmod, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { compareVersions, parseVersion, satisfiesRange } from './semver.js';
import type { ProfileInfo, ProfileRecordState } from './types.js';

const MANIFEST_FILE = 'package.json';
const LOCKFILE = 'pnpm-lock.yaml';
const TEMP_FILE = '.dsh-ollama-web-package.json.tmp';
const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies'] as const;

type DependencyField = (typeof DEPENDENCY_FIELDS)[number];

interface DependencyEntry {
  readonly field: DependencyField;
  readonly specifier: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorCode(error: unknown): string | undefined {
  return isRecord(error) && typeof error.code === 'string' ? error.code : undefined;
}

function errorText(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) return error.message;
  return String(error);
}

/** A plain, exact semantic version such as `2.4.1`; ranges and aliases return null. */
export function exactVersion(value: string): string | null {
  if (value !== value.trim() || value.length === 0) return null;
  const parsed = parseVersion(value);
  if (parsed === undefined) return null;
  if (parsed.raw === value) return value;
  if (value === `v${parsed.raw}` || value === `V${parsed.raw}`) return parsed.raw;
  return null;
}

function dependencyOf(manifest: unknown, packageName: string): DependencyEntry | undefined {
  if (!isRecord(manifest)) return undefined;
  for (const field of DEPENDENCY_FIELDS) {
    const section = manifest[field];
    if (!isRecord(section)) continue;
    const specifier = section[packageName];
    if (typeof specifier === 'string') return { field, specifier };
  }
  return undefined;
}

function readManifest(profileDir: string): unknown {
  return JSON.parse(readFileSync(join(profileDir, MANIFEST_FILE), 'utf8')) as unknown;
}

function readLockImporterVersion(profileDir: string, packageName: string): string | null {
  const text = readFileSync(join(profileDir, LOCKFILE), 'utf8');
  const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `^\\s{4,8}['"]?${escaped}['"]?:\\s*\\n`
      + '\\s{6,10}specifier:\\s*[\'"]?([^\'"\\n]+)[\'"]?\\s*\\n'
      + '\\s{6,10}version:\\s*[\'"]?([^\'"\\n]+)[\'"]?\\s*$',
    'm',
  );
  const match = pattern.exec(text);
  const version = match?.[2]?.trim();
  return version === undefined || version.length === 0 ? null : version;
}

/**
 * Compare the profile's saved dependency and pnpm importer version with the
 * package copy the host will load. This reader never throws; a broken manifest
 * or lockfile is reported in `message` instead.
 */
export function readProfileRecords(
  profileDir: string,
  packageName: string,
  installedVersion: string | null,
): ProfileRecordState {
  let declaredSpecifier: string | null = null;
  let declaredVersion: string | null = null;
  let lockedVersion: string | null = null;
  const problems: string[] = [];

  try {
    const entry = dependencyOf(readManifest(profileDir), packageName);
    if (entry !== undefined) {
      declaredSpecifier = entry.specifier;
      declaredVersion = exactVersion(entry.specifier);
    }
  } catch (error) {
    if (errorCode(error) !== 'ENOENT') {
      problems.push(`The profile package.json could not be read: ${errorText(error)}`);
    }
  }

  try {
    lockedVersion = readLockImporterVersion(profileDir, packageName);
  } catch (error) {
    if (errorCode(error) !== 'ENOENT') {
      problems.push(`The profile pnpm-lock.yaml could not be read: ${errorText(error)}`);
    }
  }

  const mismatches: string[] = [];
  if (installedVersion !== null) {
    if (declaredVersion !== null && declaredVersion !== installedVersion) {
      mismatches.push(`package.json records ${declaredVersion}`);
    }
    if (lockedVersion !== null && lockedVersion !== installedVersion) {
      mismatches.push(`pnpm-lock.yaml records ${lockedVersion}`);
    }
  }
  if (mismatches.length > 0) {
    problems.push(`${mismatches.join(' and ')}, but ${installedVersion} is installed.`);
  }

  return {
    declaredSpecifier,
    declaredVersion,
    lockedVersion,
    mismatch: mismatches.length > 0,
    message: problems.length === 0 ? null : problems.join(' '),
  };
}

function indentOf(raw: string): string {
  const match = /^\{\r?\n([ \t]+)"/.exec(raw);
  return match?.[1] ?? '  ';
}

function newlineOf(raw: string): string {
  return raw.includes('\r\n') ? '\r\n' : '\n';
}

async function writeManifest(profileDir: string, raw: string, manifest: Record<string, unknown>): Promise<void> {
  const path = join(profileDir, MANIFEST_FILE);
  const temporary = join(profileDir, TEMP_FILE);
  const text = `${JSON.stringify(manifest, null, indentOf(raw)).replace(/\n/g, newlineOf(raw))}${newlineOf(raw)}`;
  try {
    await writeFile(temporary, text, { encoding: 'utf8', mode: 0o600, flag: 'w' });
    await chmod(temporary, 0o600).catch(() => undefined);
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => undefined);
    throw error;
  }
}

export interface ReconcileProfileRecordsOptions {
  readonly profile: ProfileInfo;
  readonly packageName: string;
  readonly installedVersion: string;
}

export interface ProfileRecordReconcileResult {
  readonly manifestUpdated: boolean;
  readonly state: ProfileRecordState;
  readonly warning: string | null;
}

function lockWarning(state: ProfileRecordState, installedVersion: string): string | null {
  if (state.lockedVersion !== null && state.lockedVersion !== installedVersion) {
    return `The profile pnpm-lock.yaml still records ${state.lockedVersion}; run pnpm install --lockfile-only in the profile or reinstall from Plugins.`;
  }
  return null;
}

/**
 * Update the profile manifest's exact pin after a successful package swap.
 * The lockfile is deliberately not rewritten: this updater never runs pnpm, so
 * a stale lock is reported instead of being edited by hand.
 */
export async function reconcileProfileRecords(
  options: ReconcileProfileRecordsOptions,
): Promise<ProfileRecordReconcileResult> {
  let raw: string;
  let manifest: unknown;
  try {
    raw = readFileSync(join(options.profile.dir, MANIFEST_FILE), 'utf8');
    manifest = JSON.parse(raw) as unknown;
  } catch (error) {
    const state = readProfileRecords(options.profile.dir, options.packageName, options.installedVersion);
    return {
      manifestUpdated: false,
      state,
      warning: `The profile package.json could not be read, so its version was left unchanged: ${errorText(error)}`,
    };
  }

  const entry = dependencyOf(manifest, options.packageName);
  const declared = entry === undefined ? null : exactVersion(entry.specifier);
  const warnings: string[] = [];
  let manifestUpdated = false;

  if (!isRecord(manifest)) {
    warnings.push('The profile package.json is not an object, so its version was left unchanged.');
  } else if (entry === undefined) {
    warnings.push(`The profile package.json does not record ${options.packageName}, so its version was left unchanged.`);
  } else if (entry.specifier === options.installedVersion) {
    // Already pinned to the new version.
  } else if (declared !== null) {
    if (compareVersions(declared, options.installedVersion) <= 0) {
      try {
        const section = manifest[entry.field];
        if (!isRecord(section)) throw new Error('dependency section is not an object');
        section[options.packageName] = options.installedVersion;
        await writeManifest(options.profile.dir, raw, manifest);
        manifestUpdated = true;
      } catch (error) {
        warnings.push(`The profile package.json could not be updated: ${errorText(error)}`);
      }
    } else {
      warnings.push(
        `The profile package.json records ${entry.specifier}, which is newer than the installed ${options.installedVersion}; it was left unchanged.`,
      );
    }
  } else if (satisfiesRange(options.installedVersion, entry.specifier) === true) {
    warnings.push(
      `The profile package.json records the range ${entry.specifier}, which includes ${options.installedVersion}; the range was left unchanged.`,
    );
  } else {
    warnings.push(
      `The profile package.json records ${entry.specifier}, which is not an exact pin; it was left unchanged.`,
    );
  }

  const state = readProfileRecords(options.profile.dir, options.packageName, options.installedVersion);
  const staleLock = lockWarning(state, options.installedVersion);
  if (staleLock !== null) warnings.push(staleLock);
  if (state.message !== null && state.mismatch === false && !warnings.includes(state.message)) {
    warnings.push(state.message);
  }

  return {
    manifestUpdated,
    state,
    warning: warnings.length === 0 ? null : warnings.join(' '),
  };
}
