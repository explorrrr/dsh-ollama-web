import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { recoverInterruptedInstall } from '../dist/update/install.js';
import { journalPath, writeJournal } from '../dist/update/state.js';
import { PACKAGE_NAME, cleanup, makeProfile, makeTempDir, readJson, writeJson } from './update-helpers.mjs';

function journalFor(packageDir, stageDir, backupDir, packageName = PACKAGE_NAME) {
  return {
    schemaVersion: 1,
    id: 'test-journal',
    startedAt: new Date().toISOString(),
    targets: [{
      packageName,
      targetDir: packageDir,
      stageDir,
      backupDir,
    }],
  };
}

test('recovers an interrupted swap by restoring the backup', async () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, version: '1.0.0' });
    const dataDir = join(setup.profileDir, 'data', 'dsh-ollama-web');
    const backupDir = join(dirname(setup.packageDir), `.dsh-ollama-web-bak-${PACKAGE_NAME}-test`);
    const stageDir = join(dirname(setup.packageDir), `.dsh-ollama-web-next-${PACKAGE_NAME}-test`);
    cpSync(setup.packageDir, backupDir, { recursive: true });
    writeJson(join(setup.packageDir, 'package.json'), { name: PACKAGE_NAME, version: '2.0.0' });
    mkdirSync(stageDir, { recursive: true });
    writeFileSync(join(stageDir, 'partial.txt'), 'partial');
    await writeJournal(dataDir, journalFor(setup.packageDir, stageDir, backupDir));

    assert.equal(await recoverInterruptedInstall(setup.profile, dataDir), true);
    assert.equal(readJson(join(setup.packageDir, 'package.json')).version, '1.0.0');
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
    const setup = makeProfile({ root, version: '1.0.0' });
    const dataDir = join(setup.profileDir, 'data', 'dsh-ollama-web');
    const backupDir = join(dirname(setup.packageDir), `.dsh-ollama-web-bak-${PACKAGE_NAME}-missing`);
    const stageDir = join(dirname(setup.packageDir), `.dsh-ollama-web-next-${PACKAGE_NAME}-missing`);
    mkdirSync(stageDir, { recursive: true });
    await writeJournal(dataDir, journalFor(setup.packageDir, stageDir, backupDir));

    assert.equal(await recoverInterruptedInstall(setup.profile, dataDir), false);
    assert.equal(readJson(join(setup.packageDir, 'package.json')).version, '1.0.0');
    assert.equal(existsSync(stageDir), false);
    assert.equal(existsSync(journalPath(dataDir)), false);
  } finally {
    cleanup(root);
  }
});

test('recovers a 1.x journal that still names the client package', async () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, version: '1.0.0' });
    const dataDir = join(setup.profileDir, 'data', 'dsh-ollama-web');
    const legacyPackageName = 'dsh-ollama-web-client';
    const legacyDir = join(setup.profileDir, 'node_modules', legacyPackageName);
    const backupDir = join(dirname(legacyDir), `.dsh-ollama-web-bak-${legacyPackageName}-test`);
    const stageDir = join(dirname(legacyDir), `.dsh-ollama-web-next-${legacyPackageName}-test`);
    writeJson(join(legacyDir, 'package.json'), { name: legacyPackageName, version: '2.0.0' });
    cpSync(legacyDir, backupDir, { recursive: true });
    writeJson(join(legacyDir, 'package.json'), { name: legacyPackageName, version: '1.2.0' });
    mkdirSync(stageDir, { recursive: true });
    await writeJournal(dataDir, journalFor(legacyDir, stageDir, backupDir, legacyPackageName));

    assert.equal(await recoverInterruptedInstall(setup.profile, dataDir), true);
    assert.equal(readJson(join(legacyDir, 'package.json')).version, '2.0.0');
    assert.equal(existsSync(backupDir), false);
    assert.equal(existsSync(stageDir), false);
  } finally {
    cleanup(root);
  }
});

test('does not restore paths outside the profile', async () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, version: '1.0.0' });
    const dataDir = join(setup.profileDir, 'data', 'dsh-ollama-web');
    const outside = join(root, 'outside');
    mkdirSync(outside, { recursive: true });
    writeFileSync(join(outside, 'keep.txt'), 'keep');
    await writeJournal(dataDir, {
      schemaVersion: 1,
      id: 'outside',
      startedAt: new Date().toISOString(),
      targets: [{
        packageName: PACKAGE_NAME,
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
