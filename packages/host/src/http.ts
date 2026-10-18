import { WebError } from '@deepseek-ai/dsh-web';
import { abortedError, providerError } from './errors.js';

export interface PostJsonOptions {
  readonly url: string;
  readonly body: unknown;
  readonly headers: Record<string, string>;
  readonly signal?: AbortSignal;
  readonly timeoutMs: number;
  readonly maxBytes: number;
}

/** POST JSON, refuse redirects, enforce a deadline and a response-byte cap. */
export async function postJsonWithLimit(options: PostJsonOptions): Promise<unknown> {
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
    throw mapFetchError(error, options.signal, timeout, options.timeoutMs);
  }

  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw httpStatusError(response.status, response.headers.get('retry-after'));
  }

  const declaredLength = Number(response.headers.get('content-length') ?? '');
  if (Number.isFinite(declaredLength) && declaredLength > options.maxBytes) {
    await response.body?.cancel().catch(() => undefined);
    throw providerError(`Ollama web search response exceeded ${options.maxBytes} bytes`);
  }

  const text = await readTextWithLimit(response, options.maxBytes, options.signal, timeout, options.timeoutMs);
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw providerError('Ollama web search returned invalid JSON', error);
  }
}

async function readTextWithLimit(
  response: Response,
  maxBytes: number,
  caller: AbortSignal | undefined,
  timeout: AbortSignal,
  timeoutMs: number,
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
        throw providerError(`Ollama web search response exceeded ${maxBytes} bytes`);
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof WebError) throw error;
    throw mapFetchError(error, caller, timeout, timeoutMs);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function mapFetchError(
  error: unknown,
  caller: AbortSignal | undefined,
  timeout: AbortSignal,
  timeoutMs: number,
): WebError {
  if (caller?.aborted === true) return abortedError(error);
  if (timeout.aborted === true) {
    return providerError(`Ollama web search timed out after ${timeoutMs}ms`, error);
  }
  const message = error instanceof Error ? error.message : String(error);
  if (/redirect/i.test(message)) {
    return providerError('Ollama web search refused a redirect', error);
  }
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return providerError(`Ollama web search timed out after ${timeoutMs}ms`, error);
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return abortedError(error);
  }
  return providerError('Ollama web search request failed', error);
}

function httpStatusError(status: number, retryAfter: string | null): WebError {
  if (status === 401 || status === 403) {
    return providerError(`Ollama web search failed (HTTP ${status}); check OLLAMA_API_KEY`);
  }
  if (status === 429) {
    const suffix = retryAfter !== null && /^\d+$/.test(retryAfter)
      ? `; retry after ${retryAfter}s`
      : '';
    return providerError(`Ollama web search rate limited (HTTP 429)${suffix}`);
  }
  if (status >= 500) {
    return providerError(`Ollama web search failed (HTTP ${status}); Ollama may be unavailable`);
  }
  return providerError(`Ollama web search request rejected (HTTP ${status})`);
}
