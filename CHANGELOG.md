# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Optional Buy Me a Coffee link (<https://buymeacoffee.com/explorrrr>) in the
  READMEs and the Plugins Configure card. The card link is inert until clicked
  and adds no network request, storage or telemetry.
- Simplified Chinese README (`README.zh.md`), Chinese settings-card copy, and
  language links across the English, Japanese and Chinese READMEs.

## [1.0.1] - 2026-10-18

### Changed

- Publish both packages through npm trusted publishing (OIDC); 1.0.1 carries
  npm provenance attestations.
- GitHub Release assets now download the exact published npm tarballs, so
  `SHA512SUMS` matches npm.
- Documentation records the provenance verification steps.

### Notes

- No runtime changes. 1.0.0 remains available; 1.0.1 is the recommended version.

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
