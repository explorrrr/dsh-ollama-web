import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, realpathSync } from 'node:fs';
import { rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  cleanupBackups,
  detectPackageInstall,
  installRelease,
  profileFromBaseUrl,
  readPackageVersion,
  stagePackage,
  swapStaged,
  verifyIntegrity,
} from '../dist/update/install.js';
import {
  PACKAGE_NAME,
  cleanup,
  makePackageTarball,
  makeProfile,
  makeRelease,
  makeTempDir,
  sha512Integrity,
  writeJson,
} from './update-helpers.mjs';

function fetchTarball(target, tarball) {
  return async (input) => {
    const url = String(input);
    if (url === target.pkg.tarball) return new Response(tarball, { status: 200 });
    return new Response('not found', { status: 404 });
  };
}

function releasePackage(version, tarball, target) {
  return {
    name: PACKAGE_NAME,
    version,
    tarball: target,
    integrity: sha512Integrity(tarball),
    publishedAt: null,
    provenance: true,
  };
}

test('resolves a profile directory and detects the installed version', () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, version: '1.0.0' });
    assert.equal(profileFromBaseUrl(setup.profileUrl)?.name, 'test');
    assert.equal(profileFromBaseUrl('https://example.com/profile'), undefined);
    const install = detectPackageInstall(
      setup.profile,
      PACKAGE_NAME,
      [setup.packageDir],
    );
    assert.equal(install.version, '1.0.0');
    assert.equal(install.linked, false);
    assert.equal(install.dirs.includes(realpathSync(setup.packageDir)), true);
  } finally {
    cleanup(root);
  }
});

test('verifies SHA-512 integrity', () => {
  const bytes = Buffer.from('release');
  assert.equal(verifyIntegrity(bytes, sha512Integrity(bytes)), true);
  assert.equal(verifyIntegrity(bytes, sha512Integrity(Buffer.from('other'))), false);
  assert.equal(verifyIntegrity(bytes, 'sha1-abc'), false);
});

test('stages a package without touching the installed copy and preserves node_modules', async () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, version: '1.0.0' });
    const tarball = makePackageTarball({
      version: '2.0.0',
      dependencies: { 'legacy-dep': '1.0.0' },
      extra: { 'package/dist/index.js': 'export const version = "2.0.0";\n' },
    });
    const pkg = releasePackage('2.0.0', tarball, 'https://registry.example/dsh-ollama-web/-/dsh-ollama-web-2.0.0.tgz');
    const staged = await stagePackage(pkg, tarball, setup.packageDir, setup.profile);
    assert.equal(readPackageVersion(staged.stageDir), '2.0.0');
    assert.equal(readPackageVersion(setup.packageDir), '1.0.0');
    assert.equal(existsSync(join(staged.stageDir, 'node_modules', 'legacy-dep', 'index.js')), true);
    assert.equal(existsSync(join(staged.stageDir, 'dist', 'index.js')), true);
    assert.equal(existsSync(join(staged.stageDir, 'client.js')), true);
    await rm(staged.stageDir, { recursive: true, force: true });
  } finally {
    cleanup(root);
  }
});

test('rejects a tarball missing the client bundle or its manifest declaration', async () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, version: '1.0.0' });
    const missingFile = makePackageTarball({
      version: '2.0.0',
      omit: ['package/client.js'],
    });
    await assert.rejects(
      stagePackage(
        releasePackage('2.0.0', missingFile, 'https://registry.example/missing-client.tgz'),
        missingFile,
        setup.packageDir,
        setup.profile,
      ),
      /client\.js/,
    );
    const missingDeclaration = makePackageTarball({
      version: '2.0.0',
      manifest: {
        name: PACKAGE_NAME,
        version: '2.0.0',
        type: 'module',
        main: './dist/index.js',
        exports: { '.': './dist/index.js', './client': './client.js' },
        dsh: { bundle: { patch: './cordis.patch.yml' } },
      },
    });
    await assert.rejects(
      stagePackage(
        releasePackage('2.0.0', missingDeclaration, 'https://registry.example/missing-client-decl.tgz'),
        missingDeclaration,
        setup.packageDir,
        setup.profile,
      ),
      /web client bundle/,
    );
    const missingExport = makePackageTarball({
      version: '2.0.0',
      manifest: {
        name: PACKAGE_NAME,
        version: '2.0.0',
        type: 'module',
        main: './dist/index.js',
        exports: { '.': './dist/index.js' },
        dsh: {
          bundle: { patch: './cordis.patch.yml' },
          client: { platform: 'web', inject: [] },
        },
      },
    });
    await assert.rejects(
      stagePackage(
        releasePackage('2.0.0', missingExport, 'https://registry.example/missing-client-export.tgz'),
        missingExport,
        setup.packageDir,
        setup.profile,
      ),
      /export its client bundle/,
    );
  } finally {
    cleanup(root);
  }
});

test('swaps a staged package and keeps a backup', async () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, version: '1.0.0' });
    const tarball = makePackageTarball({
      version: '2.0.0',
      dependencies: { 'legacy-dep': '1.0.0' },
      extra: { 'package/dist/index.js': 'export const version = "2.0.0";\n' },
    });
    const staged = await stagePackage(
      releasePackage('2.0.0', tarball, 'https://registry.example/dsh-ollama-web.tgz'),
      tarball,
      setup.packageDir,
      setup.profile,
    );
    const backups = await swapStaged([staged]);
    assert.equal(readPackageVersion(setup.packageDir), '2.0.0');
    assert.equal(backups.length, 1);
    assert.equal(existsSync(backups[0]), true);
    assert.equal(existsSync(join(setup.packageDir, 'node_modules', 'legacy-dep', 'index.js')), true);
  } finally {
    cleanup(root);
  }
});

test('rolls back earlier targets when a later swap fails', async () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, version: '1.0.0' });
    const secondDir = join(setup.profile.profilesRoot, 'node_modules', PACKAGE_NAME);
    cpSync(setup.packageDir, secondDir, { recursive: true });
    const tarball = makePackageTarball({
      version: '2.0.0',
      dependencies: { 'legacy-dep': '1.0.0' },
      extra: { 'package/dist/index.js': 'export const version = "2.0.0";\n' },
    });
    const pkg = releasePackage('2.0.0', tarball, 'https://registry.example/dsh-ollama-web.tgz');
    const firstStaged = await stagePackage(pkg, tarball, setup.packageDir, setup.profile);
    const secondStaged = await stagePackage(pkg, tarball, secondDir, setup.profile);
    let renames = 0;
    const ops = {
      async rename(from, to) {
        renames += 1;
        if (renames === 3) throw Object.assign(new Error('locked'), { code: 'EINVAL' });
        await rename(from, to);
      },
      rm: (path) => rm(path, { recursive: true, force: true }),
      exists: async (path) => existsSync(path),
    };
    await assert.rejects(swapStaged([firstStaged, secondStaged], ops), /move the installed package aside/);
    assert.equal(readPackageVersion(setup.packageDir), '1.0.0');
    assert.equal(readPackageVersion(secondDir), '1.0.0');
    assert.equal(existsSync(join(setup.packageDir, 'node_modules', 'legacy-dep', 'index.js')), true);
  } finally {
    cleanup(root);
  }
});

test('installs the package end to end', async () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, version: '1.0.0' });
    const tarball = makePackageTarball({
      version: '2.0.0',
      dependencies: { 'legacy-dep': '1.0.0' },
      extra: { 'package/dist/index.js': 'export const version = "2.0.0";\n' },
    });
    const { target } = makeRelease({ version: '2.0.0', tarball });
    const result = await installRelease({
      target,
      profile: setup.profile,
      packageName: PACKAGE_NAME,
      runningDir: setup.packageDir,
      dataDir: join(setup.profileDir, 'data', 'dsh-ollama-web'),
      fetchImpl: fetchTarball(target, tarball),
    });
    assert.equal(result.version, '2.0.0');
    assert.equal(readPackageVersion(setup.packageDir), '2.0.0');
    assert.equal(existsSync(join(setup.packageDir, 'client.js')), true);
    assert.equal(existsSync(join(setup.packageDir, 'node_modules', 'legacy-dep', 'index.js')), true);
    assert.equal(result.backups.length, 1);
    assert.equal(existsSync(result.backups[0]), true);
    assert.equal(existsSync(join(setup.profileDir, 'data', 'dsh-ollama-web', 'update-journal.json')), false);
  } finally {
    cleanup(root);
  }
});

test('refuses a linked install outside the profiles root', async () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, version: '1.0.0' });
    const outside = join(root, 'outside', PACKAGE_NAME);
    writeJson(join(outside, 'package.json'), { name: PACKAGE_NAME, version: '1.0.0' });
    const tarball = makePackageTarball({ version: '2.0.0' });
    const { target } = makeRelease({ version: '2.0.0', tarball });
    await assert.rejects(
      installRelease({
        target,
        profile: setup.profile,
        packageName: PACKAGE_NAME,
        runningDir: outside,
        dataDir: join(setup.profileDir, 'data', 'dsh-ollama-web'),
        fetchImpl: fetchTarball(target, tarball),
      }),
      /linked development/,
    );
    assert.equal(readPackageVersion(setup.packageDir), '1.0.0');
  } finally {
    cleanup(root);
  }
});

test('cleanupBackups only removes our backups inside the profiles root', async () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, version: '1.0.0' });
    const inside = join(setup.profile.profilesRoot, '.dsh-ollama-web-bak-test');
    const outside = join(root, '.dsh-ollama-web-bak-outside');
    mkdirSync(inside, { recursive: true });
    mkdirSync(outside, { recursive: true });
    await cleanupBackups(setup.profile, [inside, outside]);
    assert.equal(existsSync(inside), false);
    assert.equal(existsSync(outside), true);
  } finally {
    cleanup(root);
  }
});
