# dsh-ollama-web

Ollama Cloud web search and optional web fetch provider for DeepSeek Harness,
including the Web UI settings and update card. One npm package ships both the
host plugin and its browser bundle.

[日本語 README](https://github.com/explorrrr/dsh-ollama-web/blob/main/README.ja.md) | [中文 README](https://github.com/explorrrr/dsh-ollama-web/blob/main/README.zh.md)

See the repository [README](../../README.md) for install, configuration,
security notes and compatibility. This package registers the `ollama` search
provider on `ctx.web` and talks to `https://ollama.com/api/web_search` by
default. It can also register an `ollama` fetch provider for
`https://ollama.com/api/web_fetch`; this is opt-in via the card's
**Use Ollama for web fetch** switch, or via
`enableFetchProvider: true` plus `web.fetchProvider: ollama` in a manual
profile patch. The default `web_fetch` remains DSH's credential-free HTTP
provider. The same package serves `client.js` as the `ollama-web` row's browser
half.

## Compatibility

| DSH | Plugin |
|---|---|
| 0.2.1-rc.2 (tested) | 2.5.x |
| 0.3.x | 3.0 (planned) |

The package declares `engines.dsh` `>=0.2.1-rc.1 <0.3.0` and the same range for
its `@deepseek-ai/dsh-web` peer dependency. The updater compares this range with
the running DSH version before installing. See the repository
[docs/COMPATIBILITY.md](https://github.com/explorrrr/dsh-ollama-web/blob/main/docs/COMPATIBILITY.md)
for the tested matrix and the automatic update guard.

## Optional fetch provider

Turn on **Use Ollama for web fetch** in the settings card. The card writes
`enableFetchProvider: true` and `web.fetchProvider: ollama` together, so a
manual profile patch is not needed. For a manual configuration, set
`enableFetchProvider: true` and pin `web.fetchProvider: ollama`; a `web` patch
replaces the row config, so keep both provider fields. The provider sends
`{ url }` to `/api/web_fetch`, folds `title`/`content`/`links` into a text
result, and caps the text at `fetchMaxChars`. Ollama does not expose the target
HTTP status or final URL, so a successful fetch is reported as HTTP 200 for the
requested URL. Keep `fetchProvider: http` when those semantics or DSH's local
SSRF boundary matter.

## Provider selection

The card edits DSH's `web` settings namespace: **Use Ollama for web search**
writes `searchProvider`, and the fetch switch writes `enableFetchProvider` plus
`fetchProvider`. The card shows the provider DSH is currently using even when
Ollama is not selected. A profile patch that pins `searchProvider: ollama` is
shown as pinned; remove that patch line to manage the search selection from the
card. Environment overrides (`DSH_WEB_SEARCH_PROVIDER` /
`DSH_WEB_FETCH_PROVIDER`) are not visible to the card.

## Updates

The package also owns the `/ollama-web-update` RPC used by the Configure card
and the bundle detail section. On request (or while auto-update is enabled) it
reads the npm registry / npmmirror, verifies the release SHA-512 integrity,
safely extracts and atomically replaces the installed package. After a
successful swap it rewrites an exact profile `package.json` pin and reports a
stale `pnpm-lock.yaml` in the card and host log; it never runs pnpm. It never
sends the Ollama API key, queries or session data. See
[docs/UPDATES.md](../../docs/UPDATES.md).

## Support

If this package saves you time, you can buy me a coffee at
<https://buymeacoffee.com/explorrrr>. The Configure card and the bundle detail
page show the link; neither makes a request until you click it. Donations are
optional.

MIT. Not affiliated with Ollama or DeepSeek.
