# dsh-ollama-web

English | [日本語](README.ja.md) | [中文](README.zh.md)

Ollama Cloud web search and optional web fetch provider for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH), with a Web UI settings card. One npm package provides both the host backend and the browser card. Search uses Ollama; `web_fetch` stays on DSH's built-in HTTP provider unless you explicitly enable the optional Ollama fetch provider.

[![Support via Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?style=flat-square&logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/explorrrr)

- Search endpoint defaults to `https://ollama.com/api/web_search`
- Optional fetch endpoint defaults to `https://ollama.com/api/web_fetch`; off by default
- Configure the API key in the card (write-only) or via `OLLAMA_API_KEY`
- Update checks, install, and opt-in auto-update are included
- Default `web_fetch` remains the credential-free DSH HTTP provider

## Requirements

- DSH 0.2.1-rc.2 (peer `>=0.2.1-rc.1 <0.3.0`), tested on this version
- DSH 0.3.x is not supported yet (planned for 3.0); see [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md)
- Node.js >= 20.3
- An Ollama Cloud API key from <https://ollama.com/settings/keys>

## Install

One package provides the `web_search` backend, the optional fetch provider and the settings card. Install it once.

1. Add the package.

   ```bash
   dsh plugin --profile desktop add dsh-ollama-web@2.4.1
   ```

   Replace `desktop` with your profile name if needed. You can also use **Plugins -> Add plugin** in the Web UI. npm: [dsh-ollama-web](https://www.npmjs.com/package/dsh-ollama-web)

2. Pin the search provider in `~/.dsh/profiles/<profile>/cordis.patch.yml`.

   ```yaml
   - id: web
     config:
       searchProvider: ollama
       fetchProvider: http

   # Only if the built-in DeepSeek search provider is mounted.
   - id: web-search-deepseek
     disabled: true
   ```

   `fetchProvider: http` keeps `web_fetch` on DSH's built-in HTTP provider.

### Optional Ollama fetch provider

To use Ollama for `web_fetch`, enable the provider **and** pin it. Both entries are required:

```yaml
- id: web
  config:
    searchProvider: ollama
    fetchProvider: ollama

- id: ollama-web
  config:
    enableFetchProvider: true
```

`web` replaces its whole config, so keep `searchProvider: ollama` when you change `fetchProvider`. With only `enableFetchProvider: true`, `web_fetch` reports `WEB_PROVIDER_AMBIGUOUS` because both the HTTP and Ollama fetch providers are usable. With only `fetchProvider: ollama`, it reports `WEB_PROVIDER_CONFIGURED_UNAVAILABLE` because the Ollama provider is disabled. You can also enable the provider from the settings card, but the `web.fetchProvider: ollama` pin still belongs in the profile patch.

Ollama does not expose the target page's HTTP status or final redirect URL. A successful Ollama fetch is reported to DSH as `HTTP 200` for the requested URL; title, main content and links are folded into the text result. Keep `fetchProvider: http` when target status fidelity or DSH's local SSRF boundary matters.

### Upgrading from 1.x

2.0.0 merges the former `dsh-ollama-web-client` package into `dsh-ollama-web`. Remove the old package before installing 2.4.1:

```bash
dsh plugin --profile <profile> remove dsh-ollama-web-client
dsh plugin --profile <profile> add dsh-ollama-web@2.4.1
```

The 1.x updater checks both old packages and only auto-installs the current major. Because 2.0.0 is not published as a new `dsh-ollama-web-client`, it will not move you to 2.0.0; the upgrade is manual. In the desktop app, remove the `dsh-ollama-web-client` bundle in **Plugins**, then install `dsh-ollama-web@2.4.1`. Leaving the old client installed can register the settings card twice and is not supported.

## Configure

### API key

Enter it in the settings card (**Plugins -> `dsh-ollama-web` -> `ollama-web` -> Configure**), or set `OLLAMA_API_KEY` in the environment that launches DSH. The card is write-only: leaving the key blank keeps the current key, and a saved key is never shown again.

### Settings

| Field | Default | Constraint |
|---|---|---|
| `baseURL` | `https://ollama.com` | HTTPS only; no userinfo/query/fragment |
| `apiKeyEnv` | `OLLAMA_API_KEY` | `^OLLAMA_[A-Za-z0-9_]+$` |
| `searchPath` | `/api/web_search` | Absolute path under the baseURL path, same origin |
| `maxResults` | `5` | 1-10 |
| `snippetMax` | `2000` | 1-10000 characters |
| `maxQueryChars` | `2048` | 1-8192 characters |
| `searchTimeoutMs` | `30000` | 1000-120000 ms |
| `maxResponseBytes` | `2097152` | 65536-10485760 bytes |
| `fetchPath` | `/api/web_fetch` | Absolute path under the baseURL path, same origin |
| `fetchTimeoutMs` | `30000` | 1000-120000 ms |
| `fetchMaxChars` | `100000` | 1-200000 characters |
| `enableFetchProvider` | `false` | Live boolean; requires `web.fetchProvider: ollama` |
| `apiKey` | unset | Secret; prefer the card or `OLLAMA_API_KEY` |

`apiKeyEnv` accepts only `OLLAMA_*` names. Other environment variables and credential references are rejected before a request is made.

## Usage

Ask the model to search, then check that results come from Ollama. The search request body contains only the query and `max_results`; the API key is sent in the `Authorization: Bearer` header. The default endpoint is `https://ollama.com/api/web_search`.

When the optional fetch provider is enabled and pinned, `web_fetch` sends only `{ "url": "..." }` to `https://ollama.com/api/web_fetch` with the same Bearer key. Ollama returns `title`, main-content `content` and `links`; this plugin folds them into a text result and caps it at `fetchMaxChars`. The request URL is returned as the result URL and the status is always `200` on success, because Ollama does not expose the target status or final redirect URL.

### If the settings card does not appear

1. Confirm `dsh-ollama-web` is installed and its bundle is enabled.
2. Refresh the Web page.
3. Check that the package name is `dsh-ollama-web` and the row is `ollama-web` (the card key is `dsh-ollama-web#ollama-web`).
4. Fall back to the patch configuration above; the host works without the card.

## Updates

**Plugins -> `dsh-ollama-web` -> Configure** (or the bundle detail page) shows an Updates section. As of 2.2.0, the bundle detail page also shows the support card. Opening this screen performs a fresh check when the last successful check is older than five minutes; **Check for updates** always checks immediately. Use **Check for updates** / **Install update**, then restart DSH (quit and reopen the desktop app) to load the new version.

- **Check:** the host reads the npm registry (fallback: npmmirror) and honours the profile's pnpm `minimumReleaseAge` only when it is explicitly set. Unset, unreadable, invalid or `0` means no age wait. A release newer than a configured age is shown as waiting instead of being installed.
- **Compatibility:** the updater compares the release's `engines.dsh` with the running DSH version (`DSH_CLIENT_VERSION` or `DSH_APP_VERSION`). A known-incompatible release is blocked; if compatibility cannot be verified, auto-update pauses while the manual Install button remains available.
- **Install:** downloads one tarball, verifies the npm SHA-512 integrity and the archive, then atomically replaces the installed package. A failed swap rolls the previous copy back.
- **Auto-update (opt-in):** off by default. When enabled, the host checks every 6 hours and installs a newer **same-major** release that supports the running DSH. Major updates require the explicit button.
- **Caveats:** a `link:` or external-directory development install is never modified. DSH 0.2.1 has no third-party update API, so the updater replaces installed files directly. The profile's `package.json` and `pnpm-lock.yaml` still record the previous version; reinstall through **Plugins** (or the CLI) if you want those records updated.

See [docs/UPDATES.md](docs/UPDATES.md) for details.

## Security

- Host plugins run in-process, outside the workspace sandbox. Review plugins before installing and pin versions.
- Search is HTTPS-only, refuses redirects, caps response/query/snippet sizes, and allows only `http(s)` result URLs.
- The optional fetch provider sends the requested URL to Ollama. Ollama performs the fetch, so this provider does not provide DSH HTTP's local DNS-pinning/SSRF boundary. It rejects non-http(s) URLs, embedded credentials and obvious local/private destinations, but URLs are still disclosed to Ollama; do not use it for internal or secret-bearing URLs.
- No query, URL or API key logging, no telemetry, no custom session events.
- Search and optional fetch contact only `ollama.com` by default. Updates contact the npm registry (fallback: npmmirror) only on explicit action, while auto-update is enabled, or when the update screen opens after five minutes without a successful check, and send only the package name. Changing `baseURL` changes where the key, queries and fetch URLs go.
- Update tarballs are checked against the npm SHA-512 integrity; symlinks, traversal and oversized entries are rejected. No npm lifecycle script runs.
- Auto-update installs new code without a prompt. It is opt-in and limited to the current major version.
- The client card makes no third-party external request. It reads update state and performs update actions only through DSH's same-origin Connection RPC to the host. It does not use `innerHTML` / `dangerouslySetInnerHTML`.
- Release and self-review settings: [docs/RELEASE-HARDENING.md](docs/RELEASE-HARDENING.md).
- The published package carries npm provenance. See [docs/PROVENANCE.md](docs/PROVENANCE.md) and [docs/SMOKE-RESULTS.md](docs/SMOKE-RESULTS.md) for verification records, and [SECURITY.md](SECURITY.md) / [docs/SECURITY.md](docs/SECURITY.md) for the full policy.

## Support

If `dsh-ollama-web` saves you time, you can support its development with a coffee at [Buy Me a Coffee](https://buymeacoffee.com/explorrrr). You can also use the GitHub **Sponsor** button. Donations are optional and do not unlock features or change the license.

The support links in the settings card and on the bundle detail page make no request to Buy Me a Coffee until you click them. The plugin does not read or store donation information.

## Development

```bash
pnpm install
pnpm verify
```

`pnpm verify` runs typecheck, build, test and check. To run them individually, use `pnpm typecheck`, `pnpm build`, `pnpm test` and `pnpm check`.

The host tests use mocked `fetch`; search and fetch e2e tests are opt-in with `OLLAMA_API_KEY`. The client tests load the browser bundle in a VM with fake React/primitives.

- Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Versioning and release: [docs/VERSIONING.md](docs/VERSIONING.md)
- Changelog: [CHANGELOG.md](CHANGELOG.md) / [GitHub Releases](https://github.com/explorrrr/dsh-ollama-web/releases)

## License

MIT. See [LICENSE](LICENSE). Not affiliated with Ollama or DeepSeek. Ollama is a trademark of its owner.
