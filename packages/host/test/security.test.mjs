import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildEndpoint } from '../dist/config.js';
import { makeProvider } from './helpers.mjs';

test('runtime bundles contain no process-spawning, filesystem or eval APIs', () => {
  const dir = new URL('../dist/', import.meta.url);
  const files = readdirSync(dir).filter((name) => name.endsWith('.js'));
  const forbidden = [
    /child_process/,
    /node:fs/,
    /\bfs\./,
    /\beval\s*\(/,
    /new\s+Function\s*\(/,
  ];
  for (const file of files) {
    const source = readFileSync(join(dir.pathname, file), 'utf8');
    for (const pattern of forbidden) {
      assert.doesNotMatch(source, pattern, `${file} matched ${pattern}`);
    }
  }
});

test('HTTPS and same-origin path rules are enforced', () => {
  assert.throws(() => buildEndpoint('http://ollama.com', '/api/web_search'), /https/);
  assert.throws(() => buildEndpoint('https://ollama.com', '//evil.example/x'), /origin/);
  assert.throws(() => buildEndpoint('https://ollama.com', '/a/../b'), /plain path/);
});

test('the search provider is registered under the ollama id', () => {
  const provider = makeProvider({ apiKey: 'secret' });
  assert.equal(provider.id, 'ollama');
  assert.equal(provider.available(), true);
});
