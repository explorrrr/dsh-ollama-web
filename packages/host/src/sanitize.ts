const CONTROL_CHARS = /[\u0000-\u001F\u007F]+/g;
const BLOCK_CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const WHITESPACE = /\s+/g;
const MARKDOWN_URL_CHARS = /[()[\]<>\\|]/g;

/** Collapse control characters/whitespace and cap a model-visible string. */
export function sanitizeInline(value: string, max: number): string {
  return value.replace(CONTROL_CHARS, ' ').replace(WHITESPACE, ' ').trim().slice(0, max);
}

/**
 * Sanitize a multi-line block while preserving Markdown line breaks and tabs.
 * CRLF is normalized to LF and other C0 controls/NUL are removed.
 */
export function sanitizeBlock(value: string, max: number): string {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(BLOCK_CONTROL_CHARS, '')
    .slice(0, max);
}

/**
 * Titles are used as Markdown link labels by the DSH web tool. Removing square
 * brackets keeps a hostile title from breaking out of `[label](url)`; removing
 * angle brackets and backslashes also blocks autolinks and escaped delimiters.
 */
export function sanitizeTitle(value: string, max = 300): string {
  return sanitizeInline(sanitizeInline(value, max).replace(/[[\]<>\\]/g, ''), max);
}

/** Remove Markdown delimiters from short metadata such as a publish date. */
export function sanitizeMetadata(value: string, max: number): string {
  return sanitizeInline(sanitizeInline(value, max).replace(/[[\]()<>\\]/g, ''), max);
}

function parseHttpUrl(value: unknown): URL | undefined {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) return undefined;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
  if (url.username !== '' || url.password !== '') return undefined;
  return url;
}

/** True for a credential-free http(s) URL. */
export function isHttpUrl(value: string): boolean {
  return parseHttpUrl(value) !== undefined;
}

/**
 * Validate a source URL and percent-encode characters that could terminate or
 * alter the Markdown link destination used by the DSH web tool.
 */
export function sanitizeSourceUrl(value: unknown): string | undefined {
  const url = parseHttpUrl(value);
  if (url === undefined) return undefined;
  const encoded = url.href.replace(
    MARKDOWN_URL_CHARS,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return encoded.length <= 2048 ? encoded : undefined;
}
