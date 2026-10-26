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
  | 'incompatible-dsh'
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
  /** The release's `engines.dsh` range, or null when it declares none. */
  readonly dshRange: string | null;
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
  | 'incompatible'
  | 'age-limited'
  | 'ahead'
  | 'installed'
  | 'linked'
  | 'unavailable'
  | 'unknown';

export type UpdatePhase = 'idle' | 'checking' | 'installing' | 'saving';

/** The profile's saved dependency and lockfile entry compared with the installed copy. */
export interface ProfileRecordState {
  /** The dependency value in the profile package.json, when one is recorded. */
  readonly declaredSpecifier: string | null;
  /** The declared exact version, or null for a range, file/link spec or missing entry. */
  readonly declaredVersion: string | null;
  /** The version recorded by the pnpm lockfile importer, or null when unknown. */
  readonly lockedVersion: string | null;
  /** Whether either recorded version differs from the installed package version. */
  readonly mismatch: boolean;
  /** A short diagnostic for a mismatch or unreadable record. */
  readonly message: string | null;
}

/** Whether the latest release's `engines.dsh` accepts the running DSH. */
export interface DshCompatibility {
  /** The running DSH version, or null when the host could not determine it. */
  readonly dsh: string | null;
  /** The latest release's `engines.dsh` range, or null when absent. */
  readonly range: string | null;
  readonly state: 'compatible' | 'incompatible' | 'unknown';
}

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
    readonly dshRange: string | null;
  } | null;
  readonly compatibility: DshCompatibility;
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
  /** The profile's package.json / pnpm-lock.yaml view of the installed copy. */
  readonly records: ProfileRecordState;
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
  readonly dshRange: string | null;
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
