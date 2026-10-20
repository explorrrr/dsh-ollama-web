import { apply } from '../packages/host/dist/index.js';

function config(enableFetchProvider) {
  const values = {
    apiKey: 'smoke-key',
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
    enableFetchProvider,
  };
  const out = {};
  for (const [key, value] of Object.entries(values)) {
    out[key] = { get: () => value };
  }
  return out;
}

function context() {
  const searchProviders = [];
  const fetchProviders = [];
  return {
    searchProviders,
    fetchProviders,
    ctx: {
      web: {
        registerSearchProvider: (provider) => searchProviders.push(provider),
        registerFetchProvider: (provider) => fetchProviders.push(provider),
      },
      get: () => undefined,
    },
  };
}

const disabled = context();
apply(disabled.ctx, config(false));
if (disabled.searchProviders.length !== 1 || disabled.searchProviders[0].id !== 'ollama') {
  throw new Error('smoke: search provider was not registered as ollama');
}
if (disabled.searchProviders[0].available() !== true) {
  throw new Error('smoke: search provider is not available');
}
if (disabled.fetchProviders.length !== 1 || disabled.fetchProviders[0].id !== 'ollama') {
  throw new Error('smoke: fetch provider was not registered as ollama');
}
if (disabled.fetchProviders[0].available() !== false) {
  throw new Error('smoke: fetch provider must be unavailable when disabled');
}

const enabled = context();
apply(enabled.ctx, config(true));
if (enabled.fetchProviders.length !== 1 || enabled.fetchProviders[0].available() !== true) {
  throw new Error('smoke: fetch provider is not available when enabled');
}

console.log('smoke ok: ollama-web search and optional fetch providers registered');
