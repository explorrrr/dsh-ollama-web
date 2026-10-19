import {
  acquireUpdateLock,
  cleanupStaleUpdateLock,
} from './lock.js';
import {
  cleanupBackups,
  cleanupStaleArtifacts,
  detectInstalls,
  installRelease,
} from './install.js';
import { toUpdateError, UpdateFailure } from './errors.js';
import {
  NPM_REGISTRY,
  NPMMIRROR_REGISTRY,
  checkRelease,
  readMinimumReleaseAge,
} from './registry.js';
import { compareVersions, sameMajor } from './semver.js';
import { readPrefs, readState, writePrefs, writeState } from './state.js';
import type {
  InstalledSnapshot,
  ReleaseTarget,
  StoredUpdateState,
  UpdateError,
  UpdatePhase,
  UpdatePrefs,
  UpdateState,
  UpdateStatus,
} from './types.js';

const CHECK_CACHE_MS = 60 * 60_000;
const DEFAULT_AUTO_UPDATE_INTERVAL_MS = 6 * 60 * 60_000;
const DEFAULT_STARTUP_DELAY_MS = 60_000;

export interface UpdateServiceOptions {
  readonly profile: {
    readonly dir: string;
    readonly name: string;
    readonly profilesRoot: string;
    readonly restartKind: 'app' | 'host';
  };
  readonly hostPackageName: string;
  readonly clientPackageName: string;
  readonly hostPackageDir: string;
  readonly hostRunningVersion: string;
  readonly dataDir: string;
  readonly fetchImpl?: typeof fetch;
  readonly now?: () => number;
  readonly logger?: (message: string, error?: unknown) => void;
  readonly registries?: readonly string[];
  readonly minReleaseAgeMinutes?: number;
  readonly autoUpdateIntervalMs?: number;
  readonly startupDelayMs?: number;
  readonly allowInsecureLocalhostRegistry?: boolean;
  readonly checkCacheMs?: number;
}

interface AgeInfo {
  readonly eligibleAt: string | null;
  readonly ageLimited: boolean;
  readonly ageUnknown: boolean;
}

interface LatestView {
  readonly host: string;
  readonly client: string;
  readonly publishedAt: string | null;
  readonly eligibleAt: string | null;
  readonly releaseUrl: string;
  readonly provenance: boolean;
}

export class UpdateService {
  private readonly options: UpdateServiceOptions;
  private readonly abort = new AbortController();
  private readonly ready: Promise<void>;
  private prefs: UpdatePrefs = { autoUpdate: false };
  private state: StoredUpdateState = { schemaVersion: 1 };
  private installs: InstalledSnapshot | null = null;
  private latestTarget: ReleaseTarget | null = null;
  private checkedAt: string | null = null;
  private lastError: UpdateError | null = null;
  private phase: UpdatePhase = 'idle';
  private checkPromise: Promise<UpdateStatus> | null = null;
  private installPromise: Promise<UpdateStatus> | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private startupTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private minAgeMinutes: number;

  constructor(options: UpdateServiceOptions) {
    this.options = options;
    this.minAgeMinutes = options.minReleaseAgeMinutes ?? 60;
    this.ready = this.init();
  }

  private async init(): Promise<void> {
    this.minAgeMinutes = this.options.minReleaseAgeMinutes
      ?? await readMinimumReleaseAge(this.options.profile.dir);
    this.prefs = await readPrefs(this.options.dataDir);
    await cleanupStaleUpdateLock(this.options.dataDir, this.now()).catch(() => undefined);
    this.state = await readState(this.options.dataDir);
    this.installs = detectInstalls(
      this.options.profile,
      this.options.hostPackageDir,
      this.options.hostPackageName,
      this.options.clientPackageName,
    );
    this.checkedAt = this.state.lastCheckAt ?? null;
    this.lastError = this.state.lastError ?? null;
    const hostVersion = this.installs.host.version;
    const clientVersion = this.installs.client.version;
    if (
      this.state.needsRestart === true
      && hostVersion !== null
      && this.state.installed !== undefined
      && this.state.installed.host === hostVersion
      && this.state.installed.client === (clientVersion ?? '')
    ) {
      this.state.needsRestart = false;
      delete this.state.installed;
      delete this.state.installedAt;
      if (this.state.backups !== undefined) {
        await cleanupBackups(this.options.profile, this.state.backups).catch(() => undefined);
      }
      delete this.state.backups;
      await this.persistState();
    }
    await cleanupStaleArtifacts(
      this.options.profile,
      [...this.installs.host.dirs, ...this.installs.client.dirs],
      this.now(),
    ).catch(() => undefined);
    if (this.prefs.autoUpdate) this.startTimers();
  }

  private now(): number {
    return (this.options.now ?? Date.now)();
  }

  private fetchImpl(): typeof fetch {
    return this.options.fetchImpl ?? fetch;
  }

  private log(message: string, error?: unknown): void {
    this.options.logger?.(message, error);
  }

  private requireInstalls(): InstalledSnapshot {
    if (this.installs === null) {
      throw new UpdateFailure('unavailable', 'update service is not initialized');
    }
    return this.installs;
  }

  private ageInfo(publishedAt: string | null, eligibleAt: string | null): AgeInfo {
    if (publishedAt === null) {
      return { eligibleAt, ageLimited: false, ageUnknown: true };
    }
    const published = Date.parse(publishedAt);
    if (!Number.isFinite(published)) {
      return { eligibleAt, ageLimited: false, ageUnknown: true };
    }
    const eligible = new Date(published + this.minAgeMinutes * 60_000).toISOString();
    return {
      eligibleAt: eligible,
      ageLimited: Date.parse(eligible) > this.now(),
      ageUnknown: false,
    };
  }

  private latestFromTarget(target: ReleaseTarget): LatestView {
    const age = this.ageInfo(target.publishedAt, target.eligibleAt);
    return {
      host: target.host.version,
      client: target.client.version,
      publishedAt: target.publishedAt,
      eligibleAt: age.eligibleAt,
      releaseUrl: target.releaseUrl,
      provenance: target.provenance,
    };
  }

  private latestFromState(): LatestView | null {
    const latest = this.state.latest;
    if (latest === undefined) return null;
    const age = this.ageInfo(latest.publishedAt, latest.eligibleAt);
    return {
      host: latest.host,
      client: latest.client,
      publishedAt: latest.publishedAt,
      eligibleAt: age.eligibleAt,
      releaseUrl: latest.releaseUrl,
      provenance: latest.provenance,
    };
  }

  private latestView(): LatestView | null {
    return this.latestTarget === null ? this.latestFromState() : this.latestFromTarget(this.latestTarget);
  }

  private stateOf(
    installs: InstalledSnapshot,
    latest: LatestView | null,
    age: AgeInfo,
  ): UpdateState {
    if (installs.host.linked || installs.client.linked) return 'linked';
    if (installs.host.version === null || installs.host.dirs.length === 0) return 'unavailable';
    if (this.state.needsRestart === true) return 'installed';
    if (latest === null) return 'unknown';
    const hostCompare = compareVersions(latest.host, installs.host.version);
    const clientCompare = installs.client.version === null
      ? 0
      : compareVersions(latest.client, installs.client.version);
    if (hostCompare < 0 || clientCompare < 0) return 'ahead';
    if (installs.client.version !== null && installs.host.version !== installs.client.version) {
      return 'mismatch';
    }
    if (age.ageLimited) return 'age-limited';
    if (hostCompare > 0 || clientCompare > 0) {
      return sameMajor(latest.host, installs.host.version) ? 'update' : 'major';
    }
    return 'current';
  }

  private buildStatus(): UpdateStatus {
    const installs = this.installs;
    if (installs === null) {
      return {
        available: false,
        profile: { name: this.options.profile.name, restartKind: this.options.profile.restartKind },
        running: { host: this.options.hostRunningVersion },
        current: { host: null, client: null },
        latest: null,
        state: 'unavailable',
        phase: this.phase,
        checkedAt: this.checkedAt,
        autoUpdate: this.prefs.autoUpdate,
        installed: null,
        error: this.lastError ?? { code: 'unavailable', message: 'update service is not initialized' },
        busy: this.phase !== 'idle',
        ageLimited: false,
        ageUnknown: false,
        staleProcess: false,
        versionsMatch: true,
        clientInstalled: false,
      };
    }
    const latest = this.latestView();
    const age = latest === null
      ? { eligibleAt: null, ageLimited: false, ageUnknown: false }
      : this.ageInfo(latest.publishedAt, latest.eligibleAt);
    const installed = this.state.installed === undefined
      ? null
      : {
        version: this.state.installed.host,
        at: this.state.installedAt ?? null,
        needsRestart: this.state.needsRestart === true,
      };
    return {
      available: true,
      profile: { name: this.options.profile.name, restartKind: this.options.profile.restartKind },
      running: { host: this.options.hostRunningVersion },
      current: { host: installs.host.version, client: installs.client.version },
      latest,
      state: this.stateOf(installs, latest, age),
      phase: this.phase,
      checkedAt: this.checkedAt,
      autoUpdate: this.prefs.autoUpdate,
      installed,
      error: this.lastError ?? this.state.lastError ?? null,
      busy: this.phase !== 'idle',
      ageLimited: age.ageLimited,
      ageUnknown: age.ageUnknown,
      staleProcess: installs.host.version !== null && this.options.hostRunningVersion !== installs.host.version,
      versionsMatch: installs.host.version === null
        || installs.client.version === null
        || installs.host.version === installs.client.version,
      clientInstalled: installs.client.version !== null,
    };
  }

  async status(): Promise<UpdateStatus> {
    await this.ready;
    return this.buildStatus();
  }

  private cacheUsable(): boolean {
    if (this.checkedAt === null) return false;
    const checked = Date.parse(this.checkedAt);
    if (!Number.isFinite(checked)) return false;
    if (this.now() - checked > (this.options.checkCacheMs ?? CHECK_CACHE_MS)) return false;
    return this.latestTarget !== null || this.state.latest !== undefined;
  }

  async check(options: { readonly fresh?: boolean } = {}): Promise<UpdateStatus> {
    await this.ready;
    if (this.disposed) throw new UpdateFailure('unavailable', 'update service is disposed');
    if (this.phase === 'installing') throw new UpdateFailure('busy', 'an update is already installing');
    if (this.checkPromise !== null) return this.checkPromise;
    if (options.fresh !== true && this.cacheUsable()) return this.buildStatus();
    this.phase = 'checking';
    const promise = (async () => {
      try {
        await this.doCheck();
      } finally {
        this.checkPromise = null;
        if (this.phase === 'checking') this.phase = 'idle';
      }
      return this.buildStatus();
    })();
    this.checkPromise = promise;
    return promise;
  }

  private async doCheck(): Promise<UpdateStatus> {
    try {
      const target = await checkRelease(
        [this.options.hostPackageName, this.options.clientPackageName],
        {
          fetchImpl: this.fetchImpl(),
          registries: this.options.registries ?? [NPM_REGISTRY, NPMMIRROR_REGISTRY],
          minReleaseAgeMinutes: this.minAgeMinutes,
          now: this.now(),
          signal: this.abort.signal,
          ...(this.options.allowInsecureLocalhostRegistry === true
            ? { allowInsecureLocalhost: true }
            : {}),
        },
      );
      this.latestTarget = target;
      this.checkedAt = new Date(this.now()).toISOString();
      this.lastError = null;
      this.state.lastCheckAt = this.checkedAt;
      this.state.latest = {
        host: target.host.version,
        client: target.client.version,
        publishedAt: target.publishedAt,
        eligibleAt: target.eligibleAt,
        releaseUrl: target.releaseUrl,
        provenance: target.provenance,
      };
      delete this.state.lastError;
      await this.persistState();
      return this.buildStatus();
    } catch (error) {
      const failure = toUpdateError(error);
      this.lastError = failure;
      this.state.lastError = failure;
      await this.persistState();
      throw error;
    }
  }

  async install(options: { readonly allowMajor?: boolean } = {}): Promise<UpdateStatus> {
    await this.ready;
    if (this.installPromise !== null) return this.installPromise;
    if (this.disposed) throw new UpdateFailure('unavailable', 'update service is disposed');
    const promise = (async () => {
      try {
        await this.doInstall(options.allowMajor === true);
      } finally {
        this.installPromise = null;
        if (this.phase === 'installing') this.phase = 'idle';
      }
      return this.buildStatus();
    })();
    this.installPromise = promise;
    return promise;
  }

  private async doInstall(allowMajor: boolean): Promise<UpdateStatus> {
    let installs = this.requireInstalls();
    if (installs.host.linked || installs.client.linked) {
      throw new UpdateFailure('linked', 'linked development installs cannot be updated from the card');
    }
    if (installs.host.dirs.length === 0 || installs.host.version === null) {
      throw new UpdateFailure('no-install', 'the host package is not installed in this profile');
    }
    const checkedAt = this.checkedAt === null ? Number.NaN : Date.parse(this.checkedAt);
    const stale = !Number.isFinite(checkedAt)
      || this.now() - checkedAt > (this.options.checkCacheMs ?? CHECK_CACHE_MS);
    if (this.latestTarget === null || stale) {
      await this.check({ fresh: true });
    }
    if (this.latestTarget === null) {
      await this.check({ fresh: true });
    }
    const target = this.latestTarget;
    if (target === null) throw new UpdateFailure('no-update', 'no release is available');
    const age = this.ageInfo(target.publishedAt, target.eligibleAt);
    if (age.ageLimited) {
      throw new UpdateFailure('age-limited', 'the release is newer than the profile minimumReleaseAge');
    }
    const currentHost = installs.host.version;
    if (currentHost === null) throw new UpdateFailure('no-install', 'the host package has no readable version');
    const hostCompare = compareVersions(target.version, currentHost);
    const clientCompare = installs.client.version === null
      ? 0
      : compareVersions(target.version, installs.client.version);
    if (hostCompare < 0 || clientCompare < 0) {
      throw new UpdateFailure('no-update', 'the installed version is ahead of the latest release');
    }
    if (
      hostCompare === 0
      && clientCompare === 0
      && this.state.needsRestart !== true
    ) {
      throw new UpdateFailure('no-update', 'the installed version is already current');
    }
    if (!sameMajor(target.version, currentHost) && !allowMajor) {
      throw new UpdateFailure('major-blocked', 'major updates require an explicit confirmation');
    }
    const lock = await acquireUpdateLock(this.options.dataDir, this.now());
    this.phase = 'installing';
    try {
      const result = await installRelease({
        target,
        profile: this.options.profile,
        hostPackageName: this.options.hostPackageName,
        clientPackageName: this.options.clientPackageName,
        hostRunningDir: this.options.hostPackageDir,
        fetchImpl: this.fetchImpl(),
        signal: this.abort.signal,
      });
      this.installs = detectInstalls(
        this.options.profile,
        this.options.hostPackageDir,
        this.options.hostPackageName,
        this.options.clientPackageName,
      );
      installs = this.installs;
      this.checkedAt = new Date(this.now()).toISOString();
      this.state.lastCheckAt = this.checkedAt;
      this.state.installed = {
        host: result.host,
        client: result.client ?? installs.client.version ?? '',
      };
      this.state.installedAt = this.checkedAt;
      this.state.needsRestart = true;
      this.state.backups = result.backups;
      this.latestTarget = target;
      this.lastError = null;
      delete this.state.lastError;
      await this.persistState();
      return this.buildStatus();
    } catch (error) {
      const failure = toUpdateError(error);
      this.lastError = failure;
      this.state.lastError = failure;
      await this.persistState();
      throw error;
    } finally {
      await lock.release().catch(() => undefined);
    }
  }

  async setAutoUpdate(options: { readonly enabled: boolean }): Promise<UpdateStatus> {
    await this.ready;
    const enabled = options.enabled === true;
    const installs = this.requireInstalls();
    if (enabled && (installs.host.linked || installs.client.linked)) {
      throw new UpdateFailure('linked', 'linked development installs cannot use auto-update');
    }
    if (enabled && installs.host.dirs.length === 0) {
      throw new UpdateFailure('no-install', 'the host package is not installed in this profile');
    }
    this.phase = 'saving';
    try {
      await writePrefs(this.options.dataDir, { autoUpdate: enabled });
      this.prefs = { autoUpdate: enabled };
    } finally {
      if (this.phase === 'saving') this.phase = 'idle';
    }
    if (enabled) {
      this.startTimers();
      void this.runAutoUpdate().catch(() => undefined);
    } else {
      this.stopTimers();
    }
    return this.buildStatus();
  }

  private startTimers(): void {
    this.stopTimers();
    if (this.disposed) return;
    const delay = this.options.startupDelayMs ?? DEFAULT_STARTUP_DELAY_MS;
    const jitter = Math.floor(Math.random() * Math.max(1, delay));
    this.startupTimer = setTimeout(() => {
      this.startupTimer = null;
      void this.runAutoUpdate();
    }, delay + jitter);
    this.startupTimer.unref?.();
    this.timer = setInterval(() => {
      void this.runAutoUpdate();
    }, this.options.autoUpdateIntervalMs ?? DEFAULT_AUTO_UPDATE_INTERVAL_MS);
    this.timer.unref?.();
  }

  private stopTimers(): void {
    if (this.startupTimer !== null) {
      clearTimeout(this.startupTimer);
      this.startupTimer = null;
    }
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runAutoUpdate(): Promise<void> {
    await this.ready;
    if (this.disposed || !this.prefs.autoUpdate || this.phase === 'installing') return;
    try {
      await this.check({ fresh: true });
    } catch {
      return;
    }
    const target = this.latestTarget;
    if (target === null) return;
    const installs = this.requireInstalls();
    if (installs.host.linked || installs.client.linked || installs.host.version === null) return;
    const age = this.ageInfo(target.publishedAt, target.eligibleAt);
    if (age.ageLimited || age.ageUnknown) return;
    if (!sameMajor(target.version, installs.host.version)) return;
    const hostCompare = compareVersions(target.version, installs.host.version);
    const clientCompare = installs.client.version === null
      ? 0
      : compareVersions(target.version, installs.client.version);
    const needsHost = hostCompare > 0;
    const needsClient = installs.client.version !== null && clientCompare > 0;
    if (!needsHost && !needsClient) return;
    try {
      await this.install({ allowMajor: false });
    } catch (error) {
      this.log('auto-update failed', error);
    } finally {
      this.state.lastAutoUpdateAt = new Date(this.now()).toISOString();
      await this.persistState();
    }
  }

  private async persistState(): Promise<void> {
    try {
      await writeState(this.options.dataDir, this.state);
    } catch (error) {
      this.log('could not persist update state', error);
    }
  }

  dispose(): void {
    this.disposed = true;
    this.stopTimers();
    this.abort.abort();
  }
}
