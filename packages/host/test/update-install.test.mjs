import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, realpathSync } from 'node:fs';
import { rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  cleanupBackups,
  detectInstalls,
  installRelease,
  profileFromBaseUrl,
  readPackageVersion,
  stagePackage,
  swapStaged,
  verifyIntegrity,
} from '../dist/update/install.js';
import {
  cleanup,
  makePackageTarball,
  makeProfile,
  makeRelease,
  makeTempDir,
  readJson,
  sha512Integrity,
  writeJson,
  writeText,
} from './update-helpers.mjs';

function fetchTarballs(target, hostTarball, clientTarball) {
  return async (input) => {
    const url = String(input);
    if (url === target.host.tarball) return new Response(hostTarball, { status: 200 });
    if (url === target.client.tarball) return new Response(clientTarball, { status: 200 });
    return new Response('not found', { status: 404 });
  };
}

test('resolves a profile directory and detects installed versions', () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, hostVersion: '1.0.0', clientVersion: '1.0.0' });
    assert.equal(profileFromBaseUrl(setup.profileUrl)?.name, 'test');
    assert.equal(profileFromBaseUrl('https://example.com/profile'), undefined);
    const installs = detectInstalls(
      setup.profile,
      setup.hostDir,
      'dsh-ollama-web',
      'dsh-ollama-web-client',
    );
    assert.equal(installs.host.version, '1.0.0');
    assert.equal(installs.client.version, '1.0.0');
    assert.equal(installs.host.linked, false);
    assert.equal(installs.host.dirs.includes(realpathSync(setup.hostDir)), true);
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
    const setup = makeProfile({ root, hostVersion: '1.0.0', clientVersion: '1.0.0' });
    const tarball = makePackageTarball({
      name: 'dsh-ollama-web',
      version: '1.1.0',
      dependencies: { 'legacy-dep': '1.0.0' },
      extra: { 'package/dist/index.js': 'export const version = "1.1.0";\n' },
    });
    const pkg = {
      name: 'dsh-ollama-web',
      version: '1.1.0',
      tarball: 'https://registry.example/dsh-ollama-web/-/dsh-ollama-web-1.1.0.tgz',
      integrity: sha512Integrity(tarball),
      publishedAt: null,
      provenance: true,
    };
    const staged = await stagePackage(pkg, tarball, setup.hostDir, setup.profile);
    assert.equal(readPackageVersion(staged.stageDir), '1.1.0');
    assert.equal(readPackageVersion(setup.hostDir), '1.0.0');
    assert.equal(existsSync(join(staged.stageDir, 'node_modules', 'legacy-dep', 'index.js')), true);
    assert.equal(existsSync(join(staged.stageDir, 'dist', 'index.js')), true);
    await rm(staged.stageDir, { recursive: true, force: true });
  } finally {
    cleanup(root);
  }
});

test('swaps staged packages and keeps backups', async () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, hostVersion: '1.0.0', clientVersion: '1.0.0' });
    const tarball = makePackageTarball({
      name: 'dsh-ollama-web',
      version: '1.1.0',
      dependencies: { 'legacy-dep': '1.0.0' },
      extra: { 'package/dist/index.js': 'export const version = "1.1.0";\n' },
    });
    const staged = await stagePackage({
      name: 'dsh-ollama-web',
      version: '1.1.0',
      tarball: 'https://registry.example/dsh-ollama-web.tgz',
      integrity: sha512Integrity(tarball),
      publishedAt: null,
      provenance: true,
    }, tarball, setup.hostDir, setup.profile);
    const backups = await swapStaged([staged]);
    assert.equal(readPackageVersion(setup.hostDir), '1.1.0');
    assert.equal(backups.length, 1);
    assert.equal(existsSync(backups[0]), true);
    assert.equal(existsSync(join(setup.hostDir, 'node_modules', 'legacy-dep', 'index.js')), true);
  } finally {
    cleanup(root);
  }
});

test('rolls back earlier targets when a later swap fails', async () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, hostVersion: '1.0.0', clientVersion: '1.0.0' });
    const hostTarball = makePackageTarball({
      name: 'dsh-ollama-web',
      version: '1.1.0',
      dependencies: { 'legacy-dep': '1.0.0' },
      extra: { 'package/dist/index.js': 'export const version = "1.1.0";\n' },
    });
    const clientTarball = makePackageTarball({ name: 'dsh-ollama-web-client', version: '1.1.0' });
    const hostStaged = await stagePackage({
      name: 'dsh-ollama-web', version: '1.1.0',
      tarball: 'https://registry.example/host.tgz',
      integrity: sha512Integrity(hostTarball), publishedAt: null, provenance: true,
    }, hostTarball, setup.hostDir, setup.profile);
    const clientStaged = await stagePackage({
      name: 'dsh-ollama-web-client', version: '1.1.0',
      tarball: 'https://registry.example/client.tgz',
      integrity: sha512Integrity(clientTarball), publishedAt: null, provenance: true,
    }, clientTarball, setup.clientDir, setup.profile);
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
    await assert.rejects(swapStaged([hostStaged, clientStaged], ops), /move the installed package aside/);
    assert.equal(readPackageVersion(setup.hostDir), '1.0.0');
    assert.equal(readPackageVersion(setup.clientDir), '1.0.0');
    assert.equal(existsSync(join(setup.hostDir, 'node_modules', 'legacy-dep', 'index.js')), true);
  } finally {
    cleanup(root);
  }
});

test('installs both packages end to end', async () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, hostVersion: '1.0.0', clientVersion: '1.0.0' });
    const hostTarball = makePackageTarball({
      name: 'dsh-ollama-web',
      version: '1.1.0',
      dependencies: { 'legacy-dep': '1.0.0' },
      extra: { 'package/dist/index.js': 'export const version = "1.1.0";\n' },
    });
    const clientTarball = makePackageTarball({ name: 'dsh-ollama-web-client', version: '1.1.0' });
    const { target } = makeRelease({ version: '1.1.0', hostTarball, clientTarball });
    const result = await installRelease({
      target,
      profile: setup.profile,
      hostPackageName: 'dsh-ollama-web',
      clientPackageName: 'dsh-ollama-web-client',
      hostRunningDir: setup.hostDir,
      dataDir: join(setup.profileDir, 'data', 'dsh-ollama-web'),
      fetchImpl: fetchTarballs(target, hostTarball, clientTarball),
    });
    assert.equal(result.host, '1.1.0');
    assert.equal(result.client, '1.1.0');
    assert.equal(readPackageVersion(setup.hostDir), '1.1.0');
    assert.equal(readPackageVersion(setup.clientDir), '1.1.0');
    assert.equal(existsSync(join(setup.hostDir, 'node_modules', 'legacy-dep', 'index.js')), true);
    assert.equal(result.backups.length, 2);
    for (const backup of result.backups) assert.equal(existsSync(backup), true);
    assert.equal(existsSync(join(setup.profileDir, 'data', 'dsh-ollama-web', 'update-journal.json')), false);
  } finally {
    cleanup(root);
  }
});

test('refuses a linked host install outside the profiles root', async () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, hostVersion: '1.0.0', clientVersion: '1.0.0' });
    const outside = join(root, 'outside', 'dsh-ollama-web');
    writeJson(join(outside, 'package.json'), { name: 'dsh-ollama-web', version: '1.0.0' });
    const hostTarball = makePackageTarball({ name: 'dsh-ollama-web', version: '1.1.0' });
    const clientTarball = makePackageTarball({ name: 'dsh-ollama-web-client', version: '1.1.0' });
    const { target } = makeRelease({ version: '1.1.0', hostTarball, clientTarball });
    await assert.rejects(
      installRelease({
        target,
        profile: setup.profile,
        hostPackageName: 'dsh-ollama-web',
        clientPackageName: 'dsh-ollama-web-client',
        hostRunningDir: outside,
        dataDir: join(setup.profileDir, 'data', 'dsh-ollama-web'),
        fetchImpl: fetchTarballs(target, hostTarball, clientTarball),
      }),
      /linked development/,
    );
    assert.equal(readPackageVersion(setup.hostDir), '1.0.0');
    assert.equal(readPackageVersion(setup.clientDir), '1.0.0');
  } finally {
    cleanup(root);
  }
});

test('cleanupBackups only removes our backups inside the profiles root', async () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root, hostVersion: '1.0.0', clientVersion: '1.0.0' });
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
