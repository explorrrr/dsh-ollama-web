# Compatibility

## Tested matrix

| DSH | Node | Plugin |
|---|---|---|
| 0.2.1-rc.2 | 22.x, 24.x | 1.2.x |

The host peer range is `@deepseek-ai/dsh-web >=0.2.1-rc.1 <0.3.0`. The client
package depends on the `plugins.row.config` / `configForms` contract, the
`plugins.detail.section` slot, the official
`@deepseek-ai/dsh-client-ui-primitives` module, and the shell's `connection`
service.

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

## DSH 0.3

DSH 0.3 may change the web seam, the connection RPC, or the client slot
contract. When that happens:

- Bump the plugin major to 2.0.
- Re-run the client contract spike on the new DSH before releasing.
- Keep the host patch fallback working even if the card needs a rewrite.
- Do not auto-update 1.x users into 2.0: the updater only installs releases in
  the current major version.

See [VERSIONING.md](VERSIONING.md) for the release rules.
