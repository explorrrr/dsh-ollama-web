import {
  acquireUpdateLock,
  cleanupStaleUpdateLock,
  tryAcquireUpdateLock,
} from './lock.js';
import {
  cleanupBackups,
  cleanupStaleArtifacts,
  detectPackageInstall,
  installRelease,
  recoverInterruptedInstall,
} from './install.js';
import { toUpdateError, UpdateFailure } from './errors.js';
import {
  NPM_REGISTRY,
  NPMMIRROR_REGISTRY,
  checkRelease,
  readMinimumReleaseAge,
} from './registry.js';
import { readProfileRecords, reconcileProfileRecords } from './records.js';
import { compareVersions, parseVersion, sameMajor, satisfiesRange } from './semver.js';
import { readDshVersion } from './dsh.js';
import { readPrefs, readState, writePrefs, writeState } from './state.js';
import type {
  DshCompatibility,
  PackageInstall,
  ProfileRecordState,
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
  readonly packageName: string;
  readonly packageDir: string;
  readonly runningVersion: string;
  /** The running DSH release; omit to read it from the host environment. */
  readonly dshVersion?: string | null;
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
  readonly version: string;
  readonly publishedAt: string | null;
  readonly eligibleAt: string | null;
  readonly releaseUrl: string;
  readonly provenance: boolean;
  readonly dshRange: string | null;
}

function normalizeDshVersion(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const parsed = parseVersion(value);
  return parsed === undefined ? null : parsed.raw;
}

function neutralRecords(message: string | null = null): ProfileRecordState {
  return {
    declaredSpecifier: null,
    declaredVersion: null,
    lockedVersion: null,
    mismatch: false,
    message,
  };
}

export class UpdateService {
  private readonly options: UpdateServiceOptions;
  private readonly abort = new AbortController();
  private readonly ready: Promise<void>;
  private readonly dshVersion: string | null;
  private prefs: UpdatePrefs = { autoUpdate: false };
  private state: StoredUpdateState = { schemaVersion: 2 };
  private installs: PackageInstall | null = null;
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
    this.dshVersion = options.dshVersion === undefined
      ? readDshVersion()
      : normalizeDshVersion(options.dshVersion);
    this.minAgeMinutes = options.minReleaseAgeMinutes ?? 0;
    this.ready = this.init();
  }

  private async init(): Promise<void> {
    this.minAgeMinutes = this.options.minReleaseAgeMinutes
      ?? await readMinimumReleaseAge(this.options.profile.dir);
    this.prefs = await readPrefs(this.options.dataDir);
    await cleanupStaleUpdateLock(this.options.dataDir, this.now()).catch(() => undefined);
    let recovered = false;
    const recoveryLock = await tryAcquireUpdateLock(this.options.dataDir, this.now()).catch(() => undefined);
    if (recoveryLock !== undefined) {
      try {
        recovered = await recoverInterruptedInstall(this.options.profile, this.options.dataDir);
      } catch (error) {
        this.log('could not recover an interrupted update', error);
      } finally {
        await recoveryLock.release().catch(() => undefined);
      }
    }
    this.state = await readState(this.options.dataDir);
    this.installs = detectPackageInstall(
      this.options.profile,
      this.options.packageName,
      [this.options.packageDir],
    );
    this.checkedAt = this.state.lastCheckAt ?? null;
    this.lastError = recovered
      ? { code: 'install-failed', message: 'a previous update was rolled back after an interruption' }
      : this.state.lastError ?? null;
    const version = this.installs.version;
    if (
      this.state.needsRestart === true
      && version !== null
      && this.state.installed !== undefined
      && this.state.installed.version === version
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
    if (!this.installs.linked) {
      const records = readProfileRecords(
        this.options.profile.dir,
        this.options.packageName,
        this.installs.version,
      );
      if (records.message !== null) this.log(`ollama-web: ${records.message}`);
    }
    await cleanupStaleArtifacts(
      this.options.profile,
      this.installs.dirs,
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

  private requireInstall(): PackageInstall {
    if (this.installs === null) {
      throw new UpdateFailure('unavailable', 'update service is not initialized');
    }
    return this.installs;
  }

  private ageInfo(publishedAt: string | null, eligibleAt: string | null): AgeInfo {
    // Publish times matter only when the profile explicitly configures an age
    // requirement. Without one, a missing or invalid time must not block an
    // otherwise valid update.
    if (publishedAt === null) {
      return { eligibleAt, ageLimited: false, ageUnknown: this.minAgeMinutes > 0 };
    }
    const published = Date.parse(publishedAt);
    if (!Number.isFinite(published)) {
      return { eligibleAt, ageLimited: false, ageUnknown: this.minAgeMinutes > 0 };
    }
    const eligible = new Date(published + this.minAgeMinutes * 60_000).toISOString();
    return {
      eligibleAt: eligible,
      ageLimited: this.minAgeMinutes > 0 && Date.parse(eligible) > this.now(),
      ageUnknown: false,
    };
  }

  private latestFromTarget(target: ReleaseTarget): LatestView {
    const age = this.ageInfo(target.publishedAt, target.eligibleAt);
    return {
      version: target.version,
      publishedAt: target.publishedAt,
      eligibleAt: age.eligibleAt,
      releaseUrl: target.releaseUrl,
      provenance: target.provenance,
      dshRange: target.pkg.dshRange,
    };
  }

  private latestFromState(): LatestView | null {
    const latest = this.state.latest;
    if (latest === undefined) return null;
    const age = this.ageInfo(latest.publishedAt, latest.eligibleAt);
    return {
      version: latest.version,
      publishedAt: latest.publishedAt,
      eligibleAt: age.eligibleAt,
      releaseUrl: latest.releaseUrl,
      provenance: latest.provenance,
      dshRange: latest.dshRange,
    };
  }

  private latestView(): LatestView | null {
    return this.latestTarget === null ? this.latestFromState() : this.latestFromTarget(this.latestTarget);
  }

  private compatibilityOf(latest: LatestView | null): DshCompatibility {
    const range = latest === null ? null : latest.dshRange;
    if (latest === null || this.dshVersion === null || range === null) {
      return { dsh: this.dshVersion, range, state: 'unknown' };
    }
    const matched = satisfiesRange(this.dshVersion, range);
    return {
      dsh: this.dshVersion,
      range,
      state: matched === true ? 'compatible' : matched === false ? 'incompatible' : 'unknown',
    };
  }

  private stateOf(
    install: PackageInstall,
    latest: LatestView | null,
    age: AgeInfo,
  ): UpdateState {
    if (install.linked) return 'linked';
    if (install.version === null || install.dirs.length === 0) return 'unavailable';
    if (this.state.needsRestart === true) return 'installed';
    if (latest === null) return 'unknown';
    const comparison = compareVersions(latest.version, install.version);
    if (comparison < 0) return 'ahead';
    if (comparison === 0) return 'current';
    if (this.compatibilityOf(latest).state === 'incompatible') return 'incompatible';
    if (age.ageLimited) return 'age-limited';
    return sameMajor(latest.version, install.version) ? 'update' : 'major';
  }

  private buildStatus(): UpdateStatus {
    const install = this.installs;
    if (install === null) {
      return {
        available: false,
        profile: { name: this.options.profile.name, restartKind: this.options.profile.restartKind },
        running: this.options.runningVersion,
        current: null,
        latest: null,
        compatibility: { dsh: this.dshVersion, range: null, state: 'unknown' },
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
        records: neutralRecords(),
      };
    }
    const latest = this.latestView();
    const compatibility = this.compatibilityOf(latest);
    const age = latest === null
      ? { eligibleAt: null, ageLimited: false, ageUnknown: false }
      : this.ageInfo(latest.publishedAt, latest.eligibleAt);
    const installed = this.state.installed === undefined
      ? null
      : {
        version: this.state.installed.version,
        at: this.state.installedAt ?? null,
        needsRestart: this.state.needsRestart === true,
      };
    const records = install.linked
      ? neutralRecords()
      : readProfileRecords(
        this.options.profile.dir,
        this.options.packageName,
        install.version,
      );
    return {
      available: true,
      profile: { name: this.options.profile.name, restartKind: this.options.profile.restartKind },
      running: this.options.runningVersion,
      current: install.version,
      latest,
      compatibility,
      state: this.stateOf(install, latest, age),
      phase: this.phase,
      checkedAt: this.checkedAt,
      autoUpdate: this.prefs.autoUpdate,
      installed,
      error: this.lastError ?? this.state.lastError ?? null,
      busy: this.phase !== 'idle',
      ageLimited: age.ageLimited,
      ageUnknown: age.ageUnknown,
      staleProcess: install.version !== null && this.options.runningVersion !== install.version,
      records,
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
        this.options.packageName,
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
        version: target.version,
        publishedAt: target.publishedAt,
        eligibleAt: target.eligibleAt,
        releaseUrl: target.releaseUrl,
        provenance: target.provenance,
        dshRange: target.pkg.dshRange,
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
    let install = this.requireInstall();
    if (install.linked) {
      throw new UpdateFailure('linked', 'linked development installs cannot be updated from the card');
    }
    if (install.dirs.length === 0 || install.version === null) {
      throw new UpdateFailure('no-install', 'the package is not installed in this profile');
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
    const current = install.version;
    if (current === null) throw new UpdateFailure('no-install', 'the package has no readable version');
    const comparison = compareVersions(target.version, current);
    if (comparison < 0) {
      throw new UpdateFailure('no-update', 'the installed version is ahead of the latest release');
    }
    if (comparison === 0 && this.state.needsRestart !== true) {
      throw new UpdateFailure('no-update', 'the installed version is already current');
    }
    // An explicit manual install may proceed when compatibility is unknown,
    // but never when the release declares that it excludes this DSH.
    if (this.compatibilityOf(this.latestFromTarget(target)).state === 'incompatible') {
      throw new UpdateFailure(
        'incompatible-dsh',
        'the latest release does not support the running DSH version',
      );
    }
    if (age.ageLimited) {
      throw new UpdateFailure('age-limited', 'the release is newer than the profile minimumReleaseAge');
    }
    if (!sameMajor(target.version, current) && !allowMajor) {
      throw new UpdateFailure('major-blocked', 'major updates require an explicit confirmation');
    }
    const lock = await acquireUpdateLock(this.options.dataDir, this.now());
    this.phase = 'installing';
    try {
      const result = await installRelease({
        target,
        profile: this.options.profile,
        dataDir: this.options.dataDir,
        packageName: this.options.packageName,
        runningDir: this.options.packageDir,
        fetchImpl: this.fetchImpl(),
        signal: this.abort.signal,
      });
      this.installs = detectPackageInstall(
        this.options.profile,
        this.options.packageName,
        [this.options.packageDir],
      );
      try {
        const records = await reconcileProfileRecords({
          profile: this.options.profile,
          packageName: this.options.packageName,
          installedVersion: result.version,
        });
        if (records.warning !== null) this.log(`ollama-web: ${records.warning}`);
      } catch (error) {
        this.log('ollama-web: could not reconcile the profile records', error);
      }
      install = this.installs;
      this.checkedAt = new Date(this.now()).toISOString();
      this.state.lastCheckAt = this.checkedAt;
      this.state.installed = { version: result.version };
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
    const install = this.requireInstall();
    if (enabled && install.linked) {
      throw new UpdateFailure('linked', 'linked development installs cannot use auto-update');
    }
    if (enabled && install.dirs.length === 0) {
      throw new UpdateFailure('no-install', 'the package is not installed in this profile');
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
    const install = this.requireInstall();
    if (install.linked || install.version === null) return;
    const age = this.ageInfo(target.publishedAt, target.eligibleAt);
    if (age.ageLimited || age.ageUnknown) return;
    if (!sameMajor(target.version, install.version)) return;
    if (compareVersions(target.version, install.version) <= 0) return;
    if (this.compatibilityOf(this.latestFromTarget(target)).state !== 'compatible') return;
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
