import { toUpdateError, UpdateFailure } from './errors.js';
import type { UpdateService } from './service.js';
import type { UpdateStatus } from './types.js';

export const UPDATE_CHANNEL = '/ollama-web-update';
export const UPDATE_METHODS = ['status', 'check', 'install', 'setAutoUpdate'] as const;

export type UpdateMethod = (typeof UPDATE_METHODS)[number];

export type UpdateRpcResult =
  | { readonly ok: true; readonly value: UpdateStatus }
  | {
    readonly ok: false;
    readonly error: {
      readonly code: string;
      readonly message: string;
      readonly details: Record<string, unknown>;
    };
  };

export type UpdateDispatch = (method: string, payload: unknown) => Promise<UpdateRpcResult>;

export interface RpcHandleLike {
  handle(
    channel: string,
    handler: (endpoint: string, payload: unknown) => Promise<UpdateRpcResult>,
  ): unknown;
}

export interface FetchRouteLike {
  path: string;
  methods: readonly string[];
  requestBody: 'buffered';
  fetch(request: Request): Promise<Response>;
}

export interface FetchRegisterLike {
  register(route: FetchRouteLike): unknown;
}

export interface ConnectionLike {
  readonly rpc?: RpcHandleLike;
  readonly fetch?: FetchRegisterLike;
}

type Logger = ((message: string, error?: unknown) => void) | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function recordPayload(payload: unknown): Record<string, unknown> {
  if (payload === undefined || payload === null) return {};
  if (!isRecord(payload)) {
    throw new UpdateFailure('invalid-payload', 'update payload must be an object');
  }
  return payload;
}

function failure(error: unknown): UpdateRpcResult {
  const converted = toUpdateError(error);
  return {
    ok: false,
    error: { code: converted.code, message: converted.message, details: {} },
  };
}

/** Validate the client payloads and call the update service. No client-supplied versions or URLs are honored. */
export function createUpdateDispatch(service: UpdateService): UpdateDispatch {
  return async (method, payload) => {
    try {
      const record = recordPayload(payload);
      switch (method) {
        case 'status':
          return { ok: true, value: await service.status() };
        case 'check': {
          if ('fresh' in record && typeof record.fresh !== 'boolean') {
            throw new UpdateFailure('invalid-payload', 'check.fresh must be a boolean');
          }
          return {
            ok: true,
            value: await service.check({ fresh: record.fresh === true }),
          };
        }
        case 'install': {
          if ('allowMajor' in record && typeof record.allowMajor !== 'boolean') {
            throw new UpdateFailure('invalid-payload', 'install.allowMajor must be a boolean');
          }
          return {
            ok: true,
            value: await service.install({ allowMajor: record.allowMajor === true }),
          };
        }
        case 'setAutoUpdate': {
          if (typeof record.enabled !== 'boolean') {
            throw new UpdateFailure('invalid-payload', 'setAutoUpdate.enabled must be a boolean');
          }
          return { ok: true, value: await service.setAutoUpdate({ enabled: record.enabled }) };
        }
        default:
          throw new UpdateFailure('invalid-payload', 'unknown update method');
      }
    } catch (error) {
      return failure(error);
    }
  };
}

function responseFor(rpcId: unknown, result: UpdateRpcResult): Response {
  return new Response(JSON.stringify({
    type: 'server-response',
    rpcId: typeof rpcId === 'string' ? rpcId : null,
    result,
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function invalidResult(): UpdateRpcResult {
  return {
    ok: false,
    error: { code: 'invalid-payload', message: 'invalid update request', details: {} },
  };
}

/** Register the /api exact fetch routes used by the desktop carrier. */
export function registerFetchRoutes(
  connection: unknown,
  dispatch: UpdateDispatch,
  logger: Logger,
): void {
  if (!isRecord(connection)) return;
  const fetchApi = (connection as ConnectionLike).fetch;
  if (fetchApi === undefined || typeof fetchApi.register !== 'function') {
    logger?.('ollama-web: connection.fetch is unavailable; update UI is disabled');
    return;
  }
  for (const method of UPDATE_METHODS) {
    try {
      fetchApi.register({
        path: `/api${UPDATE_CHANNEL}/${method}`,
        methods: ['POST'],
        requestBody: 'buffered',
        fetch: async (request) => {
          let body: unknown;
          try {
            body = await request.json();
          } catch {
            return responseFor(null, invalidResult());
          }
          if (!isRecord(body) || body.type !== 'client-request') {
            return responseFor(isRecord(body) ? body.rpcId : null, invalidResult());
          }
          const result = await dispatch(method, body.payload);
          return responseFor(body.rpcId, result);
        },
      });
    } catch (error) {
      logger?.(`ollama-web: could not register update route ${method}`, error);
    }
  }
}

/** Register the Web prefix RPC channel used by the browser carrier. */
export function registerRpcChannel(
  rpc: unknown,
  dispatch: UpdateDispatch,
  logger: Logger,
): void {
  if (!isRecord(rpc) || typeof rpc.handle !== 'function') {
    logger?.('ollama-web: connection.rpc is unavailable; update UI is disabled');
    return;
  }
  try {
    (rpc as unknown as RpcHandleLike).handle(
      UPDATE_CHANNEL,
      (method, payload) => dispatch(method, payload),
    );
  } catch (error) {
    logger?.(`ollama-web: could not register update channel ${UPDATE_CHANNEL}`, error);
  }
}
