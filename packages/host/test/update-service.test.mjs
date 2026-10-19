import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { UpdateService } from '../dist/update/service.js';
import { journalPath, readPrefs, writeJournal } from '../dist/update/state.js';
import {
  PACKAGE_NAME,
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

function packageTarball(version) {
  return makePackageTarball({
    version,
    dependencies: { 'legacy-dep': '1.0.0' },
    extra: { 'package/dist/index.js': `export const version = "${version}";\n` },
  });
}

function makeService({
  root,
  version = '1.1.0',
  publishedAt = '2026-10-01T00:00:00.000Z',
  minAge,
  profileMinimumReleaseAge = 0,
  now = Date.parse('2026-10-02T00:00:00.000Z'),
  runningDir,
  prefs,
  dshVersion = '0.2.1-rc.2',
  dshRange = '>=0.2.1-rc.1 <0.3.0',
} = {}) {
  const profile = makeProfile({ root, minimumReleaseAge: profileMinimumReleaseAge });
  const bytes = packageTarball(version);
  const { pkg, target } = makeRelease({ version, tarball: bytes, publishedAt, dshRange });
  const tarballs = { [target.pkg.tarball]: bytes };
  const calls = [];
  const fetchImpl = makeRegistryResponder({ pkg, tarballs, calls });
  const dataDir = join(profile.profileDir, 'data', 'dsh-ollama-web');
  if (prefs !== undefined) writeJson(join(dataDir, 'update-prefs.json'), prefs);
  const service = new UpdateService({
    profile: profile.profile,
    packageName: PACKAGE_NAME,
    packageDir: runningDir ?? profile.packageDir,
    runningVersion: '1.0.0',
    dshVersion,
    dataDir,
    fetchImpl,
    registries: [REGISTRY],
    ...(minAge === undefined ? {} : { minReleaseAgeMinutes: minAge }),
    now: () => now,
    autoUpdateIntervalMs: 3_600_000,
    startupDelayMs: 3_600_000,
  });
  return { profile, pkg, target, bytes, calls, service, dataDir };
}

test('status is read-only and starts with no network call', async () => {
  const root = makeTempDir();
  try {
    const ctx = makeService({ root });
    const status = await ctx.service.status();
    assert.equal(ctx.calls.length, 0);
    assert.equal(status.available, true);
    assert.equal(status.current, '1.0.0');
    assert.equal(status.running, '1.0.0');
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
    assert.equal(ctx.calls.length, 1);
    assert.equal(status.latest?.version, '1.1.0');
    assert.equal(status.state, 'update');
    assert.equal(status.compatibility.dsh, '0.2.1-rc.2');
    assert.equal(status.compatibility.range, '>=0.2.1-rc.1 <0.3.0');
    assert.equal(status.compatibility.state, 'compatible');
    assert.equal(status.phase, 'idle');
    assert.equal(status.busy, false);
    assert.equal(status.ageLimited, false);
    assert.equal(typeof status.checkedAt, 'string');
    const cached = await ctx.service.check({ fresh: false });
    assert.equal(ctx.calls.length, 1);
    assert.equal(cached.state, 'update');
    await ctx.service.check({ fresh: true });
    assert.equal(ctx.calls.length, 2);
    ctx.service.dispose();
  } finally {
    cleanup(root);
  }
});

test('installs the package and reports a restart', async () => {
  const root = makeTempDir();
  try {
    const ctx = makeService({ root });
    await ctx.service.check({ fresh: true });
    const status = await ctx.service.install({ allowMajor: false });
    assert.equal(ctx.calls.length, 2);
    assert.equal(status.state, 'installed');
    assert.equal(status.phase, 'idle');
    assert.equal(status.busy, false);
    assert.equal(status.current, '1.1.0');
    assert.equal(status.running, '1.0.0');
    assert.equal(status.staleProcess, true);
    assert.equal(status.installed?.needsRestart, true);
    assert.equal(readJson(join(ctx.profile.packageDir, 'package.json')).version, '1.1.0');
    assert.equal(existsSync(join(ctx.profile.packageDir, 'client.js')), true);
    assert.equal(existsSync(join(ctx.profile.packageDir, 'node_modules', 'legacy-dep', 'index.js')), true);
    const state = readJson(join(ctx.dataDir, 'update-state.json'));
    assert.equal(state.schemaVersion, 2);
    assert.equal(state.installed.version, '1.1.0');
    assert.equal(state.latest.dshRange, '>=0.2.1-rc.1 <0.3.0');
    assert.equal(state.needsRestart, true);
    assert.equal(Array.isArray(state.backups), true);
    assert.equal(state.backups.length, 1);
    assert.equal(existsSync(join(ctx.dataDir, 'update.lock')), false);
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
    assert.equal(backups.length, 1);
    first.service.dispose();
    const next = new UpdateService({
      profile: first.profile.profile,
      packageName: PACKAGE_NAME,
      packageDir: first.profile.packageDir,
      runningVersion: '1.1.0',
      dataDir: first.dataDir,
      registries: [REGISTRY],
      minReleaseAgeMinutes: 0,
      now: () => Date.parse('2026-10-02T00:00:00.000Z'),
      autoUpdateIntervalMs: 3_600_000,
      startupDelayMs: 3_600_000,
    });
    const status = await next.status();
    assert.equal(status.state, 'current');
    assert.equal(status.running, '1.1.0');
    assert.equal(status.installed, null);
    assert.equal(existsSync(backups[0]), false);
    next.dispose();
  } finally {
    cleanup(root);
  }
});

test('does not wait when minimumReleaseAge is absent', async () => {
  const root = makeTempDir();
  try {
    const now = Date.parse('2026-10-01T00:00:00.000Z');
    const ctx = makeService({
      root,
      profileMinimumReleaseAge: undefined,
      publishedAt: '2026-10-01T00:00:00.000Z',
      now,
      prefs: { autoUpdate: true },
    });
    const status = await ctx.service.check({ fresh: true });
    assert.equal(status.state, 'update');
    assert.equal(status.ageLimited, false);
    assert.equal(status.ageUnknown, false);
    assert.equal(status.latest?.eligibleAt, '2026-10-01T00:00:00.000Z');
    await ctx.service.runAutoUpdate();
    const installed = await ctx.service.status();
    assert.equal(installed.current, '1.1.0');
    assert.equal(installed.state, 'installed');
    ctx.service.dispose();
  } finally {
    cleanup(root);
  }
});

test('respects an explicitly configured minimumReleaseAge', async () => {
  const root = makeTempDir();
  try {
    const now = Date.parse('2026-10-01T00:30:00.000Z');
    const ctx = makeService({
      root,
      profileMinimumReleaseAge: 60,
      publishedAt: '2026-10-01T00:00:00.000Z',
      now,
      prefs: { autoUpdate: true },
    });
    const status = await ctx.service.check({ fresh: true });
    assert.equal(status.state, 'age-limited');
    assert.equal(status.ageLimited, true);
    assert.equal(status.ageUnknown, false);
    assert.equal(status.latest?.eligibleAt, '2026-10-01T01:00:00.000Z');
    await assert.rejects(ctx.service.install(), /minimumReleaseAge/);
    await ctx.service.runAutoUpdate();
    assert.equal((await ctx.service.status()).current, '1.0.0');
    assert.equal(readJson(join(ctx.profile.packageDir, 'package.json')).version, '1.0.0');
    ctx.service.dispose();
  } finally {
    cleanup(root);
  }
});

test('pauses auto-update for an unknown release age when an age is configured', async () => {
  const root = makeTempDir();
  try {
    const ctx = makeService({
      root,
      profileMinimumReleaseAge: 60,
      publishedAt: null,
      prefs: { autoUpdate: true },
    });
    const status = await ctx.service.check({ fresh: true });
    assert.equal(status.ageUnknown, true);
    assert.equal(status.ageLimited, false);
    await ctx.service.runAutoUpdate();
    assert.equal((await ctx.service.status()).current, '1.0.0');
    const installed = await ctx.service.install();
    assert.equal(installed.current, '1.1.0');
    ctx.service.dispose();
  } finally {
    cleanup(root);
  }
});

test('does not pause auto-update for an unknown release age without an age setting', async () => {
  const root = makeTempDir();
  try {
    const ctx = makeService({
      root,
      profileMinimumReleaseAge: undefined,
      publishedAt: null,
      prefs: { autoUpdate: true },
    });
    const status = await ctx.service.check({ fresh: true });
    assert.equal(status.ageUnknown, false);
    assert.equal(status.ageLimited, false);
    await ctx.service.runAutoUpdate();
    assert.equal((await ctx.service.status()).current, '1.1.0');
    ctx.service.dispose();
  } finally {
    cleanup(root);
  }
});

test('blocks major updates until explicitly allowed', async () => {
  const root = makeTempDir();
  try {
    const ctx = makeService({ root, version: '3.0.0' });
    const status = await ctx.service.check({ fresh: true });
    assert.equal(status.state, 'major');
    await assert.rejects(ctx.service.install({ allowMajor: false }), /major updates/);
    const installed = await ctx.service.install({ allowMajor: true });
    assert.equal(installed.current, '3.0.0');
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
    assert.equal(status.current, '1.1.0');
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

test('recovers an interrupted update before reporting status', async () => {
  const root = makeTempDir();
  try {
    const profile = makeProfile({ root, version: '1.0.0' });
    const dataDir = join(profile.profileDir, 'data', 'dsh-ollama-web');
    const backupDir = join(dirname(profile.packageDir), `.dsh-ollama-web-bak-${PACKAGE_NAME}-test`);
    const stageDir = join(dirname(profile.packageDir), `.dsh-ollama-web-next-${PACKAGE_NAME}-test`);
    cpSync(profile.packageDir, backupDir, { recursive: true });
    writeJson(join(profile.packageDir, 'package.json'), { name: PACKAGE_NAME, version: '1.1.0' });
    mkdirSync(stageDir, { recursive: true });
    await writeJournal(dataDir, {
      schemaVersion: 1,
      id: 'service-recovery',
      startedAt: new Date().toISOString(),
      targets: [{
        packageName: PACKAGE_NAME,
        targetDir: profile.packageDir,
        stageDir,
        backupDir,
      }],
    });
    const service = new UpdateService({
      profile: profile.profile,
      packageName: PACKAGE_NAME,
      packageDir: profile.packageDir,
      runningVersion: '1.0.0',
      dataDir,
      registries: [REGISTRY],
      minReleaseAgeMinutes: 0,
      now: () => Date.parse('2026-10-02T00:00:00.000Z'),
      autoUpdateIntervalMs: 3_600_000,
      startupDelayMs: 3_600_000,
    });
    const status = await service.status();
    assert.equal(status.current, '1.0.0');
    assert.match(status.error?.message ?? '', /interruption/);
    assert.equal(existsSync(journalPath(dataDir)), false);
    assert.equal(existsSync(stageDir), false);
    service.dispose();
  } finally {
    cleanup(root);
  }
});

test('refuses to install while another process holds the profile lock', async () => {
  const root = makeTempDir();
  try {
    const ctx = makeService({ root });
    writeJson(join(ctx.dataDir, 'update.lock'), {
      schemaVersion: 1,
      token: 'other-process',
      pid: process.pid,
      startedAt: new Date().toISOString(),
    });
    await assert.rejects(ctx.service.install(), /another update/);
    assert.equal(readJson(join(ctx.profile.packageDir, 'package.json')).version, '1.0.0');
    ctx.service.dispose();
  } finally {
    cleanup(root);
  }
});

test('reports a release that excludes the running DSH and blocks installs', async () => {
  const root = makeTempDir();
  try {
    const ctx = makeService({
      root,
      dshVersion: '0.3.0-rc.1',
      prefs: { autoUpdate: true },
    });
    const status = await ctx.service.check({ fresh: true });
    assert.equal(status.state, 'incompatible');
    assert.equal(status.compatibility.dsh, '0.3.0-rc.1');
    assert.equal(status.compatibility.range, '>=0.2.1-rc.1 <0.3.0');
    assert.equal(status.compatibility.state, 'incompatible');
    await assert.rejects(ctx.service.install(), /running DSH/);
    await ctx.service.runAutoUpdate();
    assert.equal((await ctx.service.status()).current, '1.0.0');
    assert.equal(readJson(join(ctx.profile.packageDir, 'package.json')).version, '1.0.0');
    ctx.service.dispose();
  } finally {
    cleanup(root);
  }
});

test('pauses auto-update when the running DSH version is unknown', async () => {
  const root = makeTempDir();
  try {
    const ctx = makeService({
      root,
      dshVersion: null,
      prefs: { autoUpdate: true },
    });
    const status = await ctx.service.check({ fresh: true });
    assert.equal(status.state, 'update');
    assert.equal(status.compatibility.dsh, null);
    assert.equal(status.compatibility.state, 'unknown');
    await ctx.service.runAutoUpdate();
    assert.equal((await ctx.service.status()).current, '1.0.0');
    const installed = await ctx.service.install();
    assert.equal(installed.current, '1.1.0');
    ctx.service.dispose();
  } finally {
    cleanup(root);
  }
});

test('pauses auto-update when the release declares no DSH range', async () => {
  const root = makeTempDir();
  try {
    const ctx = makeService({
      root,
      dshRange: null,
      prefs: { autoUpdate: true },
    });
    const status = await ctx.service.check({ fresh: true });
    assert.equal(status.state, 'update');
    assert.equal(status.compatibility.range, null);
    assert.equal(status.compatibility.state, 'unknown');
    await ctx.service.runAutoUpdate();
    assert.equal((await ctx.service.status()).current, '1.0.0');
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
      packageName: PACKAGE_NAME,
      packageDir: profile.packageDir,
      runningVersion: '1.0.0',
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
    assert.equal(readJson(join(profile.packageDir, 'package.json')).version, '1.0.0');
    service.dispose();
  } finally {
    cleanup(root);
  }
});
