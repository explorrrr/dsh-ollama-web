# Security notes

## Trust boundary

`dsh-ollama-web` is a DSH host plugin. It runs in the Node.js main process and
is not confined by the workspace sandbox. It can read the user's files,
credentials and sessions if it is malicious or compromised. The reviewed code
only reads the configured `OLLAMA_*` API-key reference and the search query, but
users should still treat installing/updating this plugin as a trust decision.

The client package runs in the Web GUI origin. Its bundle is intentionally
small: no external `fetch`, no storage, no HTML sinks (`innerHTML` /
`dangerouslySetInnerHTML`), no `postMessage`, no `window.open`. It registers a
`plugins.row.config` slot and a `plugins.detail.section`, calls `form.mutate`,
asks the host's update service through DSH's same-origin `connection.rpc` when
the user invokes an update action, and injects two static `<style>` elements for
the support and update sections. The donation link is a plain HTTPS anchor; the
card sends nothing until the user clicks it.

## Data flow

| Data | Destination | Notes |
|---|---|---|
| API key | `Authorization: Bearer` header | Only to the configured HTTPS endpoint |
| Query, `max_results` | `/api/web_search` | No session/user identifiers |
| Response results | Local model context | Stored by DSH as a tool result |
| Settings | DSH host settings/credentials | Key is write-only |
| Update package names, metadata, tarballs | npm registry / npmmirror | Only on Check/Install or while auto-update is enabled |
| Update state/preferences | `<profile>/data/dsh-ollama-web/` | No secrets; mode 0o600 |

Default search endpoint: `https://ollama.com`. Changing `baseURL` changes where
the key and queries go; HTTPS is enforced, redirects are refused, but the
operator is responsible for the destination.

## Controls

- HTTPS-only search endpoint, no userinfo/query/fragment.
- `apiKeyEnv` must match `^OLLAMA_[A-Za-z0-9_]+$`; other environment or
  credential references are rejected before a request is made.
- Same-origin path validation that also keeps `searchPath` under the
  `baseURL` path prefix. Literal and percent-encoded `..`, `?`, `#`,
  backslashes and protocol-relative paths are rejected.
- `redirect: "error"`.
- Response byte cap, query cap, snippet cap and result cap.
- `http(s)`-only result URLs; username/password URLs dropped.
- Titles have square brackets removed so a hostile title cannot break the
  Markdown link label.
- No logging, telemetry or custom session events.
- Credentials are resolved per operation; a credentials-service failure is
  surfaced instead of silently falling back.
- Update metadata/tarballs are HTTPS-only, redirect-refused and size/time capped.
- Update tarballs are checked against the npm SHA-512 SRI before extraction.
- The tar extractor admits only regular files/directories under `package/` and
  rejects traversal, symlinks, hardlinks, devices, duplicates and oversized
  entries.
- No npm/pnpm command or lifecycle script runs during an update.
- Auto-update is opt-in, same-major only, and respects `minimumReleaseAge`.
- Linked development installs are never modified.
- The update RPC accepts no client-supplied version, URL, path or spec.

## Residual risks

- The host-plugin trust boundary is inherent to DSH.
- A compromised Ollama endpoint can return hostile content; DSH labels search
  results as external data, but prompt injection cannot be eliminated.
- The API key is account-scoped by Ollama; a leak can consume model/search
  quota. Use a dedicated key and monitor usage.
- The update trust boundary is the npm registry/npmmirror, TLS and the npm
  account. SRI detects transport/archive tampering, not a compromised registry.
  Provenance is published but the updater does not verify Sigstore itself.
- Auto-update installs new code without a prompt. It is opt-in and limited to
  the same major version; users who need review should leave it off.
- The updater replaces installed files directly. The profile's
  `package.json` / `pnpm-lock.yaml` still record the previous version and a later
  pnpm operation can reinstall it; see [UPDATES.md](UPDATES.md).
- `web_fetch` stays on DSH's local HTTP provider in 1.x; an Ollama fetch provider
  is deferred because its status-code semantics do not match the DSH contract.
