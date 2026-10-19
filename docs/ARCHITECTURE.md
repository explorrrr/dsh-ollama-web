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

The browser half (`client.js`) ships in the same npm package and never talks to
Ollama. It renders a configuration card plus the update and support sections on
the bundle detail page, and writes settings through the DSH Plugin Manager's
`configForms` transport. Both the card and the detail page show an optional
static donation link; the link is inert until clicked and adds no external
network call to the plugin.

## Update flow

```text
[Configure card / bundle detail section]
  -> DSH connection.rpc.call('/ollama-web-update', method, payload)
  -> Host RPC (Web: connection.rpc.handle; desktop: /api exact fetch routes)
  -> UpdateService
       -> npm registry / npmmirror packument for dsh-ollama-web
       -> running DSH version + release engines.dsh compatibility gate
       -> SHA-512 SRI check -> safe tar extraction -> staging
       -> atomic rename of the installed package dir (+ rollback)
       -> <profile>/data/dsh-ollama-web/update-state.json
  -> UpdateStatus
```

The update service never reads the Ollama API key, search query or session
state. The client bundle never makes an external network request; it only uses
the same-origin Connection RPC.

## Package modules

| Module | Role |
|---|---|
| `src/index.ts` | Plugin shape: `name`, `inject`, `Config`, `apply`; update service and RPC registration |
| `src/config.ts` | Schema, defaults, endpoint validation, key resolution |
| `src/provider.ts` | `OllamaSearchProvider` and response mapping |
| `src/http.ts` | POST, deadline, redirect refusal, byte cap, status mapping |
| `src/credentials.ts` | (part of `config.ts`) literal -> credentials -> launch env |
| `src/sanitize.ts` | URL scheme, Markdown-safe URL/title/metadata sanitization |
| `src/errors.ts` | `WebError` helpers |
| `src/update/types.ts` | Update status, compatibility result, error codes, stored state |
| `src/update/semver.ts` | Stable/prerelease comparison and `engines.dsh` range matching |
| `src/update/dsh.ts` | Read the running DSH version from the host environment |
| `src/update/http.ts` | Limited JSON/byte fetch for update metadata and tarballs |
| `src/update/registry.ts` | Packument parsing, registry fallback, optional `minimumReleaseAge` |
| `src/update/tar.ts` | Safe `package/` tar extraction |
| `src/update/install.ts` | Install detection, staging, SRI, swap/rollback, crash recovery |
| `src/update/lock.ts` | Profile-wide install lock and stale-lock recovery |
| `src/update/state.ts` | Atomic prefs/state/journal persistence |
| `src/update/service.ts` | Check/install/auto-update orchestration |
| `src/update/rpc.ts` | `/ollama-web-update` dispatch and route registration |
| `client.js` | Browser half: row config card, update section, locale and styles |

## Client bundle

`client.js` registers `window.__ModuleLoader__.load({ id: 'dsh-ollama-web' })`.
DSH attaches the browser half to the Loader row whose specifier is the bare
package name (`ollama-web` -> `dsh-ollama-web`). The bundle registers the
`plugins.row.config` card keyed `dsh-ollama-web#ollama-web` and the
`plugins.detail.section` update section.

## IDs

- Provider id: `ollama`
- Host loader row: `ollama-web`
- Config namespace: `ollama-web`
- Client card key: `dsh-ollama-web#ollama-web`
- Client module id: `dsh-ollama-web`
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
| SHA-512 mismatch | `integrity` |
| Unsafe/invalid/oversized archive | `archive` |
| Missing files, wrong manifest, missing client half, unresolved dependency | `package-invalid` |
| `file:`/`link:` install | `linked` |
| Package/profile missing | `no-install`, `no-profile` |
| Directory replacement refused | `permission`, `install-failed` |
| State/prefs write failed | `state-write` |
| Configured `minimumReleaseAge` not reached | `age-limited` |
| Release `engines.dsh` excludes the running DSH | `incompatible-dsh` |
| Auto-update refused a major version | `major-blocked` |
| Already current | `no-update` |
| Another update running | `busy` |
