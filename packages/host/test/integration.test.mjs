import test from 'node:test';
import assert from 'node:assert/strict';
import { Context } from '@deepseek-ai/cordis';
import WebRuntime from '@deepseek-ai/dsh-web';
import { OllamaFetchProvider } from '../dist/fetch-provider.js';
import { OllamaSearchProvider } from '../dist/provider.js';
import { installFetch, jsonResponse } from './helpers.mjs';

const WebRuntimePlugin = WebRuntime.default ?? WebRuntime;

function options(overrides = {}) {
  return {
    apiKey: 'secret',
    apiKeyEnv: 'OLLAMA_API_KEY',
    endpoint: 'https://ollama.com/api/web_search',
    maxResults: 5,
    snippetMax: 2000,
    maxQueryChars: 2048,
    searchTimeoutMs: 30000,
    maxResponseBytes: 2097152,
    fetchEndpoint: 'https://ollama.com/api/web_fetch',
    fetchTimeoutMs: 30000,
    fetchMaxChars: 100000,
    fetchEnabled: true,
    configError: undefined,
    fetchConfigError: undefined,
    resolveApiKey: async () => 'secret',
    ...overrides,
  };
}

test('a real WebRuntime selects the provider through ctx.web.search', async () => {
  const ctx = new Context();
  await ctx.plugin(WebRuntimePlugin, { searchProvider: 'ollama' });

  ctx.web.registerSearchProvider(new OllamaSearchProvider(() => options()));

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

test('a real WebRuntime selects the Ollama fetch provider when pinned', async () => {
  const ctx = new Context();
  await ctx.plugin(WebRuntimePlugin, { fetchProvider: 'ollama' });
  ctx.web.registerFetchProvider(new OllamaFetchProvider(() => options()));

  const mock = installFetch(() => jsonResponse({ content: 'Hello from Ollama' }));
  try {
    const result = await ctx.web.fetch({ url: 'https://example.com/' });
    assert.equal(result.statusCode, 200);
    assert.equal(result.body.kind, 'text');
    assert.equal(result.body.content, 'Hello from Ollama');
  } finally {
    mock.restore();
    if (typeof ctx.dispose === 'function') await ctx.dispose();
  }
});

test('two usable fetch providers are ambiguous until one is pinned', async () => {
  const ctx = new Context();
  await ctx.plugin(WebRuntimePlugin);
  const dummy = {
    id: 'http',
    available: () => true,
    fetch: async () => ({
      url: 'https://example.com/',
      statusCode: 200,
      body: { kind: 'text', content: 'http' },
      truncated: false,
    }),
  };
  ctx.web.registerFetchProvider(dummy);
  ctx.web.registerFetchProvider(new OllamaFetchProvider(() => options()));

  try {
    await assert.rejects(ctx.web.fetch({ url: 'https://example.com/' }), (error) => {
      assert.equal(error.code, 'WEB_PROVIDER_AMBIGUOUS');
      return true;
    });
  } finally {
    if (typeof ctx.dispose === 'function') await ctx.dispose();
  }
});
