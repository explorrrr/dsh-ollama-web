/** Types for the self-update subsystem. Nothing here reads search settings or credentials. */

/** The 1.x browser package; kept only to warn and to recover an old journal. */
export const LEGACY_CLIENT_PACKAGE = 'dsh-ollama-web-client';

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

/** A release from the single package this plugin publishes. */
export interface ReleaseTarget {
  readonly pkg: PublishedPackage;
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
  | 'installed'
  | 'linked'
  | 'unavailable'
  | 'unknown';

export type UpdatePhase = 'idle' | 'checking' | 'installing' | 'saving';

export interface UpdateStatus {
  readonly available: boolean;
  readonly profile: { readonly name: string; readonly restartKind: 'app' | 'host' } | null;
  readonly running: string;
  readonly current: string | null;
  readonly latest: {
    readonly version: string;
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
}

export interface UpdatePrefs {
  readonly autoUpdate: boolean;
}

export interface StoredLatest {
  readonly version: string;
  readonly publishedAt: string | null;
  readonly eligibleAt: string | null;
  readonly releaseUrl: string;
  readonly provenance: boolean;
}

export interface StoredInstalled {
  readonly version: string;
}

export interface StoredUpdateState {
  schemaVersion: 2;
  lastCheckAt?: string;
  latest?: StoredLatest;
  installedAt?: string;
  installed?: StoredInstalled;
  needsRestart?: boolean;
  lastAutoUpdateAt?: string;
  lastError?: UpdateError;
  backups?: string[];
}

export interface JournalTarget {
  readonly packageName: string;
  readonly targetDir: string;
  readonly stageDir: string;
  readonly backupDir: string;
}

/** Written before a multi-directory swap so a crash can be rolled back on startup. */
export interface StoredUpdateJournal {
  schemaVersion: 1;
  readonly id: string;
  readonly startedAt: string;
  readonly targets: readonly JournalTarget[];
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
