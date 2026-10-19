## Summary

<!-- What changed and why? -->

## Self-review (solo maintainer)

- [ ] I read the complete `git diff main...HEAD`.
- [ ] `pnpm verify` passes.
- [ ] The security regression test fails before the fix and passes after it.
- [ ] No secret, runtime dependency or lifecycle script was added.
- [ ] README/CHANGELOG and the relevant security docs are updated.
- [ ] The rollback path is recorded below.

## Security checklist

- [ ] No secret, token or API key is added to the repository or logs.
- [ ] No new runtime dependency, or its license/install scripts were reviewed.
- [ ] No `preinstall`/`install`/`postinstall`/`prepare` script was added.
- [ ] Host endpoint handling remains HTTPS-only; `searchPath` stays under the
      baseURL path prefix; `apiKeyEnv` is limited to `OLLAMA_*`.
- [ ] Response/query/snippet/result caps remain enforced.
- [ ] Client bundle still has no external network, storage or HTML sink calls;
      only the same-origin update RPC is allowed.
- [ ] Update metadata/tarballs are HTTPS-only, redirect-refused, size-capped and
      checked against SHA-512 SRI before extraction.
- [ ] Tar extraction rejects traversal, symlinks, hardlinks, devices and
      oversized entries; no npm lifecycle script runs.
- [ ] Persisted release URLs are validated; installs are locked and journaled.
- [ ] Auto-update remains opt-in, same-major and `minimumReleaseAge`-aware;
      linked installs are refused.
- [ ] Tests cover the changed behavior, including failure paths.
- [ ] README/README.ja/README.zh, CHANGELOG and the relevant docs are updated.

## Testing

<!-- Commands run, DSH version, browser smoke result. -->
