# Contributing

Thanks for improving `dsh-ollama-web`.

## Setup

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm test
pnpm check
```

## Pull requests

- Keep the host and client package versions in lockstep.
- Add tests for behavior changes. Security-relevant changes need a test that
  exercises the failure path, not only the happy path.
- Do not add runtime dependencies without a review of their license, install
  scripts and transitive tree. The default runtime dependency set is
  `@deepseek-ai/schemastery` only.
- Do not add `preinstall`, `install`, `postinstall` or `prepare` scripts. The
  published packages ship built artifacts; `prepublishOnly` is the only allowed
  lifecycle hook.
- Do not add network calls, `fetch`, storage access, `innerHTML`,
  `dangerouslySetInnerHTML`, `postMessage`, `window.open`, `eval` or
  `new Function` to the client bundle.
- Do not log queries, API keys or response bodies.
- Update README/README.ja/README.zh and CHANGELOG for user-visible changes.
- Keep error messages free of secrets and upstream response bodies.

## Security review checklist

- [ ] HTTPS-only endpoint; no userinfo/query/fragment.
- [ ] Same-origin path validation; redirects refused.
- [ ] Response/query/snippet/result caps enforced.
- [ ] Result URLs restricted to `http(s)`.
- [ ] Key resolution uses credentials/launch env; no secret in errors or logs.
- [ ] No custom session events.
- [ ] Client bundle has no network/DOM sinks.
- [ ] `pnpm check` passes.

## Release

1. Bump both package versions and add a CHANGELOG section.
2. Run `pnpm verify` and the browser smoke test.
3. Tag `v<version>` and publish from the release workflow with provenance.
4. Attach both tarballs and `SHA512SUMS` to the GitHub Release.
