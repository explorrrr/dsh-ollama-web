import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { Config } from '../dist/index.js';

const hostPackage = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const clientSource = readFileSync(new URL('../client.js', import.meta.url), 'utf8');

function loadClient() {
  let definition;
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load(value) {
          definition = value;
        },
      },
    },
    console,
    Symbol,
    Object,
    Promise,
  };
  runInContext(clientSource, createContext(sandbox));
  assert.ok(definition, 'client bundle did not register a loader definition');
  assert.equal(definition.id, hostPackage.name);
  const fakeReact = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: () => [{}, () => {}],
  };
  const fakePrimitives = {
    SettingsForm: 'SettingsForm',
    SettingsValueField: 'SettingsValueField',
    SettingsSecretField: 'SettingsSecretField',
  };
  return definition.factory((id) => (
    id === 'react' ? fakeReact : fakePrimitives
  ));
}

test('client ROW_KEY matches the host bundle package name', () => {
  const client = loadClient();
  assert.equal(client.ROW_KEY, `${hostPackage.name}#ollama-web`);
  assert.equal(client.TARGET_NS, 'ollama-web');
});

test('client fields match the host config keys', () => {
  const client = loadClient();
  const hostKeys = Object.keys(Config.dict)
    .filter((key) => key !== 'apiKey' && key !== 'enableFetchProvider')
    .sort();
  const clientKeys = Array.from(client.FIELDS, (field) => field.name).sort();
  assert.deepEqual(clientKeys, hostKeys);
  assert.equal(client.FIELDS.some((field) => field.name === 'enableFetchProvider'), false);
});

test('client pure helpers build the expected settings operations', () => {
  const client = loadClient();
  const plain = (value) => JSON.parse(JSON.stringify(value));
  assert.deepEqual(plain(client.parseDraft('', 'number', 'snippetMax')), {
    op: 'unset',
    path: ['snippetMax'],
  });
  assert.equal(client.parseDraft('nope', 'number', 'snippetMax'), undefined);
  assert.deepEqual(plain(client.buildOps({ snippetMax: '1500' }, { snippetMax: 2000 })), [
    { op: 'set', path: ['snippetMax'], value: 1500 },
  ]);
  assert.deepEqual(plain(client.buildOps({ apiKey: 'secret' }, {})), [
    { op: 'set', path: ['apiKey'], value: 'secret' },
  ]);
  assert.deepEqual(plain(client.buildOps({ enableFetchProvider: true }, { enableFetchProvider: false })), [
    { op: 'set', path: ['enableFetchProvider'], value: true },
  ]);
  assert.equal(client.isDirty({ baseURL: 'https://ollama.com' }, { baseURL: 'https://ollama.com' }), false);
  assert.equal(client.isDirty({ enableFetchProvider: true }, { enableFetchProvider: false }), true);
  assert.deepEqual(Array.from(client.invalidFields({ snippetMax: 'x' })), ['snippetMax']);
});
