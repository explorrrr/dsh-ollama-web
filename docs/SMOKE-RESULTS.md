# Smoke results

Date: 2026-10-19 (2.3.0); 2.2.0, 2.1.0, 2.0.0, 1.2.0 and 1.1.0 checks were
recorded earlier.

Environment: DSH 0.2.1-rc.2, macOS. The 2.3.0 checks are package-level unless
noted; the full isolated DSH/browser result remains the 1.2.0 run below.

## 2.3.0 update-on-open checks (local)

- [x] `pnpm install --frozen-lockfile --ignore-scripts` passed.
- [x] `pnpm verify` passed: typecheck, build, 139 tests, `check-versions`,
      `check-dist` and `check-client`.
- [x] `pnpm audit --prod` found no known vulnerabilities.
- [x] `npm pack --dry-run` includes `client.js`, `dist/index.js`,
      `dist/update/dsh.js`, `cordis.patch.yml` and `package.json` at 2.3.0.
- [x] Client tests cover the five-minute auto-check threshold, the manual
      **Check for updates** override (always fresh), silent automatic-check
      failure, and the skip for persisted install errors.
- [x] Published `dsh-ollama-web@2.3.0` tarball SHA-512 matches npm
      `dist.integrity` and the GitHub Release `SHA512SUMS`
      (`7190e1eeb23376c0c5b4bce42134853bedbccfaa105a2472495e2f05c98e08703a046764d4fce88ce61bda934f71f04651d80e44ee3080981fa00417cd6dc57c`).
- [x] Published `package/client.js` contains `autoCheckDue`,
      `AUTO_CHECK_MIN_INTERVAL_MS` and the support-card registration, and
      passes `node --check`.
- [x] SLSA provenance subject is `pkg:npm/dsh-ollama-web@2.3.0` with the same
      digest; workflow ref is `refs/tags/v2.3.0`, path is
      `.github/workflows/release.yml`, and commit is
      `de0d6859a0c0cdab124ffc1fc10159a42d029297`.
- [x] npm `latest` points to `2.3.0`; the GitHub Release `v2.3.0` has
      `dsh-ollama-web-2.3.0.tgz` and `SHA512SUMS` assets with the same digest.
- [x] The publish job completed in its first run; this release did not need the
      npm-propagation rerun used for 2.1.0 and 2.2.0.
- [ ] Full isolated DSH/browser smoke was not re-run for 2.3.0; the 1.2.0
      browser result below remains the last full UI smoke. The 2.3.0 change is
      covered by client unit tests and a published-bundle check.

## 2.2.0 support card checks (local)

- [x] `pnpm install --frozen-lockfile --ignore-scripts` passed.
- [x] `pnpm verify` passed: typecheck, build, 135 tests, `check-versions`,
      `check-dist` and `check-client`.
- [x] `pnpm audit --prod` found no known vulnerabilities.
- [x] `npm pack --dry-run` includes `client.js`, `dist/index.js`,
      `dist/update/dsh.js`, `cordis.patch.yml` and `package.json` at 2.2.0.
- [x] Client tests cover the second `plugins.detail.section` entry
      (`dsh-ollama-web-support`, `order: 10`), subject filtering, the support
      link URL/target/rel and the `data-view="detail"` marker.
- [x] Published `dsh-ollama-web@2.2.0` tarball SHA-512 matches npm
      `dist.integrity` and the GitHub Release `SHA512SUMS`
      (`01c3c47a25410bb36a1309e94751360708215ee80faf3964fbf3b981902feadd44413125ab7591b27fc69da18bd78ccfbd39ef4bfaaf852f401dc0a3aa52d72f`).
- [x] Published `package/client.js` contains `dsh-ollama-web-support`,
      `plugins.detail.section` and `makeSupportDetailSection`, and passes
      `node --check`.
- [x] SLSA provenance subject is `pkg:npm/dsh-ollama-web@2.2.0` with the same
      digest; workflow ref is `refs/tags/v2.2.0`, path is
      `.github/workflows/release.yml`, and commit is
      `a4f8109ed29a56b9aa093b114d9b87838b12b610`.
- [x] npm `latest` points to `2.2.0`; the GitHub Release `v2.2.0` has
      `dsh-ollama-web-2.2.0.tgz` and `SHA512SUMS` assets with the same digest.
- [x] The first publish run published the package but failed while npm
      propagation took about three minutes; re-running the failed `publish`
      job completed the GitHub Release and asset upload.
- [ ] Full isolated DSH/browser smoke was not re-run for 2.2.0; the 1.2.0
      browser result below remains the last full UI smoke. The 2.2.0 change is
      additive and covered by client unit tests and a published-bundle check.

## 2.1.0 compatibility checks (local)

- [x] `pnpm install --frozen-lockfile --ignore-scripts` passed.
- [x] `pnpm verify` passed: typecheck, build, 134 tests, `check-versions`,
      `check-dist` and `check-client`.
- [x] `pnpm audit --prod` found no known vulnerabilities.
- [x] `npm pack --dry-run` includes `client.js`, `dist/index.js`,
      `dist/update/dsh.js`, `cordis.patch.yml` and `package.json` at 2.1.0.
- [x] Tests cover `engines.dsh` range matching (including prereleases), reading
      `DSH_CLIENT_VERSION` / `DSH_APP_VERSION`, incompatible/unknown status,
      blocking a known-incompatible install, and pausing auto-update.
- [x] Published `dsh-ollama-web@2.1.0` tarball SHA-512 matches npm
      `dist.integrity` and the GitHub Release `SHA512SUMS`
      (`c4ed60bc5c01cbbd7de9831e26f462b1dda1baeac99cb0a14cbf9812f946f5e86db539ffb96ae16398957dabc6381cb63157252ad7e27d96eda6dea8d8584438`).
- [x] SLSA provenance subject is `pkg:npm/dsh-ollama-web@2.1.0` with the same
      digest; workflow ref is `refs/tags/v2.1.0`, path is
      `.github/workflows/release.yml`, and commit is
      `57cd1e0e4709f179c577a3c3fcac061b86887460`.
- [x] npm `latest` points to `2.1.0`; the GitHub Release `v2.1.0` has
      `dsh-ollama-web-2.1.0.tgz` and `SHA512SUMS` assets with the same digest.
- [x] The first publish run published the package but failed while npm
      propagation took about three minutes; re-running the failed `publish`
      job completed the GitHub Release and asset upload.

## 2.0.0 single-package checks

- [x] `pnpm verify` passed: typecheck, build, 125 tests, `check-versions`,
      `check-dist` and `check-client`.
- [x] `npm pack --dry-run` contains `client.js`, `dist/index.js`,
      `cordis.patch.yml` and `package.json`; the manifest declares
      `dsh.bundle.patch`, `dsh.client.platform: web`, `exports['./client']` and
      `files` includes `client.js`.
- [x] Published `dsh-ollama-web@2.0.0` tarball SHA-512 matches npm
      `dist.integrity` and the GitHub Release `SHA512SUMS`
      (`ed806d62d2f27d3208b774657060a90fd938e59d136d2ad96ed120e7c58ed441131b4d2ea2bde0a3229c9eeb56f50cfb0e764de80faa4128e79253aeba7703c8`).
- [x] SLSA provenance subject is `pkg:npm/dsh-ollama-web@2.0.0` with the same
      digest; workflow ref is `refs/tags/v2.0.0`, path is
      `.github/workflows/release.yml`, and commit is
      `4e455172ca443d84c1da8450b4c83d0848dccbe6`.
- [x] npm `latest` dist-tag points to `2.0.0`.
- [x] Published tarball host smoke: importing `dist/index.js` and applying it
      with a mock `ctx.web` registers the `ollama` provider as available.
- [x] Published tarball client smoke: `client.js` registers the module id
      `dsh-ollama-web` and contains the `dsh-ollama-web#ollama-web` row key and
      the `plugins.detail.section` registration.
- [ ] Full isolated DSH install / browser Configure card / desktop update flow
      was not re-run for 2.0.0. The 1.2.0 browser result below remains the last
      full UI smoke; run the isolated profile smoke before treating the 2.0 UI
      as fully verified.

## Verified (1.2.0)

- [x] Both tarballs install with `dsh plugin --profile smoke add ...`.
- [x] The profile's `dsh.profile.bundles` contains `dsh-ollama-web` and
      `dsh-ollama-web-client`.
- [x] `dsh --profile smoke --dump-config` composes:
      `web.searchProvider: ollama`, `web.fetchProvider: http`,
      `web-search-deepseek` disabled, rows `ollama-web` and
      `ollama-web-client`.
- [x] The host plugin inventory reports both entries as `enabled: true` and
      `fiberPhase: active`.
- [x] The Web boot graph contains `dsh-ollama-web-client` with the expected
      injects (`@deepseek-ai/dsh-client-ui-plugin-manager`,
      `@deepseek-ai/dsh-client-ui-primitives`).
- [x] The served `/plugins/.../dsh-ollama-web-client/client.js` bundle matches
      the built client source and contains the `dsh-ollama-web#ollama-web`
      row key.
- [x] `settings/describe` serves the `ollama-web` namespace with the expected
      9 fields, secret/credential-ref roles and defaults.
- [x] `settings/mutate` with `{ns:"ollama-web", ops:[{op:"set",
      path:["snippetMax"], value:1500}], expectedRevision:0}` succeeds; a
      subsequent `settings/describe` returns `snippetMax: 1500`,
      `user.snippetMax: 1500`, `revision: 1`.
- [x] **Browser Configure card:** headless Chrome opened the isolated DSH Web
      UI, dismissed the preview notice, opened Plugins -> `dsh-ollama-web` ->
      row `ollama-web` -> Configure. The card rendered all eight value fields
      plus the write-only API key field. Editing **Snippet cap** from 2000 to
      1600 and clicking **Save** persisted `snippetMax: 1600` (confirmed by
      `settings/describe`, `revision: 1`). Screenshot:
      [configure-card.png](configure-card.png).

- [x] **npm registry install:** `dsh plugin --profile smoke add
      dsh-ollama-web@1.0.0 dsh-ollama-web-client@1.0.0` installed both published
      packages into an isolated profile; `--dump-config` composed the expected
      host/client rows and `web.searchProvider: ollama`.

## 1.1.0 update feature (automated)

- [x] Host tests cover semver comparison, packument parsing and registry
      fallback, `minimumReleaseAge`, SHA-512 integrity, tar traversal/symlink/
      oversize rejection, staging and rollback, state persistence, the update
      service (check/install/auto-update/major guard), and the RPC routes.
- [x] Client tests cover the update states, Check/Install/Auto-update RPC calls,
      detail-section subject filtering, localized dictionaries, and the
      no-external-network policy.
- [x] `pnpm check` enforces version lockstep, changelog presence, the update-only
      filesystem allowlist, and the client update/detail registrations.
- [x] The update tests use temporary profiles and an injected local registry;
      no live npm request or user profile is touched.

## 1.1.0 update feature (isolated DSH smoke)

Date: 2026-10-18. DSH 0.2.1-rc.2, isolated `DSH_HOME`, headless Chrome, macOS.
The user's desktop profile was not modified.

- [x] Installed the 1.1.0 tarballs into an isolated profile. The
      `/ollama-web-update/status` route returned host/client 1.1.0 without a
      network request.
- [x] `/ollama-web-update/check` fetched the real npm registry, returned
      `phase: "idle"`, `busy: false`, and reported npm `1.0.1` as `ahead`.
- [x] `/ollama-web-update/setAutoUpdate` wrote
      `<profile>/data/dsh-ollama-web/update-prefs.json` and toggled back off.
- [x] A temporary local registry served test-only 1.1.1 tarballs. The `check`
      RPC reported an update; the `install` RPC replaced both installed
      directories, preserved the host `node_modules`, wrote state/backups and
      returned `state: "installed"`, `needsRestart: true`, `busy: false`.
- [x] After restarting the host, `status` reported running/current 1.1.1,
      cleared `needsRestart`, and removed the backup directories.
- [x] Headless Chrome opened Plugins -> `dsh-ollama-web` and rendered the
      Updates section. Check fetched npm, the auto-update switch toggled
      on/off, the version rows and release/provenance links rendered, and no
      client-request error was logged.
- [x] Updating from the published 1.1.0 to 1.2.0 over the real npm registry
      (see the 1.2.0 section below).

The earlier 1.1.1 artifacts and local registry were temporary test fixtures. The
1.2.0 isolated profile was also removed after this record; the user's desktop
profile was untouched.

## 1.1.0 publication

- [x] npm published `dsh-ollama-web@1.1.0` and `dsh-ollama-web-client@1.1.0`
      with trusted-publishing provenance. The SLSA subject SHA-512 values match
      the npm tarballs; see [PROVENANCE.md](PROVENANCE.md).
- [x] GitHub Release `v1.1.0` was created from the same published npm tarballs;
      its `SHA512SUMS` matches the attestation subject digests.
- [x] The release workflow published both packages successfully. Its
      asset-listing step then hit a `tar | grep -q` SIGPIPE under `pipefail`;
      the GitHub Release assets were created from the same tarballs and the
      workflow check was fixed on `main` for later releases.
- [x] Updating from the published 1.1.0 to 1.2.0 over the real npm registry
      (verified in the 1.2.0 section below).

## 1.2.0 automated and isolated checks

Date: 2026-10-19. DSH 0.2.1-rc.2, isolated `DSH_HOME`, macOS. The user's
desktop profile was not modified.

- [x] `pnpm verify` passed: typecheck, build, 102 host tests, 20 client tests,
      version lockstep, dist allowlist and client bundle checks.
- [x] `node scripts/smoke.mjs` passed.
- [x] `readMinimumReleaseAge()` returns `0` for the repository profile (no
      setting) and `60` for the local desktop profile (explicit
      `minimumReleaseAge: 60`).
- [x] New host tests cover: unset age with a just-published release installs
      normally; explicit `60` blocks manual and auto install; explicit `60` with
      an unknown publish time pauses auto-update but allows manual install;
      unset age with an unknown publish time allows auto-update.
- [x] Created an isolated DSH profile from the shipped `web` template (no
      `minimumReleaseAge` setting), installed the published 1.1.0 host/client,
      and ran the published 1.1.0 `UpdateService` against the real npm registry
      with `minReleaseAgeMinutes: 0`. `check` reported `state: "update"` and
      latest 1.2.0; `install` replaced both installed directories and returned
      `state: "installed"`, `current: 1.2.0`, `needsRestart: true`.
- [x] Re-opening the profile with the 1.2.0 service and
      `hostRunningVersion: "1.2.0"` reported `state: "current"`, cleared
      `needsRestart`, and removed the hidden backup directories.
- [x] `dsh --profile smoke --dump-config` after the update still composes the
      `dsh-ollama-web` and `dsh-ollama-web-client` rows.
- [x] The published `dsh-ollama-web@1.2.0` tarball contains
      `DEFAULT_MINIMUM_RELEASE_AGE_MINUTES = 0`, and both published tarballs
      report version 1.2.0.
- [x] npm and GitHub Release verification: both packages are `1.2.0`; the
      GitHub Release `SHA512SUMS` verifies against the downloaded npm tarballs;
      the SLSA subject digests match. See [PROVENANCE.md](PROVENANCE.md).
- [x] The release workflow completed successfully (`build` and `publish` jobs
      both `success`).

The update from 1.1.0 to 1.2.0 used the published 1.1.0 updater, so the smoke
explicitly set `minReleaseAgeMinutes: 0`; the 1.1.0 default would otherwise
wait 60 minutes. The new "unset means no wait" behavior is covered by the host
tests above and applies to updates after 1.2.0 is installed.

## Not yet verified

- [ ] A live Ollama `/api/web_search` call with a real `OLLAMA_API_KEY`
      (`pnpm --filter dsh-ollama-web test:e2e`).
- [ ] macOS/Windows desktop browser matrix; only the host/API and bundle
      serving paths were exercised here.

## Commands

```bash
pnpm verify
node scripts/smoke.mjs
# isolated profile:
# DSH_HOME=/tmp/dsh-ollama-smoke dsh --profile smoke --from-default-profile web --dump-config
# DSH_HOME=/tmp/dsh-ollama-smoke dsh plugin --profile smoke add <host.tgz> <client.tgz>
# DSH_HOME=/tmp/dsh-ollama-smoke dsh --profile smoke --host 127.0.0.1 --port 0 --no-open
```

The temporary profile and its settings write were deleted after the smoke run.
