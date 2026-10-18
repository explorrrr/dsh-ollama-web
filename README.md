# dsh-ollama-web

Ollama Cloud web search provider for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH), with a Web UI settings card. It replaces only the `web_search` backend: no DeepSeek API key, no DeepSeek provider, no fallback.

`web_fetch` stays on DSH's built-in HTTP provider, which is free and already has SSRF guards. Ollama fetch is deliberately not part of 1.0.

## Requirements

- DSH 0.2.1-rc.2 (peer range `>=0.2.1-rc.1 <0.3.0`)
- Node.js >= 20.3
- An Ollama Cloud API key from <https://ollama.com/settings/keys>

## Install

Install both packages. The host package provides search; the client package provides the Configure card.

```bash
dsh plugin --profile desktop add dsh-ollama-web@1.0.0
dsh plugin --profile desktop add dsh-ollama-web-client@1.0.0
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
- The client card performs no network requests and contains no HTML sinks.
- Only `ollama.com` is contacted by default. If you change `baseURL`, you are choosing where the key and queries go.
- See [SECURITY.md](SECURITY.md) and [docs/SECURITY.md](docs/SECURITY.md).

## Compatibility

| DSH | Plugin |
|---|---|
| 0.2.1-rc.2 | 1.0.x |
| 0.3.x | not yet supported (planned 2.0) |

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

- Replace `OWNER` in both `packages/*/package.json` and `.github/CODEOWNERS`.
- Configure npm trusted publishing for `dsh-ollama-web` and
  `dsh-ollama-web-client` (repository, workflow `release.yml`, environment
  `npm`).
- Confirm both npm names are still available.
- Run `pnpm verify`, the browser smoke in [docs/SMOKE-RESULTS.md](docs/SMOKE-RESULTS.md),
  then tag `v1.0.0`.

## License

MIT. Not affiliated with Ollama or DeepSeek. Ollama is a trademark of its owner.
