import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import {
  DEFAULT_MINIMUM_RELEASE_AGE_MINUTES,
  checkRelease,
  readMinimumReleaseAge,
} from '../dist/update/registry.js';
import { REGISTRY } from './update-helpers.mjs';

test('reads minimumReleaseAge from the profile and defaults to 60', async () => {
  const { makeTempDir, cleanup, writeText } = await import('./update-helpers.mjs');
  const root = makeTempDir();
  try {
    const profileDir = join(root, 'profiles', 'test');
    writeText(join(profileDir, 'pnpm-workspace.yaml'), 'minimumReleaseAge: 15\n');
    assert.equal(await readMinimumReleaseAge(profileDir), 15);
    writeText(join(profileDir, 'pnpm-workspace.yaml'), 'minimumReleaseAge: 0\n');
    assert.equal(await readMinimumReleaseAge(profileDir), 0);
    writeText(join(profileDir, 'pnpm-workspace.yaml'), 'packages: []\n');
    assert.equal(await readMinimumReleaseAge(profileDir), DEFAULT_MINIMUM_RELEASE_AGE_MINUTES);
    assert.equal(await readMinimumReleaseAge(join(root, 'missing')), DEFAULT_MINIMUM_RELEASE_AGE_MINUTES);
  } finally {
    cleanup(root);
  }
});

test('reads host and client releases from the same registry', async () => {
  const { makeTempDir, cleanup, makeRelease } = await import('./update-helpers.mjs');
  const root = makeTempDir();
  try {
    const { host, client, target } = makeRelease({
      version: '1.1.0',
      hostTarball: Buffer.from('host'),
      clientTarball: Buffer.from('client'),
    });
    const calls = [];
    const targetResult = await checkRelease(
      ['dsh-ollama-web', 'dsh-ollama-web-client'],
      {
        fetchImpl: async (input) => {
          const url = String(input);
          calls.push(url);
          if (url === `${REGISTRY}dsh-ollama-web`) {
            return new Response(JSON.stringify(host), { status: 200 });
          }
          if (url === `${REGISTRY}dsh-ollama-web-client`) {
            return new Response(JSON.stringify(client), { status: 200 });
          }
          return new Response('not found', { status: 404 });
        },
        registries: [REGISTRY],
        minReleaseAgeMinutes: 60,
        now: Date.parse(target.publishedAt) + 30 * 60_000,
      },
    );
    assert.equal(targetResult.version, '1.1.0');
    assert.equal(targetResult.host.tarball, target.host.tarball);
    assert.equal(targetResult.client.tarball, target.client.tarball);
    assert.equal(targetResult.provenance, true);
    assert.equal(targetResult.eligibleAt, '2026-10-01T01:00:00.000Z');
    assert.equal(calls.length, 2);
  } finally {
    cleanup(root);
  }
});

test('falls back to the next registry after a failure', async () => {
  const { makeTempDir, cleanup, makeRelease, REGISTRY } = await import('./update-helpers.mjs');
  const root = makeTempDir();
  try {
    const { host, client } = makeRelease({
      version: '1.1.0',
      hostTarball: Buffer.from('host'),
      clientTarball: Buffer.from('client'),
    });
    const first = 'https://first.example/';
    const result = await checkRelease(
      ['dsh-ollama-web', 'dsh-ollama-web-client'],
      {
        fetchImpl: async (input) => {
          const url = String(input);
          if (url.startsWith(first)) return new Response('bad', { status: 500 });
          if (url === `${REGISTRY}dsh-ollama-web`) return new Response(JSON.stringify(host), { status: 200 });
          if (url === `${REGISTRY}dsh-ollama-web-client`) return new Response(JSON.stringify(client), { status: 200 });
          return new Response('not found', { status: 404 });
        },
        registries: [first, REGISTRY],
        minReleaseAgeMinutes: 0,
        now: Date.parse('2026-10-02T00:00:00.000Z'),
      },
    );
    assert.equal(result.version, '1.1.0');
    assert.equal(result.registry, REGISTRY);
  } finally {
    cleanup(root);
  }
});

test('rejects release version mismatches', async () => {
  const { makeTempDir, cleanup, makeRelease } = await import('./update-helpers.mjs');
  const root = makeTempDir();
  try {
    const { host, client } = makeRelease({
      version: '1.1.0',
      hostTarball: Buffer.from('host'),
      clientTarball: Buffer.from('client'),
    });
    client['dist-tags'].latest = '1.2.0';
    client.versions['1.2.0'] = {
      ...client.versions['1.1.0'],
      version: '1.2.0',
    };
    await assert.rejects(
      checkRelease(
        ['dsh-ollama-web', 'dsh-ollama-web-client'],
        {
          fetchImpl: async (input) => {
            const url = String(input);
            if (url === `${REGISTRY}dsh-ollama-web`) return new Response(JSON.stringify(host), { status: 200 });
            if (url === `${REGISTRY}dsh-ollama-web-client`) return new Response(JSON.stringify(client), { status: 200 });
            return new Response('not found', { status: 404 });
          },
          registries: [REGISTRY],
          minReleaseAgeMinutes: 0,
          now: Date.now(),
        },
      ),
      /different versions/,
    );
  } finally {
    cleanup(root);
  }
});

test('rejects non-HTTPS tarballs and missing SHA-512 integrity', async () => {
  const { makeTempDir, cleanup, makeRelease } = await import('./update-helpers.mjs');
  const root = makeTempDir();
  try {
    const { host, client } = makeRelease({
      version: '1.1.0',
      hostTarball: Buffer.from('host'),
      clientTarball: Buffer.from('client'),
    });
    host.versions['1.1.0'].dist.tarball = 'http://registry.example/insecure.tgz';
    await assert.rejects(
      checkRelease(
        ['dsh-ollama-web', 'dsh-ollama-web-client'],
        {
          fetchImpl: async (input) => {
            const url = String(input);
            if (url === `${REGISTRY}dsh-ollama-web`) return new Response(JSON.stringify(host), { status: 200 });
            if (url === `${REGISTRY}dsh-ollama-web-client`) return new Response(JSON.stringify(client), { status: 200 });
            return new Response('not found', { status: 404 });
          },
          registries: [REGISTRY],
          minReleaseAgeMinutes: 0,
          now: Date.now(),
        },
      ),
      /HTTPS/,
    );
    const { host: host2, client: client2 } = makeRelease({
      version: '1.1.0',
      hostTarball: Buffer.from('host'),
      clientTarball: Buffer.from('client'),
    });
    delete host2.versions['1.1.0'].dist.integrity;
    await assert.rejects(
      checkRelease(
        ['dsh-ollama-web', 'dsh-ollama-web-client'],
        {
          fetchImpl: async (input) => {
            const url = String(input);
            if (url === `${REGISTRY}dsh-ollama-web`) return new Response(JSON.stringify(host2), { status: 200 });
            if (url === `${REGISTRY}dsh-ollama-web-client`) return new Response(JSON.stringify(client2), { status: 200 });
            return new Response('not found', { status: 404 });
          },
          registries: [REGISTRY],
          minReleaseAgeMinutes: 0,
          now: Date.now(),
        },
      ),
      /integrity/,
    );
  } finally {
    cleanup(root);
  }
});

test('allows only loopback HTTP registries when explicitly enabled', async () => {
  const { makeTempDir, cleanup, makeRelease } = await import('./update-helpers.mjs');
  const root = makeTempDir();
  try {
    const { checkRelease: check } = await import('../dist/update/registry.js');
    const local = 'http://127.0.0.1:34567/';
    const { host, client } = makeRelease({
      version: '1.1.0',
      hostTarball: Buffer.from('host'),
      clientTarball: Buffer.from('client'),
      registry: local,
    });
    const result = await check(
      ['dsh-ollama-web', 'dsh-ollama-web-client'],
      {
        fetchImpl: async (input) => {
          const url = String(input);
          if (url === `${local}dsh-ollama-web`) return new Response(JSON.stringify(host), { status: 200 });
          if (url === `${local}dsh-ollama-web-client`) return new Response(JSON.stringify(client), { status: 200 });
          return new Response('not found', { status: 404 });
        },
        registries: [local],
        minReleaseAgeMinutes: 0,
        now: Date.now(),
        allowInsecureLocalhost: true,
      },
    );
    assert.equal(result.version, '1.1.0');
    await assert.rejects(
      check(
        ['dsh-ollama-web', 'dsh-ollama-web-client'],
        {
          fetchImpl: async () => new Response('no', { status: 500 }),
          registries: [local],
          minReleaseAgeMinutes: 0,
          now: Date.now(),
        },
      ),
      /HTTPS/,
    );
  } finally {
    cleanup(root);
  }
});

test('keeps an unknown publish time as null', async () => {
  const { makeTempDir, cleanup, makeRelease } = await import('./update-helpers.mjs');
  const root = makeTempDir();
  try {
    const { host, client } = makeRelease({
      version: '1.1.0',
      hostTarball: Buffer.from('host'),
      clientTarball: Buffer.from('client'),
    });
    delete host.time;
    delete client.time;
    const result = await checkRelease(
      ['dsh-ollama-web', 'dsh-ollama-web-client'],
      {
        fetchImpl: async (input) => {
          const url = String(input);
          if (url === `${REGISTRY}dsh-ollama-web`) return new Response(JSON.stringify(host), { status: 200 });
          if (url === `${REGISTRY}dsh-ollama-web-client`) return new Response(JSON.stringify(client), { status: 200 });
          return new Response('not found', { status: 404 });
        },
        registries: [REGISTRY],
        minReleaseAgeMinutes: 0,
        now: Date.now(),
      },
    );
    assert.equal(result.publishedAt, null);
    assert.equal(result.eligibleAt, null);
  } finally {
    cleanup(root);
  }
});
