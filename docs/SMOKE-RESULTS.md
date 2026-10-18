# Smoke results

Date: 2026-10-18

Environment: DSH 0.2.1-rc.2 (commit 332895e), isolated `DSH_HOME` under a
temporary directory, macOS. The user's desktop profile was not modified.

## Verified

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
- [ ] Updating from the published 1.1.0 to a later 1.1.x release over the real
      npm registry. 1.1.0 is the first updater release, so this is the next
      release's verification.

The 1.1.1 artifacts and the local registry were temporary test fixtures. The
isolated profile was deleted after the smoke; the user's desktop profile was
untouched.

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
