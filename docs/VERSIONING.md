# Versioning

`dsh-ollama-web` uses [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).
Both published packages always carry the same version:

- `dsh-ollama-web` (host)
- `dsh-ollama-web-client` (web client)

`scripts/check-versions.mjs` and the release workflow enforce the lockstep and
the presence of a matching `CHANGELOG.md` section. There is no automated version
bump tool; release commits update both `package.json` files and the changelogs
manually.

## Which component changes

| Release | Use for |
|---|---|
| **MAJOR** (`2.0.0`) | Breaking changes: an incompatible settings/API/data contract, removal of supported behavior, a change in how plugins are installed that requires user action, or a new DSH compatibility line such as DSH 0.3. |
| **MINOR** (`1.1.0`) | Backward-compatible features: the update UI, a new optional data file, an additive RPC method, a new locale, or a new optional setting that defaults to the existing behavior. |
| **PATCH** (`1.0.1`) | Backward-compatible fixes and non-behavioral work: bug fixes, security fixes, documentation, packaging, CI and provenance-only changes. |

Examples from this repository:

- `1.0.0` — first stable release.
- `1.0.1` — publishing/provenance changes only; no runtime change.
- `1.1.0` — update checks, explicit update, opt-in auto-update and the
  documentation around them. Existing search settings and behavior are
  unchanged.
- `2.0.0` — planned for DSH 0.3 compatibility or another breaking change.

The project treats `0.x` as bootstrap/unstable. From `1.0.0` onward the table
above applies.

## Tags and npm dist-tags

- Release tags are `v<version>` (for example `v1.1.0`).
- Stable releases use the npm `latest` dist-tag.
- Pre-releases use the npm `next` dist-tag and are published from a tag that
  contains a hyphen (for example `v1.2.0-rc.1`). The release workflow adds
  `--tag next` and marks the GitHub Release as a pre-release.
- The updater follows `latest`; pre-releases are opt-in manual installs.

## Release checklist

1. Update both `package.json` versions and add the matching changelog section
   to `CHANGELOG.md` and the package changelogs.
2. Update the install/version examples and update notes in all three READMEs
   (`README.md`, `README.ja.md`, `README.zh.md`), keep their structure in sync,
   and confirm the DSH compatibility statement still matches
   `docs/COMPATIBILITY.md`.
3. Run `pnpm verify` and the update smoke test in an isolated profile.
4. Commit the release, tag `v<version>`, and push the tag.
5. The release workflow publishes both packages with provenance and attaches the
   npm tarballs plus `SHA512SUMS` to the GitHub Release.
6. Verify the npm versions, integrity and attestations, then record the evidence
   in `docs/PROVENANCE.md` and `docs/SMOKE-RESULTS.md`.

## Publishing setup

npm trusted publishing (OIDC) is configured for both packages:

- repository: `explorrrr/dsh-ollama-web`
- workflow: `.github/workflows/release.yml`
- environment: `npm`

No `NPM_TOKEN` is stored. The release workflow verifies that the package
metadata points at the repository and that the tag matches both package
versions.

## DSH compatibility

| DSH | Plugin |
|---|---|
| 0.2.1-rc.2 | 1.1.x |
| 0.3.x | 2.0 (planned) |

The update feature uses DSH's `connection` RPC and the plugin manager's
`plugins.detail.section` slot. On a DSH build where either is unavailable the
search plugin still loads; the update section reports that update checks are
unavailable.
