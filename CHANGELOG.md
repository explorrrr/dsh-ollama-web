# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Restructured the English, Japanese and Simplified Chinese READMEs around
  install, configuration, usage, updates and security. Added a Buy Me a Coffee
  badge and the GitHub Sponsor button, and removed the top-of-README release
  status section and the maintainer-only publishing checklist.
- Moved the one-time npm trusted-publishing setup into `docs/VERSIONING.md`.

### Security

- Percent-encode Markdown delimiters in search result URLs and remove autolink
  delimiters from titles/publish dates so hostile results cannot inject links
  into the model-visible source list.
- Keep `searchPath` under the configured `baseURL` path prefix. Percent-encoded
  dot segments and encoded path separators are rejected before a request is
  made.
- Restrict `apiKeyEnv` to `OLLAMA_*` environment variable names. The settings
  card can no longer select unrelated environment variables or credential
  references as the Ollama search key.

## [1.1.0] - 2026-10-18

### Added

- **Update checks and one-click updates.** The host reads the npm registry
  (fallback: npmmirror), compares host/client versions, verifies the release's
  SHA-512 integrity, safely extracts both tarballs and atomically replaces the
  installed packages. A failed swap rolls both packages back.
- **Opt-in auto-update.** Checks every six hours while the host is running,
  installs newer same-major releases, respects the profile's pnpm
  `minimumReleaseAge`, and leaves major updates to the explicit button.
- **Update UI** in the Plugins Configure card and the bundle detail page, with
  current/latest versions, last check time, release notes/provenance links,
  restart guidance and a linked-install warning.
- **`/ollama-web-update` host RPC** over DSH's authenticated same-origin
  Connection transport. The client makes no external network request.
- **Safe installer:** installed-copy detection, `file:`/`link:` refusal,
  traversal/symlink/oversize rejection, dependency-resolution checks, atomic
  staging with rollback and post-restart backup cleanup.
- Tests for version comparison, packument/fallback/age handling, tar safety,
  staging/swapping/rollback, state persistence, the update service, the RPC
  routes and the client update states.
- `docs/UPDATES.md`, `docs/VERSIONING.md`, and README/security/compatibility
  updates in English, Japanese and Simplified Chinese.

### Changed

- Documented the versioning policy: SemVer, host/client lockstep, `v<version>`
  tags, and `next` dist-tags for prereleases. The release workflow now adds
  `--tag next` and marks prerelease GitHub Releases.
- The client bundle now uses DSH's `plugins.detail.section` slot in addition to
  `plugins.row.config`.
- The README's optional donation link and Simplified Chinese card copy are part
  of this release.

### Security

- Update metadata and tarballs are HTTPS-only, redirect-refused and size/time
  capped; tarballs must match the npm SHA-512 SRI before extraction.
- Tar extraction admits only regular files/directories under `package/` and
  rejects traversal, symlinks, hardlinks, devices, duplicates and oversized
  entries.
- Auto-update is opt-in, same-major only and `minimumReleaseAge`-aware. Linked
  installs are never modified. No npm/pnpm lifecycle script runs.
- Update requests carry only package names; no API key, query, session or file
  data is sent.

### Notes

- 1.1.0 is the first release with the updater. 1.0.x must install 1.1.0 manually;
  later 1.1.x releases can update from the card.
- An installed update requires a DSH restart (desktop: quit and reopen the app).
- The updater replaces installed files directly because DSH 0.2.1 has no
  third-party update API. The profile's `package.json` / `pnpm-lock.yaml` still
  record the previous version; reinstall through Plugins/CLI to reconcile.
- No new runtime dependencies.

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
