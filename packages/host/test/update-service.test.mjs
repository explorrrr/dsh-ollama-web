import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { UpdateService } from '../dist/update/service.js';
import { readPrefs } from '../dist/update/state.js';
import {
  REGISTRY,
  cleanup,
  makePackageTarball,
  makeProfile,
  makeRegistryResponder,
  makeRelease,
  makeTempDir,
  readJson,
  writeJson,
} from './update-helpers.mjs';

function hostTarball(version) {
  return makePackageTarball({
    name: 'dsh-ollama-web',
    version,
    dependencies: { 'legacy-dep': '1.0.0' },
    extra: { 'package/dist/index.js': `export const version = "${version}";\n` },
  });
}

function makeService({ root, version = '1.1.0', publishedAt = '2026-10-01T00:00:00.000Z', minAge = 0, now = Date.parse('2026-10-02T00:00:00.000Z'), hostRunningDir, prefs } = {}) {
  const profile = makeProfile({ root });
  const hostBytes = hostTarball(version);
  const clientBytes = makePackageTarball({ name: 'dsh-ollama-web-client', version });
  const { host, client, target } = makeRelease({ version, hostTarball: hostBytes, clientTarball: clientBytes, publishedAt });
  const tarballs = {
    [target.host.tarball]: hostBytes,
    [target.client.tarball]: clientBytes,
  };
  const calls = [];
  const fetchImpl = makeRegistryResponder({ host, client, tarballs, calls });
  const dataDir = join(profile.profileDir, 'data', 'dsh-ollama-web');
  if (prefs !== undefined) writeJson(join(dataDir, 'update-prefs.json'), prefs);
  const service = new UpdateService({
    profile: profile.profile,
    hostPackageName: 'dsh-ollama-web',
    clientPackageName: 'dsh-ollama-web-client',
    hostPackageDir: hostRunningDir ?? profile.hostDir,
    hostRunningVersion: '1.0.0',
    dataDir,
    fetchImpl,
    registries: [REGISTRY],
    minReleaseAgeMinutes: minAge,
    now: () => now,
    autoUpdateIntervalMs: 3_600_000,
    startupDelayMs: 3_600_000,
  });
  return { profile, host, client, target, hostBytes, clientBytes, calls, service, dataDir };
}

test('status is read-only and starts with no network call', async () => {
  const root = makeTempDir();
  try {
    const ctx = makeService({ root });
    const status = await ctx.service.status();
    assert.equal(ctx.calls.length, 0);
    assert.equal(status.available, true);
    assert.equal(status.current.host, '1.0.0');
    assert.equal(status.current.client, '1.0.0');
    assert.equal(status.running.host, '1.0.0');
    assert.equal(status.state, 'unknown');
    assert.equal(status.autoUpdate, false);
    ctx.service.dispose();
  } finally {
    cleanup(root);
  }
});

test('checks the registry, caches a result, and reports an update', async () => {
  const root = makeTempDir();
  try {
    const ctx = makeService({ root });
    const status = await ctx.service.check({ fresh: true });
    assert.equal(ctx.calls.length, 2);
    assert.equal(status.latest?.host, '1.1.0');
    assert.equal(status.latest?.client, '1.1.0');
    assert.equal(status.state, 'update');
    assert.equal(status.phase, 'idle');
    assert.equal(status.busy, false);
    assert.equal(status.ageLimited, false);
    assert.equal(typeof status.checkedAt, 'string');
    const cached = await ctx.service.check({ fresh: false });
    assert.equal(ctx.calls.length, 2);
    assert.equal(cached.state, 'update');
    await ctx.service.check({ fresh: true });
    assert.equal(ctx.calls.length, 4);
    ctx.service.dispose();
  } finally {
    cleanup(root);
  }
});

test('installs both packages and reports a restart', async () => {
  const root = makeTempDir();
  try {
    const ctx = makeService({ root });
    await ctx.service.check({ fresh: true });
    const status = await ctx.service.install({ allowMajor: false });
    assert.equal(ctx.calls.length, 4);
    assert.equal(status.state, 'installed');
    assert.equal(status.phase, 'idle');
    assert.equal(status.busy, false);
    assert.equal(status.current.host, '1.1.0');
    assert.equal(status.current.client, '1.1.0');
    assert.equal(status.running.host, '1.0.0');
    assert.equal(status.staleProcess, true);
    assert.equal(status.installed?.needsRestart, true);
    assert.equal(readJson(join(ctx.profile.hostDir, 'package.json')).version, '1.1.0');
    assert.equal(readJson(join(ctx.profile.clientDir, 'package.json')).version, '1.1.0');
    assert.equal(existsSync(join(ctx.profile.hostDir, 'node_modules', 'legacy-dep', 'index.js')), true);
    const state = readJson(join(ctx.dataDir, 'update-state.json'));
    assert.equal(state.needsRestart, true);
    assert.equal(Array.isArray(state.backups), true);
    ctx.service.dispose();
  } finally {
    cleanup(root);
  }
});

test('clears needsRestart and backups after the new version starts', async () => {
  const root = makeTempDir();
  try {
    const first = makeService({ root });
    await first.service.install();
    const backups = readJson(join(first.dataDir, 'update-state.json')).backups;
    assert.equal(backups.length, 2);
    first.service.dispose();
    const next = new UpdateService({
      profile: first.profile.profile,
      hostPackageName: 'dsh-ollama-web',
      clientPackageName: 'dsh-ollama-web-client',
      hostPackageDir: first.profile.hostDir,
      hostRunningVersion: '1.1.0',
      dataDir: first.dataDir,
      registries: [REGISTRY],
      minReleaseAgeMinutes: 0,
      now: () => Date.parse('2026-10-02T00:00:00.000Z'),
      autoUpdateIntervalMs: 3_600_000,
      startupDelayMs: 3_600_000,
    });
    const status = await next.status();
    assert.equal(status.state, 'current');
    assert.equal(status.running.host, '1.1.0');
    assert.equal(status.installed, null);
    assert.equal(existsSync(backups[0]), false);
    assert.equal(existsSync(backups[1]), false);
    next.dispose();
  } finally {
    cleanup(root);
  }
});

test('respects minimumReleaseAge', async () => {
  const root = makeTempDir();
  try {
    const now = Date.parse('2026-10-01T00:30:00.000Z');
    const ctx = makeService({
      root,
      publishedAt: '2026-10-01T00:00:00.000Z',
      minAge: 60,
      now,
    });
    const status = await ctx.service.check({ fresh: true });
    assert.equal(status.state, 'age-limited');
    assert.equal(status.ageLimited, true);
    assert.equal(status.latest?.eligibleAt, '2026-10-01T01:00:00.000Z');
    await assert.rejects(ctx.service.install(), /minimumReleaseAge/);
    assert.equal(readJson(join(ctx.profile.hostDir, 'package.json')).version, '1.0.0');
    ctx.service.dispose();
  } finally {
    cleanup(root);
  }
});

test('blocks major updates until explicitly allowed', async () => {
  const root = makeTempDir();
  try {
    const ctx = makeService({ root, version: '2.0.0' });
    const status = await ctx.service.check({ fresh: true });
    assert.equal(status.state, 'major');
    await assert.rejects(ctx.service.install({ allowMajor: false }), /major updates/);
    const installed = await ctx.service.install({ allowMajor: true });
    assert.equal(installed.current.host, '2.0.0');
    assert.equal(installed.state, 'installed');
    ctx.service.dispose();
  } finally {
    cleanup(root);
  }
});

test('auto-update installs a newer same-major release', async () => {
  const root = makeTempDir();
  try {
    const ctx = makeService({
      root,
      prefs: { autoUpdate: true },
    });
    await ctx.service.runAutoUpdate();
    const status = await ctx.service.status();
    assert.equal(status.current.host, '1.1.0');
    assert.equal(status.state, 'installed');
    const state = readJson(join(ctx.dataDir, 'update-state.json'));
    assert.equal(typeof state.lastAutoUpdateAt, 'string');
    assert.equal((await readPrefs(ctx.dataDir)).autoUpdate, true);
    ctx.service.dispose();
  } finally {
    cleanup(root);
  }
});

test('setAutoUpdate persists the preference', async () => {
  const root = makeTempDir();
  try {
    const ctx = makeService({ root });
    const enabled = await ctx.service.setAutoUpdate({ enabled: true });
    assert.equal(enabled.autoUpdate, true);
    assert.deepEqual(await readPrefs(ctx.dataDir), { autoUpdate: true });
    const disabled = await ctx.service.setAutoUpdate({ enabled: false });
    assert.equal(disabled.autoUpdate, false);
    assert.deepEqual(await readPrefs(ctx.dataDir), { autoUpdate: false });
    ctx.service.dispose();
  } finally {
    cleanup(root);
  }
});

test('reports a registry failure without touching the install', async () => {
  const root = makeTempDir();
  try {
    const profile = makeProfile({ root });
    const service = new UpdateService({
      profile: profile.profile,
      hostPackageName: 'dsh-ollama-web',
      clientPackageName: 'dsh-ollama-web-client',
      hostPackageDir: profile.hostDir,
      hostRunningVersion: '1.0.0',
      dataDir: join(profile.profileDir, 'data', 'dsh-ollama-web'),
      fetchImpl: async () => new Response('bad', { status: 500 }),
      registries: [REGISTRY],
      minReleaseAgeMinutes: 0,
      now: Date.now,
      autoUpdateIntervalMs: 3_600_000,
      startupDelayMs: 3_600_000,
    });
    await assert.rejects(service.check({ fresh: true }), /rejected/);
    const status = await service.status();
    assert.equal(status.error?.code, 'registry-status');
    assert.equal(readJson(join(profile.hostDir, 'package.json')).version, '1.0.0');
    service.dispose();
  } finally {
    cleanup(root);
  }
});
