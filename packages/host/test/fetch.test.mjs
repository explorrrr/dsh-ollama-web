import test from 'node:test';
import assert from 'node:assert/strict';
import { OllamaFetchProvider } from '../dist/fetch-provider.js';
import {
  installFetch,
  installHangingFetch,
  jsonResponse,
  makeConfig,
  makeCtx,
  makeFetchProvider,
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
    fetchEndpoint: 'https://ollama.com/api/web_fetch',
    fetchTimeoutMs: 1000,
    fetchMaxChars: 100000,
    fetchEnabled: true,
    configError: undefined,
    fetchConfigError: undefined,
    resolveApiKey: async () => 'secret',
    ...overrides,
  };
  return new OllamaFetchProvider(() => options);
}

test('sends the documented request and maps title, content and links', async () => {
  const provider = makeFetchProvider({ apiKey: 'secret' });
  const mock = installFetch(() => jsonResponse({
    title: 'Hello [world]',
    content: '# Body\n\nText with a control\u0000char.',
    links: [
      'https://example.com/a',
      'https://example.com/a',
      'javascript:alert(1)',
      'https://example.com/b)[x](https://phish.example)',
    ],
  }));
  try {
    const result = await provider.fetch({ url: 'https://example.com/page' });
    assert.equal(mock.calls.length, 1);
    assert.equal(mock.calls[0].url, 'https://ollama.com/api/web_fetch');
    assert.equal(mock.calls[0].init.method, 'POST');
    assert.equal(mock.calls[0].init.redirect, 'error');
    assert.equal(mock.calls[0].init.headers.authorization, 'Bearer secret');
    assert.deepEqual(JSON.parse(mock.calls[0].init.body), { url: 'https://example.com/page' });

    assert.equal(result.url, 'https://example.com/page');
    assert.equal(result.statusCode, 200);
    assert.equal(result.body.kind, 'text');
    assert.equal(result.truncated, false);
    assert.match(result.body.content, /^# Hello world\n\n# Body\n\nText with a controlchar\./);
    assert.match(result.body.content, /Links:\n- https:\/\/example\.com\/a\n- https:\/\/example\.com\/b/);
    assert.doesNotMatch(result.body.content, /javascript:/);
    assert.doesNotMatch(result.body.content, /\)\[x\]\(/);
  } finally {
    mock.restore();
  }
});

test('uses a configured fetchPath under the baseURL prefix', async () => {
  const provider = makeFetchProvider({
    apiKey: 'secret',
    baseURL: 'https://proxy.example/ollama',
    fetchPath: '/api/web_fetch',
  });
  const mock = installFetch(() => jsonResponse({ content: 'ok' }));
  try {
    await provider.fetch({ url: 'https://example.com/' });
    assert.equal(mock.calls[0].url, 'https://proxy.example/ollama/api/web_fetch');
  } finally {
    mock.restore();
  }
});

test('caps the returned text and reports truncation', async () => {
  const provider = makeFetchProvider({ apiKey: 'secret', fetchMaxChars: 20 });
  const mock = installFetch(() => jsonResponse({ content: 'abcdefghij'.repeat(5) }));
  try {
    const result = await provider.fetch({ url: 'https://example.com/' });
    assert.equal(result.truncated, true);
    assert.ok(result.body.content.length <= 20);
  } finally {
    mock.restore();
  }
});

test('rejects malformed, non-http and local/private URLs before a request', async () => {
  const provider = directProvider();
  const urls = [
    '',
    'not a url',
    'ftp://example.com/file',
    'javascript:alert(1)',
    'https://user:pass@example.com/',
    'http://localhost/',
    'http://127.0.0.1/',
    'http://10.0.0.1/',
    'http://172.16.0.1/',
    'http://192.168.1.1/',
    'http://169.254.169.254/',
    'https://[::1]/',
    'https://[fc00::1]/',
    'https://example.local/',
    'https://service.internal/',
    `https://example.com/${'a'.repeat(2048)}`,
  ];
  const mock = installFetch(() => jsonResponse({ content: 'should not be used' }));
  try {
    for (const url of urls) {
      await assert.rejects(provider.fetch({ url }), (error) => {
        assert.ok(error.code === 'WEB_INVALID_URL' || error.code === 'WEB_BLOCKED_URL', url);
        return true;
      }, url);
    }
    assert.equal(mock.calls.length, 0);
  } finally {
    mock.restore();
  }
});

test('accepts public HTTP and HTTPS URLs', async () => {
  const provider = directProvider();
  const mock = installFetch(() => jsonResponse({ content: 'ok' }));
  try {
    await provider.fetch({ url: 'http://example.com/' });
    await provider.fetch({ url: 'https://1.1.1.1/' });
    await provider.fetch({ url: 'https://[2606:4700:4700::1111]/' });
    assert.equal(mock.calls.length, 3);
  } finally {
    mock.restore();
  }
});

test('a missing key is a credential error and performs no request', async () => {
  const ref = 'OLLAMA_MISSING_FETCH_KEY_FOR_TEST';
  delete process.env[ref];
  const provider = makeFetchProvider({ apiKey: undefined, apiKeyEnv: ref });
  const mock = installFetch(() => jsonResponse({ content: 'should not be used' }));
  try {
    await assert.rejects(provider.fetch({ url: 'https://example.com/' }), (error) => {
      assert.equal(error.code, 'WEB_PROVIDER_CREDENTIAL_MISSING');
      assert.match(error.message, new RegExp(ref));
      assert.match(error.message, /web fetch/);
      return true;
    });
    assert.equal(mock.calls.length, 0);
  } finally {
    mock.restore();
  }
});

test('resolves a key through the credentials service', async () => {
  const { ctx, fetchProviders } = makeCtx({
    credentials: { resolve: async () => ({ value: 'credential-key' }) },
  });
  apply(ctx, makeConfig({ apiKey: undefined, enableFetchProvider: true }));
  const provider = fetchProviders[0];
  const mock = installFetch(() => jsonResponse({ content: 'ok' }));
  try {
    await provider.fetch({ url: 'https://example.com/' });
    assert.equal(mock.calls[0].init.headers.authorization, 'Bearer credential-key');
  } finally {
    mock.restore();
  }
});

test('maps HTTP statuses without echoing the upstream body', async () => {
  const provider = directProvider();
  for (const [status, pattern] of [[401, /401/], [429, /429/], [500, /500/]]) {
    const mock = installFetch(() => jsonResponse({ error: 'SUPER_SECRET_UPSTREAM_DETAIL' }, status));
    try {
      await assert.rejects(provider.fetch({ url: 'https://example.com/' }), (error) => {
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
  const provider = directProvider();
  const mock = installFetch(() => jsonResponse({}, 429, { 'retry-after': '60' }));
  try {
    await assert.rejects(provider.fetch({ url: 'https://example.com/' }), /retry after 60s/);
  } finally {
    mock.restore();
  }
});

test('rejects invalid JSON and a response without content', async () => {
  const provider = directProvider();
  let mock = installFetch(() => new Response('not json', { status: 200 }));
  try {
    await assert.rejects(provider.fetch({ url: 'https://example.com/' }), (error) => {
      assert.equal(error.code, 'WEB_PROVIDER_ERROR');
      assert.match(error.message, /invalid JSON/);
      return true;
    });
  } finally {
    mock.restore();
  }

  mock = installFetch(() => jsonResponse({ title: 'Title only' }));
  try {
    const result = await provider.fetch({ url: 'https://example.com/' });
    assert.equal(result.body.content, '# Title only');
  } finally {
    mock.restore();
  }

  mock = installFetch(() => jsonResponse({ nope: true }));
  try {
    await assert.rejects(provider.fetch({ url: 'https://example.com/' }), /no content/);
  } finally {
    mock.restore();
  }
});

test('enforces the response byte cap while streaming', async () => {
  const provider = directProvider({ maxResponseBytes: 100 });
  const mock = installFetch(() => streamResponse(['x'.repeat(200)]));
  try {
    await assert.rejects(provider.fetch({ url: 'https://example.com/' }), (error) => {
      assert.equal(error.code, 'WEB_FETCH_TOO_LARGE');
      assert.match(error.message, /exceeded 100 bytes/);
      return true;
    });
  } finally {
    mock.restore();
  }
});

test('enforces the declared content-length cap', async () => {
  const provider = directProvider({ maxResponseBytes: 100 });
  const mock = installFetch(() => jsonResponse({ content: 'ok' }, 200, { 'content-length': '9999' }));
  try {
    await assert.rejects(provider.fetch({ url: 'https://example.com/' }), (error) => {
      assert.equal(error.code, 'WEB_FETCH_TOO_LARGE');
      return true;
    });
  } finally {
    mock.restore();
  }
});

test('times out with WEB_FETCH_TIMEOUT', async () => {
  const provider = directProvider({ fetchTimeoutMs: 10 });
  const mock = installHangingFetch();
  try {
    await assert.rejects(provider.fetch({ url: 'https://example.com/' }), (error) => {
      assert.equal(error.code, 'WEB_FETCH_TIMEOUT');
      assert.match(error.message, /timed out after 10ms/);
      return true;
    });
  } finally {
    mock.restore();
  }
});

test('maps caller cancellation to WEB_ABORTED', async () => {
  const provider = directProvider({ fetchTimeoutMs: 60000 });
  const mock = installHangingFetch();
  const controller = new AbortController();
  try {
    const promise = provider.fetch({ url: 'https://example.com/' }, controller.signal);
    controller.abort();
    await assert.rejects(promise, (error) => {
      assert.equal(error.code, 'WEB_ABORTED');
      return true;
    });
  } finally {
    mock.restore();
  }
});

test('maps a refused redirect to WEB_REDIRECT_BLOCKED', async () => {
  const provider = directProvider();
  const mock = installFetch(() => {
    throw new TypeError('fetch failed', { cause: new Error('unexpected redirect') });
  });
  try {
    await assert.rejects(provider.fetch({ url: 'https://example.com/' }), (error) => {
      assert.equal(error.code, 'WEB_REDIRECT_BLOCKED');
      return true;
    });
  } finally {
    mock.restore();
  }
});

test('availability follows the live enable flag and fetch config', () => {
  assert.equal(directProvider({ fetchEnabled: false }).available(), false);
  assert.equal(directProvider({ fetchConfigError: 'bad path' }).available(), false);
  assert.equal(directProvider().available(), true);
});

test('a disabled provider refuses a direct call', async () => {
  const provider = directProvider({ fetchEnabled: false });
  const mock = installFetch(() => jsonResponse({ content: 'should not be used' }));
  try {
    await assert.rejects(provider.fetch({ url: 'https://example.com/' }), (error) => {
      assert.equal(error.code, 'WEB_PROVIDER_UNAVAILABLE');
      return true;
    });
    assert.equal(mock.calls.length, 0);
  } finally {
    mock.restore();
  }
});

test('registers the optional provider even when disabled, and skips a missing seam safely', () => {
  const enabled = makeCtx();
  apply(enabled.ctx, makeConfig({ enableFetchProvider: false }));
  assert.equal(enabled.providers.length, 1);
  assert.equal(enabled.fetchProviders.length, 1);
  assert.equal(enabled.fetchProviders[0].available(), false);

  const noSeam = makeCtx({ fetchSeam: false });
  assert.doesNotThrow(() => apply(noSeam.ctx, makeConfig({ enableFetchProvider: true })));
  assert.equal(noSeam.providers.length, 1);
  assert.equal(noSeam.fetchProviders.length, 0);
});

test('does not log or append session events', async () => {
  const appended = [];
  const { ctx, fetchProviders } = makeCtx({
    agents: { currentInitiator: () => ({ session: { append: (...args) => appended.push(args) } }) },
  });
  apply(ctx, makeConfig({ apiKey: 'secret', enableFetchProvider: true }));
  const provider = fetchProviders[0];
  const mock = installFetch(() => jsonResponse({ content: 'ok' }));
  const logs = [];
  const original = { log: console.log, warn: console.warn, error: console.error };
  console.log = (...args) => logs.push(args);
  console.warn = (...args) => logs.push(args);
  console.error = (...args) => logs.push(args);
  try {
    await provider.fetch({ url: 'https://example.com/' });
  } finally {
    console.log = original.log;
    console.warn = original.warn;
    console.error = original.error;
    mock.restore();
  }
  assert.deepEqual(logs, []);
  assert.deepEqual(appended, []);
});
