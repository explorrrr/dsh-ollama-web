const CONTROL_CHARS = /[\u0000-\u001F\u007F]+/g;
const WHITESPACE = /\s+/g;

/** Collapse control characters/whitespace and cap a model-visible string. */
export function sanitizeInline(value: string, max: number): string {
  return value.replace(CONTROL_CHARS, ' ').replace(WHITESPACE, ' ').trim().slice(0, max);
}

/**
 * Titles are used as Markdown link labels by the DSH web tool. Removing square
 * brackets keeps a hostile title from breaking out of `[label](url)`.
 */
export function sanitizeTitle(value: string, max = 300): string {
  return sanitizeInline(value, max).replace(/[[\]]/g, '');
}

/** True for a credential-free http(s) URL. */
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:')
      && url.username === ''
      && url.password === ''
    );
  } catch {
    return false;
  }
}

/** Validate a source URL before it reaches the DSH seam. */
export function isHttpSourceUrl(value: unknown): value is string {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= 2048
    && isHttpUrl(value);
}
