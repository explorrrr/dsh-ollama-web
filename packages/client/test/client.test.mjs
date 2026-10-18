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

function loadClient(react) {
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
  assert.deepEqual(Object.keys(calls.locale.dictionaries).sort(), ['en', 'ja']);
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

test('an empty draft unsets the field back to its schema default', () => {
  const react = makeReact();
  const { exports } = loadClient(react);
  assert.deepEqual(
    JSON.parse(JSON.stringify(exports.buildOps({ snippetMax: '' }, { snippetMax: 2000 }))),
    [{ op: 'unset', path: ['snippetMax'] }],
  );
});
