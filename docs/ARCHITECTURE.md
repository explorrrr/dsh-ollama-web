# Architecture

## Data flow

```text
[model tool call]
  -> dsh-tool-web (external-content notice, result caps)
  -> ctx.web.search()
  -> dsh-ollama-web search provider
  -> HTTPS POST https://ollama.com/api/web_search
  -> map {title,url,content} to {title,url,snippet}

[optional model tool call]
  -> dsh-tool-web
  -> ctx.web.fetch()
  -> dsh-ollama-web fetch provider (only when enabled and pinned)
  -> HTTPS POST https://ollama.com/api/web_fetch
  -> map {title,content,links} to WebFetchResult (text, synthetic status 200)
```

The browser half (`client.js`) ships in the same npm package and never talks to
Ollama. It renders a configuration card plus the update and support sections on
the bundle detail page, and writes settings through the DSH Plugin Manager's
`configForms` transport. Both the card and the detail page show an optional
static donation link; the link is inert until clicked and adds no external
network call to the plugin.

## Provider selection flow

```text
[Configure card: Use Ollama for web search/fetch]
  -> ctx.configForms.get('web')
  -> settings mutate [web.searchProvider / web.fetchProvider]
  -> live @deepseek-ai/dsh-web provider selection
  -> the card also writes the row's enableFetchProvider through its own form
```

The card is opt-in: the host bundle still does not set `web.searchProvider` or
`web.fetchProvider` in `cordis.patch.yml`. The card displays the effective
`web` value so a user can see which provider DSH is using when Ollama is not
selected. A `web` profile patch replaces the whole row config; the card writes
both provider fields when it changes a selection and fills a missing
`fetchProvider` with `http`, and warns when the composed row has only one field.
`DSH_WEB_SEARCH_PROVIDER` / `DSH_WEB_FETCH_PROVIDER` environment overrides are
applied by the host at runtime and are not visible to the card.

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

The update service never reads the Ollama API key, search query, fetch URL or
session state. It does not run pnpm or any package lifecycle script. The client
bundle never makes an external network request; it only uses the same-origin
Connection RPC.

## Package modules

| Module | Role |
|---|---|
| `src/index.ts` | Plugin shape: `name`, `inject`, `Config`, `apply`; update service and RPC registration |
| `src/config.ts` | Schema, defaults, endpoint validation, key resolution, search/fetch error isolation |
| `src/provider.ts` | `OllamaSearchProvider` and response mapping |
| `src/fetch-provider.ts` | `OllamaFetchProvider`, fetch URL policy, response mapping |
| `src/http.ts` | POST, deadline, redirect refusal, byte cap, status/error mapping |
| `src/credentials.ts` | (part of `config.ts`) literal -> credentials -> launch env |
| `src/sanitize.ts` | URL scheme, Markdown-safe URL/title/metadata and multi-line block sanitization |
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
`plugins.row.config` card keyed `dsh-ollama-web#ollama-web`, the
`plugins.detail.section` update/support sections, provider-selection switches
that write the `web` settings namespace, and a live fetch-provider toggle with
its own static stylesheet.

## IDs

- Search provider id: `ollama`
- Fetch provider id: `ollama` (separate DSH fetch registry)
- Built-in HTTP fetch provider id: `http`
- Host loader row: `ollama-web`
- Config namespace: `ollama-web`
- Web provider settings namespace: `web`
- Client card key: `dsh-ollama-web#ollama-web`
- Client module id: `dsh-ollama-web`
- Update RPC channel: `/ollama-web-update`
- Update data directory: `<profile>/data/dsh-ollama-web/`

## Error taxonomy

| Situation | Search code | Fetch code |
|---|---|---|
| No API key | `WEB_PROVIDER_CREDENTIAL_MISSING` | `WEB_PROVIDER_CREDENTIAL_MISSING` |
| Caller abort | `WEB_ABORTED` | `WEB_ABORTED` |
| Timeout | `WEB_PROVIDER_ERROR` | `WEB_FETCH_TIMEOUT` |
| Invalid URL | — | `WEB_INVALID_URL` |
| Credentials/private target | — | `WEB_BLOCKED_URL` |
| 401/403 | `WEB_PROVIDER_ERROR` (check key) | `WEB_PROVIDER_ERROR` (check key) |
| 429 | `WEB_PROVIDER_ERROR` (rate limited) | `WEB_PROVIDER_ERROR` (rate limited) |
| 5xx | `WEB_PROVIDER_ERROR` | `WEB_PROVIDER_ERROR` |
| Redirect | `WEB_PROVIDER_ERROR` (refused) | `WEB_REDIRECT_BLOCKED` |
| Oversized body | `WEB_PROVIDER_ERROR` | `WEB_FETCH_TOO_LARGE` |
| Invalid JSON/shape | `WEB_PROVIDER_ERROR` | `WEB_PROVIDER_ERROR` |
| Disabled/unconfigured provider | — | `WEB_PROVIDER_UNAVAILABLE` / `WEB_PROVIDER_CONFIGURED_UNAVAILABLE` |

Messages never include the API key, query or fetch URL. Upstream error bodies
are discarded; only the status and a short classification are surfaced. The
fetch provider reports a successful Ollama call as `statusCode: 200` because
Ollama does not expose the target page's status or final URL.

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
