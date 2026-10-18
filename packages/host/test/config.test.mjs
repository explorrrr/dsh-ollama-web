import test from 'node:test';
import assert from 'node:assert/strict';
import { Config, buildEndpoint, snapshot } from '../dist/config.js';
import { installFetch, jsonResponse, makeConfig, makeCtx, makeProvider } from './helpers.mjs';

test('config schema exposes the documented keys', () => {
  assert.deepEqual(Object.keys(Config.dict).sort(), [
    'apiKey',
    'apiKeyEnv',
    'baseURL',
    'enableFetchProvider',
    'maxQueryChars',
    'maxResponseBytes',
    'maxResults',
    'searchPath',
    'searchTimeoutMs',
    'snippetMax',
  ]);
});

test('defaults resolve to the Ollama search endpoint', () => {
  const { ctx } = makeCtx();
  const options = snapshot(ctx, makeConfig());
  assert.equal(options.configError, undefined);
  assert.equal(options.endpoint, 'https://ollama.com/api/web_search');
  assert.equal(options.maxResults, 5);
  assert.equal(options.snippetMax, 2000);
  assert.equal(options.maxQueryChars, 2048);
  assert.equal(options.searchTimeoutMs, 30000);
  assert.equal(options.maxResponseBytes, 2097152);
});

test('baseURL path prefixes are preserved', () => {
  assert.equal(
    buildEndpoint('https://proxy.example/ollama/', '/api/web_search'),
    'https://proxy.example/ollama/api/web_search',
  );
});

test('HTTPS is mandatory', () => {
  assert.throws(() => buildEndpoint('http://ollama.com', '/api/web_search'), /https/);
});

test('baseURL credentials, query and fragment are rejected', () => {
  assert.throws(() => buildEndpoint('https://user:pass@ollama.com', '/api/web_search'), /credentials/);
  assert.throws(() => buildEndpoint('https://ollama.com?x=1', '/api/web_search'), /query/);
  assert.throws(() => buildEndpoint('https://ollama.com#x', '/api/web_search'), /fragment/);
});

test('searchPath must stay on the base origin', () => {
  assert.throws(() => buildEndpoint('https://ollama.com', '//evil.example/x'), /plain path|origin/);
  assert.throws(() => buildEndpoint('https://ollama.com', '/../x'), /plain path/);
  assert.throws(() => buildEndpoint('https://ollama.com', 'api/web_search'), /start with/);
});

test('searchPath cannot escape the baseURL path prefix', () => {
  const base = 'https://proxy.example/ollama';
  for (const path of [
    '/%2e%2e/admin',
    '/%2E%2E/admin',
    '/%252e%252e/admin',
    '/api/%2e%2e/web_search',
    '/%2f%2fevil.example/x',
    '/%5cevil.example/x',
    '/%3fadmin',
    '/%23admin',
  ]) {
    assert.throws(() => buildEndpoint(base, path), /plain path|under the baseURL path/, path);
  }
  assert.equal(
    buildEndpoint(base, '/api/web_search'),
    'https://proxy.example/ollama/api/web_search',
  );
});

test('numeric settings are clamped to safe bounds', () => {
  const { ctx } = makeCtx();
  const options = snapshot(ctx, makeConfig({
    maxResults: 99,
    snippetMax: 1_000_000,
    searchTimeoutMs: 0,
    maxResponseBytes: 1,
    maxQueryChars: 1_000_000,
  }));
  assert.equal(options.maxResults, 10);
  assert.equal(options.snippetMax, 10000);
  assert.equal(options.searchTimeoutMs, 1000);
  assert.equal(options.maxResponseBytes, 65536);
  assert.equal(options.maxQueryChars, 8192);
});

test('apiKeyEnv accepts only OLLAMA_ environment names', () => {
  const { ctx } = makeCtx();
  const valid = snapshot(ctx, makeConfig({ apiKeyEnv: 'OLLAMA_SEARCH_KEY' }));
  assert.equal(valid.configError, undefined);
  for (const value of ['not a ref', 'GITHUB_TOKEN', 'AWS_SECRET_ACCESS_KEY']) {
    const options = snapshot(ctx, makeConfig({ apiKeyEnv: value }));
    assert.match(options.configError, /OLLAMA_/);
    assert.equal(makeProvider({ apiKeyEnv: value }).available(), false);
  }
});

test('a non-OLLAMA apiKeyEnv never reaches fetch', async () => {
  const provider = makeProvider({ apiKeyEnv: 'GITHUB_TOKEN' });
  const mock = installFetch(() => jsonResponse({ results: [] }));
  try {
    await assert.rejects(provider.search({ query: 'x' }), /OLLAMA_/);
    assert.equal(mock.calls.length, 0);
  } finally {
    mock.restore();
  }
});

test('an API key containing CR/LF is rejected', () => {
  const { ctx } = makeCtx();
  const options = snapshot(ctx, makeConfig({ apiKey: 'secret\r\nX-Test: 1' }));
  assert.match(options.configError, /CR or LF/);
});

test('an invalid baseURL becomes a config error and makes the provider unavailable', () => {
  const { ctx } = makeCtx();
  const options = snapshot(ctx, makeConfig({ baseURL: 'http://ollama.com' }));
  assert.match(options.configError, /https/);
  assert.equal(makeProvider({ baseURL: 'http://ollama.com' }).available(), false);
});
