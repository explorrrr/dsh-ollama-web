import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  prefsPath,
  readPrefs,
  readState,
  statePath,
  writePrefs,
  writeState,
} from '../dist/update/state.js';
import { cleanup, makeTempDir, writeText } from './update-helpers.mjs';

test('preferences default to off and round-trip', async () => {
  const root = makeTempDir();
  try {
    const dataDir = join(root, 'data');
    assert.deepEqual(await readPrefs(dataDir), { autoUpdate: false });
    await writePrefs(dataDir, { autoUpdate: true });
    assert.deepEqual(await readPrefs(dataDir), { autoUpdate: true });
    if (process.platform !== 'win32') {
      assert.equal(statSync(prefsPath(dataDir)).mode & 0o777, 0o600);
    }
    const leftovers = readdirSync(dataDir).filter((name) => name.endsWith('.tmp'));
    assert.deepEqual(leftovers, []);
  } finally {
    cleanup(root);
  }
});

test('state rejects unsafe or inconsistent release metadata', async () => {
  const root = makeTempDir();
  try {
    const dataDir = join(root, 'data');
    const base = {
      schemaVersion: 1,
      latest: {
        host: '1.1.0',
        client: '1.1.0',
        publishedAt: '2026-10-01T00:00:00.000Z',
        eligibleAt: '2026-10-01T01:00:00.000Z',
        releaseUrl: 'https://github.com/explorrrr/dsh-ollama-web/releases/tag/v1.1.0',
        provenance: true,
      },
    };
    for (const latest of [
      { ...base.latest, releaseUrl: 'javascript:alert(1)' },
      { ...base.latest, releaseUrl: 'https://evil.example/releases/tag/v1.1.0' },
      { ...base.latest, host: 'not-a-version' },
      { ...base.latest, client: '1.2.0' },
    ]) {
      await writeState(dataDir, { ...base, latest });
      const state = await readState(dataDir);
      assert.equal(state.latest, undefined);
    }
    await writeState(dataDir, base);
    assert.equal((await readState(dataDir)).latest?.host, '1.1.0');
  } finally {
    cleanup(root);
  }
});

test('state defaults, round-trips, and ignores malformed JSON', async () => {
  const root = makeTempDir();
  try {
    const dataDir = join(root, 'data');
    assert.deepEqual(await readState(dataDir), { schemaVersion: 1 });
    const state = {
      schemaVersion: 1,
      lastCheckAt: '2026-10-02T00:00:00.000Z',
      latest: {
        host: '1.1.0',
        client: '1.1.0',
        publishedAt: '2026-10-01T00:00:00.000Z',
        eligibleAt: '2026-10-01T01:00:00.000Z',
        releaseUrl: 'https://github.com/explorrrr/dsh-ollama-web/releases/tag/v1.1.0',
        provenance: true,
      },
      installed: { host: '1.1.0', client: '1.1.0' },
      needsRestart: true,
      backups: ['/tmp/backup'],
    };
    await writeState(dataDir, state);
    assert.deepEqual(await readState(dataDir), state);
    writeText(statePath(dataDir), '{not json');
    assert.deepEqual(await readState(dataDir), { schemaVersion: 1 });
    writeText(statePath(dataDir), JSON.stringify({ schemaVersion: 2 }));
    assert.deepEqual(await readState(dataDir), { schemaVersion: 1 });
  } finally {
    cleanup(root);
  }
});
