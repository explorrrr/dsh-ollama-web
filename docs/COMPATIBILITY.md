# Compatibility

## Tested matrix

| DSH | Node | Plugin |
|---|---|---|
| 0.2.1-rc.2 | 22.x | 1.0.x |

The host peer range is `@deepseek-ai/dsh-web >=0.2.1-rc.1 <0.3.0`. The client
package depends on the `plugins.row.config` / `configForms` contract and the
official `@deepseek-ai/dsh-client-ui-primitives` module.

## DSH 0.3

DSH 0.3 may change the web seam or the client slot contract. When that happens:

- Bump the plugin major to 2.0.
- Re-run the client contract spike on the new DSH before releasing.
- Keep the host patch fallback working even if the card needs a rewrite.
