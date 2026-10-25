# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.4.1] - 2026-10-25

### Changed

- Updated the GitHub Actions used by the workflows: the release workflow now
  uses `actions/upload-artifact` 7.0.2 and `actions/download-artifact` 8.0.2,
  and CodeQL uses `github/codeql-action` 4.39.1.
- The artifact actions run on Node.js 24, and `actions/download-artifact` 8
  verifies artifact digests on download, which now guards the hand-off between
  the build and publish jobs.

### Notes

- No runtime, API or packaging changes. The published package differs from
  2.4.0 only in its version; this is a CI-only patch release.
- The release workflow is only exercised on a tag push, so the first real run
  of the updated actions is the `v2.4.1` release itself.

## [2.4.0] - 2026-10-20

### Added

- An opt-in Ollama `/api/web_fetch` provider. It registers on DSH's fetch seam,
  follows the live `enableFetchProvider` setting, and is selected only when the
  profile pins `web.fetchProvider: ollama`.
- `fetchPath`, `fetchTimeoutMs` and `fetchMaxChars` settings, plus a live
  **Use Ollama for web fetch** toggle in the settings card.
- The fetch provider maps Ollama's `title`, main-content `content` and `links`
  into a text result, caps the result, and sanitizes links and control
  characters.
- Fetch URL validation rejects non-http(s) URLs, embedded credentials, oversized
  URLs and obvious local/private hostnames or IP literals.

### Changed

- The default `web_fetch` remains DSH's credential-free HTTP provider. Enabling
  Ollama fetch requires both the plugin switch and `web.fetchProvider: ollama`.
- The settings card now shows the fetch settings and a warning when the Ollama
  fetch switch is on but the required provider pin is missing.
- The client bundle injects a third static stylesheet for the fetch toggle.

### Security

- Ollama fetches from its own network, so the optional provider discloses the
  requested URL to Ollama and cannot provide DSH HTTP's DNS-pinning/SSRF
  boundary. The local/private host block is best-effort and not DNS-level.
- Ollama does not expose the target HTTP status or final redirect URL. A
  successful fetch is reported as HTTP 200 for the requested URL; this is a
  documented lossy mapping.
- Fetch errors do not include the API key, URL or upstream response body.
  Response-byte, timeout, content and link caps are enforced.

### Notes

- `fetchProvider: http` remains the recommended default when target status
  fidelity, local SSRF protection or credential-free fetch matters.
- This is a backward-compatible minor release; no new runtime dependency or
  lifecycle script is added.

## [2.3.0] - 2026-10-19

### Added

- Opening the plugin's update screen now performs a fresh update check when
  the last successful check is older than five minutes. The manual **Check for
  updates** button still checks at any time. A failed automatic check leaves
  the cached status visible.

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

- The package now ships both halves: the host search provider and the Web UI
  settings/update client bundle (`./client`, `dsh.client`). One Loader row
  (`ollama-web`) provides both.
- A startup warning when the removed 1.x client package is still installed.
- Update-state migration from the 1.x host/client schema to the single-package
  schema.

### Changed

- **One npm package, one install.** `dsh-ollama-web@2.0.0` is installed once and
  provides the `web_search` backend and the settings card.
- Update checks read one npm packument and install one tarball. The update
  status reports one running/current version instead of a host/client pair.
- Update state schema is now 2; schema-1 files are read and mapped
  automatically.
- The update journal still handles multiple installed copies and keeps a
  recovery path for a 1.x journal that names the old client package.

### Removed

- The `dsh-ollama-web-client` npm package and its `ollama-web-client` Loader
  row.
- The `release-mismatch` update error and the `versionsMatch` /
  `clientInstalled` status fields.
- The second package from the release workflow, CI package check and npm
  publishing setup.

### Notes

- 1.x auto-update only installs releases in the current major, so it will not
  move users to 2.0.0. Remove `dsh-ollama-web-client` and install
  `dsh-ollama-web@2.0.0` manually.
- The old client package is deprecated on npm. Leaving it installed while
  using 2.0.0 can register the settings card twice and is not supported.
- The package is still MIT; the search provider, sandbox boundaries and update
  security controls are unchanged.

## [1.2.0] - 2026-10-19

### Changed

- **`minimumReleaseAge` is opt-in.** The updater no longer assumes 60 minutes
  when the profile does not set a value. An unset, unreadable, invalid or `0`
  setting means no age wait; an explicit positive value is still honored. An
  unknown publish time no longer blocks auto-update when no age is configured.
- Restructured the English, Japanese and Simplified Chinese READMEs around
  install, configuration, usage, updates and security. Added a Buy Me a Coffee
  badge and the GitHub Sponsor button, and removed the top-of-README release
  status section and the maintainer-only publishing checklist.
- Moved the one-time npm trusted-publishing setup into `docs/VERSIONING.md`.

### Security

- Record the applied ruleset/Environment/Actions values and the two Secret
  Scanning options GitHub still reports disabled.
- Document the solo-maintainer self-review policy, release settings, rollback
  procedure and accepted unknown-age manual-install behavior.
- Run CodeQL against GitHub Actions workflows as well as JavaScript/TypeScript.
- Split release publishing into a read-only build job and an OIDC-only
  `npm` Environment publish job; add a tag-on-main check and production audit.
- Write an update journal before a host/client swap and roll back interrupted
  swaps on the next start; invalid journal paths are ignored.
- Serialize installs per profile with a mode-0600 `update.lock` and reclaim
  stale locks left by dead or expired processes.
- Drop persisted update metadata whose release URL is not the canonical
  GitHub Releases URL or whose host/client versions are invalid or differ.
- Percent-encode Markdown delimiters in search result URLs and remove autolink
  delimiters from titles/publish dates so hostile results cannot inject links
  into the model-visible source list.
- Keep `searchPath` under the configured `baseURL` path prefix. Percent-encoded
  dot segments and encoded path separators are rejected before a request is
  made.
- Restrict `apiKeyEnv` to `OLLAMA_*` environment variable names. The settings
  card can no longer select unrelated environment variables or credential
  references as the Ollama search key.

### Notes

- Profiles that set `minimumReleaseAge` keep the existing wait. Remove the
  setting, or set it to `0`, to disable the wait.
- The DSH desktop profile currently sets 60 minutes explicitly; the plugin does
  not modify that profile.
- Updating from 1.1.0 to 1.2.0 still uses the 1.1.0 updater's 60-minute default
  when the profile omits the setting. The new behavior applies to updates after
  1.2.0 is installed.

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
