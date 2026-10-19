import type {
  WebSearchProvider,
  WebSearchRequest,
  WebSearchResult,
  WebSearchSource,
} from '@deepseek-ai/dsh-web';
import { providerError } from './errors.js';
import { postJsonWithLimit } from './http.js';
import { sanitizeInline, sanitizeMetadata, sanitizeSourceUrl, sanitizeTitle } from './sanitize.js';
import type { ResolvedOptions } from './config.js';

export const OLLAMA_PROVIDER_ID = 'ollama';

export class OllamaSearchProvider implements WebSearchProvider {
  readonly id = OLLAMA_PROVIDER_ID;

  constructor(private readonly resolveOptions: () => ResolvedOptions) {}

  available(): boolean {
    return this.resolveOptions().configError === undefined;
  }

  async search(request: WebSearchRequest, signal?: AbortSignal): Promise<WebSearchResult> {
    const options = this.resolveOptions();
    if (options.configError !== undefined) throw providerError(options.configError);
    if (options.endpoint === undefined) throw providerError('Ollama web search endpoint is not configured');

    const query = validateQuery(request.query, options.maxQueryChars);
    const apiKey = await options.resolveApiKey();
    const maxResults = clampRequestedResults(request.maxResults, options.maxResults);

    const body = await postJsonWithLimit({
      url: options.endpoint,
      body: { query, max_results: maxResults },
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      ...(signal === undefined ? {} : { signal }),
      timeoutMs: options.searchTimeoutMs,
      maxBytes: options.maxResponseBytes,
    });

    return mapResponse(body, options.snippetMax, maxResults);
  }
}

function validateQuery(query: unknown, maxChars: number): string {
  if (typeof query !== 'string' || query.trim().length === 0) {
    throw providerError('Ollama web search query must be a non-empty string');
  }
  if (query.length > maxChars) {
    throw providerError(`Ollama web search query exceeds ${maxChars} characters`);
  }
  return query;
}

function clampRequestedResults(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return Math.min(value, 10);
  }
  return fallback;
}

function mapResponse(body: unknown, snippetMax: number, maxResults: number): WebSearchResult {
  if (body === null || typeof body !== 'object' || !Array.isArray((body as { results?: unknown }).results)) {
    throw providerError('Ollama web search returned no results array');
  }

  const items = (body as { results: unknown[] }).results;
  const seen = new Set<string>();
  const sources: WebSearchSource[] = [];
  let truncated = false;

  for (const item of items) {
    if (item === null || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const url = sanitizeSourceUrl(record.url);
    if (url === undefined || seen.has(url)) continue;
    if (sources.length >= maxResults) {
      truncated = true;
      break;
    }
    seen.add(url);

    const title = typeof record.title === 'string' ? sanitizeTitle(record.title) : '';
    const content = typeof record.content === 'string' ? sanitizeInline(record.content, snippetMax) : '';
    const published = typeof record.publishedAt === 'string'
      ? record.publishedAt
      : typeof record.page_age === 'string'
        ? record.page_age
        : undefined;
    const publishedAt = published === undefined ? '' : sanitizeMetadata(published, 64);

    const source: WebSearchSource = {
      url,
      ...(title.length > 0 ? { title } : {}),
      ...(content.length > 0 ? { snippet: content } : {}),
      ...(publishedAt.length > 0 ? { publishedAt } : {}),
    };
    sources.push(source);
  }

  return { sources, truncated };
}
