/**
 * dsh-ollama-web - browser half.
 *
 * Registers the configuration card for the host bundle `dsh-ollama-web` and
 * its row `ollama-web`. The card edits the host's live settings namespace; it
 * never reads the saved API key back and never performs an external network
 * request. Update checks and installs are requested from the host's update
 * service through DSH's same-origin Connection RPC.
 */
window.__ModuleLoader__.load({
  id: 'dsh-ollama-web',
  factory: (require) => {
    const module = { exports: {} };
    const exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

    const react = require('react');
    const primitives = require('@deepseek-ai/dsh-client-ui-primitives');

    const NS = 'settings.webSearchOllama';
    const TARGET_NS = 'ollama-web';
    const ROW_KEY = 'dsh-ollama-web#ollama-web';
    const PACKAGE_NAME = 'dsh-ollama-web';
    const SUPPORT_URL = 'https://buymeacoffee.com/explorrrr';
    const UPDATE_CHANNEL = '/ollama-web-update';
    const SUPPORT_STYLE_ID = 'dsh-ollama-web/SupportSection.css';
    const UPDATE_STYLE_ID = 'dsh-ollama-web/UpdateSection.css';
    const SUPPORT_CSS = [
      '.dsh-ollama-web-support{display:flex;flex-direction:column;gap:6px;margin:12px 0 0;padding:12px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-2)}',
      '.dsh-ollama-web-support-title{margin:0;font-size:13px;font-weight:500;line-height:1.5;color:var(--dsw-alias-label-primary)}',
      '.dsh-ollama-web-support-body{margin:0;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-tertiary)}',
      '.dsh-ollama-web-support-link{align-self:flex-start;color:var(--dsw-alias-link);font-size:12px;font-weight:500;line-height:1.5;text-decoration:none}',
      '.dsh-ollama-web-support-link:hover,.dsh-ollama-web-support-link:focus-visible{text-decoration:underline}',
      '.dsh-ollama-web-support-link:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px;border-radius:2px}',
    ].join('');
    const UPDATE_CSS = [
      '.dsh-ollama-web-updates{display:flex;flex-direction:column;gap:10px;margin:12px 0 0;padding:12px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-2)}',
      '.dsh-ollama-web-updates-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:8px}',
      '.dsh-ollama-web-updates-title{margin:0;font-size:13px;font-weight:500;line-height:1.5;color:var(--dsw-alias-label-primary)}',
      '.dsh-ollama-web-updates-note{margin:0;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-tertiary)}',
      '.dsh-ollama-web-updates-grid{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:4px 12px;margin:0;font-size:12px;line-height:1.5}',
      '.dsh-ollama-web-updates-label{color:var(--dsw-alias-label-tertiary)}',
      '.dsh-ollama-web-updates-value{color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}',
      '.dsh-ollama-web-updates-status{margin:0;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary)}',
      '.dsh-ollama-web-updates-status[data-tone="error"]{color:var(--dsw-alias-state-error-primary)}',
      '.dsh-ollama-web-updates-status[data-tone="warning"]{color:var(--dsw-alias-state-warn-label)}',
      '.dsh-ollama-web-updates-warning{margin:0;padding:8px 10px;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-state-warn-tertiary);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.5}',
      '.dsh-ollama-web-updates-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px}',
      '.dsh-ollama-web-updates-auto{display:flex;flex-direction:column;gap:4px}',
      '.dsh-ollama-web-updates-auto-row{display:flex;align-items:center;gap:8px;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary)}',
      '.dsh-ollama-web-updates-auto-hint{margin:0;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-tertiary)}',
      '.dsh-ollama-web-updates-links{display:flex;flex-wrap:wrap;gap:12px}',
      '.dsh-ollama-web-updates-link{color:var(--dsw-alias-link);font-size:12px;font-weight:500;line-height:1.5;text-decoration:none}',
      '.dsh-ollama-web-updates-link:hover,.dsh-ollama-web-updates-link:focus-visible{text-decoration:underline}',
      '.dsh-ollama-web-updates-link:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px;border-radius:2px}',
    ].join('');


    const FIELDS = [
      { name: 'baseURL', kind: 'text' },
      { name: 'apiKeyEnv', kind: 'text' },
      { name: 'searchPath', kind: 'text' },
      { name: 'maxResults', kind: 'number' },
      { name: 'snippetMax', kind: 'number' },
      { name: 'maxQueryChars', kind: 'number' },
      { name: 'searchTimeoutMs', kind: 'number' },
      { name: 'maxResponseBytes', kind: 'number' },
    ];

    const NUMERIC_RANGES = {
      maxResults: [1, 10],
      snippetMax: [1, 10000],
      maxQueryChars: [1, 8192],
      searchTimeoutMs: [1000, 120000],
      maxResponseBytes: [65536, 10485760],
    };

    const en = {
      title: 'Ollama web search',
      description: 'Ollama Cloud search provider. Fetch stays on the built-in HTTP provider.',
      supportTitle: 'Support this plugin',
      supportBody: 'If dsh-ollama-web saves you time, you can buy me a coffee. Donations are optional.',
      supportLink: 'Buy me a coffee',
      baseURL: 'Endpoint',
      baseURLHint: 'HTTPS Ollama API origin. Default https://ollama.com.',
      apiKeyEnv: 'Key variable',
      apiKeyEnvHint: 'OLLAMA_ environment variable name only; default OLLAMA_API_KEY.',
      searchPath: 'Search path',
      searchPathHint: 'Absolute path under the endpoint path prefix. Default /api/web_search.',
      maxQueryChars: 'Query cap',
      maxQueryCharsHint: 'Maximum query length in characters. Integer 1-8192.',
      apiKey: 'API key',
      apiKeyHint: 'Write-only. Leave blank to keep the configured key; saved keys are never shown.',
      apiKeySet: 'A key is configured. Leave blank to keep it.',
      maxResults: 'Results per search',
      maxResultsHint: 'Default when the tool sends no limit. Integer 1-10.',
      snippetMax: 'Snippet cap',
      snippetMaxHint: 'Characters retained from each result content. Integer 1-10000.',
      searchTimeoutMs: 'Search timeout (ms)',
      searchTimeoutMsHint: 'Deadline for one search request. Integer 1000-120000.',
      maxResponseBytes: 'Response cap (bytes)',
      maxResponseBytesHint: 'Maximum response body size. Integer 65536-10485760.',
      updateTitle: 'Updates',
      updateDescription: 'The host checks npm for a newer release. The card makes no external request.',
      updateCurrent: 'Current',
      updateRunning: 'Running',
      updateLatest: 'Latest',
      updateCheck: 'Check for updates',
      updateChecking: 'Checking...',
      updateInstall: 'Install update',
      updateInstalling: 'Installing...',
      updateUpToDate: 'Up to date',
      updateAvailable: 'Update available',
      updateMajorAvailable: 'Major update available',
      updateAgeLimited: 'Waiting for the minimum release age',
      updateAgeLimitedHint: 'This release is newer than your profile minimumReleaseAge setting.',
      updateAgeUnknown: 'Release age is unknown; automatic updates are paused.',
      updateAhead: 'The installed version is ahead of the latest release.',
      updateInstalled: 'Update installed. Restart to load it.',
      updateRestartApp: 'Quit and reopen DeepSeek Harness to load the new version.',
      updateRestartHost: 'Restart the dsh host to load the new version.',
      updateAuto: 'Install updates automatically',
      updateAutoHint: 'Checks every 6 hours and installs a newer same-major release.',
      updateAutoWarning: 'Auto-update installs new code without asking. Enable it only if you trust this repository and the npm registry.',
      updateLastChecked: 'Last checked',
      updateNeverChecked: 'Not checked yet',
      updateEligibleAt: 'Auto-update eligible at',
      updatePublishedAt: 'Published',
      updateReleaseNotes: 'Release notes',
      updateProvenance: 'npm provenance',
      updateUnavailable: 'Update checks are unavailable in this deployment.',
      updateLinked: 'This is a linked development install.',
      updateLinkedHint: 'Update it from its repository; in-app updates are disabled.',
      updateCheckFailed: 'Could not check for updates.',
      updateInstallFailed: 'Update failed; the installed version was kept.',
      updateRetry: 'Retry',
      updateBusy: 'An update operation is already running.',
      updateStaleProcess: 'The running host still uses the old version.',
      updateNoUpdate: 'No update is available.',
      updateManual: 'Update manually',
      updateManualHint: 'Use Plugins to reinstall this package, or follow the README commands.',
      updateCheckUnavailable: 'The host update service did not answer.',
      overridden: 'Overridden',
      reset: 'Reset to default',
      invalidNumber: 'Enter a number, or leave blank to use the default.',
      unavailable: 'This plugin is not loaded, so it cannot be configured right now.',
      readOnly: 'This deployment stores settings read-only.',
      saveFailed: 'The deployment did not accept these values; they were left for you to correct.',
      save: 'Save',
      saving: 'Saving...',
    };

    const ja = {
      title: 'Ollama Web検索',
      description: 'Ollama Cloudの検索providerです。取得はDSH内蔵のHTTP providerを使います。',
      supportTitle: 'このプラグインを支援',
      supportBody: 'dsh-ollama-web が役に立ったら、コーヒーをおごって開発を応援できます。寄付は任意です。',
      supportLink: 'コーヒーをおごる',
      baseURL: 'エンドポイント',
      baseURLHint: 'HTTPSのOllama API origin。既定は https://ollama.com。',
      apiKeyEnv: 'キー変数',
      apiKeyEnvHint: 'OLLAMA_ で始まる環境変数名のみ。既定は OLLAMA_API_KEY。',
      searchPath: '検索パス',
      searchPathHint: 'エンドポイントのパス配下に置く絶対パス。既定は /api/web_search。',
      maxQueryChars: 'クエリ上限',
      maxQueryCharsHint: 'クエリの最大文字数。1〜8192の整数。',
      apiKey: 'APIキー',
      apiKeyHint: '書き込み専用。空欄なら現在のキーを維持します。保存済みキーは表示されません。',
      apiKeySet: 'キーは設定済みです。空欄なら維持します。',
      maxResults: '検索結果数',
      maxResultsHint: 'ツールが上限を送らない場合の既定値。1〜10の整数。',
      snippetMax: 'スニペット上限',
      snippetMaxHint: '各結果のcontentから残す文字数。1〜10000の整数。',
      searchTimeoutMs: '検索タイムアウト（ms）',
      searchTimeoutMsHint: '1回の検索の締切。1000〜120000の整数。',
      maxResponseBytes: 'レスポンス上限（バイト）',
      maxResponseBytesHint: 'レスポンス本文の最大サイズ。65536〜10485760の整数。',
      updateTitle: 'アップデート',
      updateDescription: 'Hostがnpmの最新リリースを確認します。カード自体は外部通信しません。',
      updateCurrent: '現在',
      updateRunning: '実行中',
      updateLatest: '最新',
      updateCheck: '更新を確認',
      updateChecking: '確認中...',
      updateInstall: '更新をインストール',
      updateInstalling: 'インストール中...',
      updateUpToDate: '最新です',
      updateAvailable: '更新があります',
      updateMajorAvailable: 'メジャー更新があります',
      updateAgeLimited: 'minimumReleaseAge の経過待ち',
      updateAgeLimitedHint: 'このリリースはプロファイルの minimumReleaseAge より新しいため、まだ自動更新できません。',
      updateAgeUnknown: '公開日時が不明なため、自動更新を保留しています。',
      updateAhead: 'インストール済みバージョンが最新リリースより進んでいます。',
      updateInstalled: '更新をインストールしました。再起動で反映されます。',
      updateRestartApp: 'DeepSeek Harness を終了して再起動すると新しいバージョンが読み込まれます。',
      updateRestartHost: 'dshホストを再起動すると新しいバージョンが読み込まれます。',
      updateAuto: '新しいバージョンを自動でインストール',
      updateAutoHint: '6時間ごとに確認し、同一メジャーの新しいリリースをインストールします。',
      updateAutoWarning: '自動更新は確認なしで新しいコードを導入します。このリポジトリとnpm registryを信頼できる場合だけ有効にしてください。',
      updateLastChecked: '最終確認',
      updateNeverChecked: '未確認',
      updateEligibleAt: '自動更新の解禁時刻',
      updatePublishedAt: '公開日時',
      updateReleaseNotes: 'リリースノート',
      updateProvenance: 'npm provenance',
      updateUnavailable: 'このデプロイでは更新確認を利用できません。',
      updateLinked: 'リンクされた開発インストールです。',
      updateLinkedHint: 'リポジトリ側で更新してください。アプリ内更新は無効です。',
      updateCheckFailed: '更新確認に失敗しました。',
      updateInstallFailed: '更新に失敗しました。インストール済みバージョンは維持されています。',
      updateRetry: '再試行',
      updateBusy: '別の更新処理が実行中です。',
      updateStaleProcess: '実行中のHostはまだ旧バージョンを使用しています。',
      updateNoUpdate: '更新はありません。',
      updateManual: '手動で更新',
      updateManualHint: 'Pluginsからこのパッケージを再インストールするか、READMEのコマンドを実行してください。',
      updateCheckUnavailable: 'Hostの更新サービスが応答しませんでした。',
      overridden: '上書き',
      reset: '既定に戻す',
      invalidNumber: '数値を入力するか、空欄で既定値を使ってください。',
      unavailable: 'このプラグインは読み込まれていないため、現在は設定できません。',
      readOnly: 'このデプロイでは設定は読み取り専用です。',
      saveFailed: 'このデプロイは値を受理しませんでした。修正のため入力は保持されています。',
      save: '保存',
      saving: '保存中...',
    };

    const zh = {
      title: 'Ollama 网页搜索',
      description: 'Ollama Cloud 搜索提供方。抓取仍使用内置 HTTP 提供方。',
      supportTitle: '支持这个插件',
      supportBody: '如果 dsh-ollama-web 为你节省了时间，可以请我喝杯咖啡。捐赠完全自愿，不会解锁额外功能。',
      supportLink: '请我喝杯咖啡',
      baseURL: '基础地址',
      baseURLHint: 'HTTPS 的 Ollama API 源。默认 https://ollama.com。',
      apiKeyEnv: '密钥变量',
      apiKeyEnvHint: '仅允许 OLLAMA_ 开头的环境变量名。默认 OLLAMA_API_KEY。',
      searchPath: '搜索路径',
      searchPathHint: '位于端点路径前缀下的绝对路径。默认 /api/web_search。',
      maxQueryChars: '查询上限',
      maxQueryCharsHint: '查询的最大字符数。1〜8192 的整数。',
      apiKey: 'API 密钥',
      apiKeyHint: '只写。留空则保留当前密钥；已保存的密钥不会再次显示。',
      apiKeySet: '已配置密钥。留空则保留。',
      maxResults: '每次搜索结果数',
      maxResultsHint: '工具未发送上限时的默认值。1〜10 的整数。',
      snippetMax: '片段上限',
      snippetMaxHint: '每条结果内容保留的字符数。1〜10000 的整数。',
      searchTimeoutMs: '搜索超时（毫秒）',
      searchTimeoutMsHint: '单次搜索请求的截止时间。1000〜120000 的整数。',
      maxResponseBytes: '响应上限（字节）',
      maxResponseBytesHint: '响应正文的最大大小。65536〜10485760 的整数。',
      updateTitle: '更新',
      updateDescription: '由 Host 检查 npm 上的最新版本；此卡片本身不发起外部请求。',
      updateCurrent: '当前',
      updateRunning: '运行中',
      updateLatest: '最新',
      updateCheck: '检查更新',
      updateChecking: '检查中…',
      updateInstall: '安装更新',
      updateInstalling: '安装中…',
      updateUpToDate: '已是最新',
      updateAvailable: '有可用更新',
      updateMajorAvailable: '有主版本更新',
      updateAgeLimited: '等待 minimumReleaseAge',
      updateAgeLimitedHint: '该版本比配置的 minimumReleaseAge 更新，暂时不能自动更新。',
      updateAgeUnknown: '发布日期未知，自动更新已暂停。',
      updateAhead: '已安装版本领先于最新发布。',
      updateInstalled: '更新已安装，重启后生效。',
      updateRestartApp: '退出并重新打开 DeepSeek Harness 以加载新版本。',
      updateRestartHost: '重启 dsh 宿主以加载新版本。',
      updateAuto: '自动安装新版本',
      updateAutoHint: '每 6 小时检查一次，并安装同一主版本内的新版本。',
      updateAutoWarning: '自动更新会在不询问的情况下安装新代码。仅在你信任此仓库和 npm registry 时启用。',
      updateLastChecked: '上次检查',
      updateNeverChecked: '尚未检查',
      updateEligibleAt: '自动更新解禁时间',
      updatePublishedAt: '发布时间',
      updateReleaseNotes: '发布说明',
      updateProvenance: 'npm provenance',
      updateUnavailable: '此部署无法使用更新检查。',
      updateLinked: '这是链接的开发安装。',
      updateLinkedHint: '请从仓库更新；应用内更新已禁用。',
      updateCheckFailed: '检查更新失败。',
      updateInstallFailed: '更新失败，已保留当前版本。',
      updateRetry: '重试',
      updateBusy: '已有更新操作正在运行。',
      updateStaleProcess: '正在运行的 Host 仍使用旧版本。',
      updateNoUpdate: '没有可用更新。',
      updateManual: '手动更新',
      updateManualHint: '在 Plugins 中重新安装此包，或按 README 的命令操作。',
      updateCheckUnavailable: 'Host 更新服务没有响应。',
      overridden: '已覆盖',
      reset: '恢复默认',
      invalidNumber: '请填数字；留空表示使用默认值。',
      unavailable: '该插件当前未加载，暂时无法配置。',
      readOnly: '本部署的设置为只读。',
      saveFailed: '本部署没有接受这些值，已保留供你修改。',
      save: '保存',
      saving: '保存中…',
    };

    function ensureStyle(id, css) {
      if (typeof document === 'undefined') return;
      if (!document.head) return;
      const selector = 'style[data-plugin-css=' + JSON.stringify(id) + ']';
      if (document.querySelector(selector) !== null) return;
      const tag = document.createElement('style');
      tag.dataset.plugin = 'dsh-ollama-web';
      tag.dataset.pluginCss = id;
      tag.textContent = css;
      document.head.appendChild(tag);
    }

    ensureStyle(SUPPORT_STYLE_ID, SUPPORT_CSS);
    ensureStyle(UPDATE_STYLE_ID, UPDATE_CSS);

    function formatValue(value, kind) {
      if (kind === 'number') return typeof value === 'number' ? String(value) : '';
      return typeof value === 'string' ? value : '';
    }

    function parseDraft(text, kind, field) {
      const trimmed = String(text == null ? '' : text).trim();
      if (trimmed === '') return { op: 'unset', path: [field] };
      if (kind === 'number') {
        const parsed = Number(trimmed);
        if (!Number.isFinite(parsed)) return undefined;
        const range = NUMERIC_RANGES[field];
        if (range !== undefined && (parsed < range[0] || parsed > range[1])) return undefined;
        return { op: 'set', path: [field], value: parsed };
      }
      return { op: 'set', path: [field], value: trimmed };
    }

    function buildOps(staged, current) {
      const ops = [];
      FIELDS.forEach((field) => {
        if (staged[field.name] === undefined) return;
        if (staged[field.name] === formatValue(current[field.name], field.kind)) return;
        const op = parseDraft(staged[field.name], field.kind, field.name);
        if (op !== undefined) ops.push(op);
      });
      if (staged.apiKey !== undefined && staged.apiKey !== '') {
        ops.push({ op: 'set', path: ['apiKey'], value: String(staged.apiKey) });
      }
      return ops;
    }

    function isDirty(staged, current) {
      for (const field of FIELDS) {
        if (staged[field.name] !== undefined && staged[field.name] !== formatValue(current[field.name], field.kind)) {
          return true;
        }
      }
      return staged.apiKey !== undefined && staged.apiKey !== '';
    }

    function invalidFields(staged) {
      const invalid = [];
      for (const field of FIELDS) {
        if (staged[field.name] === undefined) continue;
        if (parseDraft(staged[field.name], field.kind, field.name) === undefined) {
          invalid.push(field.name);
        }
      }
      return invalid;
    }

    class UpdateRpcError extends Error {
      constructor(code, message) {
        super(message);
        this.name = 'UpdateRpcError';
        this.code = code;
      }
    }

    function safeConnection(ctx) {
      try {
        return ctx.get('connection');
      } catch {
        return undefined;
      }
    }

    function callUpdateRpc(rpc, method, payload) {
      if (!rpc || typeof rpc.call !== 'function') {
        return Promise.reject(new UpdateRpcError('unavailable', 'update RPC is unavailable'));
      }
      let answer;
      try {
        answer = rpc.call(UPDATE_CHANNEL, method, payload === undefined ? {} : payload);
      } catch (error) {
        return Promise.reject(new UpdateRpcError('unavailable', error instanceof Error ? error.message : String(error)));
      }
      return Promise.resolve(answer).then((result) => {
        if (result && result.ok === true) return result.value;
        const code = result && result.error && typeof result.error.code === 'string'
          ? result.error.code
          : 'unknown';
        const message = result && result.error && typeof result.error.message === 'string'
          ? result.error.message
          : 'update operation failed';
        throw new UpdateRpcError(code, message);
      }, (error) => {
        throw new UpdateRpcError(
          'unavailable',
          error instanceof Error ? error.message : String(error),
        );
      });
    }

    function formatTime(value) {
      if (typeof value !== 'string' || value === '') return '';
      const parsed = Date.parse(value);
      if (!Number.isFinite(parsed)) return value;
      try {
        return new Date(parsed).toLocaleString();
      } catch {
        return value;
      }
    }

    function safeReleaseUrl(value) {
      if (typeof value !== 'string') return undefined;
      try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.hostname !== 'github.com') return undefined;
        if (url.username !== '' || url.password !== '' || url.port !== '') return undefined;
        if (url.search !== '' || url.hash !== '') return undefined;
        if (!url.pathname.startsWith('/explorrrr/dsh-ollama-web/releases/tag/')) return undefined;
        return url.href;
      } catch {
        return undefined;
      }
    }

    function updateErrorMessage(t, error) {
      if (!error) return t('updateCheckFailed');
      switch (error.code) {
        case 'age-limited': return t('updateAgeLimitedHint');
        case 'major-blocked': return t('updateMajorAvailable');
        case 'no-update': return t('updateNoUpdate');
        case 'linked': return t('updateLinkedHint');
        case 'busy': return t('updateBusy');
        case 'unavailable': return t('updateUnavailable');
        case 'install-failed':
        case 'integrity':
        case 'archive':
        case 'package-invalid':
        case 'permission':
        case 'state-write':
          return t('updateInstallFailed');
        case 'network':
        case 'timeout':
        case 'registry-status':
        case 'registry-json':
        case 'registry-mismatch':
        case 'invalid-payload':
          return t('updateCheckFailed');
        default:
          return error.message || t('updateCheckFailed');
      }
    }

    function useUpdateStatus(getConnection) {
      const statusState = react.useState(undefined);
      const status = statusState[0];
      const setStatus = statusState[1];
      const loadingState = react.useState(false);
      const loading = loadingState[0];
      const setLoading = loadingState[1];
      const errorState = react.useState(null);
      const error = errorState[0];
      const setError = errorState[1];
      const busyState = react.useState(null);
      const busy = busyState[0];
      const setBusy = busyState[1];
      const startedState = react.useState(false);
      const started = startedState[0];
      const setStarted = startedState[1];

      react.useEffect(() => {
        if (started) return undefined;
        setStarted(true);
        const rpc = getConnection() && getConnection().rpc;
        if (!rpc) {
          setError({ code: 'unavailable', message: 'update RPC is unavailable' });
          return undefined;
        }
        let alive = true;
        setLoading(true);
        callUpdateRpc(rpc, 'status').then((next) => {
          if (!alive) return;
          if (next !== undefined) setStatus(next);
          if (next && next.error) setError(next.error);
        }, (caught) => {
          if (alive) setError({ code: caught.code || 'unknown', message: caught.message || '' });
        }).then(() => {
          if (alive) setLoading(false);
        }, () => {
          if (alive) setLoading(false);
        });
        return () => {
          alive = false;
        };
      }, []);

      const run = (method, payload, phase) => {
        if (busy !== null) return Promise.resolve();
        const rpc = getConnection() && getConnection().rpc;
        if (!rpc) {
          setError({ code: 'unavailable', message: 'update RPC is unavailable' });
          return Promise.resolve();
        }
        setBusy(phase);
        setError(null);
        return callUpdateRpc(rpc, method, payload).then((next) => {
          if (next !== undefined) setStatus(next);
          if (next && next.error) setError(next.error);
        }, (caught) => {
          setError({ code: caught.code || 'unknown', message: caught.message || '' });
        }).then(() => setBusy(null), () => setBusy(null));
      };

      return {
        status,
        loading,
        error,
        busy,
        check: () => run('check', { fresh: true }, 'checking'),
        install: () => {
          const allowMajor = status !== undefined && status.state === 'major';
          return run('install', { allowMajor }, 'installing');
        },
        setAuto: (enabled) => run('setAutoUpdate', { enabled: enabled === true }, 'saving'),
        retry: () => run('status', undefined, 'checking'),
      };
    }

    function makeUpdateSection(t, getConnection) {
      return function OllamaWebUpdateSection(props) {
        const labels = typeof props.t === 'function' ? props.t : t;
        const resolveConnection = typeof props.getConnection === 'function' ? props.getConnection : getConnection;
        const update = useUpdateStatus(resolveConnection);
        const status = update.status;
        const latest = status && status.latest ? status.latest : null;
        const current = status && status.current ? status.current : null;
        const running = status && status.running ? status.running : null;
        const state = status ? status.state : (update.error ? 'unavailable' : 'unknown');
        const hostBusy = status !== undefined && status.busy === true;
        const locked = update.busy !== null || update.loading
          || state === 'linked' || state === 'unavailable';
        const titleId = props.view === 'detail'
          ? 'dsh-ollama-web-updates-detail-title'
          : 'dsh-ollama-web-updates-title';

        const grid = [];
        const addRow = (key, label, value) => {
          grid.push(react.createElement('span', {
            key: key + '-label',
            className: 'dsh-ollama-web-updates-label',
          }, label));
          grid.push(react.createElement('span', {
            key: key + '-value',
            className: 'dsh-ollama-web-updates-value',
          }, value));
        };
        if (running && current && running !== current) {
          addRow('running', labels('updateRunning'), running);
        }
        if (current) addRow('current', labels('updateCurrent'), current);
        if (latest) addRow('latest', labels('updateLatest'), latest.version);
        if (status && status.checkedAt) addRow('checked', labels('updateLastChecked'), formatTime(status.checkedAt));
        if (latest && latest.publishedAt) addRow('published', labels('updatePublishedAt'), formatTime(latest.publishedAt));
        if (latest && latest.eligibleAt && status && status.ageLimited) {
          addRow('eligible', labels('updateEligibleAt'), formatTime(latest.eligibleAt));
        }

        let statusText;
        let tone = 'info';
        if (update.loading && status === undefined) {
          statusText = labels('updateChecking');
        } else if (status === undefined) {
          statusText = update.error ? updateErrorMessage(labels, update.error) : labels('updateUnavailable');
          tone = 'error';
        } else {
          switch (status.state) {
            case 'current':
              statusText = labels('updateUpToDate');
              break;
            case 'update':
              statusText = labels('updateAvailable') + (latest ? ': ' + latest.version : '');
              break;
            case 'major':
              statusText = labels('updateMajorAvailable') + (latest ? ': ' + latest.version : '');
              tone = 'warning';
              break;
            case 'age-limited':
              statusText = labels('updateAgeLimitedHint');
              tone = 'warning';
              break;
            case 'ahead':
              statusText = labels('updateAhead');
              break;
            case 'installed':
              statusText = labels('updateInstalled') + ' '
                + (status.profile && status.profile.restartKind === 'app'
                  ? labels('updateRestartApp')
                  : labels('updateRestartHost'));
              break;
            case 'linked':
              statusText = labels('updateLinked') + ' ' + labels('updateLinkedHint');
              tone = 'warning';
              break;
            case 'unavailable':
              statusText = labels('updateUnavailable');
              tone = 'error';
              break;
            default:
              statusText = status.checkedAt ? labels('updateCheckUnavailable') : labels('updateNeverChecked');
          }
          if (hostBusy && update.busy === null) statusText = labels('updateBusy');
          if (status.ageUnknown && status.state !== 'installed') {
            statusText += ' ' + labels('updateAgeUnknown');
          }
          if (status.staleProcess && status.state !== 'installed') {
            statusText += ' ' + labels('updateStaleProcess');
          }
        }

        const shownError = update.error || (status && status.error) || null;
        const actions = [];
        actions.push(react.createElement(primitives.Button, {
          key: 'check',
          variant: 'outline',
          size: 'sm',
          disabled: locked,
          onClick: update.check,
        }, update.busy === 'checking' ? labels('updateChecking') : labels('updateCheck')));
        if (status && (status.state === 'update' || status.state === 'major' || status.state === 'age-limited')) {
          actions.push(react.createElement(primitives.Button, {
            key: 'install',
            variant: 'primary',
            size: 'sm',
            disabled: locked || status.ageLimited,
            onClick: update.install,
          }, update.busy === 'installing' ? labels('updateInstalling') : labels('updateInstall')));
        }
        if (status === undefined && update.error) {
          actions.push(react.createElement(primitives.Button, {
            key: 'retry',
            variant: 'outline',
            size: 'sm',
            disabled: update.busy !== null,
            onClick: update.retry,
          }, labels('updateRetry')));
        }

        const links = [];
        const releaseUrl = latest ? safeReleaseUrl(latest.releaseUrl) : undefined;
        if (releaseUrl !== undefined) {
          links.push(react.createElement('a', {
            key: 'release',
            className: 'dsh-ollama-web-updates-link',
            href: releaseUrl,
            target: '_blank',
            rel: 'noopener noreferrer',
          }, labels('updateReleaseNotes')));
        }
        if (latest && latest.provenance) {
          links.push(react.createElement('a', {
            key: 'provenance',
            className: 'dsh-ollama-web-updates-link',
            href: 'https://registry.npmjs.org/-/npm/v1/attestations/dsh-ollama-web@' + latest.version,
            target: '_blank',
            rel: 'noopener noreferrer',
          }, labels('updateProvenance')));
        }

        const auto = status ? react.createElement('div', {
          key: 'auto',
          className: 'dsh-ollama-web-updates-auto',
        },
          react.createElement('div', {
            key: 'row',
            className: 'dsh-ollama-web-updates-auto-row',
          },
            react.createElement(primitives.Switch, {
              checked: status.autoUpdate === true,
              label: labels('updateAuto'),
              disabled: locked,
              onChange: (next) => update.setAuto(next),
            }),
            react.createElement('span', null, labels('updateAuto')),
          ),
          react.createElement('p', {
            key: 'hint',
            className: 'dsh-ollama-web-updates-auto-hint',
          }, labels('updateAutoHint')),
        ) : null;

        return react.createElement('section', {
          className: 'dsh-ollama-web-updates',
          'aria-labelledby': titleId,
          'data-view': props.view === 'detail' ? 'detail' : 'card',
        },
          react.createElement('div', {
            key: 'head',
            className: 'dsh-ollama-web-updates-head',
          }, react.createElement('h3', {
            key: 'title',
            id: titleId,
            className: 'dsh-ollama-web-updates-title',
          }, labels('updateTitle'))),
          react.createElement('p', {
            key: 'description',
            className: 'dsh-ollama-web-updates-note',
          }, labels('updateDescription')),
          grid.length > 0 ? react.createElement('div', {
            key: 'grid',
            className: 'dsh-ollama-web-updates-grid',
          }, grid) : null,
          react.createElement('p', {
            key: 'status',
            className: 'dsh-ollama-web-updates-status',
            'data-tone': tone,
            'aria-live': 'polite',
          }, statusText),
          shownError ? react.createElement('p', {
            key: 'error',
            className: 'dsh-ollama-web-updates-status',
            'data-tone': 'error',
          }, updateErrorMessage(labels, shownError)) : null,
          actions.length > 0 ? react.createElement('div', {
            key: 'actions',
            className: 'dsh-ollama-web-updates-actions',
          }, actions) : null,
          auto,
          react.createElement('p', {
            key: 'auto-warning',
            className: 'dsh-ollama-web-updates-warning',
          }, labels('updateAutoWarning')),
          links.length > 0 ? react.createElement('div', {
            key: 'links',
            className: 'dsh-ollama-web-updates-links',
          }, links) : null,
          state === 'linked' ? react.createElement('p', {
            key: 'manual',
            className: 'dsh-ollama-web-updates-note',
          }, labels('updateManualHint')) : null,
        );
      };
    }

    function makeDetailSection(t, getConnection) {
      const UpdateSection = makeUpdateSection(t, getConnection);
      return function OllamaWebUpdatesDetail(props) {
        const subject = props.subject;
        if (!subject || subject.kind !== 'bundle' || !subject.pkg
          || subject.pkg.name !== PACKAGE_NAME) {
          return null;
        }
        return react.createElement(UpdateSection, {
          t: typeof props.t === 'function' ? props.t : t,
          getConnection,
          view: 'detail',
        });
      };
    }

    function makeCard(t, getConnection) {
      const UpdateSection = makeUpdateSection(t, getConnection);
      return function OllamaWebCard(props) {

        const stagedState = react.useState({});
        const staged = stagedState[0];
        const setStaged = stagedState[1];
        const savingState = react.useState(false);
        const saving = savingState[0];
        const setSaving = savingState[1];
        const failedState = react.useState(false);
        const failed = failedState[0];
        const setFailed = failedState[1];

        if (props.view === 'summary') return t('description');

        const form = props.form;
        const snapshot = form === undefined ? undefined : form.state;
        const ready = snapshot !== undefined && snapshot.status === 'ready';
        const writable = ready && snapshot.writable !== false;
        const value = (ready && snapshot.value) || {};
        const secrets = ready && Array.isArray(snapshot.secrets) ? snapshot.secrets : [];
        const keyConfigured = secrets.some((entry) => (
          Array.isArray(entry?.path) && entry.path[0] === 'apiKey' && entry.set === true
        ));
        const textOf = (field) => (
          staged[field.name] !== undefined
            ? staged[field.name]
            : formatValue(value[field.name], field.kind)
        );
        const invalid = invalidFields(staged);
        const dirty = isDirty(staged, value);
        const keyDraft = staged.apiKey;

        const onSave = () => {
          if (!form || !writable || saving || invalid.length > 0) return;
          if (snapshot.revision === undefined) {
            setFailed(true);
            return;
          }
          const ops = buildOps(staged, value);
          if (ops.length === 0) return;
          setSaving(true);
          setFailed(false);
          let result;
          try {
            result = form.mutate(ops, snapshot.revision);
          } catch {
            setSaving(false);
            setFailed(true);
            return undefined;
          }
          return Promise.resolve(result).then((landed) => {
            if (landed === true) setStaged({});
            else setFailed(true);
          }).catch(() => {
            setFailed(true);
          }).then(() => {
            setSaving(false);
          });
        };

        const onDiscard = () => {
          setStaged({});
          setFailed(false);
        };

        const fields = FIELDS.map((field) => {
          const text = textOf(field);
          const invalidField = staged[field.name] !== undefined
            && parseDraft(text, field.kind, field.name) === undefined;
          return react.createElement(primitives.SettingsValueField, {
            key: field.name,
            id: 'plugin-config-ollama-web-' + field.name,
            label: t(field.name),
            hint: t(field.name + 'Hint'),
            overriddenLabel: t('overridden'),
            resetLabel: t('reset'),
            invalidLabel: t('invalidNumber'),
            numeric: field.kind === 'number',
            disabled: !writable,
            text,
            overridden: false,
            invalid: invalidField,
            onEdit: (next) => {
              setStaged((prev) => {
                const copy = Object.assign({}, prev);
                copy[field.name] = next;
                return copy;
              });
            },
            onReset: () => {
              setStaged((prev) => {
                const copy = Object.assign({}, prev);
                copy[field.name] = formatValue(value[field.name], field.kind);
                return copy;
              });
            },
          });
        });

        fields.push(react.createElement(primitives.SettingsSecretField, {
          key: 'apiKey',
          id: 'plugin-config-ollama-web-apiKey',
          label: t('apiKey'),
          hint: t('apiKeyHint'),
          disabled: !writable,
          text: keyDraft === undefined ? '' : keyDraft,
          configured: keyConfigured,
          stateLabel: keyConfigured ? t('apiKeySet') : t('apiKeyHint'),
          onEdit: (next) => {
            setStaged((prev) => {
              const copy = Object.assign({}, prev);
              copy.apiKey = next;
              return copy;
            });
          },
        }));

        const support = react.createElement('div', {
          key: 'support',
          className: 'dsh-ollama-web-support',
          role: 'note',
        },
          react.createElement('p', {
            key: 'support-title',
            className: 'dsh-ollama-web-support-title',
          }, t('supportTitle')),
          react.createElement('p', {
            key: 'support-body',
            className: 'dsh-ollama-web-support-body',
          }, t('supportBody')),
          react.createElement('a', {
            key: 'support-link',
            className: 'dsh-ollama-web-support-link',
            href: SUPPORT_URL,
            target: '_blank',
            rel: 'noopener noreferrer',
          }, t('supportLink')),
        );

        return react.createElement(primitives.SettingsForm, {
          labels: {
            unavailable: t('unavailable'),
            readOnly: t('readOnly'),
            saveFailed: t('saveFailed'),
            save: t('save'),
            saving: t('saving'),
          },
          state: {
            available: ready,
            writable,
            dirty,
            invalid: invalid.length > 0,
            saving,
            failed,
          },
          onSave,
          onDiscard,
        }, fields, support, react.createElement(UpdateSection, {
          key: 'updates',
          t,
          getConnection,
          view: 'card',
        }));
      };
    }

    const inject = ['slots', 'locale', 'configForms'];

    function apply(ctx) {
      const t = ctx.locale.bind(NS);
      const getConnection = () => safeConnection(ctx);
      ctx.effect(() => ctx.locale.register(NS, { en, ja, zh }), 'ollama-web-client: dictionaries');
      ctx.effect(() => ctx.configForms.whileServed([TARGET_NS], () => (
        ctx.slots.inject('plugins.row.config', () => (
          ctx.slots.register({ name: 'plugins.row.config', key: ROW_KEY }, makeCard(t, getConnection))
        ))
      )), 'ollama-web-client: row configuration');
      ctx.effect(() => ctx.slots.inject('plugins.detail.section', () => (
        ctx.slots.register({
          name: 'plugins.detail.section',
          id: 'dsh-ollama-web-updates',
        }, makeDetailSection(t, getConnection))
      )), 'ollama-web-client: update detail section');
    }

    exports.NS = NS;
    exports.TARGET_NS = TARGET_NS;
    exports.ROW_KEY = ROW_KEY;
    exports.SUPPORT_URL = SUPPORT_URL;
    exports.UPDATE_CHANNEL = UPDATE_CHANNEL;
    exports.PACKAGE_NAME = PACKAGE_NAME;
    exports.UPDATE_STYLE_ID = UPDATE_STYLE_ID;
    exports.UpdateRpcError = UpdateRpcError;
    exports.callUpdateRpc = callUpdateRpc;
    exports.makeUpdateSection = makeUpdateSection;
    exports.makeDetailSection = makeDetailSection;
    exports.FIELDS = FIELDS;
    exports.parseDraft = parseDraft;
    exports.buildOps = buildOps;
    exports.isDirty = isDirty;
    exports.invalidFields = invalidFields;
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
