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
