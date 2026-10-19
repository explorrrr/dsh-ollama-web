import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { UpdateFailure } from './errors.js';
import { fetchJson } from './http.js';
import { parseVersion } from './semver.js';
import type { PublishedPackage, ReleaseTarget } from './types.js';

export const NPM_REGISTRY = 'https://registry.npmjs.org/';
export const NPMMIRROR_REGISTRY = 'https://registry.npmmirror.com/';
export const DEFAULT_MINIMUM_RELEASE_AGE_MINUTES = 0;
export const RELEASES_URL = 'https://github.com/explorrrr/dsh-ollama-web/releases/tag';

/** True for the canonical GitHub Releases tag URL of this repository. */
export function isAllowedReleaseUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return url.protocol === 'https:'
    && url.hostname === 'github.com'
    && url.username === ''
    && url.password === ''
    && url.port === ''
    && url.search === ''
    && url.hash === ''
    && url.pathname.startsWith('/explorrrr/dsh-ollama-web/releases/tag/');
}

const METADATA_MAX_BYTES = 256 * 1024;
const METADATA_TIMEOUT_MS = 10_000;
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

export type ReadTextFile = (path: string, encoding: 'utf8') => Promise<string>;

export interface RegistryOptions {
  readonly fetchImpl: typeof fetch;
  readonly registries: readonly string[];
  readonly minReleaseAgeMinutes: number;
  readonly now: number;
  readonly signal?: AbortSignal;
  readonly allowInsecureLocalhost?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeRegistry(registry: string, allowInsecureLocalhost: boolean): URL {
  let url: URL;
  try {
    url = new URL(registry);
  } catch (error) {
    throw new UpdateFailure('registry-json', 'update registry is not a valid URL', error);
  }
  const insecureLoopback = url.protocol === 'http:' && allowInsecureLocalhost
    && LOOPBACK_HOSTS.has(url.hostname);
  if (url.protocol !== 'https:' && !insecureLoopback) {
    throw new UpdateFailure('registry-json', 'update registry must use HTTPS');
  }
  if (url.username !== '' || url.password !== '') {
    throw new UpdateFailure('registry-json', 'update registry must not contain credentials');
  }
  return url;
}

function packumentUrl(registry: URL, name: string): string {
  const base = registry.toString().endsWith('/') ? registry.toString() : `${registry.toString()}/`;
  return new URL(encodeURIComponent(name), base).toString();
}

function validateTarballUrl(
  value: string,
  registry: URL,
  allowInsecureLocalhost: boolean,
): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch (error) {
    throw new UpdateFailure('registry-json', 'release tarball URL is invalid', error);
  }
  const insecureLoopback = url.protocol === 'http:' && allowInsecureLocalhost
    && LOOPBACK_HOSTS.has(url.hostname);
  if (url.protocol !== 'https:' && !insecureLoopback) {
    throw new UpdateFailure('registry-json', 'release tarball must use HTTPS');
  }
  if (url.username !== '' || url.password !== '') {
    throw new UpdateFailure('registry-json', 'release tarball must not contain credentials');
  }
  const allowed = new Set(['registry.npmjs.org', 'registry.npmmirror.com', registry.hostname]);
  if (!allowed.has(url.hostname) && !(insecureLoopback && LOOPBACK_HOSTS.has(url.hostname))) {
    throw new UpdateFailure('registry-json', 'release tarball host is not allowed');
  }
  return url.toString();
}

function parsePackument(name: string, registry: URL, value: unknown, allowInsecureLocalhost: boolean): PublishedPackage {
  if (!isRecord(value)) {
    throw new UpdateFailure('registry-json', 'update metadata is not an object');
  }
  const distTags = value['dist-tags'];
  const latest = isRecord(distTags) ? distTags.latest : undefined;
  if (typeof latest !== 'string' || latest.length === 0) {
    throw new UpdateFailure('registry-json', 'update metadata has no latest dist-tag');
  }
  if (parseVersion(latest) === undefined) {
    throw new UpdateFailure('registry-json', 'update metadata has an invalid latest version');
  }
  const versions = value.versions;
  const manifest = isRecord(versions) ? versions[latest] : undefined;
  if (!isRecord(manifest)) {
    throw new UpdateFailure('registry-json', 'update metadata does not contain the latest manifest');
  }
  if (manifest.name !== name || manifest.version !== latest) {
    throw new UpdateFailure('registry-json', 'update metadata name or version does not match');
  }
  const dist = manifest.dist;
  if (!isRecord(dist)) {
    throw new UpdateFailure('registry-json', 'update metadata has no dist block');
  }
  const tarball = dist.tarball;
  const integrity = dist.integrity;
  if (typeof tarball !== 'string' || typeof integrity !== 'string' || !integrity.startsWith('sha512-')) {
    throw new UpdateFailure('registry-json', 'update metadata has no SHA-512 tarball integrity');
  }
  const times = value.time;
  const published = isRecord(times) ? times[latest] : undefined;
  const publishedAt = typeof published === 'string' && Number.isFinite(Date.parse(published))
    ? new Date(published).toISOString()
    : null;
  return {
    name,
    version: latest,
    tarball: validateTarballUrl(tarball, registry, allowInsecureLocalhost),
    integrity,
    publishedAt,
    provenance: isRecord(dist.attestations),
  };
}

async function fetchLatest(
  name: string,
  registry: URL,
  options: RegistryOptions,
): Promise<PublishedPackage> {
  const value = await fetchJson({
    url: packumentUrl(registry, name),
    headers: { accept: 'application/json' },
    timeoutMs: METADATA_TIMEOUT_MS,
    maxBytes: METADATA_MAX_BYTES,
    fetchImpl: options.fetchImpl,
    ...(options.signal === undefined ? {} : { signal: options.signal }),
    label: `${name} registry`,
  });
  return parsePackument(name, registry, value, options.allowInsecureLocalhost === true);
}

function laterTimestamp(left: string | null, right: string | null): string | null {
  if (left === null || right === null) return null;
  const leftMs = Date.parse(left);
  const rightMs = Date.parse(right);
  if (!Number.isFinite(leftMs) || !Number.isFinite(rightMs)) return null;
  return new Date(Math.max(leftMs, rightMs)).toISOString();
}

function pickFailure(failures: readonly UpdateFailure[]): UpdateFailure {
  const timeout = failures.find((error) => error.code === 'timeout');
  if (timeout !== undefined) return timeout;
  const network = failures.find((error) => error.code === 'network');
  if (network !== undefined) return network;
  return failures[failures.length - 1] ?? new UpdateFailure('network', 'update registry is unavailable');
}

/**
 * Read the profile's pnpm minimumReleaseAge (minutes). The age wait is opt-in:
 * a missing, unreadable or invalid setting means 0 minutes (no wait).
 */
export async function readMinimumReleaseAge(
  profileDir: string,
  readFileFn: ReadTextFile = readFile,
): Promise<number> {
  const text = await readFileFn(join(profileDir, 'pnpm-workspace.yaml'), 'utf8').catch(() => '');
  const match = /^\s*minimumReleaseAge:\s*['"]?(\d+)['"]?\s*(?:#.*)?$/m.exec(text);
  if (match === null) return DEFAULT_MINIMUM_RELEASE_AGE_MINUTES;
  const minutes = Number(match[1]);
  if (!Number.isSafeInteger(minutes) || minutes < 0) {
    return DEFAULT_MINIMUM_RELEASE_AGE_MINUTES;
  }
  return minutes;
}

/**
 * Read host and client releases from the first registry that answers for both.
 * The two packages must advertise the same version.
 */
export async function checkRelease(
  packages: readonly [string, string],
  options: RegistryOptions,
): Promise<ReleaseTarget> {
  const [hostName, clientName] = packages;
  const failures: UpdateFailure[] = [];
  for (const rawRegistry of options.registries) {
    let registry: URL;
    try {
      registry = normalizeRegistry(rawRegistry, options.allowInsecureLocalhost === true);
    } catch (error) {
      failures.push(error instanceof UpdateFailure ? error : new UpdateFailure('registry-json', 'invalid update registry', error));
      continue;
    }
    try {
      const [host, client] = await Promise.all([
        fetchLatest(hostName, registry, options),
        fetchLatest(clientName, registry, options),
      ]);
      if (host.version !== client.version) {
        throw new UpdateFailure('release-mismatch', 'host and client releases have different versions');
      }
      const publishedAt = laterTimestamp(host.publishedAt, client.publishedAt);
      const eligibleAt = publishedAt === null
        ? null
        : new Date(Date.parse(publishedAt) + options.minReleaseAgeMinutes * 60_000).toISOString();
      return {
        host,
        client,
        version: host.version,
        publishedAt,
        eligibleAt,
        releaseUrl: `${RELEASES_URL}/v${host.version}`,
        provenance: host.provenance && client.provenance,
        registry: registry.toString(),
      };
    } catch (error) {
      const failure = error instanceof UpdateFailure
        ? error
        : new UpdateFailure('registry-json', 'update registry response was rejected', error);
      failures.push(failure);
    }
  }
  throw pickFailure(failures);
}
