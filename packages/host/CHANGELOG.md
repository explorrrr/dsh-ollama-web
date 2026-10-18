# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- Restrict `apiKeyEnv` to `OLLAMA_*` environment variable names so the settings
  card cannot resolve unrelated environment or credential references.

## [1.1.0] - 2026-10-18

### Added

- Update service and `/ollama-web-update` RPC: npm/npmmirror packument checks,
  host/client version agreement, `minimumReleaseAge`, SHA-512 SRI verification,
  safe tar extraction, atomic install with rollback, backup cleanup, and opt-in
  six-hourly same-major auto-update.
- Linked-install refusal and dependency-resolution validation before replacing
  an installed package.
- Tests for semver, registry fallback/age, tar safety, install/rollback, state
  persistence, the update service and the RPC routes.

### Security

- Update I/O is confined to `src/update/**`; `check-dist` and the security test
  reject filesystem access elsewhere.
- No npm lifecycle script runs; no API key, query, session or file data is sent
  to the registry.

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
