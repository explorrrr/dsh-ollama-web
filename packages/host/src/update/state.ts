import { chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { basename, dirname, join } from 'node:path';
import { UpdateFailure } from './errors.js';
import { isAllowedReleaseUrl } from './registry.js';
import { parseVersion } from './semver.js';
import type { StoredUpdateState, UpdateError, UpdatePrefs } from './types.js';

const PREFS_FILE = 'update-prefs.json';
const STATE_FILE = 'update-state.json';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function prefsPath(dataDir: string): string {
  return join(dataDir, PREFS_FILE);
}

export function statePath(dataDir: string): string {
  return join(dataDir, STATE_FILE);
}

async function ensureDataDir(dataDir: string): Promise<void> {
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
  return { code: value.code as UpdateError['code'], message: value.message };
}

function normalizeLatest(value: unknown): StoredUpdateState['latest'] {
  if (!isRecord(value)) return undefined;
  if (typeof value.host !== 'string' || typeof value.client !== 'string') return undefined;
  if (typeof value.releaseUrl !== 'string' || typeof value.provenance !== 'boolean') return undefined;
  if (value.host !== value.client) return undefined;
  if (parseVersion(value.host) === undefined) return undefined;
  if (!isAllowedReleaseUrl(value.releaseUrl)) return undefined;
  return {
    host: value.host,
    client: value.client,
    publishedAt: typeof value.publishedAt === 'string' ? value.publishedAt : null,
    eligibleAt: typeof value.eligibleAt === 'string' ? value.eligibleAt : null,
    releaseUrl: value.releaseUrl,
    provenance: value.provenance,
  };
}

function normalizeState(raw: unknown): StoredUpdateState {
  if (!isRecord(raw) || raw.schemaVersion !== 1) return { schemaVersion: 1 };
  const state: StoredUpdateState = { schemaVersion: 1 };
  if (typeof raw.lastCheckAt === 'string') state.lastCheckAt = raw.lastCheckAt;
  const latest = normalizeLatest(raw.latest);
  if (latest !== undefined) state.latest = latest;
  if (typeof raw.installedAt === 'string') state.installedAt = raw.installedAt;
  if (isRecord(raw.installed) && typeof raw.installed.host === 'string' && typeof raw.installed.client === 'string') {
    state.installed = { host: raw.installed.host, client: raw.installed.client };
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
  await atomicWriteJson(statePath(dataDir), { ...state, schemaVersion: 1 });
}
