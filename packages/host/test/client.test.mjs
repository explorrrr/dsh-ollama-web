import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8');

function makeReact() {
  const states = [];
  let cursor = 0;
  return {
    reset() {
      cursor = 0;
    },
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [
        states[index],
        (next) => {
          states[index] = typeof next === 'function' ? next(states[index]) : next;
        },
      ];
    },
    useEffect(effect) {
      return effect();
    },
    createElement(type, props, ...children) {
      return { type, props: { ...props, children } };
    },
    render(component, props) {
      this.reset();
      return component(props);
    },
  };
}

function loadClient(react, document) {
  let definition;
  const required = [];
  const sandbox = {
    URL,
    window: {
      __ModuleLoader__: {
        load(value) {
          definition = value;
        },
      },
    },
    console,
  };
  if (document !== undefined) sandbox.document = document;
  runInContext(source, createContext(sandbox));
  assert.ok(definition, 'client bundle did not register a loader definition');
  assert.equal(definition.id, 'dsh-ollama-web');
  const primitives = {
    SettingsForm: 'SettingsForm',
    SettingsValueField: 'SettingsValueField',
    SettingsSecretField: 'SettingsSecretField',
    Button: 'Button',
    Switch: 'Switch',
  };
  const exports = definition.factory((id) => {
    required.push(id);
    if (id === 'react') return react;
    if (id === '@deepseek-ai/dsh-client-ui-primitives') return primitives;
    throw new Error(`unexpected require: ${id}`);
  });
  return { exports, required, definition };
}

function mockContext(connection) {
  const calls = { registrations: [], injections: [], served: null, locale: null };
  const ctx = {
    effect(fn) {
      const dispose = fn();
      return typeof dispose === 'function' ? dispose : () => {};
    },
    get(name) {
      return name === 'connection' ? connection : undefined;
    },
    locale: {
      bind() {
        return (key) => key;
      },
      register(ns, dictionaries) {
        calls.locale = { ns, dictionaries };
        return () => {};
      },
    },
    configForms: {
      whileServed(namespaces, fn) {
        calls.served = namespaces;
        return fn();
      },
    },
    slots: {
      inject(name, fn) {
        calls.injections.push(name);
        return fn();
      },
      register(options, component) {
        calls.registrations.push({ options, component });
        return () => {};
      },
    },
  };
  return { ctx, calls };
}

function registration(calls, name) {
  const found = calls.registrations.find((entry) => entry.options.name === name);
  assert.ok(found, `missing slot registration ${name}`);
  return found;
}

function rowRegistration(calls) {
  return registration(calls, 'plugins.row.config');
}

function walk(node, visit) {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }
  if (node === null || node === undefined) return;
  if (typeof node !== 'object') {
    visit(node);
    return;
  }
  visit(node);
  if (node.props && node.props.children !== undefined) walk(node.props.children, visit);
}

function flatText(node) {
  const parts = [];
  walk(node, (value) => {
    if (typeof value === 'string' || typeof value === 'number') parts.push(String(value));
  });
  return parts.join(' ');
}

function findElement(tree, predicate) {
  let found;
  walk(tree, (node) => {
    if (found === undefined && node && typeof node === 'object' && predicate(node)) found = node;
  });
  return found;
}

function findButton(tree, label) {
  return findElement(tree, (node) => node.type === 'Button' && flatText(node.props.children).includes(label));
}

function findSwitch(tree) {
  return findElement(tree, (node) => node.type === 'Switch');
}

function statusLine(tree) {
  return findElement(tree, (node) => node.type === 'p' && node.props['aria-live'] === 'polite');
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

const BASE_STATUS = {
  available: true,
  profile: { name: 'desktop', restartKind: 'app' },
  running: '1.0.0',
  current: '1.0.0',
  latest: {
    version: '1.1.0',
    publishedAt: '2026-10-01T00:00:00.000Z',
    eligibleAt: '2026-10-01T01:00:00.000Z',
    releaseUrl: 'https://github.com/explorrrr/dsh-ollama-web/releases/tag/v1.1.0',
    provenance: true,
    dshRange: '>=0.2.1-rc.1 <0.3.0',
  },
  compatibility: {
    dsh: '0.2.1-rc.2',
    range: '>=0.2.1-rc.1 <0.3.0',
    state: 'compatible',
  },
  state: 'update',
  phase: 'idle',
  checkedAt: '2026-10-02T00:00:00.000Z',
  autoUpdate: false,
  installed: null,
  error: null,
  busy: false,
  ageLimited: false,
  ageUnknown: false,
  staleProcess: false,
};

function fakeConnection(status = BASE_STATUS, overrides = {}) {
  const calls = [];
  const rpc = {
    call: async (channel, method, payload) => {
      calls.push({ channel, method, payload });
      if (Object.prototype.hasOwnProperty.call(overrides, method)) {
        return overrides[method](payload);
      }
      return { ok: true, value: status };
    },
  };
  return { connection: { rpc }, calls };
}

function makeSection(exports, react, connection) {
  const Section = exports.makeUpdateSection((key) => key, () => connection);
  return Section;
}

test('bundle requires only react and the official primitives', () => {
  const react = makeReact();
  const { required } = loadClient(react);
  assert.deepEqual(required, [
    'react',
    '@deepseek-ai/dsh-client-ui-primitives',
  ]);
});

test('bundle contains no external network, storage or HTML sink calls', () => {
  for (const pattern of [
    /\bfetch\s*\(/,
    /XMLHttpRequest/,
    /innerHTML/,
    /dangerouslySetInnerHTML/,
    /localStorage/,
    /sessionStorage/,
    /postMessage/,
    /window\.open/,
    /\beval\s*\(/,
    /new\s+Function\s*\(/,
  ]) {
    assert.doesNotMatch(source, pattern);
  }
  assert.match(source, /ollama-web-update/);
  assert.match(source, /plugins\.detail\.section/);
  assert.doesNotMatch(source, /dsh-ollama-web-client/);
});

test('apply registers the row config and detail section slots', () => {
  const react = makeReact();
  const { exports } = loadClient(react);
  const { ctx, calls } = mockContext(fakeConnection().connection);
  exports.apply(ctx);
  assert.equal(calls.served[0], 'ollama-web');
  assert.equal(exports.PACKAGE_NAME, 'dsh-ollama-web');
  assert.ok(calls.injections.includes('plugins.row.config'));
  assert.ok(calls.injections.includes('plugins.detail.section'));
  const row = rowRegistration(calls);
  assert.equal(row.options.key, 'dsh-ollama-web#ollama-web');
  assert.equal(typeof row.component, 'function');
  const detail = registration(calls, 'plugins.detail.section');
  assert.equal(detail.options.id, 'dsh-ollama-web-updates');
  assert.deepEqual(Object.keys(calls.locale.dictionaries).sort(), ['en', 'ja', 'zh']);
});

test('summary view is the localized description', () => {
  const react = makeReact();
  const { exports } = loadClient(react);
  const { ctx, calls } = mockContext(fakeConnection().connection);
  exports.apply(ctx);
  assert.equal(rowRegistration(calls).component({ view: 'summary' }), 'description');
});

test('page view renders eight value fields, the secret field, support, and updates', () => {
  const react = makeReact();
  const { exports } = loadClient(react);
  const { ctx, calls } = mockContext(fakeConnection().connection);
  exports.apply(ctx);
  const form = {
    state: {
      status: 'ready',
      writable: true,
      value: { baseURL: 'https://ollama.com', snippetMax: 2000 },
      revision: 3,
    },
    mutate: async () => true,
  };
  const tree = react.render(rowRegistration(calls).component, { view: 'page', form });
  assert.equal(tree.type, 'SettingsForm');
  assert.equal(tree.props.state.available, true);
  assert.equal(tree.props.state.writable, true);
  const fields = tree.props.children[0];
  assert.equal(fields.length, 9);
  assert.equal(fields.at(-1).type, 'SettingsSecretField');
  assert.equal(fields.at(-1).props.text, '');
  assert.ok(fields.some((field) => field.props.id.endsWith('snippetMax')));
  assert.equal(tree.props.children[1].props.className, 'dsh-ollama-web-support');
  assert.equal(typeof tree.props.children[2].type, 'function');
  assert.equal(tree.props.children[2].props.view, 'card');
});

test('all locale dictionaries expose the same keys and support copy', () => {
  const react = makeReact();
  const { exports } = loadClient(react);
  const { ctx, calls } = mockContext(fakeConnection().connection);
  exports.apply(ctx);
  const dictionaries = calls.locale.dictionaries;
  const keys = Object.keys(dictionaries.en).sort();
  assert.deepEqual(Object.keys(dictionaries.ja).sort(), keys);
  assert.deepEqual(Object.keys(dictionaries.zh).sort(), keys);
  for (const locale of ['en', 'ja', 'zh']) {
    for (const key of ['supportTitle', 'supportBody', 'supportLink', 'updateTitle', 'updateAutoWarning']) {
      assert.equal(typeof dictionaries[locale][key], 'string');
      assert.ok(dictionaries[locale][key].length > 0);
    }
  }
  assert.notEqual(dictionaries.zh.supportTitle, dictionaries.en.supportTitle);
});

test('page view renders the support block with the donation link', () => {
  const react = makeReact();
  const { exports } = loadClient(react);
  const { ctx, calls } = mockContext(fakeConnection().connection);
  exports.apply(ctx);
  const form = {
    state: {
      status: 'ready',
      writable: true,
      value: { baseURL: 'https://ollama.com' },
      revision: 1,
    },
    mutate: async () => true,
  };
  const tree = react.render(rowRegistration(calls).component, { view: 'page', form });
  const support = tree.props.children[1];
  assert.equal(support.type, 'div');
  assert.equal(support.props.className, 'dsh-ollama-web-support');
  assert.equal(support.props.role, 'note');
  const [title, body, link] = support.props.children;
  assert.equal(title.type, 'p');
  assert.equal(title.props.children[0], 'supportTitle');
  assert.equal(body.type, 'p');
  assert.equal(body.props.children[0], 'supportBody');
  assert.equal(link.type, 'a');
  assert.equal(link.props.href, exports.SUPPORT_URL);
  assert.equal(link.props.href, 'https://buymeacoffee.com/explorrrr');
  assert.equal(link.props.target, '_blank');
  assert.equal(link.props.rel, 'noopener noreferrer');
  const [logo, label] = link.props.children;
  assert.equal(logo.type, 'svg');
  assert.equal(logo.props.className, 'dsh-ollama-web-support-logo');
  assert.equal(logo.props.viewBox, '0 0 35 50');
  assert.equal(logo.props['aria-hidden'], 'true');
  assert.equal(logo.props.focusable, 'false');
  assert.equal(logo.props.children.length, 1);
  assert.equal(logo.props.children[0].type, 'path');
  assert.equal(logo.props.children[0].props.fill, '#0d0c22');
  assert.ok(logo.props.children[0].props.d.startsWith('M34.1896'));
  assert.equal(label, 'supportLink');
});

function makeDocument() {
  const appended = [];
  const styles = new Map();
  const document = {
    head: {
      appendChild(node) {
        appended.push(node);
        styles.set(node.dataset.pluginCss, node);
      },
    },
    querySelector(selector) {
      const match = /^style\[data-plugin-css="(.+)"\]$/.exec(selector);
      assert.ok(match, `unexpected selector ${selector}`);
      return styles.get(match[1]) ?? null;
    },
    createElement(tag) {
      return { tag, dataset: {}, textContent: '' };
    },
  };
  return { document, appended, styles };
}

test('both stylesheets are injected once', () => {
  const first = makeDocument();
  loadClient(makeReact(), first.document);
  assert.equal(first.appended.length, 2);
  assert.equal(first.styles.get('dsh-ollama-web/SupportSection.css').tag, 'style');
  assert.equal(first.styles.get('dsh-ollama-web/UpdateSection.css').tag, 'style');
  assert.match(first.styles.get('dsh-ollama-web/SupportSection.css').textContent, /\.dsh-ollama-web-support/);
  assert.match(first.styles.get('dsh-ollama-web/UpdateSection.css').textContent, /\.dsh-ollama-web-updates/);
  loadClient(makeReact(), first.document);
  assert.equal(first.appended.length, 2);
});

test('editing a numeric field and saving sends a revision-fenced operation', async () => {
  const react = makeReact();
  const { exports } = loadClient(react);
  const { ctx, calls } = mockContext(fakeConnection().connection);
  exports.apply(ctx);
  const mutations = [];
  const form = {
    state: {
      status: 'ready',
      writable: true,
      value: { baseURL: 'https://ollama.com', snippetMax: 2000 },
      revision: 7,
    },
    mutate: async (ops, revision) => {
      mutations.push({ ops, revision });
      return true;
    },
  };

  let tree = react.render(rowRegistration(calls).component, { view: 'page', form });
  let fields = tree.props.children[0];
  const snippet = fields.find((field) => field.props.id.endsWith('snippetMax'));
  snippet.props.onEdit('1500');

  tree = react.render(rowRegistration(calls).component, { view: 'page', form });
  assert.equal(tree.props.state.dirty, true);
  await tree.props.onSave();

  assert.equal(mutations.length, 1);
  assert.equal(mutations[0].revision, 7);
  assert.deepEqual(
    JSON.parse(JSON.stringify(mutations[0].ops)),
    [{ op: 'set', path: ['snippetMax'], value: 1500 }],
  );

  tree = react.render(rowRegistration(calls).component, { view: 'page', form });
  assert.equal(tree.props.state.dirty, false);
});

test('an invalid number blocks saving', async () => {
  const react = makeReact();
  const { exports } = loadClient(react);
  const { ctx, calls } = mockContext(fakeConnection().connection);
  exports.apply(ctx);
  let mutated = false;
  const form = {
    state: {
      status: 'ready',
      writable: true,
      value: { snippetMax: 2000 },
      revision: 1,
    },
    mutate: async () => {
      mutated = true;
      return true;
    },
  };

  let tree = react.render(rowRegistration(calls).component, { view: 'page', form });
  const snippet = tree.props.children[0].find((field) => field.props.id.endsWith('snippetMax'));
  snippet.props.onEdit('not-a-number');

  tree = react.render(rowRegistration(calls).component, { view: 'page', form });
  assert.equal(tree.props.state.invalid, true);
  await tree.props.onSave();
  assert.equal(mutated, false);
});

test('out-of-range numbers are invalid', () => {
  const react = makeReact();
  const { exports } = loadClient(react);
  assert.equal(exports.parseDraft('0', 'number', 'maxResults'), undefined);
  assert.equal(exports.parseDraft('11', 'number', 'maxResults'), undefined);
  assert.deepEqual(
    JSON.parse(JSON.stringify(exports.parseDraft('10', 'number', 'maxResults'))),
    { op: 'set', path: ['maxResults'], value: 10 },
  );
  assert.deepEqual(Array.from(exports.invalidFields({ maxResponseBytes: '1' })), ['maxResponseBytes']);
});

test('an empty draft unsets the field back to its schema default', () => {
  const react = makeReact();
  const { exports } = loadClient(react);
  assert.deepEqual(
    JSON.parse(JSON.stringify(exports.buildOps({ snippetMax: '' }, { snippetMax: 2000 }))),
    [{ op: 'unset', path: ['snippetMax'] }],
  );
});

test('update section shows an available update and triggers check/install/auto RPCs', async () => {
  const react = makeReact();
  const { exports } = loadClient(react);
  const fake = fakeConnection();
  const Section = makeSection(exports, react, fake.connection);
  let tree = react.render(Section, { t: (key) => key, view: 'card' });
  await flush();
  tree = react.render(Section, { t: (key) => key, view: 'card' });
  assert.match(flatText(statusLine(tree)), /updateAvailable/);
  assert.match(flatText(tree), /updateAutoWarning/);
  const check = findButton(tree, 'updateCheck');
  assert.ok(check);
  await check.props.onClick();
  await flush();
  assert.ok(fake.calls.some((call) => call.method === 'check' && call.payload.fresh === true));
  const install = findButton(tree, 'updateInstall');
  assert.ok(install);
  await install.props.onClick();
  await flush();
  assert.ok(fake.calls.some((call) => call.method === 'install' && call.payload.allowMajor === false));
  const toggle = findSwitch(tree);
  assert.ok(toggle);
  await toggle.props.onChange(true);
  await flush();
  assert.ok(fake.calls.some((call) => call.method === 'setAutoUpdate' && call.payload.enabled === true));
});

test('update section blocks an incompatible release and shows the DSH range', async () => {
  const react = makeReact();
  const { exports } = loadClient(react);
  const fake = fakeConnection({
    ...BASE_STATUS,
    state: 'incompatible',
    latest: { ...BASE_STATUS.latest, dshRange: '>=0.2.1-rc.1 <0.3.0' },
    compatibility: {
      dsh: '0.3.0-rc.1',
      range: '>=0.2.1-rc.1 <0.3.0',
      state: 'incompatible',
    },
  });
  const Section = makeSection(exports, react, fake.connection);
  react.render(Section, { t: (key) => key, view: 'card' });
  await flush();
  const tree = react.render(Section, { t: (key) => key, view: 'card' });
  assert.match(flatText(statusLine(tree)), /updateIncompatible/);
  assert.match(flatText(tree), /updateDshVersion/);
  assert.match(flatText(tree), /0\.3\.0-rc\.1/);
  assert.match(flatText(tree), /updateDshRequired/);
  assert.equal(findButton(tree, 'updateInstall'), undefined);
});

test('update section notes unverified compatibility but allows a manual install', async () => {
  const react = makeReact();
  const { exports } = loadClient(react);
  const fake = fakeConnection({
    ...BASE_STATUS,
    compatibility: {
      dsh: null,
      range: '>=0.2.1-rc.1 <0.3.0',
      state: 'unknown',
    },
  });
  const Section = makeSection(exports, react, fake.connection);
  react.render(Section, { t: (key) => key, view: 'card' });
  await flush();
  const tree = react.render(Section, { t: (key) => key, view: 'card' });
  assert.match(flatText(statusLine(tree)), /updateCompatibilityUnknown/);
  assert.ok(findButton(tree, 'updateInstall'));
});

test('update section ignores unsafe release URLs', async () => {
  for (const releaseUrl of [
    'javascript:alert(1)',
    'https://evil.example/explorrrr/dsh-ollama-web/releases/tag/v1.1.0',
    'https://github.com/explorrrr/dsh-ollama-web/releases/tag/v1.1.0?x=1',
  ]) {
    const react = makeReact();
    const { exports } = loadClient(react);
    const fake = fakeConnection({
      ...BASE_STATUS,
      latest: { ...BASE_STATUS.latest, releaseUrl },
    });
    const Section = makeSection(exports, react, fake.connection);
    react.render(Section, { t: (key) => key, view: 'card' });
    await flush();
    const tree = react.render(Section, { t: (key) => key, view: 'card' });
    const releaseLink = findElement(
      tree,
      (node) => node.type === 'a' && flatText(node.props.children).includes('updateReleaseNotes'),
    );
    assert.equal(releaseLink, undefined, releaseUrl);
  }
});

test('update section renders the canonical release URL', async () => {
  const react = makeReact();
  const { exports } = loadClient(react);
  const fake = fakeConnection();
  const Section = makeSection(exports, react, fake.connection);
  react.render(Section, { t: (key) => key, view: 'card' });
  await flush();
  const tree = react.render(Section, { t: (key) => key, view: 'card' });
  const releaseLink = findElement(
    tree,
    (node) => node.type === 'a' && flatText(node.props.children).includes('updateReleaseNotes'),
  );
  assert.equal(releaseLink.props.href, BASE_STATUS.latest.releaseUrl);
});

test('update section renders a restart notice for an installed update', async () => {
  const react = makeReact();
  const { exports } = loadClient(react);
  const fake = fakeConnection({
    ...BASE_STATUS,
    state: 'installed',
    installed: { version: '1.1.0', at: '2026-10-02T00:00:00.000Z', needsRestart: true },
    staleProcess: true,
  });
  const Section = makeSection(exports, react, fake.connection);
  react.render(Section, { t: (key) => key, view: 'detail' });
  await flush();
  const tree = react.render(Section, { t: (key) => key, view: 'detail' });
  assert.match(flatText(statusLine(tree)), /updateRestartApp/);
  assert.equal(findButton(tree, 'updateInstall'), undefined);
  assert.equal(tree.props['data-view'], 'detail');
});

test('update section renders age-limited and linked states', async () => {
  const ageReact = makeReact();
  const ageLoaded = loadClient(ageReact);
  const ageFake = fakeConnection({
    ...BASE_STATUS,
    state: 'age-limited',
    ageLimited: true,
  });
  const AgeSection = makeSection(ageLoaded.exports, ageReact, ageFake.connection);
  ageReact.render(AgeSection, { t: (key) => key, view: 'card' });
  await flush();
  const ageTree = ageReact.render(AgeSection, { t: (key) => key, view: 'card' });
  assert.match(flatText(statusLine(ageTree)), /updateAgeLimitedHint/);
  assert.equal(findButton(ageTree, 'updateInstall').props.disabled, true);

  const linkedReact = makeReact();
  const linkedLoaded = loadClient(linkedReact);
  const linkedFake = fakeConnection({
    ...BASE_STATUS,
    state: 'linked',
  });
  const LinkedSection = makeSection(linkedLoaded.exports, linkedReact, linkedFake.connection);
  linkedReact.render(LinkedSection, { t: (key) => key, view: 'card' });
  await flush();
  const linkedTree = linkedReact.render(LinkedSection, { t: (key) => key, view: 'card' });
  assert.match(flatText(statusLine(linkedTree)), /updateLinkedHint/);
  assert.equal(findButton(linkedTree, 'updateCheck').props.disabled, true);
  assert.equal(findSwitch(linkedTree).props.disabled, true);
});

test('update section reports an unavailable RPC without throwing', async () => {
  const react = makeReact();
  const { exports } = loadClient(react);
  const Section = exports.makeUpdateSection((key) => key, () => undefined);
  const tree = react.render(Section, { t: (key) => key, view: 'card' });
  await flush();
  const next = react.render(Section, { t: (key) => key, view: 'card' });
  assert.match(flatText(statusLine(next)), /updateUnavailable/);
  assert.ok(findButton(next, 'updateRetry'));
  assert.equal(tree.props.className, 'dsh-ollama-web-updates');
});

test('detail section renders only for the package bundle', () => {
  const react = makeReact();
  const { exports } = loadClient(react);
  const detail = exports.makeDetailSection((key) => key, () => fakeConnection().connection);
  assert.equal(detail({ subject: { kind: 'bundle', pkg: { name: 'other' } }, t: (key) => key }), null);
  assert.equal(detail({ subject: { kind: 'row', pkg: { name: 'dsh-ollama-web' } }, t: (key) => key }), null);
  const node = detail({ subject: { kind: 'bundle', pkg: { name: 'dsh-ollama-web' } }, t: (key) => key });
  assert.equal(typeof node.type, 'function');
  assert.equal(node.props.view, 'detail');
});

test('callUpdateRpc returns values and maps failures', async () => {
  const react = makeReact();
  const { exports } = loadClient(react);
  const calls = [];
  assert.deepEqual(await exports.callUpdateRpc({
    call: async (channel, method, payload) => {
      calls.push({ channel, method, payload });
      return { ok: true, value: { state: 'current' } };
    },
  }, 'status'), { state: 'current' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].channel, '/ollama-web-update');
  assert.equal(calls[0].method, 'status');
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].payload)), {});
  await assert.rejects(
    exports.callUpdateRpc({
      call: async () => ({ ok: false, error: { code: 'network', message: 'bad' } }),
    }, 'status'),
    (error) => error.code === 'network',
  );
  await assert.rejects(
    exports.callUpdateRpc(undefined, 'status'),
    (error) => error.code === 'unavailable',
  );
});
