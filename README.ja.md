# dsh-ollama-web

DeepSeek Harness（DSH）用の **Ollama Cloud Web検索provider** です。Web UIの設定カード付き。`web_search` のバックエンドだけを置き換え、DeepSeekのAPIキー・provider・フォールバックは一切使いません。

`web_fetch` はDSH内蔵のHTTP providerのままです（無料・SSRF対策済み）。Ollama fetchは1.0には含めていません。

## 必要環境

- DSH 0.2.1-rc.2（peer: `>=0.2.1-rc.1 <0.3.0`）
- Node.js 20.3以上
- Ollama CloudのAPIキー: <https://ollama.com/settings/keys>

## インストール

HostとClientの2パッケージを入れます。

```bash
dsh plugin --profile desktop add dsh-ollama-web@1.0.0
dsh plugin --profile desktop add dsh-ollama-web-client@1.0.0
```

Web UIの **Plugins → Add plugin** で2回追加しても構いません。

次に `~/.dsh/profiles/<profile>/cordis.patch.yml` で検索先を固定します。

```yaml
- id: web
  config:
    searchProvider: ollama
    fetchProvider: http

# 内蔵のDeepSeek検索providerがmountされている場合のみ
- id: web-search-deepseek
  disabled: true
```

APIキーは設定カード（Plugins → `dsh-ollama-web` → `ollama-web` → Configure）で入力するか、起動環境に `OLLAMA_API_KEY` を設定します。

## 設定

| フィールド | 既定 | 制約 |
|---|---|---|
| `baseURL` | `https://ollama.com` | HTTPSのみ。userinfo/query/fragment禁止 |
| `apiKeyEnv` | `OLLAMA_API_KEY` | `^[A-Za-z_][A-Za-z0-9_]*$` |
| `searchPath` | `/api/web_search` | 同一originの絶対パス |
| `maxResults` | `5` | 1〜10 |
| `snippetMax` | `2000` | 1〜10000文字 |
| `maxQueryChars` | `2048` | 1〜8192文字 |
| `searchTimeoutMs` | `30000` | 1000〜120000 ms |
| `maxResponseBytes` | `2097152` | 65536〜10485760 bytes |
| `apiKey` | 未設定 | secret。カードか `OLLAMA_API_KEY` 推奨 |

APIキーはwrite-onlyです。空欄なら現在のキーを維持し、保存済みキーは再表示されません。

## 確認

モデルに検索させ、結果がOllama経由で返ることを確認します。プラグインが送るのはクエリと `max_results` だけで、宛先は既定で `https://ollama.com/api/web_search` です。

設定カードが出ない場合:

1. `dsh-ollama-web-client` がインストールされ、bundleが有効か確認。
2. Webページをリロード。
3. Hostパッケージ名が `dsh-ollama-web`、行が `ollama-web` か確認（カードキーは `dsh-ollama-web#ollama-web`）。
4. 上のpatch設定にフォールバック。Hostはカードなしでも動きます。

## セキュリティ

- Hostプラグインはsandbox外のin-processで動きます。導入前にコードを確認し、バージョンを固定してください。
- HTTPS限定、`redirect: "error"`、レスポンスバイト上限、クエリ/snippet上限、結果URLは `http(s)` のみ。
- クエリ/キーのログなし、テレメトリなし、独自セッションイベントなし。
- Clientカードはネットワーク呼び出しもHTML sinkもありません。
- 既定の送信先は `ollama.com` のみ。`baseURL` を変えると、キーとクエリの送信先を自分で選ぶことになります。
- 詳細: [SECURITY.md](SECURITY.md) / [docs/SECURITY.md](docs/SECURITY.md)

## 互換性

| DSH | プラグイン |
|---|---|
| 0.2.1-rc.2 | 1.0.x |
| 0.3.x | 未対応（2.0で計画） |

## 開発

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm test
pnpm check
```

Hostテストはmock `fetch`、e2eは `OLLAMA_API_KEY` がある時だけ実行します。ClientテストはVM上でブラウザbundleを読み、React/primitivesを偽装します。

## 公開前の設定

- リポジトリ情報が `explorrrr/dsh-ollama-web` を指していることを確認する（設定済み）。
- npmのtrusted publishingを `dsh-ollama-web` と `dsh-ollama-web-client` の
  両方に設定する（repository、workflow `release.yml`、environment `npm`）。
- npm名がまだ空いているか再確認する。
- `pnpm verify` と [docs/SMOKE-RESULTS.md](docs/SMOKE-RESULTS.md) のブラウザ
  スモークを実行してから `v1.0.0` をタグ付けする。

## ライセンス

MIT。Ollama/DeepSeekとは提携していません。Ollamaは各権利者の商標です。
