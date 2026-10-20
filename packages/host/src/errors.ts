import { WebError } from '@deepseek-ai/dsh-web';

/** A provider/transport failure. Messages never carry the key or URL. */
export function providerError(message: string, cause?: unknown): WebError {
  return new WebError(message, 'WEB_PROVIDER_ERROR', cause === undefined ? undefined : { cause });
}

/** A fetch-provider failure with a specific DSH error code. */
export function fetchError(
  message: string,
  code: string = 'WEB_PROVIDER_ERROR',
  cause?: unknown,
): WebError {
  return new WebError(message, code, cause === undefined ? undefined : { cause });
}

/** The caller's AbortSignal fired. */
export function abortedError(cause?: unknown): WebError {
  return new WebError('Ollama web request aborted', 'WEB_ABORTED', cause === undefined ? undefined : { cause });
}

/** The request URL is missing, malformed, too long or not HTTP(S). */
export function invalidUrlError(message = 'Ollama web fetch URL must be a valid http(s) URL'): WebError {
  return new WebError(message, 'WEB_INVALID_URL');
}

/** The request URL contains credentials or an obviously non-public destination. */
export function blockedUrlError(message = 'Ollama web fetch URL is not allowed'): WebError {
  return new WebError(message, 'WEB_BLOCKED_URL');
}

/** No credential could be resolved for the configured reference. */
export function missingCredentialError(reference: string, operation = 'web search'): WebError {
  return new WebError(
    `Ollama ${operation} has no API key for "${reference}"; store it through the credentials service, `
      + `set the ${reference} environment variable, or set a literal "apiKey" in the ollama-web config`,
    'WEB_PROVIDER_CREDENTIAL_MISSING',
  );
}
