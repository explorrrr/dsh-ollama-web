import { isIP } from 'node:net';
import type {
  WebFetchProvider,
  WebFetchRequest,
  WebFetchResult,
} from '@deepseek-ai/dsh-web';
import type { ResolvedOptions } from './config.js';
import {
  blockedUrlError,
  fetchError,
  invalidUrlError,
} from './errors.js';
import { postJsonWithLimit } from './http.js';
import { OLLAMA_PROVIDER_ID } from './provider.js';
import {
  sanitizeBlock,
  sanitizeSourceUrl,
  sanitizeTitle,
} from './sanitize.js';
import type { OllamaFetchResponse } from './types.js';

export const OLLAMA_FETCH_PROVIDER_ID = OLLAMA_PROVIDER_ID;

const MAX_FETCH_URL_LENGTH = 2048;
const MAX_TITLE_CHARS = 300;
const MAX_LINKS = 50;
const LOCAL_WILDCARD_DNS_SUFFIXES = [
  '.nip.io',
  '.sslip.io',
  '.xip.io',
  '.localtest.me',
  '.lvh.me',
];

/**
 * Ollama Cloud `/api/web_fetch` provider. This provider only runs when
 * `enableFetchProvider` is true and DSH's `web.fetchProvider` is pinned to
 * `ollama`; otherwise DSH either selects the built-in HTTP provider or reports
 * a structured provider-selection error.
 */
export class OllamaFetchProvider implements WebFetchProvider {
  readonly id = OLLAMA_FETCH_PROVIDER_ID;

  constructor(private readonly resolveOptions: () => ResolvedOptions) {}

  available(): boolean {
    const options = this.resolveOptions();
    return options.fetchEnabled && options.fetchConfigError === undefined;
  }

  async fetch(request: WebFetchRequest, signal?: AbortSignal): Promise<WebFetchResult> {
    const options = this.resolveOptions();
    if (!options.fetchEnabled) {
      throw fetchError(
        'Ollama web fetch provider is disabled; set enableFetchProvider to true',
        'WEB_PROVIDER_UNAVAILABLE',
      );
    }
    if (options.fetchConfigError !== undefined) {
      throw fetchError(options.fetchConfigError, 'WEB_PROVIDER_CONFIGURED_UNAVAILABLE');
    }
    if (options.fetchEndpoint === undefined) {
      throw fetchError(
        'Ollama web fetch endpoint is not configured',
        'WEB_PROVIDER_CONFIGURED_UNAVAILABLE',
      );
    }

    const url = validateFetchUrl(request.url);
    const apiKey = await options.resolveApiKey('web fetch');

    const body = await postJsonWithLimit({
      url: options.fetchEndpoint,
      body: { url: url.toString() },
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      ...(signal === undefined ? {} : { signal }),
      timeoutMs: options.fetchTimeoutMs,
      maxBytes: options.maxResponseBytes,
      operation: 'web fetch',
      timeoutCode: 'WEB_FETCH_TIMEOUT',
      tooLargeCode: 'WEB_FETCH_TOO_LARGE',
      redirectCode: 'WEB_REDIRECT_BLOCKED',
    });

    return mapFetchResponse(body, url, options.fetchMaxChars);
  }
}

/**
 * Reject missing/non-HTTP(S)/oversized URLs and URLs with embedded credentials.
 * The hostname check is a best-effort blocklist for obviously local or
 * non-public destinations. It is not a DNS-rebinding/SSRF boundary: Ollama
 * performs the request from its own network.
 */
export function validateFetchUrl(input: unknown): URL {
  if (
    typeof input !== 'string'
    || input.length === 0
    || input.length > MAX_FETCH_URL_LENGTH
  ) {
    throw invalidUrlError();
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw invalidUrlError();
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw invalidUrlError('Ollama web fetch URL must use http or https');
  }
  if (url.username !== '' || url.password !== '') {
    throw blockedUrlError('Ollama web fetch URL must not contain credentials');
  }
  if (isBlockedFetchHostname(url.hostname)) {
    throw blockedUrlError('Ollama web fetch URL must be a public destination');
  }
  return url;
}

/** Whether a hostname is an obvious local/non-public destination. */
export function isBlockedFetchHostname(rawHostname: string): boolean {
  const hostname = stripIpv6Brackets(rawHostname.toLowerCase()).replace(/\.+$/u, '');
  if (
    hostname === 'localhost'
    || hostname.endsWith('.localhost')
    || hostname.endsWith('.local')
    || hostname.endsWith('.internal')
    || hostname === 'home.arpa'
    || hostname.endsWith('.home.arpa')
    || LOCAL_WILDCARD_DNS_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  ) {
    return true;
  }

  const family = isIP(hostname);
  if (family === 4) return isBlockedIpv4(hostname);
  if (family === 6) return isBlockedIpv6(hostname);
  return false;
}

function stripIpv6Brackets(hostname: string): string {
  return hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname;
}

function isBlockedIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map(Number);
  const [a, b] = parts;
  if (a === undefined || b === undefined || parts.length !== 4) return false;
  if (parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;

  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51)
    || (a === 203 && b === 0)
    || a >= 224;
}

function isBlockedIpv6(hostname: string): boolean {
  // `::`, `::1`, IPv4-compatible addresses and IPv4-mapped addresses are all
  // loopback/transition forms; block the whole `::` family.
  if (hostname.startsWith('::')) return true;
  if (hostname.startsWith('fc') || hostname.startsWith('fd')) return true;
  if (/^fe[89a-f]/u.test(hostname)) return true;
  if (hostname.startsWith('ff')) return true;
  if (hostname.startsWith('2001:db8') || hostname.startsWith('2001:0db8')) return true;
  if (hostname.startsWith('64:ff9b:')) return true;
  return false;
}

/**
 * Map the Ollama response to DSH's `WebFetchResult`. DSH requires a status
 * code, but Ollama does not expose the target page's status or final URL; a
 * successful Ollama fetch is reported as HTTP 200 for the requested URL.
 */
export function mapFetchResponse(
  body: unknown,
  requestUrl: URL,
  maxChars: number,
): WebFetchResult {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw fetchError('Ollama web fetch returned an invalid response');
  }

  const record = body as OllamaFetchResponse;
  if (record.content !== undefined && typeof record.content !== 'string') {
    throw fetchError('Ollama web fetch returned invalid content');
  }

  const rawContent = typeof record.content === 'string' ? record.content : '';
  const title = typeof record.title === 'string'
    ? sanitizeTitle(record.title, MAX_TITLE_CHARS)
    : '';
  const links = collectLinks(record.links);
  if (rawContent.trim().length === 0 && title.length === 0 && links.length === 0) {
    throw fetchError('Ollama web fetch returned no content');
  }

  const header = title.length > 0 ? `# ${title}` : '';
  const footer = links.length > 0
    ? `Links:\n${links.map((link) => `- ${link}`).join('\n')}`
    : '';
  const normalized = sanitizeBlock(rawContent, maxChars + header.length + footer.length + 4);
  const separators = (header.length > 0 ? 2 : 0) + (footer.length > 0 ? 2 : 0);
  const available = Math.max(0, maxChars - header.length - footer.length - separators);
  const content = normalized.slice(0, available);
  const assembled = [header, content, footer]
    .filter((part) => part.length > 0)
    .join('\n\n');
  const text = assembled.slice(0, maxChars);

  return {
    url: requestUrl.toString(),
    statusCode: 200,
    body: { kind: 'text', content: text },
    truncated: normalized.length > content.length || assembled.length > text.length,
  };
}

function collectLinks(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const links: string[] = [];
  for (const item of value) {
    if (links.length >= MAX_LINKS) break;
    const sanitized = sanitizeSourceUrl(item);
    if (sanitized === undefined || seen.has(sanitized)) continue;
    seen.add(sanitized);
    links.push(sanitized);
  }
  return links;
}
