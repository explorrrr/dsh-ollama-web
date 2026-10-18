# npm provenance verification

Date: 2026-10-18

`dsh-ollama-web@1.0.1` and `dsh-ollama-web-client@1.0.1` were published by
GitHub Actions through npm trusted publishing (OIDC). No `NPM_TOKEN` is used.

## Attestations

| Package | Attestation |
|---|---|
| `dsh-ollama-web@1.0.1` | <https://registry.npmjs.org/-/npm/v1/attestations/dsh-ollama-web@1.0.1> |
| `dsh-ollama-web-client@1.0.1` | <https://registry.npmjs.org/-/npm/v1/attestations/dsh-ollama-web-client@1.0.1> |

Both use SLSA provenance v1. Decoded build information:

```text
workflow.ref:        refs/tags/v1.0.1
workflow.repository: https://github.com/explorrrr/dsh-ollama-web
workflow.path:       .github/workflows/release.yml
git commit:           bdc8692955dd57c6b7bf040dcfef55eb624954b2
builder:              https://github.com/actions/runner/github-hosted
```

The tag commit is the same:

```bash
git rev-parse 'v1.0.1^{commit}'
# bdc8692955dd57c6b7bf040dcfef55eb624954b2
```

## Subject digests

| Package | npm tarball SHA-512 | SLSA subject |
|---|---|---|
| `dsh-ollama-web@1.0.1` | `27d483f06159ed656ea33544772f001f5651db3222eee662d7f2428dff80d0c6cf871fa533c6a2d198590b7c872201a3ed26b9cc6ae76850c690bb31af4ddc85` | matches |
| `dsh-ollama-web-client@1.0.1` | `544131d6d730601aef8321d639ed4ee0a17a1c546f323c96c7ce90664245dde0252f600577b8c00a39091b2eb21aea2c9a292b96c5516d771a756f035924d8f4` | matches |

The GitHub Release `v1.0.1` `SHA512SUMS` contains the same two hashes; the
release workflow downloads the published npm tarballs instead of packing local
ones.

## npm audit signatures

```text
audited 14 packages in 1s
14 packages have verified registry signatures
4 packages have verified attestations
```

## Reproduce

```bash
npm view dsh-ollama-web@1.0.1 dist.attestations
npm view dsh-ollama-web-client@1.0.1 dist.attestations

mkdir -p /tmp/prov-check && cd /tmp/prov-check
for p in dsh-ollama-web dsh-ollama-web-client; do
  curl -fsSL "$(npm view "$p@1.0.1" dist.tarball)" -o "$p-1.0.1.tgz"
done
shasum -a 512 ./*.tgz
```

## Note on 1.0.0

1.0.0 was the first publish of both package names. npm required a traditional
2FA publish for that first version, so 1.0.0 has no provenance attestation.
1.0.1 is the recommended version and has verified provenance.
