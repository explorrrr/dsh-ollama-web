import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { apply } from '../dist/index.js';
import { UpdateFailure } from '../dist/update/errors.js';
import { UPDATE_CHANNEL, createUpdateDispatch, registerFetchRoutes, registerRpcChannel } from '../dist/update/rpc.js';
import { makeConfig } from './helpers.mjs';
import { cleanup, makeProfile, makeTempDir } from './update-helpers.mjs';

const STATUS = {
  available: true,
  profile: { name: 'test', restartKind: 'host' },
  running: { host: '1.0.0' },
  current: { host: '1.0.0', client: '1.0.0' },
  latest: null,
  state: 'unknown',
  phase: 'idle',
  checkedAt: null,
  autoUpdate: false,
  installed: null,
  error: null,
  busy: false,
  ageLimited: false,
  ageUnknown: false,
  staleProcess: false,
  versionsMatch: true,
  clientInstalled: true,
};

function fakeService(overrides = {}) {
  const calls = [];
  const service = {
    status: async () => STATUS,
    check: async (options) => {
      calls.push(['check', options]);
      return STATUS;
    },
    install: async (options) => {
      calls.push(['install', options]);
      return STATUS;
    },
    setAutoUpdate: async (options) => {
      calls.push(['setAutoUpdate', options]);
      return STATUS;
    },
    ...overrides,
  };
  return { service, calls };
}

test('dispatches valid update methods and validates payloads', async () => {
  const { service, calls } = fakeService();
  const dispatch = createUpdateDispatch(service);
  assert.deepEqual(await dispatch('status', undefined), { ok: true, value: STATUS });
  assert.deepEqual(await dispatch('check', { fresh: true }), { ok: true, value: STATUS });
  assert.deepEqual(await dispatch('install', { allowMajor: true }), { ok: true, value: STATUS });
  assert.deepEqual(await dispatch('setAutoUpdate', { enabled: true }), { ok: true, value: STATUS });
  assert.deepEqual(calls, [
    ['check', { fresh: true }],
    ['install', { allowMajor: true }],
    ['setAutoUpdate', { enabled: true }],
  ]);
  const invalid = await dispatch('check', { fresh: 'yes' });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error.code, 'invalid-payload');
  const unknown = await dispatch('nope', {});
  assert.equal(unknown.ok, false);
  assert.equal(unknown.error.code, 'invalid-payload');
});

test('turns service failures into wire errors', async () => {
  const { service } = fakeService({
    check: async () => {
      throw new UpdateFailure('busy', 'busy');
    },
  });
  const dispatch = createUpdateDispatch(service);
  const result = await dispatch('check', {});
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'busy');
  assert.equal(result.error.message, 'busy');
});

test('registers exact /api fetch routes and answers a client request', async () => {
  const { service } = fakeService();
  const dispatch = createUpdateDispatch(service);
  const routes = [];
  const logger = [];
  registerFetchRoutes({ fetch: { register: (route) => routes.push(route) } }, dispatch, (message) => logger.push(message));
  assert.equal(routes.length, 4);
  assert.deepEqual(routes.map((route) => route.path).sort(), [
    '/api/ollama-web-update/check',
    '/api/ollama-web-update/install',
    '/api/ollama-web-update/setAutoUpdate',
    '/api/ollama-web-update/status',
  ]);
  const route = routes.find((entry) => entry.path.endsWith('/status'));
  const response = await route.fetch(new Request('http://localhost/api/ollama-web-update/status', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId: 'rpc-1', method: 'status', payload: undefined }),
  }));
  const body = await response.json();
  assert.equal(body.type, 'server-response');
  assert.equal(body.rpcId, 'rpc-1');
  assert.equal(body.result.ok, true);
  assert.equal(body.result.value.current.host, '1.0.0');
  assert.equal(route.methods[0], 'POST');
  assert.equal(route.requestBody, 'buffered');
  const bad = await route.fetch(new Request('http://localhost/api/ollama-web-update/status', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: 'not json',
  }));
  const badBody = await bad.json();
  assert.equal(badBody.result.ok, false);
  assert.equal(badBody.result.error.code, 'invalid-payload');
});

test('registers the Web prefix channel', async () => {
  const { service } = fakeService();
  const dispatch = createUpdateDispatch(service);
  const handled = [];
  registerRpcChannel({ handle: (channel, handler) => handled.push([channel, handler]) }, dispatch, () => {});
  assert.equal(handled.length, 1);
  assert.equal(handled[0][0], UPDATE_CHANNEL);
  const result = await handled[0][1]('install', { allowMajor: false });
  assert.equal(result.ok, true);
});

test('host apply registers search, fetch routes, and the RPC channel', async () => {
  const root = makeTempDir();
  try {
    const setup = makeProfile({ root });
    const routes = [];
    const handled = [];
    const injections = [];
    const providers = [];
    const connection = {
      fetch: { register: (route) => routes.push(route) },
      rpc: { handle: (channel, handler) => handled.push([channel, handler]) },
    };
    const ctx = {
      baseUrl: setup.profileUrl,
      web: { registerSearchProvider: (provider) => providers.push(provider) },
      get: () => undefined,
      inject: (deps, callback) => {
        injections.push([...deps]);
        callback({ connection, webServer: {} });
      },
      effect: (callback) => {
        const dispose = callback();
        return typeof dispose === 'function' ? dispose : () => {};
      },
      logger: { warn: () => {} },
    };
    apply(ctx, makeConfig());
    assert.equal(providers.length, 1);
    assert.deepEqual(injections, [['connection'], ['connection', 'webServer']]);
    assert.equal(routes.length, 4);
    assert.equal(handled.length, 1);
    assert.equal(handled[0][0], UPDATE_CHANNEL);
  } finally {
    cleanup(root);
  }
});
