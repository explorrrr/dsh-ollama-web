# Security Policy

## Reporting a vulnerability

Please report security issues through GitHub's **private vulnerability
reporting** for this repository. Do not open a public issue with exploit
details, API keys or user data.

Include the affected version, DSH version, a minimal reproduction and the
impact you observed. We will acknowledge the report and coordinate a fix and
disclosure timeline.

## Supported versions

| Version | Supported |
|---|---|
| 1.0.x | Yes |
| < 1.0 | No |

## Security model

This is a DSH **host plugin**. DSH runs installed host plugins in the Node.js
main process, outside the workspace sandbox. A plugin can therefore read the
user's files, credentials and sessions if it is malicious or compromised. That
is a property of the plugin platform, not of this specific code; install only
plugins you trust, pin versions and review updates.

The client package runs in the DSH Web GUI origin. It can access the page's
services, but this plugin's client bundle contains no network calls, storage
access or HTML sinks. Its optional donation link is a plain HTTPS anchor and
makes no request until the user clicks it.

## Data egress

By default the host contacts only `https://ollama.com`:

- `POST /api/web_search` with `{ query, max_results }`.
- The configured API key is sent only in the `Authorization: Bearer` header.

The plugin does not send session IDs, user IDs, conversation text or
filesystem data. Search queries and results are stored by DSH as ordinary tool
results in the session log.

If `baseURL` is changed, the operator chooses a different destination for the
key and queries. The plugin enforces HTTPS and refuses redirects, but it cannot
make an untrusted endpoint trustworthy.

## Key handling

- Prefer `OLLAMA_API_KEY` or the credentials service over a literal `apiKey`.
- The Web UI card is write-only: a saved key is never read back or displayed.
- Keys are not logged and are not included in provider error messages.
- Use a dedicated key and monitor Ollama usage/balance. Rotate the key if it is
  exposed.

## Fetch policy

Version 1.0 does not implement Ollama `/api/web_fetch`. `web_fetch` remains on
DSH's built-in HTTP provider, which applies URL validation, public-address
checks, DNS pinning and response caps. Do not enable an Ollama fetch provider
unless you have reviewed its SSRF and status-code semantics.
