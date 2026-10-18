# Architecture

## Data flow

```text
[model tool call]
  -> dsh-tool-web (external-content notice, result caps)
  -> ctx.web.search()
  -> dsh-ollama-web host provider
  -> HTTPS POST https://ollama.com/api/web_search
  -> map {title,url,content} to {title,url,snippet}
```

The client package never talks to Ollama. It renders a configuration card and
writes settings through the DSH Plugin Manager's `configForms` transport. The
card also shows an optional static donation link; the link is inert until
clicked and adds no network call to the plugin.

## Host modules

| Module | Role |
|---|---|
| `src/index.ts` | Plugin shape: `name`, `inject`, `Config`, `apply` |
| `src/config.ts` | Schema, defaults, endpoint validation, key resolution |
| `src/provider.ts` | `OllamaSearchProvider` and response mapping |
| `src/http.ts` | POST, deadline, redirect refusal, byte cap, status mapping |
| `src/credentials.ts` | (part of `config.ts`) literal -> credentials -> launch env |
| `src/sanitize.ts` | URL scheme, title/snippet sanitization |
| `src/errors.ts` | `WebError` helpers |

## IDs

- Provider id: `ollama`
- Host loader row: `ollama-web`
- Client loader row: `ollama-web-client`
- Config namespace: `ollama-web`
- Client card key: `dsh-ollama-web#ollama-web`

## Error taxonomy

| Situation | Code |
|---|---|
| No API key | `WEB_PROVIDER_CREDENTIAL_MISSING` |
| Caller abort | `WEB_ABORTED` |
| Timeout | `WEB_PROVIDER_ERROR` |
| 401/403 | `WEB_PROVIDER_ERROR` (check key) |
| 429 | `WEB_PROVIDER_ERROR` (rate limited) |
| 5xx | `WEB_PROVIDER_ERROR` |
| Redirect | `WEB_PROVIDER_ERROR` (refused) |
| Oversized body | `WEB_PROVIDER_ERROR` |
| Invalid JSON/shape | `WEB_PROVIDER_ERROR` |

Messages never include the API key or query. Upstream error bodies are
discarded; only the status and a short classification are surfaced.
