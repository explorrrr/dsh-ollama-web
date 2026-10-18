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
the bundle update section, and writes settings through the DSH Plugin Manager's
`configForms` transport. The card also shows an optional static donation link;
the link is inert until clicked and adds no external network call to the plugin.

## Update flow

```text
[Configure card / bundle detail section]
  -> DSH connection.rpc.call('/ollama-web-update', method, payload)
  -> Host RPC (Web: connection.rpc.handle; desktop: /api exact fetch routes)
  -> UpdateService
       -> npm registry / npmmirror packuments
       -> SHA-512 SRI check -> safe tar extraction -> staging
       -> atomic rename of the installed host/client dirs (+ rollback)
       -> <profile>/data/dsh-ollama-web/update-state.json
  -> UpdateStatus
```

The update service never reads the Ollama API key, search query or session
state. The client never makes an external network request; it only uses the
same-origin Connection RPC.

## Host modules

| Module | Role |
|---|---|
| `src/index.ts` | Plugin shape: `name`, `inject`, `Config`, `apply`; update service and RPC registration |
| `src/config.ts` | Schema, defaults, endpoint validation, key resolution |
| `src/provider.ts` | `OllamaSearchProvider` and response mapping |
| `src/http.ts` | POST, deadline, redirect refusal, byte cap, status mapping |
| `src/credentials.ts` | (part of `config.ts`) literal -> credentials -> launch env |
| `src/sanitize.ts` | URL scheme, title/snippet sanitization |
| `src/errors.ts` | `WebError` helpers |
| `src/update/types.ts` | Update status, error codes, stored state |
| `src/update/semver.ts` | Stable/prerelease comparison |
| `src/update/http.ts` | Limited JSON/byte fetch for update metadata and tarballs |
| `src/update/registry.ts` | Packument parsing, registry fallback, `minimumReleaseAge` |
| `src/update/tar.ts` | Safe `package/` tar extraction |
| `src/update/install.ts` | Install detection, staging, SRI, atomic swap/rollback |
| `src/update/state.ts` | Atomic prefs/state persistence |
| `src/update/service.ts` | Check/install/auto-update orchestration |
| `src/update/rpc.ts` | `/ollama-web-update` dispatch and route registration |

## IDs

- Provider id: `ollama`
- Host loader row: `ollama-web`
- Client loader row: `ollama-web-client`
- Config namespace: `ollama-web`
- Client card key: `dsh-ollama-web#ollama-web`
- Update RPC channel: `/ollama-web-update`
- Update data directory: `<profile>/data/dsh-ollama-web/`

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

## Update error taxonomy

| Situation | Code |
|---|---|
| Registry/tarball unavailable | `network`, `timeout` |
| Registry error or invalid metadata | `registry-status`, `registry-json` |
| Host/client latest versions differ | `release-mismatch` |
| SHA-512 mismatch | `integrity` |
| Unsafe/invalid/oversized archive | `archive` |
| Missing files, wrong manifest, unresolved dependency | `package-invalid` |
| `file:`/`link:` install | `linked` |
| Package/profile missing | `no-install`, `no-profile` |
| Directory replacement refused | `permission`, `install-failed` |
| State/prefs write failed | `state-write` |
| `minimumReleaseAge` not reached | `age-limited` |
| Auto-update refused a major version | `major-blocked` |
| Already current | `no-update` |
| Another update running | `busy` |
