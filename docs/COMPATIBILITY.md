# Compatibility

## Tested matrix

| DSH | Node | Plugin |
|---|---|---|
| 0.2.1-rc.2 | 22.x, 24.x | 2.4.x |

The host peer range is `@deepseek-ai/dsh-web >=0.2.1-rc.1 <0.3.0`. The package's
client bundle depends on the `plugins.row.config` / `configForms` contract, the
`plugins.detail.section` slot, the official
`@deepseek-ai/dsh-client-ui-primitives` module, and the shell's `connection`
service. The bundle is served from the same package as the host provider.

## Fetch provider requirements

The optional fetch provider uses DSH's `registerFetchProvider` seam and returns
the `WebFetchResult` shape (`url`, `statusCode`, `body`, `truncated`). It is
registered unconditionally when the seam exists; `available()` follows the live
`enableFetchProvider` setting. Users must also pin `web.fetchProvider: ollama`
because the default composition already mounts the HTTP fetch provider.

Ollama's `/api/web_fetch` response is `{ title, content, links }` and has no
target HTTP status or final URL. The provider reports `statusCode: 200` for a
successful Ollama response and the requested URL. This is a documented lossy
mapping; `fetchProvider: http` remains the correct choice when target status
fidelity or DSH's local SSRF boundary is required.

## Automatic compatibility guard

The updater reads the running DSH release from `DSH_CLIENT_VERSION` (desktop)
or `DSH_APP_VERSION` (other deployments), and the target release's
`engines.dsh` from the npm packument.

- A release whose range rejects the running DSH is reported as `incompatible`.
  The card does not offer **Install update**, and auto-update never installs it.
- A release with no `engines.dsh`, an unparseable range, or a host without a
  DSH version is `unknown`. Auto-update pauses, but the explicit **Install
  update** button remains available for a deliberate manual update.
- The updater does not search older releases for a compatible version. If the
  latest release is incompatible, update DSH first or install a compatible
  release with the CLI.
- The guard is metadata-based. It cannot prove that an untested DSH build inside
  a broad range works; the tested matrix above remains the support statement.

## Update feature requirements

- The host registers `/ollama-web-update` through `connection.rpc.handle` on a
  Web profile and through `/api` exact fetch routes for the desktop carrier.
- The browser resolves `ctx.get('connection')` at render time. It does not add
  `connection` to the plugin's `inject` list, so an older DSH that lacks the
  service still loads the search configuration card; the update section reports
  that checks are unavailable.
- The update UI needs the `plugins.detail.section` slot declared by
  `@deepseek-ai/dsh-client-ui-plugin-manager`. Without it, the row Configure
  card still shows the update section.
- The updater relies on DSH 0.2.1's profile layout (`profiles/<name>/node_modules`)
  and on `ctx.baseUrl` pointing at the profile directory. If the profile cannot
  be resolved, the host skips the update service and search continues to work.

## Upgrading from 1.x

1.x shipped `dsh-ollama-web-client` as a separate package. 2.0.0 merges it into
`dsh-ollama-web` and changes the update RPC status shape. Remove the old client
package before installing 2.4.1; leaving it installed can register the settings
card twice and is not supported. The 1.x updater only installs releases in the
current major, so 2.0.0 is a manual upgrade. See
[UPDATES.md](UPDATES.md#upgrading-from-1x).

## DSH 0.3

DSH 0.3 may change the web seam, the connection RPC, or the client slot
contract. When that happens:

- Bump the plugin major to 3.0.
- Re-run the client contract spike on the new DSH before releasing.
- Keep the host patch fallback working even if the card needs a rewrite.
- Do not auto-update 1.x or 2.x users into 3.0: the updater only installs
  releases in the current major version.

See [VERSIONING.md](VERSIONING.md) for the release rules.
