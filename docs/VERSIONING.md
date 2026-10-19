# Versioning

`dsh-ollama-web` uses [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).
There is one active published package and one version:

- `dsh-ollama-web` — host provider plus the Web UI client bundle

`scripts/check-versions.mjs` and the release workflow require a matching
`CHANGELOG.md` section. There is no automated version bump tool; release commits
update `packages/host/package.json` and the changelogs manually.

## Which component changes

| Release | Use for |
|---|---|
| **MAJOR** (`2.0.0`) | Breaking changes: an incompatible settings/API/data contract, removal of supported behavior, a change in how plugins are installed that requires user action, or a new DSH compatibility line such as DSH 0.3. |
| **MINOR** (`2.1.0`) | Backward-compatible features: a new optional data file, an additive RPC method, a new locale, or a new optional setting that defaults to the existing behavior. |
| **PATCH** (`2.0.1`) | Backward-compatible fixes and non-behavioral work: bug fixes, security fixes, documentation, packaging, CI and provenance-only changes. |

Examples from this repository:

- `1.0.0` — first stable release.
- `1.1.0` — update checks, explicit update, opt-in auto-update and the
  documentation around them.
- `1.2.0` — `minimumReleaseAge` becomes opt-in.
- `2.0.0` — single-package release: the former `dsh-ollama-web-client` is merged
  into `dsh-ollama-web`, the update status shape is single-version, and update
  state moves to schema 2.
- `2.1.0` — the updater checks the running DSH version against each release's
  `engines.dsh`, and the settings card's support button gains the inline Buy Me
  a Coffee logo.
- `2.2.0` — the bundle detail page also shows the Buy Me a Coffee support card.
- `2.3.0` — opening the update screen checks again when the last successful
  check is older than five minutes.
- `3.0.0` — planned for DSH 0.3 compatibility or another breaking change.

The project treats `0.x` as bootstrap/unstable. From `1.0.0` onward the table
above applies.

## Tags and npm dist-tags

- Release tags are `v<version>` (for example `v2.0.0`).
- Stable releases use the npm `latest` dist-tag.
- Pre-releases use the npm `next` dist-tag and are published from a tag that
  contains a hyphen (for example `v2.1.0-rc.1`). The release workflow adds
  `--tag next` and marks the GitHub Release as a pre-release.
- The updater follows `latest`; pre-releases are opt-in manual installs.

## Release checklist

1. Update `packages/host/package.json` and add the matching changelog section to
   `CHANGELOG.md` and `packages/host/CHANGELOG.md`.
2. Update the install/version examples and update notes in all three READMEs
   (`README.md`, `README.ja.md`, `README.zh.md`), keep their structure in sync,
   and confirm the DSH compatibility statement still matches
   `docs/COMPATIBILITY.md`.
3. Run `pnpm verify` and the update smoke test in an isolated profile.
4. Commit the release, tag `v<version>`, and push the tag. The release workflow
   requires the tag to be an ancestor of `main`.
5. The release workflow builds and tests in a read-only job, audits production
   dependencies, stages the package directory, and only the `npm` Environment
   job receives `id-token: write` and `contents: write`. It publishes the package
   with provenance and attaches the npm tarball plus `SHA512SUMS` to the GitHub
   Release.
6. Verify the npm version, integrity and attestations, then record the evidence
   in `docs/PROVENANCE.md` and `docs/SMOKE-RESULTS.md`.

## Publishing setup

npm trusted publishing (OIDC) is configured for `dsh-ollama-web`:

- repository: `explorrrr/dsh-ollama-web`
- workflow: `.github/workflows/release.yml`
- environment: `npm`

No `NPM_TOKEN` is stored. The release workflow verifies that the package
metadata points at the repository and that the tag matches the package version.
The removed `dsh-ollama-web-client` package is deprecated on npm; it is not part
of the 2.0 release workflow.

## DSH compatibility

| DSH | Plugin |
|---|---|
| 0.2.1-rc.2 | 2.3.x |
| 0.3.x | 3.0 (planned) |

The update feature uses DSH's `connection` RPC and the plugin manager's
`plugins.detail.section` slot. On a DSH build where either is unavailable the
search plugin still loads; the update section reports that update checks are
unavailable.

Keep `engines.dsh` in `packages/host/package.json` and the published manifest
as the authoritative compatibility range. The updater reads that range from the
npm packument, requires a positive match for automatic installs and blocks
manual installs on a known mismatch, so a release that changes the supported
DSH line must update the range, this table, the README requirements and the
tested matrix together. The updater does not fall back to an older compatible
release; it reports the latest release as incompatible instead.

## Upgrading from 1.x

1.x published two packages and the updater only installs releases in the current
major. 2.0.0 is therefore a manual migration: remove `dsh-ollama-web-client`,
then install `dsh-ollama-web@2.3.0`. See
[UPDATES.md](UPDATES.md#upgrading-from-1x).
