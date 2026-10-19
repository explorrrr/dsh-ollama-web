# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.2.0] - 2026-10-19

### Added

- The bundle detail page now shows the same Buy Me a Coffee support card as the
  settings card, below the Updates section. The link stays inert until the
  person clicks it.

## [2.1.0] - 2026-10-19

### Added

- The updater now compares the running DSH version (`DSH_CLIENT_VERSION` or
  `DSH_APP_VERSION`) with the release's `engines.dsh`. A known-incompatible
  release is reported as incompatible and blocked; automatic updates only
  install releases that accept the running DSH, while unverifiable compatibility
  pauses auto-update but leaves manual installation available.
- The settings card's support link is now a yellow Buy Me a Coffee button with
  the cup logo inlined as SVG, so the support action is easier to find. The
  logo does not make an external request.

## [2.0.0] - 2026-10-19

### Added

- The package now also ships the Web UI client bundle (`client.js`) with a
  `dsh.client` declaration and a `./client` export. One `ollama-web` Loader row
  serves both halves.

### Changed

- Update checks and installs target the single package: one packument, one
  tarball and one installed package. The status shape reports `running` and
  `current` as single versions.
- Update state uses schema 2 and reads the 1.x host/client shape.
- The updater still stages every installed copy and keeps the atomic swap,
  journal, rollback and lock behavior.

### Removed

- The separate `dsh-ollama-web-client` package, its row and its CI/release
  steps.
- The `release-mismatch` error code and the `versionsMatch` / `clientInstalled`
  fields.

### Notes

- 1.x users must remove `dsh-ollama-web-client` before installing 2.0.0. The
  1.x auto-updater only installs the current major.
- An interrupted 1.x journal that names the old client package is still
  recoverable.

## [1.2.0] - 2026-10-19

### Changed

- `minimumReleaseAge` is opt-in. The updater waits only when the profile
  explicitly sets a positive integer; an unset, unreadable, invalid or `0`
  setting means no wait.
- An unknown publish time no longer pauses auto-update when no age is
  configured. When an age is configured, auto-update still pauses and the
  explicit install remains available.

### Security

- Journal host/client swaps and restore backups if a previous install was
  interrupted.
- Serialize installs per profile with a mode-0600 lock and reclaim stale locks
  from dead or expired processes.
- Validate persisted update release metadata and drop unsafe or inconsistent
  release URLs before exposing them to the client.
- Neutralize Markdown delimiters in search result URLs, titles and publish
  dates before they reach the DSH source list.
- Keep `searchPath` under the configured `baseURL` path prefix and reject
  percent-encoded traversal.
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
