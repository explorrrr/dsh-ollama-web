# Security notes

## Trust boundary

`dsh-ollama-web` is a DSH host plugin. It runs in the Node.js main process and
is not confined by the workspace sandbox. It can read the user's files,
credentials and sessions if it is malicious or compromised. The reviewed code
only reads the configured `OLLAMA_*` API-key reference, the search query and,
when the optional fetch provider is enabled, the requested URL, but users should
still treat installing/updating this plugin as a trust decision.

The client bundle ships in the same npm package and runs in the Web GUI origin.
Its bundle is intentionally small: no external `fetch`, no storage, no HTML
sinks (`innerHTML` / `dangerouslySetInnerHTML`), no `postMessage`, no
`window.open`. It registers a `plugins.row.config` slot and two
`plugins.detail.section` entries, calls `form.mutate`, asks the host's update
service through DSH's same-origin `connection.rpc` when the user invokes an
update action or the update screen opens with a check older than five minutes,
and injects three static `<style>` elements for the support, update and fetch
toggle sections. The donation link is a plain HTTPS anchor; the cards send
nothing until the user clicks it.

## Data flow

| Data | Destination | Notes |
|---|---|---|
| API key | `Authorization: Bearer` header | Only to the configured HTTPS endpoint |
| Query, `max_results` | `/api/web_search` | No session/user identifiers |
| Fetch URL | `/api/web_fetch` | Only when the optional Ollama fetch provider is enabled and pinned |
| Response results / fetched text | Local model context | Stored by DSH as a tool result |
| Settings | DSH host settings/credentials | Key is write-only |
| Update package name, metadata, tarballs | npm registry / npmmirror | Only on Check/Install, auto-update, or an update-screen open after five minutes |
| Update state/preferences | `<profile>/data/dsh-ollama-web/` | No secrets; mode 0o600 |

Default search and fetch endpoint host: `https://ollama.com`. Changing
`baseURL` changes where the key, queries and fetch URLs go; HTTPS is enforced,
redirects are refused, but the operator is responsible for the destination.
When the optional fetch provider is enabled, Ollama performs the request from
its own network, so the URL is disclosed to Ollama and DSH's local
DNS-pinning/SSRF boundary does not apply.

## Controls

- HTTPS-only search endpoint, no userinfo/query/fragment.
- `apiKeyEnv` must match `^OLLAMA_[A-Za-z0-9_]+$`; other environment or
  credential references are rejected before a request is made.
- Same-origin path validation that also keeps `searchPath` and `fetchPath`
  under the `baseURL` path prefix. Literal and percent-encoded `..`, `?`, `#`,
  backslashes and protocol-relative paths are rejected.
- `redirect: "error"` for the Ollama API request.
- Response byte cap, query cap, snippet cap, result cap and fetch content cap.
- Optional fetch URLs must be `http(s)`, at most 2048 characters, credential-free
  and not an obvious local/private hostname or IP literal, including known
  loopback wildcard DNS suffixes. This is a best-effort disclosure guard, not a
  DNS-level SSRF boundary.
- Fetched links are restricted to `http(s)` and Markdown-safe encoded; fetched
  content is control-character cleaned and capped.
- A successful Ollama fetch reports status `200` and the requested URL because
  Ollama does not expose the target status or final redirect URL.
- `http(s)`-only result URLs; username/password URLs dropped, and Markdown
  delimiters in URLs are percent-encoded.
- Titles and short metadata have Markdown/autolink delimiters removed so a
  hostile result cannot break the `[label](url)` structure.
- No logging, telemetry or custom session events.
- Credentials are resolved per operation; a credentials-service failure is
  surfaced instead of silently falling back.
- Release builds run in a read-only job; only the `npm` Environment publish
  job holds `id-token: write` and `contents: write`, and it does not install
  dependencies.
- Update metadata/tarballs are HTTPS-only, redirect-refused and size/time capped.
- Update tarballs are checked against the npm SHA-512 SRI before extraction.
- The tar extractor admits only regular files/directories under `package/` and
  rejects traversal, symlinks, hardlinks, devices, duplicates and oversized
  entries.
- No npm/pnpm command or lifecycle script runs during an update.
- After a successful swap, the updater may rewrite only the exact
  `dsh-ollama-web` dependency value in the profile `package.json` when it
  matched the previously installed version. The write is atomic and limited to
  the 0600 profile manifest; other fields are preserved.
- The profile `pnpm-lock.yaml` is not rewritten. A stale lock is reported in the
  update status, card and host log; a normal `pnpm install` resolves the new
  version, while `--frozen-lockfile` fails instead of silently reverting.
- Auto-update is opt-in, same-major only, and respects an explicitly configured
  `minimumReleaseAge`. When the setting is absent or `0`, there is no age wait.
- Installs are serialized per profile with a mode-0600 lock; stale locks from
  dead processes are reclaimed.
- A journal written before the package swap is used at startup to restore
  backups when a previous install was interrupted.
- Linked development installs are never modified.
- Persisted release metadata is validated on read: versions must parse and match,
  and the release URL must be the canonical GitHub Releases URL.
- The update RPC accepts no client-supplied version, URL, path or spec.

## Residual risks

- The host-plugin trust boundary is inherent to DSH.
- A compromised Ollama endpoint can return hostile content; DSH labels search
  results as external data, but prompt injection cannot be eliminated.
- The API key is account-scoped by Ollama; a leak can consume model/search
  quota. Use a dedicated key and monitor usage.
- The update trust boundary is the npm registry/npmmirror, TLS and the npm
  account. SRI detects transport/archive tampering, not a compromised registry.
  Provenance is published but the updater does not verify Sigstore itself.
- Auto-update installs new code without a prompt. It is opt-in and limited to
  the same major version; users who need review should leave it off.
- The updater replaces installed files directly. It may rewrite the exact
  `dsh-ollama-web` dependency value in `package.json`, but it does not rewrite
  `pnpm-lock.yaml`; a stale lock is reported and a later pnpm operation can
  otherwise restore the recorded version. See [UPDATES.md](UPDATES.md).
- The optional Ollama fetch provider discloses the requested URL to Ollama and
  cannot provide DSH HTTP's local DNS-pinning/SSRF guarantees. Its local/private
  hostname block is best-effort; a DNS name that resolves to a private address
  is not detected because Ollama performs the resolution and request.
- Ollama does not expose the target HTTP status or final redirect URL. A
  successful fetch is presented as `HTTP 200` for the requested URL, so target
  status semantics are lossy. Use `fetchProvider: http` when status fidelity
  matters.
- Fetched content is external and untrusted; the DSH tool's notice does not
  eliminate prompt injection.
