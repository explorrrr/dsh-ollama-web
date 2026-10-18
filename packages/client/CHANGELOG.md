# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Clarify that `searchPath` must stay under the `baseURL` path prefix and that
  `apiKeyEnv` accepts only `OLLAMA_*` environment variable names.

## [1.1.0] - 2026-10-18

### Added

- Update section in the Plugins Configure card and the bundle detail page:
  current/latest versions, Check, Install, opt-in auto-update, restart guidance,
  release notes and npm provenance links.
- Same-origin `/ollama-web-update` RPC through DSH's `connection` service. The
  client makes no external network request and resolves `connection` at render
  time so older deployments still load the search card.
- Tests for the update states, RPC mapping, detail-section subject filtering and
  the second stylesheet.
- Optional Buy Me a Coffee support callout and Simplified Chinese card copy.

### Security

- The client only sends update method names and booleans; versions, URLs and
  paths are never accepted from the browser.
- No external `fetch`, storage, HTML sinks, `postMessage` or `window.open` were
  added.

## [1.0.0] - 2026-10-18

### Added

- Host package `dsh-ollama-web`: Ollama Cloud `/api/web_search` provider for the
  DSH `ctx.web` seam, with HTTPS-only endpoints, redirect refusal, response-byte
  caps, query/snippet caps, credential resolution and sanitized errors.
- Client package `dsh-ollama-web-client`: Web UI settings card for the host row
  `ollama-web`, using the `plugins.row.config` slot and the official settings
  primitives.
- Unit, security, integration and contract tests; package/CI checks.
- English and Japanese documentation, security policy and contribution guide.
