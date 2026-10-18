import test from 'node:test';
import assert from 'node:assert/strict';
import { Config, buildEndpoint, snapshot } from '../dist/config.js';
import { makeConfig, makeCtx, makeProvider } from './helpers.mjs';

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
  assert.throws(() => buildEndpoint('https://ollama.com', '//evil.example/x'), /origin/);
  assert.throws(() => buildEndpoint('https://ollama.com', '/../x'), /plain path/);
  assert.throws(() => buildEndpoint('https://ollama.com', 'api/web_search'), /start with/);
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

test('invalid apiKeyEnv becomes a config error', () => {
  const { ctx } = makeCtx();
  const options = snapshot(ctx, makeConfig({ apiKeyEnv: 'not a ref' }));
  assert.match(options.configError, /apiKeyEnv/);
  assert.equal(makeProvider({ apiKeyEnv: 'not a ref' }).available(), false);
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
