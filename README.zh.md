# dsh-ollama-web

[English](README.md) | [日本語](README.ja.md) | 中文

用于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）的 Ollama Cloud Web 搜索提供方。一个 npm 包同时提供 host 后端和 Web UI 设置卡片。仅替换 `web_search` 后端：不使用 DeepSeek API 密钥、提供方或回退。`web_fetch` 仍使用 DSH 内置的 HTTP 提供方（已具备 SSRF 防护）。

[![通过 Buy Me a Coffee 支持](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?style=flat-square&logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/explorrrr)

- 搜索端点默认是 `https://ollama.com/api/web_search`
- 在设置卡片（只写）或通过 `OLLAMA_API_KEY` 配置 API 密钥
- 支持更新检查、安装更新和 opt-in 自动更新
- `web_fetch` 仍使用 DSH 内置 HTTP；2.x 不包含 Ollama `web_fetch`

## 环境要求

- DSH 0.2.1-rc.2（peer: `>=0.2.1-rc.1 <0.3.0`），已在该版本验证
- 不支持 DSH 0.3.x（计划在 3.0 支持）。详见 [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md)
- Node.js 20.3 以上
- Ollama Cloud API 密钥：<https://ollama.com/settings/keys>

## 安装

一个包同时提供 `web_search` 后端和设置卡片。只需安装一次。

1. 添加包。

   ```bash
   dsh plugin --profile desktop add dsh-ollama-web@2.1.0
   ```

   如果不是 `desktop` 配置，请替换 `desktop`。也可以在 Web UI 中通过 **Plugins → Add plugin** 添加。npm：[dsh-ollama-web](https://www.npmjs.com/package/dsh-ollama-web)

2. 在 `~/.dsh/profiles/<profile>/cordis.patch.yml` 中固定搜索提供方。

   ```yaml
   - id: web
     config:
       searchProvider: ollama
       fetchProvider: http

   # 仅当内置的 DeepSeek 搜索提供方已挂载时。
   - id: web-search-deepseek
     disabled: true
   ```

   `fetchProvider: http` 表示 `web_fetch` 继续使用 DSH 内置的 HTTP 提供方。

### 从 1.x 迁移

2.0.0 将原 `dsh-ollama-web-client` 包合并到 `dsh-ollama-web`。安装 2.1.0 前请先删除旧包：

```bash
dsh plugin --profile <profile> remove dsh-ollama-web-client
dsh plugin --profile <profile> add dsh-ollama-web@2.1.0
```

1.x 更新器会检查旧的两个包，自动更新仅限当前主版本。由于 2.0.0 不再发布新的 `dsh-ollama-web-client`，1.x 不会自动升级到 2.0.0，需要手动迁移。桌面版请在 **Plugins** 中删除 `dsh-ollama-web-client` bundle，再安装 `dsh-ollama-web@2.1.0`。保留旧 client 可能导致设置卡片重复注册，不受支持。

## 配置

### API 密钥

在设置卡片（**Plugins → `dsh-ollama-web` → `ollama-web` → Configure**）中输入，或在启动 DSH 的环境中设置 `OLLAMA_API_KEY`。卡片对 API 密钥是只写的：留空会保留当前密钥，已保存的密钥不会再次显示。

### 配置项

| 字段 | 默认值 | 约束 |
|---|---|---|
| `baseURL` | `https://ollama.com` | 仅 HTTPS；禁止 userinfo/query/fragment |
| `apiKeyEnv` | `OLLAMA_API_KEY` | `^OLLAMA_[A-Za-z0-9_]+$` |
| `searchPath` | `/api/web_search` | baseURL 路径前缀下、同一 origin 的绝对路径 |
| `maxResults` | `5` | 1-10 |
| `snippetMax` | `2000` | 1-10000 个字符 |
| `maxQueryChars` | `2048` | 1-8192 个字符 |
| `searchTimeoutMs` | `30000` | 1000-120000 ms |
| `maxResponseBytes` | `2097152` | 65536-10485760 字节 |
| `apiKey` | 未设置 | 密钥；优先使用设置卡片或 `OLLAMA_API_KEY` |

`apiKeyEnv` 仅接受 `OLLAMA_*` 环境变量名；其他环境变量或凭据引用会在请求前被拒绝。

## 使用

让模型执行搜索，确认结果来自 Ollama。搜索请求正文只包含查询和 `max_results`；API 密钥放在 `Authorization: Bearer` 请求头中。默认端点是 `https://ollama.com/api/web_search`。

### 如果设置卡片未出现

1. 确认 `dsh-ollama-web` 已安装且其 bundle 已启用。
2. 刷新 Web 页面。
3. 确认包名为 `dsh-ollama-web`，行 ID 为 `ollama-web`（卡片键为 `dsh-ollama-web#ollama-web`）。
4. 回退到上面的 patch 配置；即使没有卡片，Host 也能工作。

## 更新

从 2.1.0 起，**Plugins → `dsh-ollama-web` → Configure**（或 bundle 详情页）会显示更新区域。使用 **检查更新** / **安装更新**，安装后重启 DSH（桌面版请退出并重新打开应用）。

- **检查：** Host 读取 npm registry（失败时使用 npmmirror），仅在 profile **明确设置** pnpm 的 `minimumReleaseAge` 时遵守。未设置、无法读取、无效或 `0` 表示不等待。比配置年龄更新的版本会显示为等待中，不会自动安装。
- **兼容性：** 更新器会将目标版本的 `engines.dsh` 与当前运行的 DSH 版本（`DSH_CLIENT_VERSION` 或 `DSH_APP_VERSION`）进行比较。明确不兼容的版本会被阻止；无法确认兼容性时会暂停自动更新，但仍可使用手动安装按钮。
- **安装：** 下载一个 tarball，校验 npm SHA-512 integrity 和压缩包内容，然后原子替换已安装的包。任一步失败都会回滚到原副本。
- **自动更新（opt-in）：** 默认关闭。启用后每 6 小时检查一次，只自动安装支持当前 DSH 的**同一主版本**新版本。主版本更新需要点击按钮。
- **注意：** `link:` 或 profile 外目录的开发安装不会被修改。DSH 0.2.1 没有第三方更新 API，因此直接替换已安装文件。profile 的 `package.json` / `pnpm-lock.yaml` 仍记录旧版本；如需同步记录，请通过 **Plugins**（或 CLI）重新安装。

详见 [docs/UPDATES.md](docs/UPDATES.md)。

## 安全

- Host 插件在进程内运行，位于工作区 sandbox 之外。安装前请审查代码并固定版本。
- 搜索仅使用 HTTPS，拒绝重定向，限制响应/查询/片段大小，结果 URL 仅允许 `http(s)`。
- 不记录查询或 API 密钥，无遥测，无自定义会话事件。
- 搜索默认只连接 `ollama.com`。更新仅在明确操作或启用自动更新时连接 npm registry（失败时使用 npmmirror），且只发送包名。更改 `baseURL` 后，密钥和查询的发送目的地由你自行选择。
- 更新 tarball 在解包前会校验 npm SHA-512 integrity；拒绝 symlink、路径穿越和过大条目。不执行 npm lifecycle script。
- 自动更新会在不询问的情况下安装新代码。它是 opt-in，且仅限当前主版本。
- Client 卡片不向第三方发起外部请求。更新状态和操作仅通过 DSH 的同源 Connection RPC 与 Host 通信。不使用 `innerHTML` / `dangerouslySetInnerHTML`。
- 发布与自我审查设置：[docs/RELEASE-HARDENING.md](docs/RELEASE-HARDENING.md)。
- 已发布包带有 npm provenance。验证记录见 [docs/PROVENANCE.md](docs/PROVENANCE.md) / [docs/SMOKE-RESULTS.md](docs/SMOKE-RESULTS.md)，完整策略见 [SECURITY.md](SECURITY.md) / [docs/SECURITY.md](docs/SECURITY.md)。

## 支持

如果 `dsh-ollama-web` 为你节省了时间，可以通过 [Buy Me a Coffee](https://buymeacoffee.com/explorrrr) 支持开发。也可以使用 GitHub 的 **Sponsor** 按钮。捐赠完全自愿，不会解锁功能，也不会改变许可证条件。

设置卡片中的链接在你点击之前不会向 Buy Me a Coffee 发起任何请求。插件也不会读取或保存捐赠信息。

## 开发

```bash
pnpm install
pnpm verify
```

`pnpm verify` 会依次运行 typecheck、build、test 和 check。如需单独运行，请使用 `pnpm typecheck`、`pnpm build`、`pnpm test`、`pnpm check`。

Host 测试使用 mock 的 `fetch`；e2e 测试需要 `OLLAMA_API_KEY` 才运行。Client 测试在 VM 中加载浏览器 bundle，并使用伪造的 React/primitives。

- 贡献指南：[CONTRIBUTING.md](CONTRIBUTING.md)
- 架构：[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- 版本规则与发布：[docs/VERSIONING.md](docs/VERSIONING.md)
- 变更记录：[CHANGELOG.md](CHANGELOG.md) / [GitHub Releases](https://github.com/explorrrr/dsh-ollama-web/releases)

## 许可证

MIT。见 [LICENSE](LICENSE)。与 Ollama 或 DeepSeek 无关联。Ollama 是其所有者的商标。
