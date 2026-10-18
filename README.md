# dsh-ollama-web

English | [日本語](README.ja.md) | [中文](README.zh.md)

Ollama Cloud web search provider for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH), with a Web UI settings card. It replaces only the `web_search` backend: no DeepSeek API key, no DeepSeek provider, no fallback. `web_fetch` stays on DSH's built-in HTTP provider, which already has SSRF guards.

[![Support via Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?style=flat-square&logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/explorrrr)

- Search endpoint defaults to `https://ollama.com/api/web_search`
- Configure the API key in the card (write-only) or via `OLLAMA_API_KEY`
- Update checks, install, and opt-in auto-update are included
- Ollama `web_fetch` is not part of 1.x

## Requirements

- DSH 0.2.1-rc.2 (peer `>=0.2.1-rc.1 <0.3.0`), tested on this version
- DSH 0.3.x is not supported yet (planned for 2.0); see [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md)
- Node.js >= 20.3
- An Ollama Cloud API key from <https://ollama.com/settings/keys>

## Install

The host package provides the `web_search` backend; the client package provides the settings card. Install both at the same version.

1. Add the packages.

   ```bash
   dsh plugin --profile desktop add dsh-ollama-web@1.1.0
   dsh plugin --profile desktop add dsh-ollama-web-client@1.1.0
   ```

   Replace `desktop` with your profile name if needed. You can also use **Plugins -> Add plugin** twice in the Web UI. npm: [dsh-ollama-web](https://www.npmjs.com/package/dsh-ollama-web) / [dsh-ollama-web-client](https://www.npmjs.com/package/dsh-ollama-web-client)

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

1.0.x has no updater. Install the current version once manually as shown above; later 1.1.x releases can update from the card (see the Updates section below).

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
| `apiKey` | unset | Secret; prefer the card or `OLLAMA_API_KEY` |

`apiKeyEnv` accepts only `OLLAMA_*` names. Other environment variables and credential references are rejected before a request is made.

## Usage

Ask the model to search, then check that results come from Ollama. The search request body contains only the query and `max_results`; the API key is sent in the `Authorization: Bearer` header. The default endpoint is `https://ollama.com/api/web_search`.

### If the settings card does not appear

1. Confirm `dsh-ollama-web-client` is installed and its bundle is enabled.
2. Refresh the Web page.
3. Check that the host package name is `dsh-ollama-web` and the row is `ollama-web` (the card key is `dsh-ollama-web#ollama-web`).
4. Fall back to the patch configuration above; the host works without the card.

## Updates

As of 1.1.0, **Plugins -> `dsh-ollama-web` -> Configure** (or the bundle detail page) shows an Updates section. Use **Check for updates** / **Install update**, then restart DSH (quit and reopen the desktop app) to load the new version.

- **Check:** the host reads the npm registry (fallback: npmmirror) and honours the profile's pnpm `minimumReleaseAge` (default 60 minutes when unset). A release that is too new is shown as waiting instead of being installed.
- **Install:** downloads both tarballs, verifies the npm SHA-512 integrity and the archive, then atomically replaces the installed host/client copies. A failed swap rolls both copies back.
- **Auto-update (opt-in):** off by default. When enabled, the host checks every 6 hours and installs a newer **same-major** release. Major updates require the explicit button.
- **Caveats:** a `link:` or external-directory development install is never modified. DSH 0.2.1 has no third-party update API, so the updater replaces installed files directly. The profile's `package.json` and `pnpm-lock.yaml` still record the previous version; reinstall through **Plugins** (or the CLI) if you want those records updated.

See [docs/UPDATES.md](docs/UPDATES.md) for details.

## Security

- Host plugins run in-process, outside the workspace sandbox. Review plugins before installing and pin versions.
- Search is HTTPS-only, refuses redirects, caps response/query/snippet sizes, and allows only `http(s)` result URLs.
- No query or API key logging, no telemetry, no custom session events.
- Search contacts only `ollama.com` by default. Updates contact the npm registry (fallback: npmmirror) only on explicit action or while auto-update is enabled, and send only package names. Changing `baseURL` changes where the key and queries go.
- Update tarballs are checked against the npm SHA-512 integrity; symlinks, traversal and oversized entries are rejected. No npm lifecycle script runs.
- Auto-update installs new code without a prompt. It is opt-in and limited to the current major version.
- The client card makes no third-party external request. It reads update state and performs update actions only through DSH's same-origin Connection RPC to the host. It does not use `innerHTML` / `dangerouslySetInnerHTML`.
- Published packages carry npm provenance. See [docs/PROVENANCE.md](docs/PROVENANCE.md) and [docs/SMOKE-RESULTS.md](docs/SMOKE-RESULTS.md) for verification records, and [SECURITY.md](SECURITY.md) / [docs/SECURITY.md](docs/SECURITY.md) for the full policy.

## Support

If `dsh-ollama-web` saves you time, you can support its development with a coffee at [Buy Me a Coffee](https://buymeacoffee.com/explorrrr). You can also use the GitHub **Sponsor** button. Donations are optional and do not unlock features or change the license.

The link in the settings card makes no request to Buy Me a Coffee until you click it. The plugin does not read or store donation information.

## Development

```bash
pnpm install
pnpm verify
```

`pnpm verify` runs typecheck, build, test and check. To run them individually, use `pnpm typecheck`, `pnpm build`, `pnpm test` and `pnpm check`.

The host tests use mocked `fetch`; e2e tests are opt-in with `OLLAMA_API_KEY`. The client tests load the browser bundle in a VM with fake React/primitives.

- Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Versioning and release: [docs/VERSIONING.md](docs/VERSIONING.md)
- Changelog: [CHANGELOG.md](CHANGELOG.md) / [GitHub Releases](https://github.com/explorrrr/dsh-ollama-web/releases)

## License

MIT. See [LICENSE](LICENSE). Not affiliated with Ollama or DeepSeek. Ollama is a trademark of its owner.
