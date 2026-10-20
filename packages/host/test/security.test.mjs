import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEndpoint } from '../dist/config.js';
import { isBlockedFetchHostname, validateFetchUrl } from '../dist/fetch-provider.js';
import { makeFetchProvider, makeProvider } from './helpers.mjs';

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else if (entry.name.endsWith('.js')) files.push(path);
  }
  return files;
}

test('runtime bundles keep filesystem access inside the update subsystem', () => {
  const dir = fileURLToPath(new URL('../dist/', import.meta.url));
  const forbiddenAnywhere = [
    /child_process/,
    /\beval\s*\(/,
    /new\s+Function\s*\(/,
  ];
  const forbiddenOutsideUpdate = [
    /node:fs/,
    /\bfs\./,
  ];
  for (const file of walk(dir)) {
    const label = relative(dir, file);
    const source = readFileSync(file, 'utf8');
    for (const pattern of forbiddenAnywhere) {
      assert.doesNotMatch(source, pattern, `${label} matched ${pattern}`);
    }
    if (!label.startsWith('update/')) {
      for (const pattern of forbiddenOutsideUpdate) {
        assert.doesNotMatch(source, pattern, `${label} matched ${pattern}`);
      }
    }
  }
});

test('update modules import only allowlisted Node builtins', () => {
  const dir = fileURLToPath(new URL('../dist/update/', import.meta.url));
  const allowed = new Set([
    'node:crypto',
    'node:fs',
    'node:fs/promises',
    'node:module',
    'node:os',
    'node:path',
    'node:url',
    'node:zlib',
  ]);
  for (const file of walk(dir)) {
    const label = relative(dir, file);
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/\bfrom\s+(['"])(node:[^'"]+)\1/g)) {
      assert.ok(allowed.has(match[2]), `${label} imports ${match[2]}`);
    }
    for (const match of source.matchAll(/\bimport\(\s*(['"])(node:[^'"]+)\1\s*\)/g)) {
      assert.ok(allowed.has(match[2]), `${label} imports ${match[2]}`);
    }
    assert.doesNotMatch(source, /\brequire\s*\(/, `${label} uses require()`);
  }
});

test('HTTPS and same-origin path rules are enforced', () => {
  assert.throws(() => buildEndpoint('http://ollama.com', '/api/web_search'), /https/);
  assert.throws(() => buildEndpoint('https://ollama.com', '//evil.example/x'), /plain path|origin/);
  assert.throws(() => buildEndpoint('https://ollama.com', '/a/../b'), /plain path/);
  assert.throws(() => buildEndpoint('https://ollama.com', '/a/../b', 'fetchPath'), /fetchPath/);
});

test('fetch URLs reject credentials, non-http protocols and local/private hosts', () => {
  for (const hostname of [
    'localhost',
    'app.localhost',
    'printer.local',
    'printer.local.',
    'metadata.google.internal',
    '127.0.0.1.nip.io',
    'app.lvh.me',
    '127.0.0.1',
    '10.0.0.1',
    '172.16.0.1',
    '192.168.0.1',
    '169.254.169.254',
    '100.64.0.1',
    '::1',
    'fc00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
  ]) {
    assert.equal(isBlockedFetchHostname(hostname), true, hostname);
    const url = hostname.includes(':')
      ? `https://[${hostname}]/`
      : `https://${hostname}/`;
    assert.throws(() => validateFetchUrl(url), /not allowed|public/, hostname);
  }
  assert.equal(isBlockedFetchHostname('example.com'), false);
  assert.equal(isBlockedFetchHostname('1.1.1.1'), false);
  assert.equal(isBlockedFetchHostname('2606:4700:4700::1111'), false);
  assert.throws(() => validateFetchUrl('https://user:pass@example.com/'), /credentials/);
  assert.throws(() => validateFetchUrl('ftp://example.com/'), /http/);
  assert.throws(() => validateFetchUrl('javascript:alert(1)'), /http/);
});

test('the search and fetch providers are registered under the ollama id', () => {
  const provider = makeProvider({ apiKey: 'secret' });
  assert.equal(provider.id, 'ollama');
  assert.equal(provider.available(), true);

  const fetchProvider = makeFetchProvider({ apiKey: 'secret', enableFetchProvider: true });
  assert.equal(fetchProvider.id, 'ollama');
  assert.equal(fetchProvider.available(), true);
});
