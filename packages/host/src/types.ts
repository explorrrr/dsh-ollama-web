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

/** The subset of the Cordis context this plugin uses. */
export interface PluginContext {
  web: {
    registerSearchProvider(provider: WebSearchProvider): unknown;
  };
  get(name: string): unknown;
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
