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

- Keep the host and client package versions in lockstep. Follow
  [docs/VERSIONING.md](docs/VERSIONING.md) for major/minor/patch and tags.
- Add tests for behavior changes. Security-relevant changes need a test that
  exercises the failure path, not only the happy path.
- Do not add runtime dependencies without a review of their license, install
  scripts and transitive tree. The default runtime dependency set is
  `@deepseek-ai/schemastery` only.
- Do not add `preinstall`, `install`, `postinstall` or `prepare` scripts. The
  published packages ship built artifacts; `prepublishOnly` is the only allowed
  lifecycle hook.
- Do not add external network calls, `fetch`, storage access, `innerHTML`,
  `dangerouslySetInnerHTML`, `postMessage`, `window.open`, `eval` or
  `new Function` to the client bundle. Same-origin update requests through
  DSH's `connection.rpc` are the only allowed client-to-host transport.
- Keep filesystem access inside `src/update/**`. `scripts/check-dist.mjs` and
  the security test reject `node:fs` elsewhere and allow only the update
  builtins in that directory.
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
- [ ] Client bundle has no external network/storage/DOM sinks; only the
      same-origin update RPC.
- [ ] Update metadata/tarballs are HTTPS-only, redirect-refused and size-capped.
- [ ] Update tarballs are checked against SHA-512 SRI before extraction.
- [ ] Tar extraction rejects traversal, symlinks, hardlinks, devices and
      oversized entries.
- [ ] Auto-update stays opt-in, same-major and `minimumReleaseAge`-aware.
- [ ] Linked installs are refused, and no npm lifecycle script is run.
- [ ] `pnpm check` passes.

## Release

1. Read [docs/VERSIONING.md](docs/VERSIONING.md), bump both package versions and
   add a CHANGELOG section.
2. Run `pnpm verify` and the browser/update smoke tests.
3. Tag `v<version>` and publish from the release workflow with npm trusted
   publishing (OIDC, no `NPM_TOKEN`).
4. Attach both tarballs and `SHA512SUMS` to the GitHub Release.
5. Record the published attestations/hashes and smoke results in
   `docs/PROVENANCE.md` and `docs/SMOKE-RESULTS.md`.
