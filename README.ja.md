# dsh-ollama-web

[English](README.md) | 日本語 | [中文](README.zh.md)

Ollama Cloud の Web 検索を [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）の `web_search` に接続するプラグインです。host と Web UI の設定カードを1つの npm パッケージで提供します。検索バックエンドとして DeepSeek の API キー・provider・フォールバックは使わず、`web_fetch` は DSH 内蔵の HTTP provider（SSRF 対策済み）のままです。

[![Buy Me a Coffee で支援](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?style=flat-square&logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/explorrrr)

- 検索先は既定で `https://ollama.com/api/web_search`
- API キーは設定カード（write-only）または `OLLAMA_API_KEY`
- 更新チェック / 更新インストール / opt-in 自動更新に対応
- `web_fetch` は DSH 内蔵 HTTP のまま。Ollama fetch は 2.x 対象外

## 必要環境

- DSH 0.2.1-rc.2（peer: `>=0.2.1-rc.1 <0.3.0`）で動作確認済み
- DSH 0.3.x は未対応（3.0 で計画）。詳細は [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md)
- Node.js 20.3 以上
- Ollama Cloud の API キー: <https://ollama.com/settings/keys>

## インストール

1つのパッケージが `web_search` の検索先と設定カードの両方を提供します。1回だけインストールしてください。

1. パッケージを追加します。

   ```bash
   dsh plugin --profile desktop add dsh-ollama-web@2.3.0
   ```

   `desktop` 以外のプロファイルでは `desktop` を置き換えてください。Web UI の **Plugins → Add plugin** から追加しても構いません。npm: [dsh-ollama-web](https://www.npmjs.com/package/dsh-ollama-web)

2. `~/.dsh/profiles/<profile>/cordis.patch.yml` で検索先を固定します。

   ```yaml
   - id: web
     config:
       searchProvider: ollama
       fetchProvider: http

   # 内蔵のDeepSeek検索providerがmountされている場合のみ
   - id: web-search-deepseek
     disabled: true
   ```

   `fetchProvider: http` は `web_fetch` に DSH 内蔵の HTTP provider を使う指定です。

### 1.x からの移行

2.0.0 では旧 `dsh-ollama-web-client` パッケージを `dsh-ollama-web` に統合しました。2.3.0 を入れる前に旧パッケージを削除してください。

```bash
dsh plugin --profile <profile> remove dsh-ollama-web-client
dsh plugin --profile <profile> add dsh-ollama-web@2.3.0
```

1.x の updater は旧2パッケージの両方を確認し、自動更新は同一メジャーのみです。2.0.0 では新しい `dsh-ollama-web-client` を publish しないため、1.x から 2.0.0 へは自動で移行しません。手動で移行してください。desktop では **Plugins** で `dsh-ollama-web-client` bundle を削除してから `dsh-ollama-web@2.3.0` をインストールします。旧 client を残すと設定カードが二重登録される可能性があり、サポート対象外です。

## 設定

### API キー

設定カード（**Plugins → `dsh-ollama-web` → `ollama-web` → Configure**）で入力するか、DSH を起動する環境に `OLLAMA_API_KEY` を設定します。カードは write-only です。空欄なら現在のキーを維持し、保存済みのキーは再表示されません。

### 設定項目

| フィールド | 既定 | 制約 |
|---|---|---|
| `baseURL` | `https://ollama.com` | HTTPSのみ。userinfo/query/fragment禁止 |
| `apiKeyEnv` | `OLLAMA_API_KEY` | `^OLLAMA_[A-Za-z0-9_]+$` |
| `searchPath` | `/api/web_search` | baseURLのパス配下・同一originの絶対パス |
| `maxResults` | `5` | 1〜10 |
| `snippetMax` | `2000` | 1〜10000文字 |
| `maxQueryChars` | `2048` | 1〜8192文字 |
| `searchTimeoutMs` | `30000` | 1000〜120000 ms |
| `maxResponseBytes` | `2097152` | 65536〜10485760 bytes |
| `apiKey` | 未設定 | secret。カードか `OLLAMA_API_KEY` 推奨 |

`apiKeyEnv` は `OLLAMA_*` の環境変数名のみ受け付けます。それ以外の環境変数や資格情報参照はリクエスト前に拒否されます。

## 使い方

モデルに検索させ、結果が Ollama 経由で返ることを確認します。検索リクエストの本文はクエリと `max_results` だけで、API キーは `Authorization: Bearer` ヘッダーに載ります。既定の宛先は `https://ollama.com/api/web_search` です。

### 設定カードが表示されない場合

1. `dsh-ollama-web` がインストールされ、bundle が有効か確認する。
2. Web ページをリロードする。
3. パッケージ名が `dsh-ollama-web`、行が `ollama-web` か確認する（カードキーは `dsh-ollama-web#ollama-web`）。
4. 上の patch 設定にフォールバックする。Host はカードなしでも動きます。

## 更新

**Plugins → `dsh-ollama-web` → Configure**（またはバンドル詳細ページ）に更新セクションが表示されます。2.2.0 以降は、バンドル詳細ページに支援カードも表示されます。この画面を開いた時も、最後に成功した確認から5分以上経っていれば自動で確認します。手動ボタンはいつでも即時に確認できます。**更新を確認** / **更新をインストール** を使い、適用後に DSH（desktop はアプリ）を再起動してください。

- **確認:** Host が npm registry（失敗時は npmmirror）を参照し、プロファイルの pnpm `minimumReleaseAge` を**明示設定時のみ**尊重します。未設定・読めない・不正値・`0` は待機なしです。設定された年齢より新しいリリースは待機中として表示され、自動ではインストールされません。
- **対応バージョン:** 更新対象の `engines.dsh` と実行中の DSH バージョン（`DSH_CLIENT_VERSION` または `DSH_APP_VERSION`）を照合します。非対応と判定したリリースはブロックし、判定できない場合は自動更新を保留します（手動のインストールボタンは利用できます）。
- **インストール:** tarball を1つ取得し、npm の SHA-512 integrity とアーカイブを検証してから、インストール済みパッケージをアトミックに置換します。途中で失敗した場合は元のコピーにロールバックします。
- **自動更新（opt-in）:** 既定は OFF です。有効にすると6時間ごとに確認し、実行中のDSHに対応する**同一メジャー**の新しいリリースだけを自動導入します。メジャー更新は明示ボタンが必要です。
- **注意:** `link:` やプロファイル外ディレクトリの開発インストールは変更しません。DSH 0.2.1 には第三者の更新 API がないため、インストール済みファイルを直接置換します。profile の `package.json` / `pnpm-lock.yaml` は旧バージョンのままなので、記録も更新する場合は **Plugins**（または CLI）で再インストールしてください。

詳細は [docs/UPDATES.md](docs/UPDATES.md) を参照してください。

## セキュリティ

- Host プラグインは sandbox 外の in-process で動作します。導入前にコードを確認し、バージョンを固定してください。
- 検索は HTTPS 限定で、リダイレクトを拒否し、レスポンス / クエリ / snippet に上限を設けます。結果 URL は `http(s)` のみです。
- クエリや API キーをログに残さず、テレメトリや独自セッションイベントもありません。
- 検索は既定で `ollama.com` にのみ接続します。更新は、明示操作時、自動更新が有効な時、または最後の成功確認から5分以上経って更新画面を開いた時だけ npm registry（失敗時は npmmirror）に接続し、送るのはパッケージ名だけです。`baseURL` を変えると、キーとクエリの送信先を自分で選ぶことになります。
- 更新 tarball は npm の SHA-512 integrity と照合し、symlink・path traversal・過大エントリを拒否します。npm lifecycle script は実行しません。
- 自動更新は確認なしで新しいコードを導入します。opt-in で、同一メジャーに限定されています。
- Client カードはサードパーティへの外部通信をしません。更新状態の取得と操作だけを、DSH の同一オリジン Connection RPC で Host に問い合わせます。`innerHTML` / `dangerouslySetInnerHTML` は使用しません。
- リリースとセルフレビューの設定: [docs/RELEASE-HARDENING.md](docs/RELEASE-HARDENING.md)。
- 公開パッケージは npm provenance 付きです。検証記録は [docs/PROVENANCE.md](docs/PROVENANCE.md) / [docs/SMOKE-RESULTS.md](docs/SMOKE-RESULTS.md)、詳細な方針は [SECURITY.md](SECURITY.md) / [docs/SECURITY.md](docs/SECURITY.md) を参照してください。

## 支援

`dsh-ollama-web` が役に立ったら、[Buy Me a Coffee](https://buymeacoffee.com/explorrrr) で開発を支援できます。GitHub の **Sponsor** ボタンからも支援できます。寄付は任意で、機能の解放やライセンス条件の変更はありません。

設定カードとバンドル詳細ページの支援リンクは、クリックするまで Buy Me a Coffee へ通信しません。プラグインが寄付情報を読み取ったり保存したりすることもありません。

## 開発

```bash
pnpm install
pnpm verify
```

`pnpm verify` は typecheck / build / test / check をまとめて実行します。個別に実行する場合は `pnpm typecheck`、`pnpm build`、`pnpm test`、`pnpm check` を使ってください。

Host テストは mock `fetch`、e2e は `OLLAMA_API_KEY` がある時だけ実行します。Client テストは VM 上でブラウザ bundle を読み、React/primitives を偽装します。

- コントリビュート: [CONTRIBUTING.md](CONTRIBUTING.md)
- 設計: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- バージョニングとリリース手順: [docs/VERSIONING.md](docs/VERSIONING.md)
- 変更履歴: [CHANGELOG.md](CHANGELOG.md) / [GitHub Releases](https://github.com/explorrrr/dsh-ollama-web/releases)

## ライセンス

MIT。[LICENSE](LICENSE) を参照してください。Ollama / DeepSeek とは提携していません。Ollama は各権利者の商標です。
