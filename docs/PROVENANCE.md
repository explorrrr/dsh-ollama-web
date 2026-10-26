# npm provenance verification

Date: 2026-10-26 (2.5.0); 2.4.1, 2.4.0, 2.3.0, 2.2.0, 2.1.0, 2.0.0,
1.2.0 and 1.1.0 checks were recorded earlier.

## 2.5.0

`dsh-ollama-web@2.5.0` was published by GitHub Actions through npm trusted
publishing (OIDC). No `NPM_TOKEN` is used.

### Attestations

| Package | Attestation |
|---|---|
| `dsh-ollama-web@2.5.0` | <https://registry.npmjs.org/-/npm/v1/attestations/dsh-ollama-web@2.5.0> |

It uses SLSA provenance v1. Decoded build information:

```text
workflow.ref:        refs/tags/v2.5.0
workflow.repository: https://github.com/explorrrr/dsh-ollama-web
workflow.path:       .github/workflows/release.yml
git commit:          e0d2e020e735a258d6a9e9a229f12db1e70dd1a5
builder:             https://github.com/actions/runner/github-hosted
invocation:          https://github.com/explorrrr/dsh-ollama-web/actions/runs/40283159918/attempts/1
```

The tag commit is the same:

```bash
git rev-parse 'v2.5.0^{commit}'
# e0d2e020e735a258d6a9e9a229f12db1e70dd1a5
```

### Subject digests

| Package | npm tarball SHA-512 | SLSA subject |
|---|---|---|
| `dsh-ollama-web@2.5.0` | `f626c0c5766bc60ecf7e534c5191aca485945193dfde45504062ba6ddc143f2bbbc371beacd149719ae5c89dbe302369651d6787486c0c3ba536816175bf6620` | matches |

npm reports the same digest as
`sha512-9ibAxXZrxg7PflNMUZGspIWUUZPf3kVQQGK6bdwUPyu7w3G+rNFJcZrlyJ2+MCNpZR1nh0hsDDulNoFhdb9mIA==`.
The GitHub Release `v2.5.0` `SHA512SUMS` contains the same hash, computed from
the npm tarball downloaded by the release workflow. npm `latest` points to
`2.5.0`; the registry publish time is `2026-10-26T07:07:30.409Z`.

The release ran in a single `publish` job pass after the `npm` environment's
five-minute wait timer. The GitHub Release was published at
`2026-10-26T07:07:45Z` with `dsh-ollama-web-2.5.0.tgz` (94,414 bytes) and
`SHA512SUMS`. The published package contains `dist/update/records.js` and the
rest of the host/client halves.

### Reproduce

```bash
npm view dsh-ollama-web@2.5.0 dist.attestations
npm view dsh-ollama-web@2.5.0 dist.tarball dist.integrity

mkdir -p /tmp/prov-check-250 && cd /tmp/prov-check-250
curl -fsSL "$(npm view dsh-ollama-web@2.5.0 dist.tarball)" -o dsh-ollama-web-2.5.0.tgz
shasum -a 512 dsh-ollama-web-2.5.0.tgz
tar -tzf dsh-ollama-web-2.5.0.tgz | grep -E 'package/(client\.js|dist/fetch-provider\.js|dist/index\.js|dist/update/records\.js|dist/update/service\.js|cordis\.patch\.yml)'
```

## 2.4.1

`dsh-ollama-web@2.4.1` was published by GitHub Actions through npm trusted
publishing (OIDC). No `NPM_TOKEN` is used.

### Attestations

| Package | Attestation |
|---|---|
| `dsh-ollama-web@2.4.1` | <https://registry.npmjs.org/-/npm/v1/attestations/dsh-ollama-web@2.4.1> |

It uses SLSA provenance v1. Decoded build information:

```text
workflow.ref:        refs/tags/v2.4.1
workflow.repository: https://github.com/explorrrr/dsh-ollama-web
workflow.path:       .github/workflows/release.yml
git commit:          8ffb1e988a5198ca584225c99e16fa87f807511f
builder:             https://github.com/actions/runner/github-hosted
invocation:          https://github.com/explorrrr/dsh-ollama-web/actions/runs/40184282183/attempts/1
```

The tag commit is the same:

```bash
git rev-parse 'v2.4.1^{commit}'
# 8ffb1e988a5198ca584225c99e16fa87f807511f
```

### Subject digests

| Package | npm tarball SHA-512 | SLSA subject |
|---|---|---|
| `dsh-ollama-web@2.4.1` | `d7e94076a3a768a756d6cbfa1732b694019551ea2ea078bb9b31f53aea0377a21294f4a0c4c5c42caafb67ccaedc4ad1f87db1f45794c6d2e920c8494c29e3a1` | matches |

npm reports the same digest as
`sha512-1+lAdqOnaKdW1sv6FzK2lAGVUeouoHi7mzH1OuoDd6ISlPSgxMXELKr7Z8yu3ErR+H2x9FeUxtLpIMhJTCnjoQ==`.
The GitHub Release `v2.4.1` `SHA512SUMS` contains the same hash, computed from
the npm tarball downloaded by the release workflow. npm `latest` points to
`2.4.1`; the registry publish time is `2026-10-25T10:25:58.504Z`.

The release ran in a single `publish` job pass. The updated
`actions/upload-artifact` 7.0.2 and `actions/download-artifact` 8.0.2 completed
the staged-tarball hand-off (including the v8 digest check), the npm tarball
download completed on the first attempt, and the GitHub Release was published
at `2026-10-25T10:26:13Z`.

### Reproduce

```bash
npm view dsh-ollama-web@2.4.1 dist.attestations
npm view dsh-ollama-web@2.4.1 dist.tarball dist.integrity

mkdir -p /tmp/prov-check-241 && cd /tmp/prov-check-241
curl -fsSL "$(npm view dsh-ollama-web@2.4.1 dist.tarball)" -o dsh-ollama-web-2.4.1.tgz
shasum -a 512 dsh-ollama-web-2.4.1.tgz
tar -tzf dsh-ollama-web-2.4.1.tgz | grep -E 'package/(client\.js|dist/fetch-provider\.js|dist/index\.js|dist/update/dsh\.js|cordis\.patch\.yml)'
```

## 2.4.0

`dsh-ollama-web@2.4.0` was published by GitHub Actions through npm trusted
publishing (OIDC). No `NPM_TOKEN` is used.

### Attestations

| Package | Attestation |
|---|---|
| `dsh-ollama-web@2.4.0` | <https://registry.npmjs.org/-/npm/v1/attestations/dsh-ollama-web@2.4.0> |

It uses SLSA provenance v1. Decoded build information:

```text
workflow.ref:        refs/tags/v2.4.0
workflow.repository: https://github.com/explorrrr/dsh-ollama-web
workflow.path:       .github/workflows/release.yml
git commit:          a08b429550c76a321952de7b0f34be18091c6eb9
builder:             https://github.com/actions/runner/github-hosted
invocation:          https://github.com/explorrrr/dsh-ollama-web/actions/runs/39398934651/attempts/1
```

The tag commit is the same:

```bash
git rev-parse 'v2.4.0^{commit}'
# a08b429550c76a321952de7b0f34be18091c6eb9
```

### Subject digests

| Package | npm tarball SHA-512 | SLSA subject |
|---|---|---|
| `dsh-ollama-web@2.4.0` | `570b647b25846b0382a6b307c4224c2c626aae8a3d7ba1bad2b572eb50f8a9e55908479dc6f31ae04d09b12a7c1a39f579eb4b8aeeb098f0a7223760240c2a6d` | matches |

npm reports the same digest as
`sha512-VwtkeyWEawOCprMHxCJMLGJqroo9e6G60rVy61D4qeVZCEedxvMa4E0JsSp8Gjn1eetLiu6wmPCnIjdgJAwqbQ==`.
The GitHub Release `v2.4.0` `SHA512SUMS` contains the same hash, computed from
the npm tarball downloaded by the release workflow. npm `latest` points to
`2.4.0`; the registry publish time is `2026-10-20T09:20:02.730Z`.

The first publish job published the package and then failed while waiting for
npm propagation (24 attempts, about two minutes). The failed `publish` job was
rerun; it skipped the existing version, downloaded the tarball and completed the
GitHub Release. The Release was published at `2026-10-20T09:27:44Z`.

### Reproduce

```bash
npm view dsh-ollama-web@2.4.0 dist.attestations
npm view dsh-ollama-web@2.4.0 dist.tarball dist.integrity

mkdir -p /tmp/prov-check-240 && cd /tmp/prov-check-240
curl -fsSL "$(npm view dsh-ollama-web@2.4.0 dist.tarball)" -o dsh-ollama-web-2.4.0.tgz
shasum -a 512 dsh-ollama-web-2.4.0.tgz
tar -tzf dsh-ollama-web-2.4.0.tgz | grep -E 'package/(client\.js|dist/fetch-provider\.js|dist/index\.js|dist/update/dsh\.js|cordis\.patch\.yml)'
```

## 2.3.0

`dsh-ollama-web@2.3.0` was published by GitHub Actions through npm trusted
publishing (OIDC). No `NPM_TOKEN` is used.

### Attestations

| Package | Attestation |
|---|---|
| `dsh-ollama-web@2.3.0` | <https://registry.npmjs.org/-/npm/v1/attestations/dsh-ollama-web@2.3.0> |

It uses SLSA provenance v1. Decoded build information:

```text
workflow.ref:        refs/tags/v2.3.0
workflow.repository: https://github.com/explorrrr/dsh-ollama-web
workflow.path:       .github/workflows/release.yml
git commit:          de0d6859a0c0cdab124ffc1fc10159a42d029297
builder:             https://github.com/actions/runner/github-hosted
invocation:          https://github.com/explorrrr/dsh-ollama-web/actions/runs/39238812478/attempts/1
```

The tag commit is the same:

```bash
git rev-parse 'v2.3.0^{commit}'
# de0d6859a0c0cdab124ffc1fc10159a42d029297
```

### Subject digests

| Package | npm tarball SHA-512 | SLSA subject |
|---|---|---|
| `dsh-ollama-web@2.3.0` | `7190e1eeb23376c0c5b4bce42134853bedbccfaa105a2472495e2f05c98e08703a046764d4fce88ce61bda934f71f04651d80e44ee3080981fa00417cd6dc57c` | matches |

npm reports the same digest as
`sha512-cZDh7rIzdsDFtLzkITSFO+28z6oQWiRySV4vBcmOCHA6BGdk1PzojOYb2pNPcfBGUdgORO4wgJgfoAQXzW3FfA==`.
The GitHub Release `v2.3.0` `SHA512SUMS` contains the same hash, computed from
the npm tarball downloaded by the release workflow. npm `latest` points to
`2.3.0`; the registry publish time is `2026-10-19T10:44:45.018Z`.

The publish job completed in its first run; no rerun was needed. The GitHub
Release was created at `2026-10-19T10:44:59Z`.

### Reproduce

```bash
npm view dsh-ollama-web@2.3.0 dist.attestations
npm view dsh-ollama-web@2.3.0 dist.tarball dist.integrity

mkdir -p /tmp/prov-check-230 && cd /tmp/prov-check-230
curl -fsSL "$(npm view dsh-ollama-web@2.3.0 dist.tarball)" -o dsh-ollama-web-2.3.0.tgz
shasum -a 512 dsh-ollama-web-2.3.0.tgz
tar -tzf dsh-ollama-web-2.3.0.tgz | grep -E 'package/(client\.js|dist/index\.js|dist/update/dsh\.js|cordis\.patch\.yml)'
```

## 2.2.0

`dsh-ollama-web@2.2.0` was published by GitHub Actions through npm trusted
publishing (OIDC). No `NPM_TOKEN` is used.

### Attestations

| Package | Attestation |
|---|---|
| `dsh-ollama-web@2.2.0` | <https://registry.npmjs.org/-/npm/v1/attestations/dsh-ollama-web@2.2.0> |

It uses SLSA provenance v1. Decoded build information:

```text
workflow.ref:        refs/tags/v2.2.0
workflow.repository: https://github.com/explorrrr/dsh-ollama-web
workflow.path:       .github/workflows/release.yml
git commit:          a4f8109ed29a56b9aa093b114d9b87838b12b610
builder:             https://github.com/actions/runner/github-hosted
invocation:          https://github.com/explorrrr/dsh-ollama-web/actions/runs/39223380360/attempts/1
```

The tag commit is the same:

```bash
git rev-parse 'v2.2.0^{commit}'
# a4f8109ed29a56b9aa093b114d9b87838b12b610
```

### Subject digests

| Package | npm tarball SHA-512 | SLSA subject |
|---|---|---|
| `dsh-ollama-web@2.2.0` | `01c3c47a25410bb36a1309e94751360708215ee80faf3964fbf3b981902feadd44413125ab7591b27fc69da18bd78ccfbd39ef4bfaaf852f401dc0a3aa52d72f` | matches |

npm reports the same digest as
`sha512-AcPEeiVBC7NqEwnpR1E2BwghXugPrzlk+/O5gZAv6t1EQTElq3WRsn/GnaGL14zPvTnvS/qvhS9AHcCjqlLXLw==`.
The GitHub Release `v2.2.0` `SHA512SUMS` contains the same hash, computed from
the npm tarball downloaded by the release workflow. npm `latest` points to
`2.2.0`; the registry publish time is `2026-10-19T08:39:56.581Z`.

The first publish-job run published the package but failed while polling for the
new tarball because npm took about three minutes to expose it. Re-running the
failed `publish` job skipped the already-published version, downloaded the
tarball, created the GitHub Release and uploaded its assets. Both jobs of the
re-run are `success`.

### Reproduce

```bash
npm view dsh-ollama-web@2.2.0 dist.attestations
npm view dsh-ollama-web@2.2.0 dist.tarball dist.integrity

mkdir -p /tmp/prov-check-220 && cd /tmp/prov-check-220
curl -fsSL "$(npm view dsh-ollama-web@2.2.0 dist.tarball)" -o dsh-ollama-web-2.2.0.tgz
shasum -a 512 dsh-ollama-web-2.2.0.tgz
tar -tzf dsh-ollama-web-2.2.0.tgz | grep -E 'package/(client\.js|dist/index\.js|dist/update/dsh\.js|cordis\.patch\.yml)'
```

## 2.1.0

`dsh-ollama-web@2.1.0` was published by GitHub Actions through npm trusted
publishing (OIDC). No `NPM_TOKEN` is used.

### Attestations

| Package | Attestation |
|---|---|
| `dsh-ollama-web@2.1.0` | <https://registry.npmjs.org/-/npm/v1/attestations/dsh-ollama-web@2.1.0> |

It uses SLSA provenance v1. Decoded build information:

```text
workflow.ref:        refs/tags/v2.1.0
workflow.repository: https://github.com/explorrrr/dsh-ollama-web
workflow.path:       .github/workflows/release.yml
git commit:          57cd1e0e4709f179c577a3c3fcac061b86887460
builder:             https://github.com/actions/runner/github-hosted
invocation:          https://github.com/explorrrr/dsh-ollama-web/actions/runs/39217828201/attempts/1
```

The tag commit is the same:

```bash
git rev-parse 'v2.1.0^{commit}'
# 57cd1e0e4709f179c577a3c3fcac061b86887460
```

### Subject digests

| Package | npm tarball SHA-512 | SLSA subject |
|---|---|---|
| `dsh-ollama-web@2.1.0` | `c4ed60bc5c01cbbd7de9831e26f462b1dda1baeac99cb0a14cbf9812f946f5e86db539ffb96ae16398957dabc6381cb63157252ad7e27d96eda6dea8d8584438` | matches |

npm reports the same digest as
`sha512-xO1gvFwBy7196YMeJvRisd2huurJnLChTL+YEvlG9ehttTn/uWrhY5iVfavGOBy2MVclKtfifZbtpt6o2FhEOA==`.
The GitHub Release `v2.1.0` `SHA512SUMS` contains the same hash, computed from
the npm tarball downloaded by the release workflow. npm `latest` points to
`2.1.0`; the registry publish time is `2026-10-19T07:52:23.424Z`.

The first publish-job run published the package but failed while polling for the
new tarball because npm took about three minutes to expose it. Re-running the
failed `publish` job skipped the already-published version, downloaded the
tarball, created the GitHub Release and uploaded its assets. Both jobs of the
re-run are `success`.

### Reproduce

```bash
npm view dsh-ollama-web@2.1.0 dist.attestations
npm view dsh-ollama-web@2.1.0 dist.tarball dist.integrity

mkdir -p /tmp/prov-check-210 && cd /tmp/prov-check-210
curl -fsSL "$(npm view dsh-ollama-web@2.1.0 dist.tarball)" -o dsh-ollama-web-2.1.0.tgz
shasum -a 512 dsh-ollama-web-2.1.0.tgz
tar -tzf dsh-ollama-web-2.1.0.tgz | grep -E 'package/(client\.js|dist/index\.js|dist/update/dsh\.js|cordis\.patch\.yml)'
```

## 2.0.0

`dsh-ollama-web@2.0.0` was published by GitHub Actions through npm trusted
publishing (OIDC). No `NPM_TOKEN` is used. This is the first single-package
release: `dsh-ollama-web-client` is not part of 2.0.0 and remains at 1.2.0 on
npm.

### Attestations

| Package | Attestation |
|---|---|
| `dsh-ollama-web@2.0.0` | <https://registry.npmjs.org/-/npm/v1/attestations/dsh-ollama-web@2.0.0> |

It uses SLSA provenance v1. Decoded build information:

```text
workflow.ref:        refs/tags/v2.0.0
workflow.repository: https://github.com/explorrrr/dsh-ollama-web
workflow.path:       .github/workflows/release.yml
git commit:          4e455172ca443d84c1da8450b4c83d0848dccbe6
builder:             https://github.com/actions/runner/github-hosted
invocation:          https://github.com/explorrrr/dsh-ollama-web/actions/runs/39194605928/attempts/1
```

The tag commit is the same:

```bash
git rev-parse 'v2.0.0^{commit}'
# 4e455172ca443d84c1da8450b4c83d0848dccbe6
```

### Subject digests

| Package | npm tarball SHA-512 | SLSA subject |
|---|---|---|
| `dsh-ollama-web@2.0.0` | `ed806d62d2f27d3208b774657060a90fd938e59d136d2ad96ed120e7c58ed441131b4d2ea2bde0a3229c9eeb56f50cfb0e764de80faa4128e79253aeba7703c8` | matches |

npm reports the same digest as
`sha512-7YBtYtLyfTIIt3RlcGCpD9k45Z0TbSrZbtEg58WO1EETG00uor3goyKcnutW9Qz7DnZN6A+qQSjnklOuuncDyA==`.
The GitHub Release `v2.0.0` `SHA512SUMS` contains the same hash, computed from
the npm tarball downloaded by the release workflow. The release workflow
completed successfully (build and publish jobs both `success`).

### Reproduce

```bash
npm view dsh-ollama-web@2.0.0 dist.attestations
npm view dsh-ollama-web@2.0.0 dist.tarball dist.integrity

mkdir -p /tmp/prov-check-200 && cd /tmp/prov-check-200
curl -fsSL "$(npm view dsh-ollama-web@2.0.0 dist.tarball)" -o dsh-ollama-web-2.0.0.tgz
shasum -a 512 dsh-ollama-web-2.0.0.tgz
tar -tzf dsh-ollama-web-2.0.0.tgz | grep -E 'package/(client\.js|dist/index\.js|cordis\.patch\.yml)'
```

## 1.2.0

`dsh-ollama-web@1.2.0` and `dsh-ollama-web-client@1.2.0` were published by
GitHub Actions through npm trusted publishing (OIDC). No `NPM_TOKEN` is used.

### Attestations

| Package | Attestation |
|---|---|
| `dsh-ollama-web@1.2.0` | <https://registry.npmjs.org/-/npm/v1/attestations/dsh-ollama-web@1.2.0> |
| `dsh-ollama-web-client@1.2.0` | <https://registry.npmjs.org/-/npm/v1/attestations/dsh-ollama-web-client@1.2.0> |

Both use SLSA provenance v1. Decoded build information:

```text
workflow.ref:        refs/tags/v1.2.0
workflow.repository: https://github.com/explorrrr/dsh-ollama-web
workflow.path:       .github/workflows/release.yml
git commit:         613b12be9c27b99fa888378b06095aee570aea45
builder:             https://github.com/actions/runner/github-hosted
```

The tag commit is the same:

```bash
git rev-parse 'v1.2.0^{commit}'
# 613b12be9c27b99fa888378b06095aee570aea45
```

### Subject digests

| Package | npm tarball SHA-512 | SLSA subject |
|---|---|---|
| `dsh-ollama-web@1.2.0` | `9d5c7369b2fd1e245dd33c6e36d3b00041e843b62c01799244b42b1ba1257d43fcb66d726d9e96c79308fc1222b8ca8fbfa4909e120e81bca36869d6d18fc8b9` | matches |
| `dsh-ollama-web-client@1.2.0` | `10d1537a396d44b487c5841fb4c3a784d82d02d53623f750be35bdd81eb5e2ff37fea9d65507ed24cba9ee7b67aafc1ea0f85c14f155196f286b833392953c90` | matches |

The GitHub Release `v1.2.0` `SHA512SUMS` contains the same two hashes, computed
from the npm tarballs downloaded by the release workflow. The release workflow
completed successfully (build and publish jobs both `success`).

### Reproduce

```bash
npm view dsh-ollama-web@1.2.0 dist.attestations
npm view dsh-ollama-web-client@1.2.0 dist.attestations

mkdir -p /tmp/prov-check-120 && cd /tmp/prov-check-120
for p in dsh-ollama-web dsh-ollama-web-client; do
  curl -fsSL "$(npm view "$p@1.2.0" dist.tarball)" -o "$p-1.2.0.tgz"
done
shasum -a 512 ./*.tgz
```

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
