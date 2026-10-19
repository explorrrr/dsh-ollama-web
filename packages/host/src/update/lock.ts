import { randomUUID } from 'node:crypto';
import { open, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { UpdateFailure } from './errors.js';
import { ensureDataDir } from './state.js';

const LOCK_FILE = 'update.lock';
const LOCK_STALE_MS = 15 * 60_000;
const LOCK_MAX_BYTES = 4096;

interface LockRecord {
  readonly schemaVersion: 1;
  readonly token: string;
  readonly pid: number;
  readonly startedAt: string;
}

export interface UpdateLock {
  readonly path: string;
  release(): Promise<void>;
}

export function updateLockPath(dataDir: string): string {
  return join(dataDir, LOCK_FILE);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRecord(value: unknown): LockRecord | undefined {
  if (!isRecord(value)) return undefined;
  if (value.schemaVersion !== 1) return undefined;
  if (typeof value.token !== 'string' || value.token.length === 0) return undefined;
  if (typeof value.pid !== 'number' || !Number.isInteger(value.pid) || value.pid <= 0) return undefined;
  if (typeof value.startedAt !== 'string') return undefined;
  return {
    schemaVersion: 1,
    token: value.token,
    pid: value.pid,
    startedAt: value.startedAt,
  };
}

async function readLock(path: string): Promise<LockRecord | undefined> {
  try {
    const raw = await readFile(path, 'utf8');
    if (raw.length > LOCK_MAX_BYTES) return undefined;
    return readRecord(JSON.parse(raw) as unknown);
  } catch {
    return undefined;
  }
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return isRecord(error) && error.code === 'EPERM';
  }
}

async function isStaleLock(path: string, now: number): Promise<boolean> {
  let info;
  try {
    info = await stat(path);
  } catch {
    return true;
  }
  if (now - info.mtimeMs > LOCK_STALE_MS) return true;
  const record = await readLock(path);
  if (record === undefined) return false;
  return !pidAlive(record.pid);
}

async function releaseLock(path: string, token: string): Promise<void> {
  const record = await readLock(path);
  if (record?.token !== token) return;
  await rm(path, { force: true }).catch(() => undefined);
}

async function createLock(dataDir: string, now: number): Promise<UpdateLock> {
  await ensureDataDir(dataDir);
  const path = updateLockPath(dataDir);
  const token = randomUUID();
  const record: LockRecord = {
    schemaVersion: 1,
    token,
    pid: process.pid,
    startedAt: new Date(now).toISOString(),
  };
  const handle = await open(path, 'wx', 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(record)}\n`, 'utf8');
  } catch (error) {
    await rm(path, { force: true }).catch(() => undefined);
    throw error;
  } finally {
    await handle.close();
  }
  return {
    path,
    release: () => releaseLock(path, token),
  };
}

/** Acquire the profile-wide install lock or throw `busy` when another process holds it. */
export async function acquireUpdateLock(dataDir: string, now = Date.now()): Promise<UpdateLock> {
  const path = updateLockPath(dataDir);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await createLock(dataDir, now);
    } catch (error) {
      if (!isRecord(error) || error.code !== 'EEXIST') {
        throw new UpdateFailure('state-write', 'could not create the update lock', error);
      }
      if (attempt === 0 && await isStaleLock(path, now)) {
        await rm(path, { force: true }).catch(() => undefined);
        continue;
      }
      throw new UpdateFailure('busy', 'another update is already running for this profile');
    }
  }
  throw new UpdateFailure('busy', 'another update is already running for this profile');
}

/** Return undefined instead of throwing when the lock is held. */
export async function tryAcquireUpdateLock(dataDir: string, now = Date.now()): Promise<UpdateLock | undefined> {
  try {
    return await acquireUpdateLock(dataDir, now);
  } catch (error) {
    if (error instanceof UpdateFailure && error.code === 'busy') return undefined;
    throw error;
  }
}

/** Remove a lock left by a dead or expired process; leave live locks alone. */
export async function cleanupStaleUpdateLock(dataDir: string, now = Date.now()): Promise<void> {
  const path = updateLockPath(dataDir);
  if (await isStaleLock(path, now)) {
    await rm(path, { force: true }).catch(() => undefined);
  }
}
