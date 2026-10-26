import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  exactVersion,
  readProfileRecords,
  reconcileProfileRecords,
} from '../dist/update/records.js';
import {
  PACKAGE_NAME,
  cleanup,
  makeProfile,
  makeTempDir,
  readJson,
  readText,
  writeJson,
  writeProfileLock,
  writeText,
} from './update-helpers.mjs';

function manifest(setup) {
  return readJson(join(setup.profileDir, 'package.json'));
}

test('exactVersion accepts plain and v-prefixed releases but not ranges or build metadata', () => {
  assert.equal(exactVersion('2.4.1'), '2.4.1');
  assert.equal(exactVersion('v2.4.1'), '2.4.1');
  assert.equal(exactVersion('2.4.1-rc.1'), '2.4.1-rc.1');
  assert.equal(exactVersion('^2.4.1'), null);
  assert.equal(exactVersion('~2.4.1'), null);
  assert.equal(exactVersion('2.x'), null);
  assert.equal(exactVersion('2.4.1+build.1'), null);
  assert.equal(exactVersion(' 2.4.1'), null);
});

test('reads the declared exact pin and a v9 lockfile importer', () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, version: '2.4.1' });
    writeProfileLock(setup.profileDir, { version: '2.4.1' });
    const records = readProfileRecords(setup.profileDir, PACKAGE_NAME, '2.4.1');
    assert.equal(records.declaredSpecifier, '2.4.1');
    assert.equal(records.declaredVersion, '2.4.1');
    assert.equal(records.lockedVersion, '2.4.1');
    assert.equal(records.mismatch, false);
    assert.equal(records.message, null);
  } finally {
    cleanup(root);
  }
});

test('reports manifest and lockfile drift separately', () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, version: '2.0.0' });
    writeProfileLock(setup.profileDir, { version: '2.0.0' });
    const records = readProfileRecords(setup.profileDir, PACKAGE_NAME, '2.4.1');
    assert.equal(records.mismatch, true);
    assert.match(records.message, /package\.json records 2\.0\.0/);
    assert.match(records.message, /pnpm-lock\.yaml records 2\.0\.0/);
    assert.match(records.message, /2\.4\.1 is installed/);
  } finally {
    cleanup(root);
  }
});

test('does not treat a range as a declared exact version', () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, version: '^2.0.0' });
    const records = readProfileRecords(setup.profileDir, PACKAGE_NAME, '2.4.1');
    assert.equal(records.declaredSpecifier, '^2.0.0');
    assert.equal(records.declaredVersion, null);
    assert.equal(records.mismatch, false);
  } finally {
    cleanup(root);
  }
});

test('reports an unreadable manifest without throwing', () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, version: '2.0.0' });
    writeText(join(setup.profileDir, 'package.json'), '{ not json');
    const records = readProfileRecords(setup.profileDir, PACKAGE_NAME, '2.4.1');
    assert.equal(records.declaredVersion, null);
    assert.match(records.message, /could not be read/);
  } finally {
    cleanup(root);
  }
});

test('rewrites an exact dependency pin older than the installed version', async () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, version: '2.0.0' });
    const before = manifest(setup);
    const result = await reconcileProfileRecords({
      profile: setup.profile,
      packageName: PACKAGE_NAME,
      installedVersion: '2.4.1',
    });
    assert.equal(result.manifestUpdated, true);
    const after = manifest(setup);
    assert.equal(after.dependencies[PACKAGE_NAME], '2.4.1');
    assert.deepEqual(after.dsh, before.dsh);
    assert.equal(after.name, before.name);
    assert.equal(readText(join(setup.profileDir, 'package.json')).endsWith('\n'), true);
    assert.equal(result.state.declaredVersion, '2.4.1');
    assert.equal(result.state.mismatch, false);
    assert.equal(result.warning, null);
  } finally {
    cleanup(root);
  }
});

test('leaves an exact pin newer than the installed version unchanged', async () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, version: '3.0.0' });
    const result = await reconcileProfileRecords({
      profile: setup.profile,
      packageName: PACKAGE_NAME,
      installedVersion: '2.5.0',
    });
    assert.equal(result.manifestUpdated, false);
    assert.equal(manifest(setup).dependencies[PACKAGE_NAME], '3.0.0');
    assert.equal(result.state.declaredVersion, '3.0.0');
    assert.equal(result.state.mismatch, true);
    assert.match(result.warning, /newer than the installed 2\.5\.0/);
  } finally {
    cleanup(root);
  }
});

test('reports a stale lockfile after rewriting the manifest', async () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, version: '2.0.0' });
    writeProfileLock(setup.profileDir, { version: '2.0.0' });
    const result = await reconcileProfileRecords({
      profile: setup.profile,
      packageName: PACKAGE_NAME,
      installedVersion: '2.4.1',
    });
    assert.equal(result.manifestUpdated, true);
    assert.equal(manifest(setup).dependencies[PACKAGE_NAME], '2.4.1');
    assert.equal(result.state.lockedVersion, '2.0.0');
    assert.equal(result.state.mismatch, true);
    assert.match(result.warning, /pnpm-lock\.yaml still records 2\.0\.0/);
    assert.match(result.warning, /pnpm install --lockfile-only/);
  } finally {
    cleanup(root);
  }
});

test('leaves a range unchanged and reports why', async () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, version: '^2.0.0' });
    const result = await reconcileProfileRecords({
      profile: setup.profile,
      packageName: PACKAGE_NAME,
      installedVersion: '2.4.1',
    });
    assert.equal(result.manifestUpdated, false);
    assert.equal(manifest(setup).dependencies[PACKAGE_NAME], '^2.0.0');
    assert.match(result.warning, /records the range \^2\.0\.0/);
  } finally {
    cleanup(root);
  }
});

test('leaves a file specifier and a missing dependency unchanged', async () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, version: 'file:vendor/dsh-ollama-web-2.0.0.tgz' });
    const result = await reconcileProfileRecords({
      profile: setup.profile,
      packageName: PACKAGE_NAME,
      installedVersion: '2.4.1',
    });
    assert.equal(result.manifestUpdated, false);
    assert.match(result.warning, /not an exact pin/);

    const missing = makeProfile({ root: join(root, 'missing'), version: '2.0.0' });
    const missingManifest = manifest(missing);
    delete missingManifest.dependencies;
    writeJson(join(missing.profileDir, 'package.json'), missingManifest);
    const missingResult = await reconcileProfileRecords({
      profile: missing.profile,
      packageName: PACKAGE_NAME,
      installedVersion: '2.4.1',
    });
    assert.equal(missingResult.manifestUpdated, false);
    assert.match(missingResult.warning, /does not record dsh-ollama-web/);
  } finally {
    cleanup(root);
  }
});

test('does not produce a lock mismatch for an older lockfile format', () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, version: '2.4.1' });
    writeText(
      join(setup.profileDir, 'pnpm-lock.yaml'),
      "lockfileVersion: '6.0'\n\nimporters:\n\n  .:\n    specifiers:\n      dsh-ollama-web: 2.0.0\n    dependencies:\n      dsh-ollama-web: 2.0.0\n",
    );
    const records = readProfileRecords(setup.profileDir, PACKAGE_NAME, '2.4.1');
    assert.equal(records.lockedVersion, null);
    assert.equal(records.mismatch, false);
  } finally {
    cleanup(root);
  }
});

test('a failed manifest write becomes a warning instead of failing the update', async () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, version: '2.0.0' });
    mkdirSync(join(setup.profileDir, '.dsh-ollama-web-package.json.tmp'));
    const result = await reconcileProfileRecords({
      profile: setup.profile,
      packageName: PACKAGE_NAME,
      installedVersion: '2.4.1',
    });
    assert.equal(result.manifestUpdated, false);
    assert.match(result.warning, /could not be updated/);
    assert.equal(manifest(setup).dependencies[PACKAGE_NAME], '2.0.0');
  } finally {
    cleanup(root);
  }
});

test('reconcile is idempotent when the manifest already names the installed version', async () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, version: '2.4.1' });
    const before = readFileSync(join(setup.profileDir, 'package.json'), 'utf8');
    const result = await reconcileProfileRecords({
      profile: setup.profile,
      packageName: PACKAGE_NAME,
      installedVersion: '2.4.1',
    });
    assert.equal(result.manifestUpdated, false);
    assert.equal(readFileSync(join(setup.profileDir, 'package.json'), 'utf8'), before);
    assert.equal(result.warning, null);
  } finally {
    cleanup(root);
  }
});
