import test from 'node:test';
import assert from 'node:assert/strict';
import { Context } from '@deepseek-ai/cordis';
import WebRuntime from '@deepseek-ai/dsh-web';
import { OllamaSearchProvider } from '../dist/provider.js';
import { installFetch, jsonResponse } from './helpers.mjs';

const WebRuntimePlugin = WebRuntime.default ?? WebRuntime;

test('a real WebRuntime selects the provider through ctx.web.search', async () => {
  const ctx = new Context();
  await ctx.plugin(WebRuntimePlugin, { searchProvider: 'ollama' });

  const provider = new OllamaSearchProvider(() => ({
    apiKey: 'secret',
    apiKeyEnv: 'OLLAMA_API_KEY',
    endpoint: 'https://ollama.com/api/web_search',
    maxResults: 5,
    snippetMax: 2000,
    maxQueryChars: 2048,
    searchTimeoutMs: 30000,
    maxResponseBytes: 2097152,
    configError: undefined,
    resolveApiKey: async () => 'secret',
  }));
  ctx.web.registerSearchProvider(provider);

  const mock = installFetch(() => jsonResponse({
    results: [{ title: 'Ollama', url: 'https://ollama.com/', content: 'Cloud models' }],
  }));
  try {
    const result = await ctx.web.search({ query: 'what is ollama?' });
    assert.equal(result.sources.length, 1);
    assert.equal(result.sources[0].url, 'https://ollama.com/');
  } finally {
    mock.restore();
    if (typeof ctx.dispose === 'function') await ctx.dispose();
  }
});
