import { parseVersion } from './semver.js';

/** Environment variables DSH uses to expose the running release. */
const VERSION_ENV = ['DSH_CLIENT_VERSION', 'DSH_APP_VERSION'] as const;

/**
 * Read the running DSH release from the host environment.
 *
 * Desktop passes `DSH_CLIENT_VERSION` to the Host; standalone Web can pass
 * `DSH_APP_VERSION`. Normalization drops a leading `v` and build metadata so
 * the value can be compared with `engines.dsh`. Returns null when neither is a
 * usable semantic version, which makes the updater's compatibility check
 * unknown rather than guessing.
 */
export function readDshVersion(env: NodeJS.ProcessEnv = process.env): string | null {
  for (const name of VERSION_ENV) {
    const raw = env[name];
    if (typeof raw !== 'string' || raw.length === 0 || raw.length > 100) continue;
    const parsed = parseVersion(raw);
    if (parsed !== undefined) return parsed.raw;
  }
  return null;
}
