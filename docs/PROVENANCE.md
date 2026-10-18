# npm provenance verification

Date: 2026-10-18

## 1.1.0

`dsh-ollama-web@1.1.0` and `dsh-ollama-web-client@1.1.0` were published by
GitHub Actions through npm trusted publishing (OIDC). No `NPM_TOKEN` is used.

### Attestations

| Package | Attestation |
|---|---|
| `dsh-ollama-web@1.1.0` | <https://registry.npmjs.org/-/npm/v1/attestations/dsh-ollama-web@1.1.0> |
| `dsh-ollama-web-client@1.1.0` | <https://registry.npmjs.org/-/npm/v1/attestations/dsh-ollama-web-client@1.1.0> |

Both use SLSA provenance v1. Decoded build information:

```text
workflow.ref:        refs/tags/v1.1.0
workflow.repository: https://github.com/explorrrr/dsh-ollama-web
workflow.path:       .github/workflows/release.yml
git commit:         1defc35c9d434909e7f3df460b28f7ea20bd3a83
builder:             https://github.com/actions/runner/github-hosted
```

The tag commit is the same:

```bash
git rev-parse 'v1.1.0^{commit}'
# 1defc35c9d434909e7f3df460b28f7ea20bd3a83
```

### Subject digests

| Package | npm tarball SHA-512 | SLSA subject |
|---|---|---|
| `dsh-ollama-web@1.1.0` | `eb2d2ca3baa23105c6b2fa303de57c5b66223b756401f354b265040009dd9478030f50ff38060ee9e6952e52a534ec9ee6008789c60a55358359f233aceabcfc` | matches |
| `dsh-ollama-web-client@1.1.0` | `2edf077cc2c390ce1a69b813b27ae190f0e9f26977c1e2765ab3a800ef4ac67c3fe23db44f155f4e6d6df05824c2f5f998b9255344c3d7adc9ff78b7b9d17172` | matches |

The GitHub Release `v1.1.0` `SHA512SUMS` contains the same two hashes, computed
from the npm tarballs downloaded by the release workflow.

The workflow published both packages successfully and then failed its
asset-listing step: `tar -tzf ... | grep -q` closed the pipe, making tar exit
with SIGPIPE under `pipefail`. The GitHub Release assets for `v1.1.0` were
created from the same published npm tarballs. The asset check was fixed on
`main` for later releases.

### Reproduce

```bash
npm view dsh-ollama-web@1.1.0 dist.attestations
npm view dsh-ollama-web-client@1.1.0 dist.attestations

mkdir -p /tmp/prov-check-110 && cd /tmp/prov-check-110
for p in dsh-ollama-web dsh-ollama-web-client; do
  curl -fsSL "$(npm view "$p@1.1.0" dist.tarball)" -o "$p-1.1.0.tgz"
done
shasum -a 512 ./*.tgz
```

## 1.0.1 (historical)

`dsh-ollama-web@1.0.1` and `dsh-ollama-web-client@1.0.1` were published by
GitHub Actions through npm trusted publishing (OIDC). No `NPM_TOKEN` is used.

### Attestations

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

### Subject digests

| Package | npm tarball SHA-512 | SLSA subject |
|---|---|---|
| `dsh-ollama-web@1.0.1` | `27d483f06159ed656ea33544772f001f5651db3222eee662d7f2428dff80d0c6cf871fa533c6a2d198590b7c872201a3ed26b9cc6ae76850c690bb31af4ddc85` | matches |
| `dsh-ollama-web-client@1.0.1` | `544131d6d730601aef8321d639ed4ee0a17a1c546f323c96c7ce90664245dde0252f600577b8c00a39091b2eb21aea2c9a292b96c5516d771a756f035924d8f4` | matches |

The GitHub Release `v1.0.1` `SHA512SUMS` contains the same two hashes; the
release workflow downloads the published npm tarballs instead of packing local
ones.

### npm audit signatures

```text
audited 14 packages in 1s
14 packages have verified registry signatures
4 packages have verified attestations
```

### Reproduce

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
1.1.0 is the recommended version; 1.0.1 remains available with verified
provenance.
