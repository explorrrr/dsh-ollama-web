# dsh-ollama-web

[English](README.md) | 日本語 | [中文](README.zh.md)

DeepSeek Harness（DSH）用の **Ollama Cloud Web検索provider** です。Web UIの設定カード付き。`web_search` のバックエンドだけを置き換え、DeepSeekのAPIキー・provider・フォールバックは一切使いません。

`web_fetch` はDSH内蔵のHTTP providerのままです（無料・SSRF対策済み）。Ollama fetchは1.xには含めていません。

## ステータス

- `dsh-ollama-web@1.1.0` / `dsh-ollama-web-client@1.1.0` をnpmで公開済み
  （GitHub Actionsからのnpm provenance付き）。
- GitHub Release: <https://github.com/explorrrr/dsh-ollama-web/releases/tag/v1.1.0>
- 1.1.0で更新確認、明示的な **更新をインストール**、opt-inの自動更新を追加。
  PluginsのConfigureカードはDSH 0.2.1-rc.2で実機確認済み
  （[docs/SMOKE-RESULTS.md](docs/SMOKE-RESULTS.md)）。
- 1.0.xも利用可能ですがアップデータはありません。1.1.0だけ手動でインストールし、
  以後の1.1.xはカードから更新できます。
- provenanceは `npm view dsh-ollama-web@1.1.0 dist.attestations` で確認。
  詳細は [docs/PROVENANCE.md](docs/PROVENANCE.md)。
- バージョニング方針は [docs/VERSIONING.md](docs/VERSIONING.md)。

## 必要環境

- DSH 0.2.1-rc.2（peer: `>=0.2.1-rc.1 <0.3.0`）
- Node.js 20.3以上
- Ollama CloudのAPIキー: <https://ollama.com/settings/keys>

## インストール

HostとClientの2パッケージを入れます。

```bash
dsh plugin --profile desktop add dsh-ollama-web@1.1.0
dsh plugin --profile desktop add dsh-ollama-web-client@1.1.0
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

## アップデート

**Plugins → `dsh-ollama-web` → Configure**（またはバンドル詳細ページ）の
**更新を確認** / **更新をインストール** を使います。適用後はDSH
（desktopはアプリ）を再起動してください。

- **最新確認:** Hostがnpm registry（失敗時はnpmmirror）を参照し、プロファイルの
  pnpm `minimumReleaseAge`（未設定時は60分）を尊重します。新しすぎるリリースは
  待機中として表示され、自動ではインストールされません。
- **明示更新:** host/client両方のtarballを取得し、npmのSHA-512 integrityを検証、
  アーカイブを検証してから、インストール済みの両コピーをアトミックに置換します。
  置換の途中で失敗した場合は両方ロールバックします。
- **自動更新（opt-in）:** 既定OFF。有効時は6時間ごとに確認し、**同一メジャー**の
  新しいリリースだけを自動導入します。メジャー更新は明示ボタンが必要です。
- **リンクインストール:** `link:` やプロファイル外ディレクトリの開発インストールは変更しません。
  Gitリポジトリ側で更新してください。
- **再起動:** 実行中のHostはDSHを再起動するまで旧コードを使います。
- **プロファイル記録:** DSH 0.2.1には第三者の更新APIがないため、インストール済み
  ファイルを直接置換します。profileの `package.json` / `pnpm-lock.yaml` は旧
  バージョンのままです。記録も更新したい場合は **Plugins**（またはCLI）で
  再インストールしてください。詳細: [docs/UPDATES.md](docs/UPDATES.md)。
- **ブートストラップ:** 1.0.xにはアップデータがありません。1.1.0だけ手動で
  インストールしてください。以後の1.1.xはカードから更新できます。
- **送信:** 更新確認/更新または自動更新を有効にした時だけ、パッケージ名を
  registryへ送ります。クエリ、APIキー、セッション、ファイル内容は送りません。

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
- Clientカードは外部ネットワーク呼び出しもHTML sinkもありません。更新確認/更新や
  自動更新の変更時だけ、DSHの同一オリジンConnection RPCでHostの更新サービスに
  問い合わせます。任意の寄付リンクはクリックするまで通信しないHTTPSアンカーです。
- 検索では既定で `ollama.com` のみに接続します。更新では、明示操作または自動更新が
  有効な時だけnpm registry（失敗時はnpmmirror）に接続します。`baseURL` を変えると、
  キーとクエリの送信先を自分で選ぶことになります。
- 更新tarballは展開前にnpmのSHA-512 integrityと照合し、symlink・path traversal・
  過大エントリを拒否します。npm lifecycle scriptは実行しません。
- 自動更新は確認なしで新しいコードを導入します。opt-inで、同一メジャーに限定され、
  [docs/UPDATES.md](docs/UPDATES.md) に詳細があります。
- 詳細: [SECURITY.md](SECURITY.md) / [docs/SECURITY.md](docs/SECURITY.md)

## 互換性

| DSH | プラグイン |
|---|---|
| 0.2.1-rc.2 | 1.1.x |
| 0.3.x | 未対応（2.0で計画） |

## バージョニング

Semantic Versioningに従います。HostとClientは常に同一バージョンでリリースします。
互換性を壊す変更（DSH 0.3対応を含む）はメジャー、更新UIのような後方互換の機能追加は
マイナー、修正・ドキュメント・パッケージングのみの変更はパッチです。詳細は
[docs/VERSIONING.md](docs/VERSIONING.md)。

## 支援

`dsh-ollama-web` が役に立ったら、<https://buymeacoffee.com/explorrrr> で
コーヒーをおごって開発を支援できます。寄付は任意で、機能が解放されることは
ありません。寄付なしでもMITライセンスのまま全機能を使えます。

設定カードにも同じリンクがあります。クリックするまでBuy Me a Coffeeへの
通信は発生せず、プラグインが寄付情報を読み取ったり保存したりすることも
ありません。

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
  スモークを実行してから `v1.1.0` をタグ付けする。

## ライセンス

MIT。Ollama/DeepSeekとは提携していません。Ollamaは各権利者の商標です。
