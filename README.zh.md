# dsh-ollama-web

[English](README.md) | [日本語](README.ja.md) | 中文

DeepSeek Harness（DSH）的 **Ollama Cloud Web 搜索提供方**，附带 Web UI 设置卡片。仅替换 `web_search` 后端：不使用 DeepSeek API 密钥、DeepSeek 提供方或回退。

`web_fetch` 仍使用 DSH 内置的 HTTP 提供方（免费且已具备 SSRF 防护）。1.x 不包含 Ollama fetch。

## 状态

- `dsh-ollama-web@1.1.0` 和 `dsh-ollama-web-client@1.1.0` 已发布到 npm，
  并带有 GitHub Actions 生成的 **npm provenance**。
- GitHub Release: <https://github.com/explorrrr/dsh-ollama-web/releases/tag/v1.1.0>
- 1.1.0 增加了更新检查、明确的 **安装更新** 按钮和 opt-in 自动更新。Plugins 的
  Configure 卡片已在 DSH 0.2.1-rc.2 上实机验证
  （见 [docs/SMOKE-RESULTS.md](docs/SMOKE-RESULTS.md)）。
- 1.0.x 仍可使用，但没有更新器。请先手动安装 1.1.0；之后的 1.1.x 可从卡片更新。
- 使用 `npm view dsh-ollama-web@1.1.0 dist.attestations` 验证 provenance；
  详见 [docs/PROVENANCE.md](docs/PROVENANCE.md)。
- 版本规则见 [docs/VERSIONING.md](docs/VERSIONING.md)。

## 环境要求

- DSH 0.2.1-rc.2（peer: `>=0.2.1-rc.1 <0.3.0`）
- Node.js 20.3 以上
- Ollama Cloud API 密钥：<https://ollama.com/settings/keys>

## 安装

安装两个包。Host 包提供搜索；Client 包提供 Configure 卡片。

```bash
dsh plugin --profile desktop add dsh-ollama-web@1.1.0
dsh plugin --profile desktop add dsh-ollama-web-client@1.1.0
```

也可以在 Web UI 中通过 **Plugins -> Add plugin** 添加两次。

然后在 `~/.dsh/profiles/<profile>/cordis.patch.yml` 中固定搜索提供方：

```yaml
- id: web
  config:
    searchProvider: ollama
    fetchProvider: http

# 仅当内置的 DeepSeek 搜索提供方已挂载时。
- id: web-search-deepseek
  disabled: true
```

在设置卡片（Plugins -> `dsh-ollama-web` -> `ollama-web` -> Configure）中输入密钥，或在启动环境中导出 `OLLAMA_API_KEY`。

## 配置

| 字段 | 默认值 | 约束 |
|---|---|---|
| `baseURL` | `https://ollama.com` | 仅 HTTPS；禁止 userinfo/query/fragment |
| `apiKeyEnv` | `OLLAMA_API_KEY` | `^[A-Za-z_][A-Za-z0-9_]*$` |
| `searchPath` | `/api/web_search` | 同一 origin 的绝对路径 |
| `maxResults` | `5` | 1-10 |
| `snippetMax` | `2000` | 1-10000 个字符 |
| `maxQueryChars` | `2048` | 1-8192 个字符 |
| `searchTimeoutMs` | `30000` | 1000-120000 ms |
| `maxResponseBytes` | `2097152` | 65536-10485760 字节 |
| `apiKey` | 未设置 | 密钥；优先使用设置卡片或 `OLLAMA_API_KEY` |

设置卡片对 API 密钥是只写的：留空会保留当前密钥，已保存的密钥不会再次显示。

## 更新

打开 **Plugins -> `dsh-ollama-web` -> Configure**（或 bundle 详情页），使用
**检查更新** / **安装更新**。安装后请重启 DSH（桌面版请退出并重新打开应用）。

- **最新检查：** Host 读取 npm registry（失败时使用 npmmirror），并遵守 profile 中
  pnpm 的 `minimumReleaseAge`（未设置时默认 60 分钟）。过新的版本会显示为等待中，
  不会自动安装。
- **明确更新：** 下载 host/client 两个 tarball，校验 npm SHA-512 integrity，验证
  压缩包内容，然后原子替换已安装的两个副本。任一步失败都会回滚两个包。
- **自动更新（opt-in）：** 默认关闭。启用后每 6 小时检查一次，只自动安装
  **同一主版本** 的新版本。主版本更新需要点击按钮。
- **链接安装：** `link:` 或 profile 外目录的开发安装不会被修改，请从 Git 仓库更新。
- **重启：** 运行中的 Host 在 DSH 重启前仍使用旧代码。
- **Profile 记录：** DSH 0.2.1 没有第三方更新 API，因此直接替换已安装文件。
  profile 的 `package.json` / `pnpm-lock.yaml` 仍记录旧版本；如需同步记录，请通过
  Plugins（或 CLI）重新安装。详见 [docs/UPDATES.md](docs/UPDATES.md)。
- **引导：** 1.0.x 没有更新器。请先手动安装 1.1.0；之后的 1.1.x 可从卡片更新。
- **外发：** 仅在检查/更新或启用自动更新时向 registry 发送包名，不发送查询、
  API 密钥、会话或文件数据。

## 验证

让模型执行搜索，确认来源为 Ollama。插件只向 `https://ollama.com/api/web_search` 发送查询和 `max_results`。

如果设置卡片未出现：

1. 确认 `dsh-ollama-web-client` 已安装且其 bundle 已启用。
2. 刷新 Web 页面。
3. 确认 Host 包名为 `dsh-ollama-web`，行 ID 为 `ollama-web`（卡片键为 `dsh-ollama-web#ollama-web`）。
4. 回退到上面的 patch 配置；即使没有卡片，Host 也能工作。

## 安全

- Host 插件在进程内运行，位于工作区 sandbox 之外。安装前请审查插件并固定版本。
- 仅 HTTPS、`redirect: "error"`、响应字节上限、查询/片段上限、结果 URL 仅限 `http(s)`。
- 不记录查询/密钥，无遥测，无自定义会话事件。
- Client 卡片不发起外部网络请求，也不包含 HTML sink。仅在点击检查/更新或更改自动更新
  设置时，通过 DSH 的同源 Connection RPC 询问 Host 更新服务。可选的捐赠链接在点击前
  只是一个不活动的 HTTPS 链接。
- 搜索时默认只联系 `ollama.com`。更新时，仅在明确操作或启用自动更新后联系 npm
  registry（失败时使用 npmmirror）。如果更改 `baseURL`，你需要自行选择密钥和查询的
  发送目的地。
- 更新 tarball 在解包前会校验 npm SHA-512 integrity，拒绝 symlink、路径穿越和过大
  条目，不执行 npm lifecycle script。
- 自动更新会在不询问的情况下安装新代码。它是 opt-in、限制在同一主版本，详细信息见
  [docs/UPDATES.md](docs/UPDATES.md)。
- 参见 [SECURITY.md](SECURITY.md) 和 [docs/SECURITY.md](docs/SECURITY.md)。

## 兼容性

| DSH | 插件 |
|---|---|
| 0.2.1-rc.2 | 1.1.x |
| 0.3.x | 暂不支持（计划 2.0） |

## 版本规则

项目遵循 Semantic Versioning。Host 与 Client 始终以同一版本发布。破坏兼容性的变更
（包括 DSH 0.3 支持）为 major；更新 UI 这类向后兼容的功能为 minor；修复、文档和
打包变更为 patch。详见 [docs/VERSIONING.md](docs/VERSIONING.md)。

## 支持

如果 `dsh-ollama-web` 为你节省了时间，可以在
<https://buymeacoffee.com/explorrrr> 请我喝杯咖啡来支持开发。捐赠完全自愿，
不会解锁任何功能；插件仍以 MIT 许可证发布，不捐赠也可以使用全部功能。

设置卡片中也有同一个链接。它只是一个普通的 HTTPS 链接：在你点击之前，
客户端不会向 Buy Me a Coffee 发起任何请求，插件也不会读取或保存捐赠信息。

## 开发

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm test
pnpm check
```

Host 测试使用 mock 的 `fetch`；e2e 测试需要 `OLLAMA_API_KEY` 才运行。Client 测试在 VM 中加载浏览器 bundle，并使用伪造的 React/primitives。

## 发布前

- 仓库元数据已指向 `explorrrr/dsh-ollama-web`；发布前请确认。
- 为 `dsh-ollama-web` 和 `dsh-ollama-web-client` 配置 npm trusted publishing
  （repository、workflow `release.yml`、environment `npm`）。
- 确认两个 npm 名称仍然可用。
- 运行 `pnpm verify` 和 [docs/SMOKE-RESULTS.md](docs/SMOKE-RESULTS.md) 中的
  浏览器冒烟测试，然后打标签 `v1.1.0`。

## 许可证

MIT。与 Ollama 或 DeepSeek 无关联。Ollama 是其所有者的商标。
