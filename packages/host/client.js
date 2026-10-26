/**
 * dsh-ollama-web - browser half.
 *
 * Registers the configuration card for the host bundle `dsh-ollama-web` and
 * its row `ollama-web`, plus the update and support sections on the bundle's
 * detail page. The card edits the host's live settings namespace; it never
 * reads the saved API key back and never performs an external network request.
 * Update checks and installs are requested from the host's update service
 * through DSH's same-origin Connection RPC.
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
    const WEB_NS = 'web';
    const OLLAMA_PROVIDER_ID = 'ollama';
    const HTTP_FETCH_PROVIDER_ID = 'http';
    const SUPPORT_URL = 'https://buymeacoffee.com/explorrrr';
    // Official Buy Me a Coffee cup mark, inlined so the card makes no image request.
    const SUPPORT_LOGO_CUP_PATH = 'M34.1896 13.3639L33.916 11.9762C33.6706 10.7312 33.1134 9.55468 31.8426 9.10468C31.4353 8.96073 30.9732 8.89885 30.6608 8.60086C30.3485 8.30288 30.2562 7.84009 30.1839 7.41094C30.0502 6.62326 29.9244 5.83492 29.7873 5.04859C29.6689 4.37257 29.5753 3.61315 29.267 2.99296C28.8657 2.16022 28.033 1.67322 27.205 1.35102C26.7807 1.19173 26.3477 1.05698 25.9081 0.947426C23.8394 0.398542 21.6644 0.196746 19.5362 0.0817228C16.9817 -0.0600379 14.4204 -0.0173274 11.872 0.209526C9.97525 0.383071 7.97745 0.592939 6.17495 1.25281C5.51616 1.49429 4.8373 1.7842 4.33634 2.29609C3.72169 2.92502 3.52104 3.89768 3.96982 4.68199C4.28886 5.23895 4.82927 5.63245 5.40246 5.89276C6.14906 6.22818 6.92877 6.48341 7.72865 6.65421C9.95585 7.14928 12.2626 7.34368 14.538 7.42641C17.0599 7.52878 19.5859 7.44582 22.0958 7.1782C22.7165 7.10959 23.336 7.0273 23.9545 6.93134C24.6828 6.81901 25.1503 5.86115 24.9356 5.19388C24.6788 4.39611 23.9886 4.08669 23.208 4.2071C23.093 4.22526 22.9786 4.24208 22.8636 4.25889L22.7807 4.271C22.5163 4.30463 22.2518 4.33602 21.9874 4.36517C21.4412 4.42437 20.8937 4.4728 20.3448 4.51046C19.1155 4.59656 17.8828 4.63625 16.6508 4.63827C15.4403 4.63827 14.229 4.60396 13.0211 4.52392C12.47 4.48759 11.9202 4.4414 11.3718 4.38535C11.1223 4.35912 10.8735 4.33154 10.6247 4.3006L10.3879 4.27033L10.3364 4.26293L10.091 4.22728C9.58933 4.15127 9.08771 4.06382 8.59144 3.95822C8.54136 3.94704 8.49657 3.91902 8.46446 3.87879C8.43236 3.83855 8.41486 3.7885 8.41486 3.73691C8.41486 3.68533 8.43236 3.63528 8.46446 3.59504C8.49657 3.55481 8.54136 3.52679 8.59144 3.51561H8.6008C9.03086 3.42346 9.46426 3.34476 9.899 3.27615C10.0439 3.25328 10.1893 3.23086 10.3351 3.20888H10.3391C10.6113 3.19072 10.8849 3.14162 11.1557 3.10933C13.5125 2.86279 15.8832 2.77874 18.2513 2.85776C19.4011 2.89139 20.5501 2.95933 21.6945 3.07637C21.9406 3.10193 22.1854 3.12884 22.4302 3.15911C22.5238 3.17054 22.6181 3.18399 22.7124 3.19543L22.9024 3.22301C23.4562 3.30597 24.0071 3.40664 24.5551 3.52503C25.367 3.70261 26.4097 3.76046 26.7709 4.65508C26.8859 4.93894 26.9381 5.25442 27.0016 5.5524L27.0826 5.93245C27.0863 5.93927 27.0873 5.94624 27.0873 5.9533C27.2785 6.85017 27.4701 7.74704 27.6618 8.64391C27.6758 8.71017 27.6762 8.77862 27.6628 8.84501C27.6493 8.9114 27.6225 8.97429 27.5838 9.02977C27.5451 9.08525 27.4955 9.13212 27.4381 9.16746C27.3806 9.2028 27.3165 9.22585 27.2498 9.23517H27.2444L27.1274 9.25132L27.0117 9.26679C26.6452 9.31477 26.2782 9.35961 25.9108 9.40132C25.1871 9.48428 24.4623 9.55603 23.7364 9.61657C22.294 9.7372 20.8486 9.81635 19.4004 9.85401C18.6625 9.87374 17.9247 9.88294 17.1872 9.88159C14.2517 9.87926 11.3188 9.70768 8.40283 9.36769C8.08714 9.33002 7.77145 9.28966 7.45577 9.24863C7.70056 9.28024 7.27786 9.22441 7.19225 9.2123C6.9916 9.18405 6.79095 9.15468 6.5903 9.12419C5.91679 9.02262 5.24729 8.8975 4.57511 8.78786C3.76249 8.65333 2.98531 8.72059 2.25026 9.12419C1.6469 9.45624 1.15857 9.96544 0.850401 10.5838C0.533376 11.243 0.439071 11.9608 0.297279 12.6691C0.155487 13.3774 -0.0652275 14.1395 0.0183763 14.8666C0.198292 16.4359 1.28915 17.7113 2.85823 17.9965C4.33434 18.2655 5.81847 18.4835 7.30662 18.6691C13.1524 19.3892 19.0582 19.4753 24.9223 18.9261C25.3998 18.8812 25.8767 18.8324 26.3529 18.7794C26.5016 18.763 26.6521 18.7802 26.7934 18.8299C26.9347 18.8795 27.0631 18.9603 27.1693 19.0663C27.2755 19.1724 27.3567 19.3009 27.4071 19.4426C27.4575 19.5843 27.4757 19.7356 27.4605 19.8853L27.312 21.3369C27.0128 24.2701 26.7136 27.2031 26.4144 30.1358C26.1023 33.2157 25.7882 36.2953 25.472 39.3747C25.3829 40.242 25.2937 41.109 25.2045 41.9758C25.1189 42.8294 25.1069 43.7099 24.9457 44.5534C24.6915 45.8799 23.7986 46.6945 22.4957 46.9925C21.3021 47.2657 20.0827 47.4091 18.8586 47.4203C17.5016 47.4277 16.1452 47.3672 14.7881 47.3746C13.3395 47.3826 11.5651 47.2481 10.4468 46.1638C9.46426 45.2113 9.32849 43.72 9.19472 42.4306C9.01637 40.7234 8.83957 39.0164 8.66434 37.3097L7.68116 27.8192L7.0451 21.6786C7.0344 21.577 7.0237 21.4768 7.01367 21.3745C6.93742 20.642 6.42176 19.925 5.60913 19.962C4.91354 19.9929 4.12299 20.5875 4.20458 21.3745L4.67611 25.927L5.65126 35.3442C5.92905 38.0191 6.20617 40.6944 6.48262 43.3703C6.53613 43.8828 6.58628 44.3967 6.64247 44.9093C6.94812 47.7102 9.075 49.2196 11.7089 49.6448C13.2472 49.8936 14.8229 49.9448 16.384 49.9703C18.3851 50.0026 20.4063 50.08 22.3747 49.7154C25.2915 49.1773 27.4799 47.2185 27.7922 44.1801C27.8814 43.303 27.9706 42.4256 28.0597 41.548C28.3563 38.6458 28.6523 35.7433 28.9479 32.8406L29.9151 23.3562L30.3585 19.0095C30.3806 18.794 30.4711 18.5913 30.6166 18.4315C30.7621 18.2717 30.9549 18.1633 31.1665 18.1223C32.0005 17.9588 32.7977 17.6796 33.391 17.0413C34.3354 16.0249 34.5233 14.6998 34.1896 13.3639ZM2.81542 14.3016C2.82813 14.2955 2.80472 14.4052 2.79469 14.4563C2.79268 14.3789 2.7967 14.3103 2.81542 14.3016ZM2.89635 14.9312C2.90304 14.9265 2.9231 14.9534 2.94384 14.9857C2.9124 14.9561 2.89234 14.9339 2.89568 14.9312H2.89635ZM2.97594 15.0368C3.0047 15.0859 3.02009 15.1168 2.97594 15.0368V15.0368ZM3.13579 15.1673H3.1398C3.1398 15.172 3.14716 15.1767 3.14984 15.1814C3.1454 15.1762 3.14048 15.1715 3.13513 15.1673H3.13579ZM31.1277 14.9722C30.828 15.2588 30.3766 15.392 29.9305 15.4586C24.9276 16.2052 19.8519 16.5832 14.7942 16.4164C11.1745 16.292 7.59287 15.8877 4.00928 15.3785C3.65815 15.3287 3.27758 15.2642 3.03614 15.0038C2.58133 14.5128 2.80472 13.524 2.9231 12.9307C3.03145 12.3872 3.23879 11.6628 3.88154 11.5854C4.88478 11.467 6.04989 11.8928 7.04243 12.0442C8.2374 12.2276 9.43684 12.3744 10.6407 12.4848C15.7787 12.9556 21.0029 12.8823 26.1181 12.1935C27.0505 12.0675 27.9795 11.9211 28.9051 11.7543C29.7298 11.6056 30.6441 11.3264 31.1424 12.1854C31.4841 12.7706 31.5296 13.5536 31.4768 14.2148C31.4605 14.5029 31.3354 14.7739 31.127 14.9722H31.1277Z';
    const UPDATE_CHANNEL = '/ollama-web-update';
    const AUTO_CHECK_MIN_INTERVAL_MS = 5 * 60_000;
    const INSTALL_ERROR_CODES = new Set([
      'install-failed',
      'integrity',
      'archive',
      'package-invalid',
      'permission',
      'state-write',
      'incompatible-dsh',
      'major-blocked',
    ]);
    const SUPPORT_STYLE_ID = 'dsh-ollama-web/SupportSection.css';
    const UPDATE_STYLE_ID = 'dsh-ollama-web/UpdateSection.css';
    const FETCH_STYLE_ID = 'dsh-ollama-web/FetchToggle.css';
    const SUPPORT_CSS = [
      '.dsh-ollama-web-support{display:flex;flex-direction:column;gap:6px;margin:12px 0 0;padding:12px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-2)}',
      '.dsh-ollama-web-support-title{margin:0;font-size:13px;font-weight:500;line-height:1.5;color:var(--dsw-alias-label-primary)}',
      '.dsh-ollama-web-support-body{margin:0;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-tertiary)}',
      '.dsh-ollama-web-support-link{align-self:flex-start;display:inline-flex;align-items:center;gap:8px;box-sizing:border-box;padding:6px 14px 6px 10px;border:1px solid rgba(13,12,34,.14);border-radius:999px;background:#ffdd00;color:#0d0c22;font-size:12px;font-weight:600;line-height:1.4;text-decoration:none}',
      '.dsh-ollama-web-support-link:hover,.dsh-ollama-web-support-link:focus-visible{background:#ffd60a;text-decoration:none}',
      '.dsh-ollama-web-support-link:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dsh-ollama-web-support-logo{display:block;width:14px;height:20px;flex:none}',
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
    const FETCH_CSS = [
      '.dsh-ollama-web-fetch-toggle{display:flex;flex-direction:column;gap:6px;margin:4px 0 0;padding:12px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-2)}',
      '.dsh-ollama-web-fetch-toggle-row{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:500;line-height:1.5;color:var(--dsw-alias-label-primary)}',
      '.dsh-ollama-web-fetch-toggle-hint{margin:0;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-tertiary)}',
      '.dsh-ollama-web-fetch-toggle-warning{margin:0;padding:8px 10px;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-state-warn-tertiary);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.5}',
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
      { name: 'fetchPath', kind: 'text' },
      { name: 'fetchTimeoutMs', kind: 'number' },
      { name: 'fetchMaxChars', kind: 'number' },
    ];

    const NUMERIC_RANGES = {
      maxResults: [1, 10],
      snippetMax: [1, 10000],
      maxQueryChars: [1, 8192],
      searchTimeoutMs: [1000, 120000],
      maxResponseBytes: [65536, 10485760],
      fetchTimeoutMs: [1000, 120000],
      fetchMaxChars: [1, 200000],
    };

    const en = {
      title: 'Ollama web search and fetch',
      description: 'Ollama Cloud search provider, with an optional Ollama fetch provider. Fetch stays on the built-in HTTP provider by default.',
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
      fetchPath: 'Fetch path',
      fetchPathHint: 'Absolute path under the endpoint path prefix. Default /api/web_fetch.',
      fetchTimeoutMs: 'Fetch timeout (ms)',
      fetchTimeoutMsHint: 'Deadline for one fetch request. Integer 1000-120000.',
      fetchMaxChars: 'Fetch content cap (chars)',
      fetchMaxCharsHint: 'Maximum text returned from one fetch. Integer 1-200000.',
      enableFetchProvider: 'Use Ollama for web fetch',
      enableFetchProviderHint: 'Registers an Ollama fetch provider. The card also pins web.fetchProvider when Web provider settings are available.',
      enableFetchProviderWarning: 'Without the web.fetchProvider pin, web_fetch reports WEB_PROVIDER_AMBIGUOUS; without this switch, a pinned provider is unavailable.',
      useOllamaSearch: 'Use Ollama for web search',
      useOllamaSearchHint: 'Sets web.searchProvider to ollama. Turn it off to return to the deployment default.',
      useOllamaFetch: 'Use Ollama for web fetch',
      useOllamaFetchHint: 'Sets web.fetchProvider to ollama and registers the Ollama fetch provider. Turn it off to use the built-in HTTP provider.',
      providerSearchStatus: 'Search provider',
      providerFetchStatus: 'Fetch provider',
      providerUsing: 'Registered — DSH is currently using ',
      providerAutomatic: 'Registered — DSH chooses a provider automatically.',
      providerSearchSelected: 'Selected for web_search.',
      providerFetchSelected: 'Selected for web_fetch.',
      providerFetchHttp: 'DSH is using the built-in HTTP fetch provider.',
      providerPinned: 'Pinned by the profile patch. Remove the web row entry from cordis.patch.yml to manage this from the card.',
      providerIncomplete: 'The web row has only one provider field. A profile patch replaces the whole web config; pin both searchProvider and fetchProvider.',
      providerFetchDisabled: 'Ollama fetch is selected, but the Ollama fetch provider is disabled.',
      providerFetchUnselected: 'The Ollama fetch provider is registered but not selected for web_fetch.',
      providerFetchAmbiguous: 'The Ollama fetch provider is registered without an explicit web.fetchProvider; web_fetch may report WEB_PROVIDER_AMBIGUOUS.',
      providerWebUnavailable: 'Web provider settings are unavailable here. Pin both web.searchProvider and web.fetchProvider in the profile patch.',
      providerReadOnly: 'The web provider selection is read-only.',
      providerLoading: 'Loading web provider settings...',
      updateTitle: 'Updates',
      updateDescription: 'The host checks npm for a newer release. The card makes no external request.',
      updateCurrent: 'Current',
      updateRunning: 'Running',
      updateLatest: 'Latest',
      updateDshVersion: 'DSH version',
      updateDshRequired: 'Required DSH',
      updateIncompatible: 'This release does not support the running DSH version.',
      updateCompatibilityUnknown: 'DSH compatibility could not be verified, so automatic updates are paused.',
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
      updateAutoHint: 'Checks every 6 hours and installs a newer same-major release that supports the running DSH version.',
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
      title: 'Ollama Web検索・取得',
      description: 'Ollama Cloudの検索providerです。任意でOllamaの取得providerも使えます。既定の取得はDSH内蔵HTTP providerです。',
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
      fetchPath: '取得パス',
      fetchPathHint: 'エンドポイントのパス配下に置く絶対パス。既定は /api/web_fetch。',
      fetchTimeoutMs: '取得タイムアウト（ms）',
      fetchTimeoutMsHint: '1回の取得の締切。1000〜120000の整数。',
      fetchMaxChars: '取得本文の上限（文字）',
      fetchMaxCharsHint: '1回の取得で返す本文の最大文字数。1〜200000の整数。',
      enableFetchProvider: 'Web取得にOllamaを使う',
      enableFetchProviderHint: 'Ollamaの取得providerを登録します。web provider設定を利用できる場合は web.fetchProvider も同時に設定します。',
      enableFetchProviderWarning: 'web.fetchProvider のpinがないと web_fetch は WEB_PROVIDER_AMBIGUOUS、このスイッチがないとpin先のproviderがunavailableになります。',
      useOllamaSearch: 'Web検索にOllamaを使う',
      useOllamaSearchHint: 'web.searchProvider を ollama に設定します。オフにするとデプロイ既定に戻ります。',
      useOllamaFetch: 'Web取得にOllamaを使う',
      useOllamaFetchHint: 'web.fetchProvider を ollama に設定し、Ollama取得providerを登録します。オフにするとDSH内蔵HTTP providerを使います。',
      providerSearchStatus: '検索provider',
      providerFetchStatus: '取得provider',
      providerUsing: '登録済み — DSHが現在使用しているprovider: ',
      providerAutomatic: '登録済み — DSHがproviderを自動選択します。',
      providerSearchSelected: 'web_search に選択されています。',
      providerFetchSelected: 'web_fetch に選択されています。',
      providerFetchHttp: 'DSHは内蔵HTTP取得providerを使用しています。',
      providerPinned: 'profile patchで固定されています。カードから変更するには cordis.patch.yml の web 行を外してください。',
      providerIncomplete: 'web 行のproviderフィールドが片方だけです。profile patchはweb config全体を置換するため、searchProviderとfetchProviderの両方をpinしてください。',
      providerFetchDisabled: 'Ollama取得が選択されていますが、Ollama取得providerが無効です。',
      providerFetchUnselected: 'Ollama取得providerは登録済みですが、web_fetchには選択されていません。',
      providerFetchAmbiguous: 'Ollama取得providerが登録済みで web.fetchProvider が未指定です。web_fetch が WEB_PROVIDER_AMBIGUOUS になる可能性があります。',
      providerWebUnavailable: 'この環境ではweb provider設定を利用できません。profile patchで web.searchProvider と web.fetchProvider の両方をpinしてください。',
      providerReadOnly: 'web providerの選択は読み取り専用です。',
      providerLoading: 'web provider設定を読み込み中...',
      updateTitle: 'アップデート',
      updateDescription: 'Hostがnpmの最新リリースを確認します。カード自体は外部通信しません。',
      updateCurrent: '現在',
      updateRunning: '実行中',
      updateLatest: '最新',
      updateDshVersion: 'DSHバージョン',
      updateDshRequired: '必要なDSH',
      updateIncompatible: 'このリリースは実行中のDSHバージョンに対応していません。',
      updateCompatibilityUnknown: 'DSH対応を確認できないため、自動更新は保留しています。',
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
      updateAutoHint: '6時間ごとに確認し、実行中のDSHに対応する同一メジャーの新しいリリースをインストールします。',
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
      title: 'Ollama 网页搜索与抓取',
      description: 'Ollama Cloud 搜索提供方，可选 Ollama 抓取提供方。默认抓取仍使用内置 HTTP 提供方。',
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
      fetchPath: '抓取路径',
      fetchPathHint: '位于端点路径前缀下的绝对路径。默认 /api/web_fetch。',
      fetchTimeoutMs: '抓取超时（毫秒）',
      fetchTimeoutMsHint: '单次抓取请求的截止时间。1000〜120000 的整数。',
      fetchMaxChars: '抓取正文上限（字符）',
      fetchMaxCharsHint: '单次抓取返回正文的最大字符数。1〜200000 的整数。',
      enableFetchProvider: '使用 Ollama 抓取网页',
      enableFetchProviderHint: '注册 Ollama 抓取提供方；若可以使用 web provider 设置，卡片也会同时写入 web.fetchProvider。',
      enableFetchProviderWarning: '缺少 web.fetchProvider 固定时 web_fetch 会报 WEB_PROVIDER_AMBIGUOUS；关闭此开关时固定的提供方不可用。',
      useOllamaSearch: '使用 Ollama 进行网页搜索',
      useOllamaSearchHint: '将 web.searchProvider 设为 ollama；关闭后恢复部署默认值。',
      useOllamaFetch: '使用 Ollama 抓取网页',
      useOllamaFetchHint: '将 web.fetchProvider 设为 ollama，并注册 Ollama 抓取提供方；关闭后使用内置 HTTP 提供方。',
      providerSearchStatus: '搜索提供方',
      providerFetchStatus: '抓取提供方',
      providerUsing: '已注册 — DSH 当前使用：',
      providerAutomatic: '已注册 — DSH 会自动选择提供方。',
      providerSearchSelected: '已用于 web_search。',
      providerFetchSelected: '已用于 web_fetch。',
      providerFetchHttp: 'DSH 正在使用内置 HTTP 抓取提供方。',
      providerPinned: '已由 profile patch 固定。若要从卡片修改，请删除 cordis.patch.yml 中的 web 行。',
      providerIncomplete: 'web 行只有一个 provider 字段。profile patch 会替换整个 web config，请同时固定 searchProvider 和 fetchProvider。',
      providerFetchDisabled: '已选择 Ollama 抓取，但 Ollama 抓取提供方未启用。',
      providerFetchUnselected: 'Ollama 抓取提供方已注册，但未用于 web_fetch。',
      providerFetchAmbiguous: 'Ollama 抓取提供方已注册，但 web.fetchProvider 未指定；web_fetch 可能报告 WEB_PROVIDER_AMBIGUOUS。',
      providerWebUnavailable: '此环境无法使用 web provider 设置。请在 profile patch 中同时固定 web.searchProvider 和 web.fetchProvider。',
      providerReadOnly: 'web provider 选择为只读。',
      providerLoading: '正在加载 web provider 设置…',
      updateTitle: '更新',
      updateDescription: '由 Host 检查 npm 上的最新版本；此卡片本身不发起外部请求。',
      updateCurrent: '当前',
      updateRunning: '运行中',
      updateLatest: '最新',
      updateDshVersion: 'DSH 版本',
      updateDshRequired: '所需 DSH',
      updateIncompatible: '此版本不支持当前运行的 DSH 版本。',
      updateCompatibilityUnknown: '无法确认 DSH 兼容性，自动更新已暂停。',
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
      updateAutoHint: '每 6 小时检查一次，并安装支持当前 DSH 的同一主版本新版本。',
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
    ensureStyle(FETCH_STYLE_ID, FETCH_CSS);

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

    const PROVIDER_FIELDS = ['searchProvider', 'fetchProvider'];

    function providerValueKey(value) {
      return value === null || value === undefined ? '' : String(value);
    }

    function sameProviderValue(left, right) {
      return providerValueKey(left) === providerValueKey(right);
    }

    /**
     * The value a provider switch should write when it is turned off: the
     * first concrete non-Ollama value already in the settings, or the safe
     * DSH HTTP fetch provider for fetch. Search falls back to clearing the
     * field when the deployment exposes no alternative.
     */
    function providerOffTarget(field, value, base) {
      for (const candidate of [value, base]) {
        if (typeof candidate === 'string'
          && candidate.length > 0
          && candidate !== OLLAMA_PROVIDER_ID) {
          return candidate;
        }
      }
      return field === 'fetchProvider' ? HTTP_FETCH_PROVIDER_ID : null;
    }

    function buildWebOps(staged, value) {
      const ops = [];
      if (staged === undefined) return ops;
      PROVIDER_FIELDS.forEach((field) => {
        if (!Object.hasOwn(staged, field)) return;
        const target = staged[field];
        if (sameProviderValue(target, value[field])) return;
        if (target === null || target === undefined) {
          ops.push({ op: 'unset', path: [field] });
        } else {
          ops.push({ op: 'set', path: [field], value: String(target) });
        }
      });
      return ops;
    }

    function webIsDirty(staged, value) {
      if (staged === undefined) return false;
      return PROVIDER_FIELDS.some((field) => (
        Object.hasOwn(staged, field) && !sameProviderValue(staged[field], value[field])
      ));
    }

    function providerSelectionState(webSnapshot, localValue) {
      const status = webSnapshot && webSnapshot.status;
      const available = status === 'ready';
      const loading = status === 'loading';
      const writable = available && webSnapshot.writable !== false;
      const value = (available && webSnapshot.value) || {};
      const base = (available && webSnapshot.base) || {};
      const searchValue = value.searchProvider;
      const fetchValue = value.fetchProvider;
      const fetchEnabled = localValue.enableFetchProvider === true;
      const searchOff = providerOffTarget('searchProvider', searchValue, base.searchProvider);
      const fetchOff = providerOffTarget('fetchProvider', fetchValue, base.fetchProvider);
      const searchLocked = base.searchProvider === OLLAMA_PROVIDER_ID && searchOff === null;
      const incomplete = available && (
        (typeof searchValue === 'string' && fetchValue === undefined)
        || (typeof fetchValue === 'string' && searchValue === undefined)
      );
      let fetchWarning = null;
      if (fetchValue === OLLAMA_PROVIDER_ID && !fetchEnabled) fetchWarning = 'disabled';
      else if (fetchEnabled && fetchValue === undefined) fetchWarning = 'ambiguous';
      else if (fetchEnabled && fetchValue !== OLLAMA_PROVIDER_ID) fetchWarning = 'unselected';
      return {
        available,
        loading,
        writable,
        value,
        base,
        searchValue,
        fetchValue,
        fetchEnabled,
        searchOff,
        fetchOff,
        searchLocked,
        incomplete,
        fetchWarning,
        searchActive: searchValue === OLLAMA_PROVIDER_ID,
        fetchActive: fetchValue === OLLAMA_PROVIDER_ID && fetchEnabled,
      };
    }

    function buildOps(staged, current) {
      const ops = [];
      FIELDS.forEach((field) => {
        if (staged[field.name] === undefined) return;
        if (staged[field.name] === formatValue(current[field.name], field.kind)) return;
        const op = parseDraft(staged[field.name], field.kind, field.name);
        if (op !== undefined) ops.push(op);
      });
      if (staged.enableFetchProvider !== undefined
        && staged.enableFetchProvider !== (current.enableFetchProvider === true)) {
        ops.push({
          op: 'set',
          path: ['enableFetchProvider'],
          value: staged.enableFetchProvider === true,
        });
      }
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
      if (staged.enableFetchProvider !== undefined
        && staged.enableFetchProvider !== (current.enableFetchProvider === true)) {
        return true;
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
        case 'incompatible-dsh': return t('updateIncompatible');
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

    function autoCheckDue(status) {
      if (!status || status.available !== true || status.busy === true) return false;
      if (status.state === 'linked' || status.state === 'installed'
        || status.state === 'unavailable') {
        return false;
      }
      if (status.error && INSTALL_ERROR_CODES.has(status.error.code)) return false;
      const checkedAt = typeof status.checkedAt === 'string'
        ? Date.parse(status.checkedAt)
        : Number.NaN;
      return !Number.isFinite(checkedAt)
        || Date.now() - checkedAt >= AUTO_CHECK_MIN_INTERVAL_MS;
    }

    function useWebSnapshot(webForm) {
      const versionState = react.useState(0);
      const setVersion = versionState[1];
      react.useEffect(() => {
        if (!webForm || typeof webForm.subscribe !== 'function') return undefined;
        try {
          return webForm.subscribe(() => setVersion((value) => value + 1));
        } catch {
          return undefined;
        }
      }, [webForm]);
      if (!webForm || typeof webForm.getSnapshot !== 'function') return undefined;
      try {
        return webForm.getSnapshot();
      } catch {
        return undefined;
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
          if (!autoCheckDue(next)) return;
          callUpdateRpc(rpc, 'check', { fresh: true }).then((refreshed) => {
            if (!alive || refreshed === undefined) return;
            setStatus(refreshed);
            setError(refreshed.error ?? null);
          }, () => undefined);
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
        const compatibility = status && status.compatibility ? status.compatibility : null;
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
        if (compatibility && compatibility.dsh) {
          addRow('dsh-version', labels('updateDshVersion'), compatibility.dsh);
        }
        if (compatibility && compatibility.range) {
          addRow('dsh-required', labels('updateDshRequired'), compatibility.range);
        }
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
            case 'incompatible':
              statusText = labels('updateIncompatible');
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
          if (latest && compatibility && compatibility.state === 'unknown'
            && (status.state === 'update' || status.state === 'major' || status.state === 'age-limited')) {
            statusText += ' ' + labels('updateCompatibilityUnknown');
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

    function supportElement(t, view) {
      return react.createElement('div', {
        key: 'support',
        className: 'dsh-ollama-web-support',
        role: 'note',
        'data-view': view === 'detail' ? 'detail' : 'card',
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
        },
          react.createElement('svg', {
            key: 'support-logo',
            className: 'dsh-ollama-web-support-logo',
            viewBox: '0 0 35 50',
            width: 14,
            height: 20,
            'aria-hidden': 'true',
            focusable: 'false',
            xmlns: 'http://www.w3.org/2000/svg',
          }, react.createElement('path', {
            key: 'support-logo-cup',
            d: SUPPORT_LOGO_CUP_PATH,
            fill: '#0d0c22',
          })),
          t('supportLink'),
        ),
      );
    }

    function makeSupportDetailSection(t) {
      return function OllamaWebSupportDetail(props) {
        const subject = props.subject;
        if (!subject || subject.kind !== 'bundle' || !subject.pkg
          || subject.pkg.name !== PACKAGE_NAME) {
          return null;
        }
        return supportElement(
          typeof props.t === 'function' ? props.t : t,
          'detail',
        );
      };
    }

    function makeCard(t, getConnection, getWebForm) {
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
        const webStagedState = react.useState(undefined);
        const webStaged = webStagedState[0];
        const setWebStaged = webStagedState[1];
        const webForm = typeof getWebForm === 'function' ? getWebForm() : undefined;
        const webSnapshot = useWebSnapshot(webForm);

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
        const localDirty = isDirty(staged, value);
        const keyDraft = staged.apiKey;
        const localFetchEnabled = staged.enableFetchProvider !== undefined
          ? staged.enableFetchProvider === true
          : value.enableFetchProvider === true;
        const providers = providerSelectionState(webSnapshot, value);
        const webValue = providers.value;
        const webReady = providers.available;
        const webWritable = providers.writable;
        const webDirty = webIsDirty(webStaged, webValue);
        const dirty = localDirty || webDirty;
        const webRevision = webSnapshot && webSnapshot.revision;
        const draftSearch = webStaged !== undefined && Object.hasOwn(webStaged, 'searchProvider')
          ? webStaged.searchProvider
          : webValue.searchProvider;
        const draftFetch = webStaged !== undefined && Object.hasOwn(webStaged, 'fetchProvider')
          ? webStaged.fetchProvider
          : webValue.fetchProvider;
        const searchChecked = draftSearch === OLLAMA_PROVIDER_ID;
        const fetchChecked = localFetchEnabled && draftFetch === OLLAMA_PROVIDER_ID;

        const stageWebSearch = (next) => {
          const target = next === true ? OLLAMA_PROVIDER_ID : providers.searchOff;
          setWebStaged((prev) => {
            const other = prev !== undefined && Object.hasOwn(prev, 'fetchProvider')
              ? prev.fetchProvider
              : (webValue.fetchProvider === undefined
                ? HTTP_FETCH_PROVIDER_ID
                : webValue.fetchProvider);
            return { searchProvider: target, fetchProvider: other };
          });
        };

        const stageWebFetch = (next) => {
          const target = next === true ? OLLAMA_PROVIDER_ID : providers.fetchOff;
          setWebStaged((prev) => {
            const other = prev !== undefined && Object.hasOwn(prev, 'searchProvider')
              ? prev.searchProvider
              : (webValue.searchProvider === undefined ? null : webValue.searchProvider);
            return { searchProvider: other, fetchProvider: target };
          });
          setStaged((prev) => {
            const copy = Object.assign({}, prev);
            copy.enableFetchProvider = next === true;
            return copy;
          });
        };

        const onSave = () => {
          if (!form || !writable || saving || invalid.length > 0) return undefined;
          const localOps = buildOps(staged, value);
          const webOps = buildWebOps(webStaged, webValue);
          if (localOps.length === 0 && webOps.length === 0) return undefined;
          if (webOps.length > 0 && (!webForm || !webReady || !webWritable
            || typeof webForm.mutate !== 'function' || webRevision === undefined)) {
            setFailed(true);
            return undefined;
          }
          if (localOps.length > 0 && snapshot.revision === undefined) {
            setFailed(true);
            return undefined;
          }
          setSaving(true);
          setFailed(false);
          const run = async () => {
            try {
              // Save the web selection first: a partial enable must not leave
              // the Ollama fetch provider usable without an explicit pin.
              if (webOps.length > 0) {
                const landed = await webForm.mutate(webOps, webRevision);
                if (landed !== true) {
                  setFailed(true);
                  return;
                }
                setWebStaged(undefined);
              }
              if (localOps.length > 0) {
                const landed = await form.mutate(localOps, snapshot.revision);
                if (landed !== true) {
                  setFailed(true);
                  return;
                }
                setStaged({});
              }
            } catch {
              setFailed(true);
            } finally {
              setSaving(false);
            }
          };
          return run();
        };

        const onDiscard = () => {
          setStaged({});
          setWebStaged(undefined);
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

        let searchStatusDetail;
        if (providers.searchActive) searchStatusDetail = t('providerSearchSelected');
        else if (typeof providers.searchValue === 'string' && providers.searchValue.length > 0) {
          searchStatusDetail = t('providerUsing') + providers.searchValue;
        } else searchStatusDetail = t('providerAutomatic');
        const searchStatusText = t('providerSearchStatus') + ': ' + searchStatusDetail;

        let fetchStatusDetail;
        if (providers.fetchActive) fetchStatusDetail = t('providerFetchSelected');
        else if (providers.fetchValue === OLLAMA_PROVIDER_ID) fetchStatusDetail = t('providerFetchDisabled');
        else if (providers.fetchValue === HTTP_FETCH_PROVIDER_ID) fetchStatusDetail = t('providerFetchHttp');
        else if (typeof providers.fetchValue === 'string' && providers.fetchValue.length > 0) {
          fetchStatusDetail = t('providerUsing') + providers.fetchValue;
        } else fetchStatusDetail = t('providerAutomatic');
        const fetchStatusText = t('providerFetchStatus') + ': ' + fetchStatusDetail;

        const providerChildren = [];
        if (webReady) {
          providerChildren.push(
            react.createElement('div', {
              key: 'search-row',
              className: 'dsh-ollama-web-fetch-toggle-row',
            },
              react.createElement(primitives.Switch, {
                checked: searchChecked,
                label: t('useOllamaSearch'),
                disabled: !writable || !webWritable || providers.searchLocked,
                onChange: stageWebSearch,
              }),
              react.createElement('span', null, t('useOllamaSearch')),
            ),
            react.createElement('p', {
              key: 'search-hint',
              className: 'dsh-ollama-web-fetch-toggle-hint',
            }, t('useOllamaSearchHint')),
            react.createElement('p', {
              key: 'search-status',
              className: 'dsh-ollama-web-fetch-toggle-hint',
            }, searchStatusText),
          );
          if (providers.searchLocked) {
            providerChildren.push(react.createElement('p', {
              key: 'search-pinned',
              className: 'dsh-ollama-web-fetch-toggle-warning',
            }, t('providerPinned')));
          }
          if (providers.incomplete) {
            providerChildren.push(react.createElement('p', {
              key: 'provider-incomplete',
              className: 'dsh-ollama-web-fetch-toggle-warning',
            }, t('providerIncomplete')));
          }
          providerChildren.push(
            react.createElement('div', {
              key: 'fetch-row',
              className: 'dsh-ollama-web-fetch-toggle-row',
            },
              react.createElement(primitives.Switch, {
                checked: fetchChecked,
                label: t('useOllamaFetch'),
                disabled: !writable || !webWritable,
                onChange: stageWebFetch,
              }),
              react.createElement('span', null, t('useOllamaFetch')),
            ),
            react.createElement('p', {
              key: 'fetch-hint',
              className: 'dsh-ollama-web-fetch-toggle-hint',
            }, t('useOllamaFetchHint')),
            react.createElement('p', {
              key: 'fetch-status',
              className: 'dsh-ollama-web-fetch-toggle-hint',
            }, fetchStatusText),
          );
          if (providers.fetchWarning !== null) {
            const warningKey = providers.fetchWarning === 'disabled'
              ? 'providerFetchDisabled'
              : providers.fetchWarning === 'ambiguous'
                ? 'providerFetchAmbiguous'
                : 'providerFetchUnselected';
            providerChildren.push(react.createElement('p', {
              key: 'fetch-warning',
              className: 'dsh-ollama-web-fetch-toggle-warning',
            }, t(warningKey)));
          }
          if (!webWritable) {
            providerChildren.push(react.createElement('p', {
              key: 'provider-readonly',
              className: 'dsh-ollama-web-fetch-toggle-warning',
            }, t('providerReadOnly')));
          }
        } else if (providers.loading) {
          providerChildren.push(react.createElement('p', {
            key: 'provider-loading',
            className: 'dsh-ollama-web-fetch-toggle-hint',
          }, t('providerLoading')));
        } else {
          providerChildren.push(
            react.createElement('div', {
              key: 'fetch-row',
              className: 'dsh-ollama-web-fetch-toggle-row',
            },
              react.createElement(primitives.Switch, {
                checked: localFetchEnabled,
                label: t('enableFetchProvider'),
                disabled: !writable,
                onChange: (next) => {
                  setStaged((prev) => {
                    const copy = Object.assign({}, prev);
                    copy.enableFetchProvider = next === true;
                    return copy;
                  });
                },
              }),
              react.createElement('span', null, t('enableFetchProvider')),
            ),
            react.createElement('p', {
              key: 'fetch-hint',
              className: 'dsh-ollama-web-fetch-toggle-hint',
            }, t('enableFetchProviderHint')),
            react.createElement('p', {
              key: 'provider-unavailable',
              className: 'dsh-ollama-web-fetch-toggle-warning',
            }, t('providerWebUnavailable')),
          );
          if (localFetchEnabled) {
            providerChildren.push(react.createElement('p', {
              key: 'fetch-warning',
              className: 'dsh-ollama-web-fetch-toggle-warning',
            }, t('enableFetchProviderWarning')));
          }
        }
        fields.push(react.createElement('div', {
          key: 'providers',
          className: 'dsh-ollama-web-fetch-toggle',
        }, ...providerChildren));

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

        const support = supportElement(t, 'card');

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
      const getWebForm = () => {
        try {
          const configForms = ctx.configForms;
          return configForms !== undefined && typeof configForms.get === 'function'
            ? configForms.get(WEB_NS)
            : undefined;
        } catch {
          return undefined;
        }
      };
      ctx.effect(() => ctx.locale.register(NS, { en, ja, zh }), 'ollama-web-client: dictionaries');
      ctx.effect(() => ctx.configForms.whileServed([TARGET_NS], () => (
        ctx.slots.inject('plugins.row.config', () => (
          ctx.slots.register(
            { name: 'plugins.row.config', key: ROW_KEY },
            makeCard(t, getConnection, getWebForm),
          )
        ))
      )), 'ollama-web-client: row configuration');
      ctx.effect(() => ctx.slots.inject('plugins.detail.section', () => [
        ctx.slots.register({
          name: 'plugins.detail.section',
          id: 'dsh-ollama-web-updates',
        }, makeDetailSection(t, getConnection)),
        ctx.slots.register({
          name: 'plugins.detail.section',
          id: 'dsh-ollama-web-support',
          order: 10,
        }, makeSupportDetailSection(t)),
      ]), 'ollama-web-client: detail sections');
    }

    exports.NS = NS;
    exports.TARGET_NS = TARGET_NS;
    exports.WEB_NS = WEB_NS;
    exports.OLLAMA_PROVIDER_ID = OLLAMA_PROVIDER_ID;
    exports.HTTP_FETCH_PROVIDER_ID = HTTP_FETCH_PROVIDER_ID;
    exports.ROW_KEY = ROW_KEY;
    exports.SUPPORT_URL = SUPPORT_URL;
    exports.UPDATE_CHANNEL = UPDATE_CHANNEL;
    exports.PACKAGE_NAME = PACKAGE_NAME;
    exports.UPDATE_STYLE_ID = UPDATE_STYLE_ID;
    exports.FETCH_STYLE_ID = FETCH_STYLE_ID;
    exports.UpdateRpcError = UpdateRpcError;
    exports.callUpdateRpc = callUpdateRpc;
    exports.autoCheckDue = autoCheckDue;
    exports.makeUpdateSection = makeUpdateSection;
    exports.makeDetailSection = makeDetailSection;
    exports.makeSupportDetailSection = makeSupportDetailSection;
    exports.FIELDS = FIELDS;
    exports.parseDraft = parseDraft;
    exports.providerOffTarget = providerOffTarget;
    exports.buildWebOps = buildWebOps;
    exports.webIsDirty = webIsDirty;
    exports.providerSelectionState = providerSelectionState;
    exports.buildOps = buildOps;
    exports.isDirty = isDirty;
    exports.invalidFields = invalidFields;
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
