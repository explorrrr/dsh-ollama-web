import type {
  WebSearchProvider,
  WebSearchRequest,
  WebSearchResult,
  WebSearchSource,
} from '@deepseek-ai/dsh-web';

export type {
  WebSearchProvider,
  WebSearchRequest,
  WebSearchResult,
  WebSearchSource,
};

/** A live settings reference handed to the plugin by the DSH loader. */
export interface Volatile<T> {
  get(): T;
}

/** The loader-config shape this plugin reads. */
export interface ConfigRefs {
  apiKey: Volatile<string | undefined>;
  apiKeyEnv: Volatile<string>;
  baseURL: Volatile<string>;
  searchPath: Volatile<string>;
  maxResults: Volatile<number>;
  snippetMax: Volatile<number>;
  maxQueryChars: Volatile<number>;
  searchTimeoutMs: Volatile<number>;
  maxResponseBytes: Volatile<number>;
  enableFetchProvider: boolean;
}

export interface CredentialsLike {
  resolve(reference: string): Promise<{ value?: string } | undefined>;
}

export interface LaunchEnvironmentLike {
  get(name: string): { value?: string } | undefined;
}

export interface LoggerLike {
  warn?(message: string, error?: unknown): void;
}

/** The subset of an optional Cordis injection scope this plugin reads. */
export interface InjectScope {
  readonly connection?: unknown;
  readonly webServer?: unknown;
}

/** The subset of the Cordis context this plugin uses. */
export interface PluginContext {
  web: {
    registerSearchProvider(provider: WebSearchProvider): unknown;
  };
  get(name: string): unknown;
  readonly baseUrl?: string;
  inject?(deps: readonly string[], callback: (scope: InjectScope) => void): unknown;
  effect?(callback: () => (() => void) | void, label?: string): unknown;
  readonly logger?: LoggerLike;
}

export interface OllamaSearchResult {
  title?: unknown;
  url?: unknown;
  content?: unknown;
  publishedAt?: unknown;
}

export interface OllamaSearchResponse {
  results?: unknown;
}
