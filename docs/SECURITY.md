# Security notes

## Trust boundary

`dsh-ollama-web` is a DSH host plugin. It runs in the Node.js main process and
is not confined by the workspace sandbox. It can read the user's files,
credentials and sessions if it is malicious or compromised. The reviewed code
only reads the configured Ollama API key and the search query, but users should
still treat installing/updating this plugin as a trust decision.

The client package runs in the Web GUI origin. Its bundle is intentionally
small: no `fetch`, no storage, no HTML sinks, no `postMessage`; it only
registers a `plugins.row.config` slot and calls `form.mutate`.

## Data flow

| Data | Destination | Notes |
|---|---|---|
| API key | `Authorization: Bearer` header | Only to the configured HTTPS endpoint |
| Query, `max_results` | `/api/web_search` | No session/user identifiers |
| Response results | Local model context | Stored by DSH as a tool result |
| Settings | DSH host settings/credentials | Key is write-only |

Default endpoint: `https://ollama.com`. Changing `baseURL` changes where the
key and queries go; HTTPS is enforced, redirects are refused, but the operator
is responsible for the destination.

## Controls

- HTTPS-only endpoint, no userinfo/query/fragment.
- Same-origin path validation; `..`, `?`, `#` and protocol-relative paths are
  rejected.
- `redirect: "error"`.
- Response byte cap, query cap, snippet cap and result cap.
- `http(s)`-only result URLs; username/password URLs dropped.
- Titles have square brackets removed so a hostile title cannot break the
  Markdown link label.
- No logging, telemetry or custom session events.
- Credentials are resolved per operation; a credentials-service failure is
  surfaced instead of silently falling back.

## Residual risks

- The host-plugin trust boundary is inherent to DSH.
- A compromised Ollama endpoint can return hostile content; DSH labels search
  results as external data, but prompt injection cannot be eliminated.
- The API key is account-scoped by Ollama; a leak can consume model/search
  quota. Use a dedicated key and monitor usage.
- `web_fetch` stays on DSH's local HTTP provider in 1.0; an Ollama fetch provider
  is deferred because its status-code semantics do not match the DSH contract.
