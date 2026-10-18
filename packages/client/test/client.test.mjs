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
  const primitives = {
    SettingsForm: 'SettingsForm',
    SettingsValueField: 'SettingsValueField',
    SettingsSecretField: 'SettingsSecretField',
  };
  const exports = definition.factory((id) => {
    required.push(id);
    if (id === 'react') return react;
    if (id === '@deepseek-ai/dsh-client-ui-primitives') return primitives;
    throw new Error(`unexpected require: ${id}`);
  });
  return { exports, required, definition };
}

function mockContext() {
  const calls = { registered: null, injected: null, served: null, locale: null };
  const ctx = {
    effect(fn) {
      const dispose = fn();
      return typeof dispose === 'function' ? dispose : () => {};
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
        calls.injected = name;
        return fn();
      },
      register(options, component) {
        calls.registered = { options, component };
        return () => {};
      },
    },
  };
  return { ctx, calls };
}

test('bundle requires only react and the official primitives', () => {
  const react = makeReact();
  const { required } = loadClient(react);
  assert.deepEqual(required, [
    'react',
    '@deepseek-ai/dsh-client-ui-primitives',
  ]);
});

test('bundle contains no network, storage or HTML sink calls', () => {
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
});

test('apply registers the row config slot with the host bundle key', () => {
  const react = makeReact();
  const { exports } = loadClient(react);
  const { ctx, calls } = mockContext();
  exports.apply(ctx);
  assert.equal(calls.served[0], 'ollama-web');
  assert.equal(calls.injected, 'plugins.row.config');
  assert.equal(calls.registered.options.name, 'plugins.row.config');
  assert.equal(calls.registered.options.key, 'dsh-ollama-web#ollama-web');
  assert.equal(typeof calls.registered.component, 'function');
  assert.deepEqual(Object.keys(calls.locale.dictionaries).sort(), ['en', 'ja', 'zh']);
});

test('summary view is the localized description', () => {
  const react = makeReact();
  const { exports } = loadClient(react);
  const { ctx, calls } = mockContext();
  exports.apply(ctx);
  assert.equal(calls.registered.component({ view: 'summary' }), 'description');
});

test('page view renders eight value fields plus the secret field', () => {
  const react = makeReact();
  const { exports } = loadClient(react);
  const { ctx, calls } = mockContext();
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
  const tree = react.render(calls.registered.component, { view: 'page', form });
  assert.equal(tree.type, 'SettingsForm');
  assert.equal(tree.props.state.available, true);
  assert.equal(tree.props.state.writable, true);
  const fields = tree.props.children[0];
  assert.equal(fields.length, 9);
  assert.equal(fields.at(-1).type, 'SettingsSecretField');
  assert.equal(fields.at(-1).props.text, '');
  assert.ok(fields.some((field) => field.props.id.endsWith('snippetMax')));
});

test('all locale dictionaries expose the same keys and support copy', () => {
  const react = makeReact();
  const { exports } = loadClient(react);
  const { ctx, calls } = mockContext();
  exports.apply(ctx);
  const dictionaries = calls.locale.dictionaries;
  const keys = Object.keys(dictionaries.en).sort();
  assert.deepEqual(Object.keys(dictionaries.ja).sort(), keys);
  assert.deepEqual(Object.keys(dictionaries.zh).sort(), keys);
  for (const locale of ['en', 'ja', 'zh']) {
    for (const key of ['supportTitle', 'supportBody', 'supportLink']) {
      assert.equal(typeof dictionaries[locale][key], 'string');
      assert.ok(dictionaries[locale][key].length > 0);
    }
  }
  assert.notEqual(dictionaries.zh.supportTitle, dictionaries.en.supportTitle);
});

test('page view renders the support block with the donation link', () => {
  const react = makeReact();
  const { exports } = loadClient(react);
  const { ctx, calls } = mockContext();
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
  const tree = react.render(calls.registered.component, { view: 'page', form });
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
  assert.equal(link.props.children[0], 'supportLink');
});

function makeDocument() {
  const appended = [];
  let existing = null;
  const document = {
    head: {
      appendChild(node) {
        appended.push(node);
        existing = node;
      },
    },
    querySelector(selector) {
      assert.equal(selector, 'style[data-plugin-css="dsh-ollama-web-client/SupportSection.css"]');
      return existing;
    },
    createElement(tag) {
      return { tag, dataset: {}, textContent: '' };
    },
  };
  return { document, appended };
}

test('the support stylesheet is injected once', () => {
  const first = makeDocument();
  loadClient(makeReact(), first.document);
  assert.equal(first.appended.length, 1);
  assert.equal(first.appended[0].tag, 'style');
  assert.equal(first.appended[0].dataset.plugin, 'dsh-ollama-web-client');
  assert.equal(first.appended[0].dataset.pluginCss, 'dsh-ollama-web-client/SupportSection.css');
  assert.match(first.appended[0].textContent, /\.dsh-ollama-web-support/);
  loadClient(makeReact(), first.document);
  assert.equal(first.appended.length, 1);
});

test('editing a numeric field and saving sends a revision-fenced operation', async () => {
  const react = makeReact();
  const { exports } = loadClient(react);
  const { ctx, calls } = mockContext();
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

  let tree = react.render(calls.registered.component, { view: 'page', form });
  let fields = tree.props.children[0];
  const snippet = fields.find((field) => field.props.id.endsWith('snippetMax'));
  snippet.props.onEdit('1500');

  tree = react.render(calls.registered.component, { view: 'page', form });
  assert.equal(tree.props.state.dirty, true);
  await tree.props.onSave();

  assert.equal(mutations.length, 1);
  assert.equal(mutations[0].revision, 7);
  assert.deepEqual(
    JSON.parse(JSON.stringify(mutations[0].ops)),
    [{ op: 'set', path: ['snippetMax'], value: 1500 }],
  );

  tree = react.render(calls.registered.component, { view: 'page', form });
  assert.equal(tree.props.state.dirty, false);
});

test('an invalid number blocks saving', async () => {
  const react = makeReact();
  const { exports } = loadClient(react);
  const { ctx, calls } = mockContext();
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

  let tree = react.render(calls.registered.component, { view: 'page', form });
  const snippet = tree.props.children[0].find((field) => field.props.id.endsWith('snippetMax'));
  snippet.props.onEdit('not-a-number');

  tree = react.render(calls.registered.component, { view: 'page', form });
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
