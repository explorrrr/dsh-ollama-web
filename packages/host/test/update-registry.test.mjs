import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import {
  DEFAULT_MINIMUM_RELEASE_AGE_MINUTES,
  checkRelease,
  readMinimumReleaseAge,
} from '../dist/update/registry.js';
import { PACKAGE_NAME, REGISTRY } from './update-helpers.mjs';

test('reads minimumReleaseAge only when explicitly configured', async () => {
  const { makeTempDir, cleanup, writeText } = await import('./update-helpers.mjs');
  const root = makeTempDir();
  try {
    const profileDir = join(root, 'profiles', 'test');
    assert.equal(DEFAULT_MINIMUM_RELEASE_AGE_MINUTES, 0);
    writeText(join(profileDir, 'pnpm-workspace.yaml'), 'minimumReleaseAge: 15\n');
    assert.equal(await readMinimumReleaseAge(profileDir), 15);
    writeText(join(profileDir, 'pnpm-workspace.yaml'), 'minimumReleaseAge: 0\n');
    assert.equal(await readMinimumReleaseAge(profileDir), 0);
    writeText(join(profileDir, 'pnpm-workspace.yaml'), 'packages: []\n');
    assert.equal(await readMinimumReleaseAge(profileDir), DEFAULT_MINIMUM_RELEASE_AGE_MINUTES);
    writeText(join(profileDir, 'pnpm-workspace.yaml'), 'minimumReleaseAge: soon\n');
    assert.equal(await readMinimumReleaseAge(profileDir), 0);
    assert.equal(await readMinimumReleaseAge(join(root, 'missing')), DEFAULT_MINIMUM_RELEASE_AGE_MINUTES);
  } finally {
    cleanup(root);
  }
});

test('reads the latest release from one registry', async () => {
  const { makeRelease } = await import('./update-helpers.mjs');
  const { pkg, target } = makeRelease({
    version: '2.0.0',
    tarball: Buffer.from('package'),
  });
  const calls = [];
  const targetResult = await checkRelease(PACKAGE_NAME, {
    fetchImpl: async (input) => {
      const url = String(input);
      calls.push(url);
      if (url === `${REGISTRY}${PACKAGE_NAME}`) {
        return new Response(JSON.stringify(pkg), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    },
    registries: [REGISTRY],
    minReleaseAgeMinutes: 60,
    now: Date.parse(target.publishedAt) + 30 * 60_000,
  });
  assert.equal(targetResult.version, '2.0.0');
  assert.equal(targetResult.pkg.tarball, target.pkg.tarball);
  assert.equal(targetResult.pkg.integrity, target.pkg.integrity);
  assert.equal(targetResult.pkg.dshRange, '>=0.2.1-rc.1 <0.3.0');
  assert.equal(targetResult.provenance, true);
  assert.equal(targetResult.eligibleAt, '2026-10-01T01:00:00.000Z');
  assert.equal(calls.length, 1);
  assert.equal(calls[0], `${REGISTRY}${PACKAGE_NAME}`);
});

test('falls back to the next registry after a failure', async () => {
  const { makeRelease, REGISTRY: registry } = await import('./update-helpers.mjs');
  const { pkg } = makeRelease({
    version: '2.0.0',
    tarball: Buffer.from('package'),
  });
  const first = 'https://first.example/';
  const result = await checkRelease(PACKAGE_NAME, {
    fetchImpl: async (input) => {
      const url = String(input);
      if (url.startsWith(first)) return new Response('bad', { status: 500 });
      if (url === `${registry}${PACKAGE_NAME}`) return new Response(JSON.stringify(pkg), { status: 200 });
      return new Response('not found', { status: 404 });
    },
    registries: [first, registry],
    minReleaseAgeMinutes: 0,
    now: Date.parse('2026-10-02T00:00:00.000Z'),
  });
  assert.equal(result.version, '2.0.0');
  assert.equal(result.registry, registry);
});

test('rejects non-HTTPS tarballs and missing SHA-512 integrity', async () => {
  const { makeRelease } = await import('./update-helpers.mjs');
  const { pkg } = makeRelease({
    version: '2.0.0',
    tarball: Buffer.from('package'),
  });
  pkg.versions['2.0.0'].dist.tarball = 'http://registry.example/insecure.tgz';
  await assert.rejects(
    checkRelease(PACKAGE_NAME, {
      fetchImpl: async () => new Response(JSON.stringify(pkg), { status: 200 }),
      registries: [REGISTRY],
      minReleaseAgeMinutes: 0,
      now: Date.now(),
    }),
    /HTTPS/,
  );
  const { pkg: pkg2 } = makeRelease({
    version: '2.0.0',
    tarball: Buffer.from('package'),
  });
  delete pkg2.versions['2.0.0'].dist.integrity;
  await assert.rejects(
    checkRelease(PACKAGE_NAME, {
      fetchImpl: async () => new Response(JSON.stringify(pkg2), { status: 200 }),
      registries: [REGISTRY],
      minReleaseAgeMinutes: 0,
      now: Date.now(),
    }),
    /integrity/,
  );
});

test('allows only loopback HTTP registries when explicitly enabled', async () => {
  const { makeRelease } = await import('./update-helpers.mjs');
  const local = 'http://127.0.0.1:34567/';
  const { pkg } = makeRelease({
    version: '2.0.0',
    tarball: Buffer.from('package'),
    registry: local,
  });
  const result = await checkRelease(PACKAGE_NAME, {
    fetchImpl: async (input) => {
      const url = String(input);
      if (url === `${local}${PACKAGE_NAME}`) return new Response(JSON.stringify(pkg), { status: 200 });
      return new Response('not found', { status: 404 });
    },
    registries: [local],
    minReleaseAgeMinutes: 0,
    now: Date.now(),
    allowInsecureLocalhost: true,
  });
  assert.equal(result.version, '2.0.0');
  await assert.rejects(
    checkRelease(PACKAGE_NAME, {
      fetchImpl: async () => new Response('no', { status: 500 }),
      registries: [local],
      minReleaseAgeMinutes: 0,
      now: Date.now(),
    }),
    /HTTPS/,
  );
});

test('keeps an unknown publish time as null', async () => {
  const { makeRelease } = await import('./update-helpers.mjs');
  const { pkg } = makeRelease({
    version: '2.0.0',
    tarball: Buffer.from('package'),
  });
  delete pkg.time;
  const result = await checkRelease(PACKAGE_NAME, {
    fetchImpl: async () => new Response(JSON.stringify(pkg), { status: 200 }),
    registries: [REGISTRY],
    minReleaseAgeMinutes: 0,
    now: Date.now(),
  });
  assert.equal(result.publishedAt, null);
  assert.equal(result.eligibleAt, null);
});

test('keeps a missing or oversized engines.dsh as null', async () => {
  const { makeRelease } = await import('./update-helpers.mjs');
  const missing = makeRelease({
    version: '2.0.0',
    tarball: Buffer.from('package'),
    dshRange: null,
  });
  const missingResult = await checkRelease(PACKAGE_NAME, {
    fetchImpl: async () => new Response(JSON.stringify(missing.pkg), { status: 200 }),
    registries: [REGISTRY],
    minReleaseAgeMinutes: 0,
    now: Date.now(),
  });
  assert.equal(missingResult.pkg.dshRange, null);

  const oversized = makeRelease({
    version: '2.0.0',
    tarball: Buffer.from('package'),
    dshRange: `>=${'0'.repeat(250)}`,
  });
  const oversizedResult = await checkRelease(PACKAGE_NAME, {
    fetchImpl: async () => new Response(JSON.stringify(oversized.pkg), { status: 200 }),
    registries: [REGISTRY],
    minReleaseAgeMinutes: 0,
    now: Date.now(),
  });
  assert.equal(oversizedResult.pkg.dshRange, null);
});
