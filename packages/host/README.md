# dsh-ollama-web

Host half of the Ollama Cloud web search provider for DeepSeek Harness.

[日本語 README](https://github.com/explorrrr/dsh-ollama-web/blob/main/README.ja.md) | [中文 README](https://github.com/explorrrr/dsh-ollama-web/blob/main/README.zh.md)

See the repository [README](../../README.md) for install, configuration,
security notes and compatibility. This package registers the `ollama` search
provider on `ctx.web` and talks only to `https://ollama.com/api/web_search` by
default.

## Updates

The host also owns the `/ollama-web-update` RPC used by the Configure card and
the bundle detail section. On request (or while auto-update is enabled) it reads
the npm registry / npmmirror, verifies the release SHA-512 integrity, safely
extracts and atomically replaces the installed host and client packages. It
never sends the Ollama API key, queries or session data. See
[docs/UPDATES.md](../../docs/UPDATES.md).

## Support

If this package saves you time, you can buy me a coffee at
<https://buymeacoffee.com/explorrrr>. Donations are optional.

MIT. Not affiliated with Ollama or DeepSeek.
