import Schema from '@deepseek-ai/schemastery';
import { missingCredentialError, providerError } from './errors.js';
import type {
  ConfigRefs,
  CredentialsLike,
  LaunchEnvironmentLike,
  PluginContext,
} from './types.js';

export const API_KEY_ENV_PATTERN = /^OLLAMA_[A-Za-z0-9_]+$/;

export const DEFAULTS = {
  apiKeyEnv: 'OLLAMA_API_KEY',
  baseURL: 'https://ollama.com',
  searchPath: '/api/web_search',
  maxResults: 5,
  snippetMax: 2000,
  maxQueryChars: 2048,
  searchTimeoutMs: 30000,
  maxResponseBytes: 2097152,
  fetchPath: '/api/web_fetch',
  fetchTimeoutMs: 30000,
  fetchMaxChars: 100000,
} as const;

export const Config = Schema.object({
  apiKey: Schema.string().role('secret').volatile(),
  apiKeyEnv: Schema.string().role('credential-ref').default(DEFAULTS.apiKeyEnv).pattern(API_KEY_ENV_PATTERN).volatile(),
  baseURL: Schema.string().default(DEFAULTS.baseURL).volatile(),
  searchPath: Schema.string().default(DEFAULTS.searchPath).volatile(),
  maxResults: Schema.number().step(1).min(1).default(DEFAULTS.maxResults).volatile(),
  snippetMax: Schema.number().step(1).min(1).default(DEFAULTS.snippetMax).volatile(),
  maxQueryChars: Schema.number().step(1).min(1).default(DEFAULTS.maxQueryChars).volatile(),
  searchTimeoutMs: Schema.number().step(1).min(1).default(DEFAULTS.searchTimeoutMs).volatile(),
  maxResponseBytes: Schema.number().step(1).min(1).default(DEFAULTS.maxResponseBytes).volatile(),
  fetchPath: Schema.string().default(DEFAULTS.fetchPath).volatile(),
  fetchTimeoutMs: Schema.number().step(1).min(1).default(DEFAULTS.fetchTimeoutMs).volatile(),
  fetchMaxChars: Schema.number().step(1).min(1).default(DEFAULTS.fetchMaxChars).volatile(),
  enableFetchProvider: Schema.boolean().default(false).volatile(),
});

export interface ResolvedOptions {
  readonly apiKey: string | undefined;
  readonly apiKeyEnv: string;
  readonly endpoint: string | undefined;
  readonly maxResults: number;
  readonly snippetMax: number;
  readonly maxQueryChars: number;
  readonly searchTimeoutMs: number;
  readonly maxResponseBytes: number;
  readonly fetchEndpoint: string | undefined;
  readonly fetchTimeoutMs: number;
  readonly fetchMaxChars: number;
  readonly fetchEnabled: boolean;
  readonly configError: string | undefined;
  readonly fetchConfigError: string | undefined;
  resolveApiKey(operation?: string): Promise<string>;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function readLiteralKey(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  return value;
}

/** Reject literal and percent-encoded traversal before URL normalization. */
function assertPlainPath(rawPath: string, fieldName: string): void {
  let current = rawPath;
  for (let depth = 0; depth < 5; depth += 1) {
    assertNoTraversal(current, fieldName);
    let decoded: string;
    try {
      decoded = decodeURIComponent(current);
    } catch {
      throw new Error(`${fieldName} must be a plain path`);
    }
    if (decoded === current) return;
    current = decoded;
  }
  assertNoTraversal(current, fieldName);
}

function assertNoTraversal(path: string, fieldName: string): void {
  if (
    path.includes('..')
    || path.includes('?')
    || path.includes('#')
    || path.includes('\\')
    || path.startsWith('//')
  ) {
    throw new Error(`${fieldName} must be a plain path`);
  }
}

/**
 * Build and validate a request endpoint. `baseURL` may carry a path prefix
 * (for a reverse proxy), but it must stay on its own HTTPS origin.
 */
export function buildEndpoint(rawBaseURL: string, rawPath: string, fieldName = 'searchPath'): string {
  let base: URL;
  try {
    base = new URL(rawBaseURL);
  } catch {
    throw new Error('baseURL must be a valid URL');
  }
  if (base.protocol !== 'https:') {
    throw new Error('baseURL must use https:');
  }
  if (base.username !== '' || base.password !== '') {
    throw new Error('baseURL must not contain credentials');
  }
  if (base.search !== '' || base.hash !== '') {
    throw new Error('baseURL must not contain a query or fragment');
  }

  const path = rawPath.trim();
  if (!path.startsWith('/')) {
    throw new Error(`${fieldName} must start with /`);
  }
  assertPlainPath(path, fieldName);

  const basePath = base.pathname.replace(/\/+$/, '');
  const endpoint = new URL(`${basePath}${path}`, base.origin);
  if (endpoint.origin !== base.origin) {
    throw new Error(`${fieldName} must stay on the baseURL origin`);
  }
  if (basePath !== '' && endpoint.pathname !== basePath && !endpoint.pathname.startsWith(`${basePath}/`)) {
    throw new Error(`${fieldName} must stay under the baseURL path`);
  }
  return endpoint.toString();
}

/** Read the live config into one operation-local snapshot. */
export function snapshot(ctx: PluginContext, config: ConfigRefs): ResolvedOptions {
  const apiKey = readLiteralKey(config.apiKey.get());
  const apiKeyEnv = (config.apiKeyEnv.get() ?? DEFAULTS.apiKeyEnv).trim();
  const baseURL = config.baseURL.get() ?? DEFAULTS.baseURL;
  const searchPath = config.searchPath.get() ?? DEFAULTS.searchPath;
  const maxResults = clampInt(config.maxResults.get(), 1, 10, DEFAULTS.maxResults);
  const snippetMax = clampInt(config.snippetMax.get(), 1, 10_000, DEFAULTS.snippetMax);
  const maxQueryChars = clampInt(config.maxQueryChars.get(), 1, 8192, DEFAULTS.maxQueryChars);
  const searchTimeoutMs = clampInt(config.searchTimeoutMs.get(), 1_000, 120_000, DEFAULTS.searchTimeoutMs);
  const maxResponseBytes = clampInt(config.maxResponseBytes.get(), 65_536, 10_485_760, DEFAULTS.maxResponseBytes);
  const fetchPath = config.fetchPath.get() ?? DEFAULTS.fetchPath;
  const fetchTimeoutMs = clampInt(config.fetchTimeoutMs.get(), 1_000, 120_000, DEFAULTS.fetchTimeoutMs);
  const fetchMaxChars = clampInt(config.fetchMaxChars.get(), 1, 200_000, DEFAULTS.fetchMaxChars);
  const fetchEnabled = config.enableFetchProvider.get() === true;

  let commonError: string | undefined;
  if (!API_KEY_ENV_PATTERN.test(apiKeyEnv)) {
    commonError = 'apiKeyEnv must be an OLLAMA_ environment variable name';
  }
  if (apiKey !== undefined && /[\r\n]/.test(apiKey)) {
    commonError = 'apiKey must not contain CR or LF';
  }

  let configError = commonError;
  let fetchConfigError = commonError;
  let endpoint: string | undefined;
  let fetchEndpoint: string | undefined;
  if (commonError === undefined) {
    try {
      endpoint = buildEndpoint(baseURL, searchPath);
    } catch (error) {
      configError = error instanceof Error ? error.message : 'invalid Ollama endpoint configuration';
    }
    try {
      fetchEndpoint = buildEndpoint(baseURL, fetchPath, 'fetchPath');
    } catch (error) {
      fetchConfigError = error instanceof Error ? error.message : 'invalid Ollama fetch endpoint configuration';
    }
  }

  return {
    apiKey,
    apiKeyEnv,
    endpoint,
    maxResults,
    snippetMax,
    maxQueryChars,
    searchTimeoutMs,
    maxResponseBytes,
    fetchEndpoint,
    fetchTimeoutMs,
    fetchMaxChars,
    fetchEnabled,
    configError,
    fetchConfigError,
    resolveApiKey: (operation?: string) => resolveApiKey(ctx, apiKey, apiKeyEnv, operation),
  };
}

async function resolveApiKey(
  ctx: PluginContext,
  literal: string | undefined,
  reference: string,
  operation = 'web search',
): Promise<string> {
  if (literal !== undefined && literal.length > 0) return literal;

  const credentials = ctx.get('credentials') as CredentialsLike | undefined;
  if (credentials !== undefined) {
    let hit: { value?: string } | undefined;
    try {
      hit = await credentials.resolve(reference);
    } catch (error) {
      throw providerError(`Ollama web credential resolution failed for "${reference}"`, error);
    }
    if (hit?.value !== undefined && hit.value.length > 0) return hit.value;
  }

  const launchEnvironment = ctx.get('launchEnvironment') as LaunchEnvironmentLike | undefined;
  const fromLaunch = launchEnvironment?.get?.(reference)?.value;
  if (fromLaunch !== undefined && fromLaunch.length > 0) return fromLaunch;

  const fromEnv = process.env[reference];
  if (fromEnv !== undefined && fromEnv.length > 0) return fromEnv;

  throw missingCredentialError(reference, operation);
}
