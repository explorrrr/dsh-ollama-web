# Security Policy

## Reporting a vulnerability

Please report security issues through GitHub's **private vulnerability
reporting** for this repository. Do not open a public issue with exploit
details, API keys or user data.

Include the affected version, DSH version, a minimal reproduction and the
impact you observed. We will acknowledge the report and coordinate a fix and
disclosure timeline.

## Supported versions

| Version | Supported |
|---|---|
| 2.4.x | Yes |
| 2.3.x | Yes |
| 2.2.x | Yes |
| 2.1.x | Yes |
| 2.0.x | Yes |
| 1.2.x | Yes |
| 1.1.x | Yes |
| 1.0.x | Yes (no update feature) |
| < 1.0 | No |

## Security model

This is a DSH **host plugin**. DSH runs installed host plugins in the Node.js
main process, outside the workspace sandbox. A plugin can therefore read the
user's files, credentials and sessions if it is malicious or compromised. That
is a property of the plugin platform, not of this specific code; install only
plugins you trust, pin versions and review updates.

The client bundle ships in the same npm package and runs in the DSH Web GUI
origin. It can access the page's services, but this plugin's client bundle
contains no external network calls, storage access or HTML sinks. It requests
update status/actions from the host through DSH's authenticated same-origin
Connection RPC, and only when the user presses Check/Update or changes
auto-update. Its optional donation link is a plain HTTPS anchor and makes no
request until the user clicks it.

## Data egress

For search, the host contacts only `https://ollama.com` by default:

- `POST /api/web_search` with `{ query, max_results }`.
- The configured API key is sent only in the `Authorization: Bearer` header.

When the optional Ollama fetch provider is enabled and pinned, it additionally
sends the requested URL to `POST /api/web_fetch` with the same Bearer key. The
request is executed by Ollama, so the URL is disclosed to Ollama and DSH's local
DNS-pinning/SSRF boundary does not apply. The provider rejects non-http(s) URLs,
URLs with credentials and obvious local/private hosts, but this is best-effort.

For updates, the host contacts the npm registry (primary) or npmmirror
(fallback) only when the user checks/installs, while auto-update is enabled, or
when the update screen opens after five minutes without a successful check:

- the package name `dsh-ollama-web`;
- the package metadata and tarballs returned by the registry.

No API key, search query, fetch URL, session ID, user ID, conversation text or
filesystem data is sent except to the configured Ollama endpoint as described
above. Queries, fetch URLs and results are stored by DSH as ordinary tool
results in the session log.

If `baseURL` is changed, the operator chooses a different destination for the
key, queries and fetch URLs. The plugin enforces HTTPS and refuses redirects,
but it cannot make an untrusted endpoint trustworthy.

## Update security

- Update metadata and tarballs are HTTPS-only, redirect-refused, and capped at
  256 KiB / 10 seconds (metadata) and 16 MiB / 60 seconds (tarball).
- The tarball must match the npm `dist.integrity` SHA-512 SRI before extraction.
- Extraction accepts only regular files/directories under `package/`; symlinks,
  hardlinks, devices, absolute paths, `..` segments, duplicates and oversized
  entries are rejected.
- No npm/pnpm command or package lifecycle script is executed.
- Auto-update is opt-in, default off, limited to the same major version, and
  respects a `minimumReleaseAge` explicitly configured in the profile. When the
  setting is absent or `0`, there is no age wait.
- Linked development installs are never modified.
- Installs are serialized per profile with a mode-0600 lock and journaled for
  startup rollback after an interruption.
- The update RPC accepts no version, URL, path or package spec from the browser.
- Release settings and the solo self-review policy are documented in
  [docs/RELEASE-HARDENING.md](docs/RELEASE-HARDENING.md).
- The profile's `package.json` / `pnpm-lock.yaml` are not rewritten; a later
  pnpm operation can reinstall the recorded version. See
  [docs/UPDATES.md](docs/UPDATES.md).

## Key handling

- Prefer `OLLAMA_API_KEY` or the credentials service over a literal `apiKey`.
- `apiKeyEnv` only accepts `OLLAMA_*` names; unrelated environment variables
  cannot be selected as the search/fetch credential.
- The Web UI card is write-only: a saved key is never read back or displayed.
- Keys are not logged and are not included in provider error messages.
- Use a dedicated key and monitor Ollama usage/balance. Rotate the key if it is
  exposed.

## Fetch policy

`web_fetch` remains on DSH's built-in HTTP provider by default. The optional
Ollama `/api/web_fetch` provider is opt-in and requires both
`enableFetchProvider: true` and `web.fetchProvider: ollama`.

Ollama performs the fetch from its own network. The provider therefore does not
provide DSH HTTP's public-address checks, DNS pinning or same-origin redirect
policy, and the target URL is disclosed to Ollama. It does reject non-http(s)
URLs, URLs with embedded credentials and obvious local/private hostnames or IP
literals (including known loopback wildcard DNS suffixes), but that block is
best-effort and does not resolve DNS.

Ollama also does not expose the target HTTP status or final redirect URL. A
successful fetch is reported to DSH as `HTTP 200` for the requested URL. This is
a lossy mapping; use `fetchProvider: http` when target status fidelity or the
local SSRF boundary matters.
