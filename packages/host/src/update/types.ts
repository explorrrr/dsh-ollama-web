/** Types for the self-update subsystem. Nothing here reads search settings or credentials. */

export type UpdateErrorCode =
  | 'unavailable'
  | 'no-profile'
  | 'linked'
  | 'no-install'
  | 'busy'
  | 'network'
  | 'timeout'
  | 'registry-status'
  | 'registry-json'
  | 'registry-mismatch'
  | 'release-mismatch'
  | 'integrity'
  | 'archive'
  | 'package-invalid'
  | 'permission'
  | 'install-failed'
  | 'state-write'
  | 'age-limited'
  | 'major-blocked'
  | 'no-update'
  | 'invalid-payload'
  | 'unknown';

export interface UpdateError {
  readonly code: UpdateErrorCode;
  readonly message: string;
}

/** One package release as the npm registry describes it. */
export interface PublishedPackage {
  readonly name: string;
  readonly version: string;
  readonly tarball: string;
  readonly integrity: string;
  readonly publishedAt: string | null;
  readonly provenance: boolean;
}

/** A host/client pair that must be released together. */
export interface ReleaseTarget {
  readonly host: PublishedPackage;
  readonly client: PublishedPackage;
  readonly version: string;
  readonly publishedAt: string | null;
  readonly eligibleAt: string | null;
  readonly releaseUrl: string;
  readonly provenance: boolean;
  readonly registry: string;
}

export type UpdateState =
  | 'current'
  | 'update'
  | 'major'
  | 'age-limited'
  | 'ahead'
  | 'mismatch'
  | 'installed'
  | 'linked'
  | 'unavailable'
  | 'unknown';

export type UpdatePhase = 'idle' | 'checking' | 'installing' | 'saving';

export interface UpdateStatus {
  readonly available: boolean;
  readonly profile: { readonly name: string; readonly restartKind: 'app' | 'host' } | null;
  readonly running: { readonly host: string | null };
  readonly current: { readonly host: string | null; readonly client: string | null };
  readonly latest: {
    readonly host: string;
    readonly client: string;
    readonly publishedAt: string | null;
    readonly eligibleAt: string | null;
    readonly releaseUrl: string;
    readonly provenance: boolean;
  } | null;
  readonly state: UpdateState;
  readonly phase: UpdatePhase;
  readonly checkedAt: string | null;
  readonly autoUpdate: boolean;
  readonly installed: {
    readonly version: string;
    readonly at: string | null;
    readonly needsRestart: boolean;
  } | null;
  readonly error: UpdateError | null;
  readonly busy: boolean;
  readonly ageLimited: boolean;
  readonly ageUnknown: boolean;
  readonly staleProcess: boolean;
  readonly versionsMatch: boolean;
  readonly clientInstalled: boolean;
}

export interface UpdatePrefs {
  readonly autoUpdate: boolean;
}

export interface StoredLatest {
  readonly host: string;
  readonly client: string;
  readonly publishedAt: string | null;
  readonly eligibleAt: string | null;
  readonly releaseUrl: string;
  readonly provenance: boolean;
}

export interface StoredInstalled {
  readonly host: string;
  readonly client: string;
}

export interface StoredUpdateState {
  schemaVersion: 1;
  lastCheckAt?: string;
  latest?: StoredLatest;
  installedAt?: string;
  installed?: StoredInstalled;
  needsRestart?: boolean;
  lastAutoUpdateAt?: string;
  lastError?: UpdateError;
  backups?: string[];
}

export interface ProfileInfo {
  readonly dir: string;
  readonly name: string;
  readonly profilesRoot: string;
  readonly restartKind: 'app' | 'host';
}

export interface PackageInstall {
  readonly name: string;
  readonly version: string | null;
  readonly dirs: string[];
  readonly linked: boolean;
}

export interface InstalledSnapshot {
  readonly host: PackageInstall;
  readonly client: PackageInstall;
}
