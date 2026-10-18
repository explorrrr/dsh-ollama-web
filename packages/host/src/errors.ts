import { WebError } from '@deepseek-ai/dsh-web';

/** A provider/transport failure. Messages never carry the key or query. */
export function providerError(message: string, cause?: unknown): WebError {
  return new WebError(message, 'WEB_PROVIDER_ERROR', cause === undefined ? undefined : { cause });
}

/** The caller's AbortSignal fired. */
export function abortedError(cause?: unknown): WebError {
  return new WebError('Ollama web search aborted', 'WEB_ABORTED', cause === undefined ? undefined : { cause });
}

/** No credential could be resolved for the configured reference. */
export function missingCredentialError(reference: string): WebError {
  return new WebError(
    `Ollama web search has no API key for "${reference}"; store it through the credentials service, `
      + `set the ${reference} environment variable, or set a literal "apiKey" in the ollama-web config`,
    'WEB_PROVIDER_CREDENTIAL_MISSING',
  );
}
