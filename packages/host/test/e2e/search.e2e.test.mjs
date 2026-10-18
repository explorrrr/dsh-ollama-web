import test from 'node:test';
import assert from 'node:assert/strict';
import { apply } from '../../dist/index.js';

const apiKey = process.env.OLLAMA_API_KEY;
const skip = apiKey === undefined || apiKey.length === 0;

function config(overrides = {}) {
  const values = {
    apiKey,
    apiKeyEnv: 'OLLAMA_API_KEY',
    baseURL: 'https://ollama.com',
    searchPath: '/api/web_search',
    maxResults: 3,
    snippetMax: 2000,
    maxQueryChars: 2048,
    searchTimeoutMs: 30000,
    maxResponseBytes: 2097152,
    enableFetchProvider: false,
    ...overrides,
  };
  const out = {};
  for (const [key, value] of Object.entries(values)) {
    out[key] = key === 'enableFetchProvider' ? value : { get: () => value };
  }
  return out;
}

test('real Ollama /api/web_search returns citeable sources', { skip, timeout: 60000 }, async () => {
  const providers = [];
  const ctx = {
    web: { registerSearchProvider: (provider) => providers.push(provider) },
    get: () => undefined,
  };
  apply(ctx, config());
  const result = await providers[0].search({ query: 'what is ollama?', maxResults: 3 });
  assert.ok(result.sources.length > 0);
  for (const source of result.sources) {
    assert.match(source.url, /^https?:\/\//);
  }
});
