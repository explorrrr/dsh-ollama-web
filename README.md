# dsh-ollama-web

English | [日本語](README.ja.md) | [中文](README.zh.md)

Ollama Cloud web search provider for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH), with a Web UI settings card. It replaces only the `web_search` backend: no DeepSeek API key, no DeepSeek provider, no fallback.

`web_fetch` stays on DSH's built-in HTTP provider, which is free and already has SSRF guards. Ollama fetch is deliberately not part of 1.x.

## Status

- `dsh-ollama-web@1.1.0` and `dsh-ollama-web-client@1.1.0` are published on npm
  with **npm provenance** from GitHub Actions.
- GitHub Release: <https://github.com/explorrrr/dsh-ollama-web/releases/tag/v1.1.0>
- 1.1.0 adds update checks, an explicit **Install update** button, and opt-in
  auto-update. The Plugins Configure card was verified on DSH 0.2.1-rc.2 (see
  [docs/SMOKE-RESULTS.md](docs/SMOKE-RESULTS.md)).
- 1.0.x remains available but has no updater. Install 1.1.0 once manually;
  later 1.1.x releases can be updated from the card.
- Verify provenance with `npm view dsh-ollama-web@1.1.0 dist.attestations`;
  see [docs/PROVENANCE.md](docs/PROVENANCE.md).
- Versioning rules are documented in [docs/VERSIONING.md](docs/VERSIONING.md).

## Requirements

- DSH 0.2.1-rc.2 (peer range `>=0.2.1-rc.1 <0.3.0`)
- Node.js >= 20.3
- An Ollama Cloud API key from <https://ollama.com/settings/keys>

## Install

Install both packages. The host package provides search; the client package provides the Configure card.

```bash
dsh plugin --profile desktop add dsh-ollama-web@1.1.0
dsh plugin --profile desktop add dsh-ollama-web-client@1.1.0
```

Or use **Plugins -> Add plugin** in the Web UI twice.

Then pin the search provider in `~/.dsh/profiles/<profile>/cordis.patch.yml`:

```yaml
- id: web
  config:
    searchProvider: ollama
    fetchProvider: http

# Only if the built-in DeepSeek search provider is mounted.
- id: web-search-deepseek
  disabled: true
```

Set the key in the settings card (Plugins -> `dsh-ollama-web` -> `ollama-web` -> Configure), or export `OLLAMA_API_KEY` in the launching environment.

## Configure

| Field | Default | Constraint |
|---|---|---|
| `baseURL` | `https://ollama.com` | HTTPS only; no userinfo/query/fragment |
| `apiKeyEnv` | `OLLAMA_API_KEY` | `^[A-Za-z_][A-Za-z0-9_]*$` |
| `searchPath` | `/api/web_search` | Absolute path on the same origin |
| `maxResults` | `5` | 1-10 |
| `snippetMax` | `2000` | 1-10000 characters |
| `maxQueryChars` | `2048` | 1-8192 characters |
| `searchTimeoutMs` | `30000` | 1000-120000 ms |
| `maxResponseBytes` | `2097152` | 65536-10485760 bytes |
| `apiKey` | unset | Secret; prefer the card or `OLLAMA_API_KEY` |

The card is write-only for the API key: leaving the key blank keeps the current key, and a saved key is never shown again.

## Updates

Open **Plugins -> `dsh-ollama-web` -> Configure** (or the bundle detail page) and use **Check for updates** / **Install update**. Restart DSH (or quit and reopen the desktop app) to load an installed update.

- **Latest check:** the host reads the npm registry (fallback: npmmirror) and honours the profile's pnpm `minimumReleaseAge` (default 60 minutes when unset). A release that is too new is shown as waiting instead of being installed.
- **Explicit update:** downloads both published tarballs, verifies the npm SHA-512 integrity, validates the archive, and replaces the installed host/client copies atomically. A failed swap rolls both copies back.
- **Auto-update (opt-in):** off by default. When enabled, the host checks every 6 hours and installs a newer **same-major** release. Major updates require the explicit button.
- **Linked installs:** a `link:` or external-directory development install is never modified; update it from its Git repository.
- **Restart:** the running host keeps using the old code until DSH restarts.
- **Profile records:** DSH 0.2.1 has no third-party update API, so the updater replaces installed files directly. The profile's `package.json` and `pnpm-lock.yaml` still record the previous version; reinstall through **Plugins** (or the CLI) if you want those records updated. See [docs/UPDATES.md](docs/UPDATES.md).
- **Bootstrap:** 1.0.x has no updater. Install 1.1.0 once manually; later 1.1.x releases can update from the card.
- **Egress:** only package names are sent to the registry, and only when you check/update or enable auto-update. No query, API key, session or file data is sent.

## Verify

Ask the model to search, then check that sources come from Ollama. The plugin sends only the query and `max_results` to `https://ollama.com/api/web_search`.

If the settings card does not appear:

1. Confirm `dsh-ollama-web-client` is installed and its bundle is enabled.
2. Refresh the Web page.
3. Check that the host package name is `dsh-ollama-web` and the row is `ollama-web` (the card key is `dsh-ollama-web#ollama-web`).
4. Fall back to the patch configuration above; the host works without the card.

## Security

- Host plugins run in-process, outside the workspace sandbox. Review plugins before installing and pin versions.
- HTTPS only, `redirect: "error"`, response-byte cap, query/snippet caps, `http(s)`-only result URLs.
- No query/key logging, no telemetry, no custom session events.
- The client card performs no external network request and contains no HTML sinks. It asks the host's update service through DSH's same-origin Connection RPC only when you press Check/Update or change auto-update. The optional donation link is an inert HTTPS anchor until clicked.
- For search, only `ollama.com` is contacted by default. For updates, the host contacts the npm registry (fallback: npmmirror) only on explicit action or while auto-update is enabled. If you change `baseURL`, you are choosing where the key and queries go.
- Update archives are checked against the npm SHA-512 integrity before extraction; symlinks, traversal and oversized entries are rejected, and no npm lifecycle script is run.
- Auto-update installs new code without a prompt. It is opt-in, limited to the current major version, and documented in [docs/UPDATES.md](docs/UPDATES.md).
- See [SECURITY.md](SECURITY.md) and [docs/SECURITY.md](docs/SECURITY.md).

## Compatibility

| DSH | Plugin |
|---|---|
| 0.2.1-rc.2 | 1.1.x |
| 0.3.x | not yet supported (planned 2.0) |

## Versioning

The project follows Semantic Versioning. The host and client packages are always released at the same version. Breaking compatibility changes (including DSH 0.3 support) are major releases; backward-compatible features such as the update UI are minor releases; fixes, documentation and packaging-only changes are patches. See [docs/VERSIONING.md](docs/VERSIONING.md).

## Support

If `dsh-ollama-web` saves you time, you can support its development with a
coffee at <https://buymeacoffee.com/explorrrr>. Donations are optional and do
not unlock features; the plugin stays MIT-licensed and fully functional
without them.

The Configure card shows the same link. It is a plain HTTPS anchor: the client
makes no request to Buy Me a Coffee until you click it, and the plugin does not
read or store donation information.

## Development

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm test
pnpm check
```

The host tests use mocked `fetch`; e2e tests are opt-in with `OLLAMA_API_KEY`. The client tests load the browser bundle in a VM with fake React/primitives.

## Before publishing

- Repository metadata already points to `explorrrr/dsh-ollama-web`; confirm it before publishing.
- Configure npm trusted publishing for `dsh-ollama-web` and
  `dsh-ollama-web-client` (repository, workflow `release.yml`, environment
  `npm`).
- Confirm both npm names are still available.
- Run `pnpm verify`, the browser smoke in [docs/SMOKE-RESULTS.md](docs/SMOKE-RESULTS.md),
  then tag `v1.1.0`.

## License

MIT. Not affiliated with Ollama or DeepSeek. Ollama is a trademark of its owner.
