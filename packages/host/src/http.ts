import { WebError } from '@deepseek-ai/dsh-web';
import { abortedError, fetchError, providerError } from './errors.js';

export interface PostJsonOptions {
  readonly url: string;
  readonly body: unknown;
  readonly headers: Record<string, string>;
  readonly signal?: AbortSignal;
  readonly timeoutMs: number;
  readonly maxBytes: number;
  /** Human-readable operation used in errors. Defaults to "web search". */
  readonly operation?: string;
  /** Error code for a timeout. Defaults to WEB_PROVIDER_ERROR. */
  readonly timeoutCode?: string;
  /** Error code for an oversized response. Defaults to WEB_PROVIDER_ERROR. */
  readonly tooLargeCode?: string;
  /** Error code for a refused redirect. Defaults to WEB_PROVIDER_ERROR. */
  readonly redirectCode?: string;
}

/** POST JSON, refuse redirects, enforce a deadline and a response-byte cap. */
export async function postJsonWithLimit(options: PostJsonOptions): Promise<unknown> {
  const operation = options.operation ?? 'web search';
  const timeout = AbortSignal.timeout(options.timeoutMs);
  const combined = options.signal !== undefined
    ? AbortSignal.any([options.signal, timeout])
    : timeout;

  let response: Response;
  try {
    response = await fetch(options.url, {
      method: 'POST',
      headers: options.headers,
      body: JSON.stringify(options.body),
      signal: combined,
      redirect: 'error',
    });
  } catch (error) {
    throw mapFetchError(error, options.signal, timeout, options.timeoutMs, operation, options);
  }

  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw httpStatusError(response.status, response.headers.get('retry-after'), operation);
  }

  const declaredLength = Number(response.headers.get('content-length') ?? '');
  if (Number.isFinite(declaredLength) && declaredLength > options.maxBytes) {
    await response.body?.cancel().catch(() => undefined);
    throw tooLargeError(options.maxBytes, operation, options.tooLargeCode);
  }

  const text = await readTextWithLimit(
    response,
    options.maxBytes,
    options.signal,
    timeout,
    options.timeoutMs,
    operation,
    options,
  );
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw providerError(`Ollama ${operation} returned invalid JSON`, error);
  }
}

async function readTextWithLimit(
  response: Response,
  maxBytes: number,
  caller: AbortSignal | undefined,
  timeout: AbortSignal,
  timeoutMs: number,
  operation: string,
  options: PostJsonOptions,
): Promise<string> {
  if (response.body === null) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw tooLargeError(maxBytes, operation, options.tooLargeCode);
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof WebError) throw error;
    throw mapFetchError(error, caller, timeout, timeoutMs, operation, options);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function tooLargeError(maxBytes: number, operation: string, code: string | undefined): WebError {
  return fetchError(
    `Ollama ${operation} response exceeded ${maxBytes} bytes`,
    code ?? 'WEB_PROVIDER_ERROR',
  );
}

function timeoutError(timeoutMs: number, operation: string, code: string | undefined): WebError {
  return fetchError(
    `Ollama ${operation} timed out after ${timeoutMs}ms`,
    code ?? 'WEB_PROVIDER_ERROR',
  );
}

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause;
  const causeText = cause instanceof Error ? ` ${cause.message}` : '';
  return `${error.message}${causeText}`;
}

function mapFetchError(
  error: unknown,
  caller: AbortSignal | undefined,
  timeout: AbortSignal,
  timeoutMs: number,
  operation: string,
  options: PostJsonOptions,
): WebError {
  if (caller?.aborted === true) return abortedError(error);
  if (timeout.aborted === true) {
    return timeoutError(timeoutMs, operation, options.timeoutCode);
  }
  const message = errorText(error);
  if (/redirect/i.test(message)) {
    return fetchError(
      `Ollama ${operation} refused a redirect`,
      options.redirectCode ?? 'WEB_PROVIDER_ERROR',
      error,
    );
  }
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return timeoutError(timeoutMs, operation, options.timeoutCode);
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return abortedError(error);
  }
  return providerError(`Ollama ${operation} request failed`, error);
}

function httpStatusError(status: number, retryAfter: string | null, operation: string): WebError {
  if (status === 401 || status === 403) {
    return providerError(`Ollama ${operation} failed (HTTP ${status}); check OLLAMA_API_KEY`);
  }
  if (status === 429) {
    const suffix = retryAfter !== null && /^\d+$/.test(retryAfter)
      ? `; retry after ${retryAfter}s`
      : '';
    return providerError(`Ollama ${operation} rate limited (HTTP 429)${suffix}`);
  }
  if (status >= 500) {
    return providerError(`Ollama ${operation} failed (HTTP ${status}); Ollama may be unavailable`);
  }
  return providerError(`Ollama ${operation} request rejected (HTTP ${status})`);
}
