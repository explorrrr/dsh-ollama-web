import { UpdateFailure } from './errors.js';
import type { UpdateErrorCode } from './types.js';

export interface LimitedFetchOptions {
  readonly url: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly timeoutMs: number;
  readonly maxBytes: number;
  readonly signal?: AbortSignal;
  readonly tooLargeCode?: UpdateErrorCode;
  readonly label?: string;
  readonly fetchImpl?: typeof fetch;
}

interface ReadResult {
  readonly bytes: Uint8Array;
}

/** Read a response body with a hard byte cap. The body is cancelled on overflow. */
async function readLimited(response: Response, options: LimitedFetchOptions): Promise<ReadResult> {
  const tooLargeCode = options.tooLargeCode ?? 'registry-json';
  const declared = Number(response.headers.get('content-length') ?? '');
  if (Number.isFinite(declared) && declared > options.maxBytes) {
    await response.body?.cancel().catch(() => undefined);
    throw new UpdateFailure(tooLargeCode, 'update response exceeded its size limit');
  }
  if (response.body === null) return { bytes: new Uint8Array(0) };
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > options.maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new UpdateFailure(tooLargeCode, 'update response exceeded its size limit');
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof UpdateFailure) throw error;
    throw new UpdateFailure('network', 'could not read the update response', error);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes };
}

async function fetchLimited(options: LimitedFetchOptions): Promise<ReadResult> {
  const timeout = AbortSignal.timeout(options.timeoutMs);
  const signal = options.signal === undefined ? timeout : AbortSignal.any([options.signal, timeout]);
  const doFetch = options.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await doFetch(options.url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'user-agent': 'dsh-ollama-web-update',
        ...options.headers,
      },
      redirect: 'error',
      signal,
    });
  } catch (error) {
    if (timeout.aborted) {
      throw new UpdateFailure('timeout', 'update request timed out', error);
    }
    throw new UpdateFailure('network', 'update request failed', error);
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new UpdateFailure(
      'registry-status',
      `${options.label ?? 'update'} request was rejected (HTTP ${String(response.status)})`,
    );
  }
  return readLimited(response, options);
}

/** Fetch and parse a JSON document with a deadline and a byte cap. */
export async function fetchJson(options: LimitedFetchOptions): Promise<unknown> {
  const { bytes } = await fetchLimited(options);
  let text: string;
  try {
    text = new TextDecoder().decode(bytes);
  } catch (error) {
    throw new UpdateFailure('registry-json', 'update metadata was not valid UTF-8', error);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new UpdateFailure('registry-json', 'update metadata was not valid JSON', error);
  }
}

/** Fetch a binary document with a deadline and a byte cap. */
export async function fetchBytes(options: LimitedFetchOptions): Promise<Uint8Array> {
  const { bytes } = await fetchLimited({
    ...options,
    headers: {
      accept: 'application/octet-stream',
      ...options.headers,
    },
    tooLargeCode: options.tooLargeCode ?? 'archive',
  });
  return bytes;
}
