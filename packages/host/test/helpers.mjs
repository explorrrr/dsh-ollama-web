import { apply } from '../dist/index.js';

const DEFAULTS = {
  apiKey: undefined,
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

/** Build the live-ref config shape the DSH loader hands to `apply`. */
export function makeConfig(overrides = {}) {
  const values = { ...DEFAULTS, ...overrides };
  const config = {};
  for (const [key, value] of Object.entries(values)) {
    config[key] = key === 'enableFetchProvider' ? value : { get: () => value };
  }
  return config;
}

/** Minimal Cordis-like context with the services this plugin touches. */
export function makeCtx({ env = {}, credentials, agents } = {}) {
  const providers = [];
  const ctx = {
    web: {
      registerSearchProvider(provider) {
        providers.push(provider);
        return () => {};
      },
    },
    get(name) {
      if (name === 'launchEnvironment') {
        return {
          get: (key) => (
            Object.prototype.hasOwnProperty.call(env, key) ? { value: env[key] } : undefined
          ),
        };
      }
      if (name === 'credentials') return credentials;
      if (name === 'agents') return agents;
      return undefined;
    },
  };
  return { ctx, providers };
}

export function makeProvider(overrides = {}) {
  const { ctx, providers } = makeCtx();
  apply(ctx, makeConfig(overrides));
  return providers[0];
}

export function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

/** A streaming JSON response useful for the response-cap tests. */
export function streamResponse(chunks, status = 200, headers = {}) {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  }), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

/** Replace global fetch for one test and record every call. */
export function installFetch(handler) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return handler(input, init);
  };
  return {
    calls,
    restore() {
      globalThis.fetch = original;
    },
  };
}

/** A fetch that only settles when its AbortSignal fires. */
export function installHangingFetch() {
  return installFetch((_input, init) => new Promise((_resolve, reject) => {
    const signal = init?.signal;
    const fail = () => reject(new DOMException('Aborted', 'AbortError'));
    if (signal?.aborted === true) fail();
    else signal?.addEventListener('abort', fail, { once: true });
  }));
}
