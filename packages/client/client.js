/**
 * dsh-ollama-web-client - browser half.
 *
 * Registers the configuration card for the host bundle `dsh-ollama-web` and
 * its row `ollama-web`. The card edits the host's live settings namespace; it
 * never reads the saved API key back and never performs a network request.
 */
window.__ModuleLoader__.load({
  id: 'dsh-ollama-web-client',
  factory: (require) => {
    const module = { exports: {} };
    const exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

    const react = require('react');
    const primitives = require('@deepseek-ai/dsh-client-ui-primitives');

    const NS = 'settings.webSearchOllama';
    const TARGET_NS = 'ollama-web';
    const ROW_KEY = 'dsh-ollama-web#ollama-web';
    const SUPPORT_URL = 'https://buymeacoffee.com/explorrrr';
    const SUPPORT_STYLE_ID = 'dsh-ollama-web-client/SupportSection.css';
    const SUPPORT_CSS = [
      '.dsh-ollama-web-support{display:flex;flex-direction:column;gap:6px;margin:12px 0 0;padding:12px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-2)}',
      '.dsh-ollama-web-support-title{margin:0;font-size:13px;font-weight:500;line-height:1.5;color:var(--dsw-alias-label-primary)}',
      '.dsh-ollama-web-support-body{margin:0;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-tertiary)}',
      '.dsh-ollama-web-support-link{align-self:flex-start;color:var(--dsw-alias-link);font-size:12px;font-weight:500;line-height:1.5;text-decoration:none}',
      '.dsh-ollama-web-support-link:hover,.dsh-ollama-web-support-link:focus-visible{text-decoration:underline}',
      '.dsh-ollama-web-support-link:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px;border-radius:2px}',
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
      apiKeyEnvHint: 'Credential reference resolved through the host; default OLLAMA_API_KEY.',
      searchPath: 'Search path',
      searchPathHint: 'Absolute path appended to the endpoint. Default /api/web_search.',
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
      apiKeyEnvHint: 'Hostが解決する資格情報参照名。既定は OLLAMA_API_KEY。',
      searchPath: '検索パス',
      searchPathHint: 'エンドポイントに連結する絶対パス。既定は /api/web_search。',
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
      apiKeyEnvHint: '由 Host 解析的凭据引用名。默认 OLLAMA_API_KEY。',
      searchPath: '搜索路径',
      searchPathHint: '追加到端点的绝对路径。默认 /api/web_search。',
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
      overridden: '已覆盖',
      reset: '恢复默认',
      invalidNumber: '请填数字；留空表示使用默认值。',
      unavailable: '该插件当前未加载，暂时无法配置。',
      readOnly: '本部署的设置为只读。',
      saveFailed: '本部署没有接受这些值，已保留供你修改。',
      save: '保存',
      saving: '保存中…',
    };

    function ensureSupportStyle() {
      if (typeof document === 'undefined') return;
      if (!document.head) return;
      const selector = 'style[data-plugin-css=' + JSON.stringify(SUPPORT_STYLE_ID) + ']';
      if (document.querySelector(selector) !== null) return;
      const tag = document.createElement('style');
      tag.dataset.plugin = 'dsh-ollama-web-client';
      tag.dataset.pluginCss = SUPPORT_STYLE_ID;
      tag.textContent = SUPPORT_CSS;
      document.head.appendChild(tag);
    }

    ensureSupportStyle();

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

    function makeCard(t) {
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
        }, fields, support);
      };
    }

    const inject = ['slots', 'locale', 'configForms'];

    function apply(ctx) {
      const t = ctx.locale.bind(NS);
      ctx.effect(() => ctx.locale.register(NS, { en, ja, zh }), 'ollama-web-client: dictionaries');
      ctx.effect(() => ctx.configForms.whileServed([TARGET_NS], () => (
        ctx.slots.inject('plugins.row.config', () => (
          ctx.slots.register({ name: 'plugins.row.config', key: ROW_KEY }, makeCard(t))
        ))
      )), 'ollama-web-client: row configuration');
    }

    exports.NS = NS;
    exports.TARGET_NS = TARGET_NS;
    exports.ROW_KEY = ROW_KEY;
    exports.SUPPORT_URL = SUPPORT_URL;
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
