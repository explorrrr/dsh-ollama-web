import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { utimes } from 'node:fs/promises';
import { join } from 'node:path';
import {
  acquireUpdateLock,
  cleanupStaleUpdateLock,
  tryAcquireUpdateLock,
  updateLockPath,
} from '../dist/update/lock.js';
import { cleanup, makeTempDir, writeJson } from './update-helpers.mjs';

function record(pid, token = 'test-token') {
  return {
    schemaVersion: 1,
    token,
    pid,
    startedAt: new Date().toISOString(),
  };
}

test('profile lock is exclusive and releases cleanly', async () => {
  const root = makeTempDir();
  try {
    const dataDir = join(root, 'data');
    const first = await acquireUpdateLock(dataDir);
    const path = updateLockPath(dataDir);
    assert.equal(existsSync(path), true);
    if (process.platform !== 'win32') assert.equal(statSync(path).mode & 0o777, 0o600);
    await assert.rejects(acquireUpdateLock(dataDir), /another update/);
    assert.equal(await tryAcquireUpdateLock(dataDir), undefined);
    await first.release();
    assert.equal(existsSync(path), false);
    const second = await acquireUpdateLock(dataDir);
    await second.release();
  } finally {
    cleanup(root);
  }
});

test('stale locks from dead processes are reclaimed', async () => {
  const root = makeTempDir();
  try {
    const dataDir = join(root, 'data');
    const path = updateLockPath(dataDir);
    writeJson(path, record(999_999));
    const lock = await acquireUpdateLock(dataDir);
    assert.equal(existsSync(path), true);
    await lock.release();
    assert.equal(existsSync(path), false);
  } finally {
    cleanup(root);
  }
});

test('an old lock is reclaimed even when its PID is still alive', async () => {
  const root = makeTempDir();
  try {
    const dataDir = join(root, 'data');
    const path = updateLockPath(dataDir);
    const now = Date.now();
    writeJson(path, record(process.pid, 'old'));
    const old = new Date(now - 16 * 60_000);
    await utimes(path, old, old);
    const lock = await acquireUpdateLock(dataDir, now);
    assert.equal(existsSync(path), true);
    await lock.release();
  } finally {
    cleanup(root);
  }
});

test('a live, fresh lock is not removed by cleanup', async () => {
  const root = makeTempDir();
  try {
    const dataDir = join(root, 'data');
    const path = updateLockPath(dataDir);
    writeJson(path, record(process.pid, 'live'));
    await assert.rejects(acquireUpdateLock(dataDir), /another update/);
    assert.equal(await tryAcquireUpdateLock(dataDir), undefined);
    await cleanupStaleUpdateLock(dataDir);
    assert.equal(existsSync(path), true);
  } finally {
    cleanup(root);
  }
});

test('release does not remove a lock replaced by another holder', async () => {
  const root = makeTempDir();
  try {
    const dataDir = join(root, 'data');
    const path = updateLockPath(dataDir);
    const lock = await acquireUpdateLock(dataDir);
    const current = JSON.parse(readFileSync(path, 'utf8'));
    writeJson(path, { ...current, token: 'another-holder' });
    await lock.release();
    assert.equal(existsSync(path), true);
    assert.equal(JSON.parse(readFileSync(path, 'utf8')).token, 'another-holder');
  } finally {
    cleanup(root);
  }
});
