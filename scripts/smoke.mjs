import { apply } from '../packages/host/dist/index.js';

const config = {};
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
  enableFetchProvider: false,
};
for (const [key, value] of Object.entries(values)) {
  config[key] = key === 'enableFetchProvider' ? value : { get: () => value };
}

const providers = [];
const ctx = {
  web: { registerSearchProvider: (provider) => providers.push(provider) },
  get: () => undefined,
};

apply(ctx, config);
if (providers.length !== 1 || providers[0].id !== 'ollama') {
  throw new Error('smoke: provider was not registered as ollama');
}
if (providers[0].available() !== true) throw new Error('smoke: provider is not available');
console.log('smoke ok: ollama-web registered');
