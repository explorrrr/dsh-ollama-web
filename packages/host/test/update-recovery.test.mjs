import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { recoverInterruptedInstall } from '../dist/update/install.js';
import { journalPath, writeJournal } from '../dist/update/state.js';
import { cleanup, makeProfile, makeTempDir, readJson, writeJson } from './update-helpers.mjs';

function journalFor(hostDir, stageDir, backupDir) {
  return {
    schemaVersion: 1,
    id: 'test-journal',
    startedAt: new Date().toISOString(),
    targets: [{
      packageName: 'dsh-ollama-web',
      targetDir: hostDir,
      stageDir,
      backupDir,
    }],
  };
}

test('recovers an interrupted swap by restoring the backup', async () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, hostVersion: '1.0.0', clientVersion: '1.0.0' });
    const dataDir = join(setup.profileDir, 'data', 'dsh-ollama-web');
    const backupDir = join(dirname(setup.hostDir), '.dsh-ollama-web-bak-dsh-ollama-web-test');
    const stageDir = join(dirname(setup.hostDir), '.dsh-ollama-web-next-dsh-ollama-web-test');
    cpSync(setup.hostDir, backupDir, { recursive: true });
    writeJson(join(setup.hostDir, 'package.json'), { name: 'dsh-ollama-web', version: '1.1.0' });
    mkdirSync(stageDir, { recursive: true });
    writeFileSync(join(stageDir, 'partial.txt'), 'partial');
    await writeJournal(dataDir, journalFor(setup.hostDir, stageDir, backupDir));

    assert.equal(await recoverInterruptedInstall(setup.profile, dataDir), true);
    assert.equal(readJson(join(setup.hostDir, 'package.json')).version, '1.0.0');
    assert.equal(existsSync(backupDir), false);
    assert.equal(existsSync(stageDir), false);
    assert.equal(existsSync(journalPath(dataDir)), false);
  } finally {
    cleanup(root);
  }
});

test('recovers a crash before the target was moved aside', async () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, hostVersion: '1.0.0', clientVersion: '1.0.0' });
    const dataDir = join(setup.profileDir, 'data', 'dsh-ollama-web');
    const backupDir = join(dirname(setup.hostDir), '.dsh-ollama-web-bak-dsh-ollama-web-missing');
    const stageDir = join(dirname(setup.hostDir), '.dsh-ollama-web-next-dsh-ollama-web-missing');
    mkdirSync(stageDir, { recursive: true });
    await writeJournal(dataDir, journalFor(setup.hostDir, stageDir, backupDir));

    assert.equal(await recoverInterruptedInstall(setup.profile, dataDir), false);
    assert.equal(readJson(join(setup.hostDir, 'package.json')).version, '1.0.0');
    assert.equal(existsSync(stageDir), false);
    assert.equal(existsSync(journalPath(dataDir)), false);
  } finally {
    cleanup(root);
  }
});

test('does not restore paths outside the profile', async () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, hostVersion: '1.0.0', clientVersion: '1.0.0' });
    const dataDir = join(setup.profileDir, 'data', 'dsh-ollama-web');
    const outside = join(root, 'outside');
    mkdirSync(outside, { recursive: true });
    writeFileSync(join(outside, 'keep.txt'), 'keep');
    await writeJournal(dataDir, {
      schemaVersion: 1,
      id: 'outside',
      startedAt: new Date().toISOString(),
      targets: [{
        packageName: 'dsh-ollama-web',
        targetDir: outside,
        stageDir: join(outside, '.dsh-ollama-web-next-evil'),
        backupDir: join(outside, '.dsh-ollama-web-bak-evil'),
      }],
    });

    assert.equal(await recoverInterruptedInstall(setup.profile, dataDir), false);
    assert.equal(existsSync(join(outside, 'keep.txt')), true);
    assert.equal(existsSync(journalPath(dataDir)), false);
  } finally {
    cleanup(root);
  }
});
