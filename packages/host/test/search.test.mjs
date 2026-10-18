import test from 'node:test';
import assert from 'node:assert/strict';
import { OllamaSearchProvider } from '../dist/provider.js';
import {
  installFetch,
  installHangingFetch,
  jsonResponse,
  makeConfig,
  makeCtx,
  makeProvider,
  streamResponse,
} from './helpers.mjs';
import { apply } from '../dist/index.js';

function directProvider(overrides = {}) {
  const options = {
    apiKey: 'secret',
    apiKeyEnv: 'OLLAMA_API_KEY',
    endpoint: 'https://ollama.com/api/web_search',
    maxResults: 5,
    snippetMax: 2000,
    maxQueryChars: 2048,
    searchTimeoutMs: 1000,
    maxResponseBytes: 2097152,
    configError: undefined,
    resolveApiKey: async () => 'secret',
    ...overrides,
  };
  return new OllamaSearchProvider(() => options);
}

test('sends the documented request and maps results', async () => {
  const provider = makeProvider({ apiKey: 'secret' });
  const mock = installFetch(() => jsonResponse({
    results: [
      {
        title: 'Hello [world]',
        url: 'https://example.com/a',
        content: '  first\nsecond  ',
        page_age: '2026-10-01',
      },
      { title: 'Duplicate', url: 'https://example.com/a', content: 'dup' },
      { title: 'Bad', url: 'javascript:alert(1)', content: 'bad' },
      { title: 'Also bad', url: 'data:text/html,x', content: 'bad' },
      { title: 'No URL' },
    ],
  }));
  try {
    const result = await provider.search({ query: 'hello', maxResults: 3 });
    assert.equal(mock.calls.length, 1);
    assert.equal(mock.calls[0].url, 'https://ollama.com/api/web_search');
    assert.equal(mock.calls[0].init.method, 'POST');
    assert.equal(mock.calls[0].init.redirect, 'error');
    assert.equal(mock.calls[0].init.headers.authorization, 'Bearer secret');
    assert.deepEqual(JSON.parse(mock.calls[0].init.body), { query: 'hello', max_results: 3 });
    assert.equal(result.truncated, false);
    assert.equal(result.sources.length, 1);
    assert.equal(result.sources[0].url, 'https://example.com/a');
    assert.equal(result.sources[0].title, 'Hello world');
    assert.equal(result.sources[0].snippet, 'first second');
    assert.equal(result.sources[0].publishedAt, '2026-10-01');
  } finally {
    mock.restore();
  }
});

test('clamps request maxResults to the Ollama maximum of 10', async () => {
  const provider = makeProvider({ apiKey: 'secret' });
  const mock = installFetch(() => jsonResponse({ results: [] }));
  try {
    await provider.search({ query: 'x', maxResults: 20 });
    assert.equal(JSON.parse(mock.calls[0].init.body).max_results, 10);
  } finally {
    mock.restore();
  }
});

test('uses the configured default when the request has no maxResults', async () => {
  const provider = makeProvider({ apiKey: 'secret', maxResults: 7 });
  const mock = installFetch(() => jsonResponse({ results: [] }));
  try {
    await provider.search({ query: 'x' });
    assert.equal(JSON.parse(mock.calls[0].init.body).max_results, 7);
  } finally {
    mock.restore();
  }
});

test('empty results are a success', async () => {
  const provider = makeProvider({ apiKey: 'secret' });
  const mock = installFetch(() => jsonResponse({ results: [] }));
  try {
    const result = await provider.search({ query: 'x' });
    assert.deepEqual(result, { sources: [], truncated: false });
  } finally {
    mock.restore();
  }
});

test('truncates sources at maxResults and reports it', async () => {
  const provider = makeProvider({ apiKey: 'secret', maxResults: 2 });
  const results = Array.from({ length: 10 }, (_, index) => ({
    title: `T${index}`,
    url: `https://example.com/${index}`,
    content: `C${index}`,
  }));
  const mock = installFetch(() => jsonResponse({ results }));
  try {
    const result = await provider.search({ query: 'x' });
    assert.equal(result.sources.length, 2);
    assert.equal(result.truncated, true);
  } finally {
    mock.restore();
  }
});

test('caps snippets at snippetMax', async () => {
  const provider = makeProvider({ apiKey: 'secret', snippetMax: 5 });
  const mock = installFetch(() => jsonResponse({
    results: [{ title: 'T', url: 'https://example.com', content: 'abcdefghij' }],
  }));
  try {
    const result = await provider.search({ query: 'x' });
    assert.equal(result.sources[0].snippet, 'abcde');
  } finally {
    mock.restore();
  }
});

test('rejects a response without a results array', async () => {
  const provider = makeProvider({ apiKey: 'secret' });
  const mock = installFetch(() => jsonResponse({ nope: true }));
  try {
    await assert.rejects(provider.search({ query: 'x' }), (error) => {
      assert.equal(error.code, 'WEB_PROVIDER_ERROR');
      assert.match(error.message, /no results array/);
      return true;
    });
  } finally {
    mock.restore();
  }
});

test('rejects invalid JSON', async () => {
  const provider = makeProvider({ apiKey: 'secret' });
  const mock = installFetch(() => new Response('not json', { status: 200 }));
  try {
    await assert.rejects(provider.search({ query: 'x' }), (error) => {
      assert.equal(error.code, 'WEB_PROVIDER_ERROR');
      assert.match(error.message, /invalid JSON/);
      return true;
    });
  } finally {
    mock.restore();
  }
});

test('maps HTTP statuses without echoing the upstream body', async () => {
  const provider = makeProvider({ apiKey: 'secret' });
  for (const [status, pattern] of [[401, /401/], [429, /429/], [500, /500/]]) {
    const mock = installFetch(() => jsonResponse({ error: 'SUPER_SECRET_UPSTREAM_DETAIL' }, status));
    try {
      await assert.rejects(provider.search({ query: 'x' }), (error) => {
        assert.equal(error.code, 'WEB_PROVIDER_ERROR');
        assert.match(error.message, pattern);
        assert.doesNotMatch(error.message, /SUPER_SECRET_UPSTREAM_DETAIL/);
        return true;
      });
    } finally {
      mock.restore();
    }
  }
});

test('includes a numeric Retry-After on 429', async () => {
  const provider = makeProvider({ apiKey: 'secret' });
  const mock = installFetch(() => jsonResponse({}, 429, { 'retry-after': '60' }));
  try {
    await assert.rejects(provider.search({ query: 'x' }), /retry after 60s/);
  } finally {
    mock.restore();
  }
});

test('enforces the response byte cap while streaming', async () => {
  const provider = directProvider({ maxResponseBytes: 100 });
  const mock = installFetch(() => streamResponse(['x'.repeat(200)]));
  try {
    await assert.rejects(provider.search({ query: 'x' }), (error) => {
      assert.equal(error.code, 'WEB_PROVIDER_ERROR');
      assert.match(error.message, /exceeded 100 bytes/);
      return true;
    });
  } finally {
    mock.restore();
  }
});

test('enforces the declared content-length cap', async () => {
  const provider = directProvider({ maxResponseBytes: 100 });
  const mock = installFetch(() => jsonResponse({ results: [] }, 200, { 'content-length': '9999' }));
  try {
    await assert.rejects(provider.search({ query: 'x' }), /exceeded 100 bytes/);
  } finally {
    mock.restore();
  }
});

test('times out a hung endpoint', async () => {
  const provider = directProvider({ searchTimeoutMs: 10 });
  const mock = installHangingFetch();
  try {
    await assert.rejects(provider.search({ query: 'x' }), (error) => {
      assert.equal(error.code, 'WEB_PROVIDER_ERROR');
      assert.match(error.message, /timed out after 10ms/);
      return true;
    });
  } finally {
    mock.restore();
  }
});

test('maps caller cancellation to WEB_ABORTED', async () => {
  const provider = directProvider({ searchTimeoutMs: 60000 });
  const mock = installHangingFetch();
  const controller = new AbortController();
  try {
    const promise = provider.search({ query: 'x' }, controller.signal);
    controller.abort();
    await assert.rejects(promise, (error) => {
      assert.equal(error.code, 'WEB_ABORTED');
      return true;
    });
  } finally {
    mock.restore();
  }
});

test('a missing key is a credential error and performs no request', async () => {
  const ref = 'OLLAMA_MISSING_KEY_FOR_TEST';
  delete process.env[ref];
  const provider = makeProvider({ apiKey: undefined, apiKeyEnv: ref });
  const mock = installFetch(() => jsonResponse({ results: [] }));
  try {
    await assert.rejects(provider.search({ query: 'x' }), (error) => {
      assert.equal(error.code, 'WEB_PROVIDER_CREDENTIAL_MISSING');
      assert.match(error.message, new RegExp(ref));
      return true;
    });
    assert.equal(mock.calls.length, 0);
  } finally {
    mock.restore();
  }
});

test('resolves a key through the credentials service', async () => {
  const { ctx, providers } = makeCtx({
    credentials: { resolve: async () => ({ value: 'credential-key' }) },
  });
  apply(ctx, makeConfig({ apiKey: undefined }));
  const provider = providers[0];
  const mock = installFetch(() => jsonResponse({ results: [] }));
  try {
    await provider.search({ query: 'x' });
    assert.equal(mock.calls[0].init.headers.authorization, 'Bearer credential-key');
  } finally {
    mock.restore();
  }
});

test('a literal key wins over credentials', async () => {
  const { ctx, providers } = makeCtx({
    credentials: { resolve: async () => ({ value: 'credential-key' }) },
  });
  apply(ctx, makeConfig({ apiKey: 'literal-key' }));
  const provider = providers[0];
  const mock = installFetch(() => jsonResponse({ results: [] }));
  try {
    await provider.search({ query: 'x' });
    assert.equal(mock.calls[0].init.headers.authorization, 'Bearer literal-key');
  } finally {
    mock.restore();
  }
});

test('credential resolution failures surface as provider errors', async () => {
  const { ctx, providers } = makeCtx({
    credentials: { resolve: async () => { throw new Error('locked'); } },
  });
  apply(ctx, makeConfig({ apiKey: undefined }));
  const provider = providers[0];
  const mock = installFetch(() => jsonResponse({ results: [] }));
  try {
    await assert.rejects(provider.search({ query: 'x' }), (error) => {
      assert.equal(error.code, 'WEB_PROVIDER_ERROR');
      assert.match(error.message, /credential resolution failed/);
      return true;
    });
    assert.equal(mock.calls.length, 0);
  } finally {
    mock.restore();
  }
});

test('falls back to the launch environment', async () => {
  const { ctx, providers } = makeCtx({ env: { OLLAMA_API_KEY: 'env-key' } });
  apply(ctx, makeConfig({ apiKey: undefined }));
  const provider = providers[0];
  const mock = installFetch(() => jsonResponse({ results: [] }));
  try {
    await provider.search({ query: 'x' });
    assert.equal(mock.calls[0].init.headers.authorization, 'Bearer env-key');
  } finally {
    mock.restore();
  }
});

test('rejects empty and overlong queries without a request', async () => {
  const provider = makeProvider({ apiKey: 'secret', maxQueryChars: 5 });
  const mock = installFetch(() => jsonResponse({ results: [] }));
  try {
    await assert.rejects(provider.search({ query: '   ' }), /non-empty/);
    await assert.rejects(provider.search({ query: '123456' }), /exceeds 5/);
    assert.equal(mock.calls.length, 0);
  } finally {
    mock.restore();
  }
});

test('does not log or append session events', async () => {
  const appended = [];
  const { ctx, providers } = makeCtx({
    agents: { currentInitiator: () => ({ session: { append: (...args) => appended.push(args) } }) },
  });
  apply(ctx, makeConfig({ apiKey: 'secret' }));
  const provider = providers[0];
  const mock = installFetch(() => jsonResponse({ results: [] }));
  const logs = [];
  const original = { log: console.log, warn: console.warn, error: console.error };
  console.log = (...args) => logs.push(args);
  console.warn = (...args) => logs.push(args);
  console.error = (...args) => logs.push(args);
  try {
    await provider.search({ query: 'x' });
  } finally {
    console.log = original.log;
    console.warn = original.warn;
    console.error = original.error;
    mock.restore();
  }
  assert.deepEqual(logs, []);
  assert.deepEqual(appended, []);
});
