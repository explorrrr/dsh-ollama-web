import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isHttpUrl,
  sanitizeBlock,
  sanitizeMetadata,
  sanitizeSourceUrl,
  sanitizeTitle,
} from '../dist/sanitize.js';

test('source URLs cannot break Markdown link destinations', () => {
  const normalized = sanitizeSourceUrl('https://a.example/x)[x](https://phish.example)');
  assert.equal(typeof normalized, 'string');
  assert.doesNotMatch(normalized, /[()[\]<>\\|]/);
  assert.match(normalized, /^https:\/\/a\.example\//);
  assert.equal(new URL(normalized).hostname, 'a.example');
});

test('source URLs stay http(s), credential-free and bounded', () => {
  assert.equal(sanitizeSourceUrl('javascript:alert(1)'), undefined);
  assert.equal(sanitizeSourceUrl('data:text/html,x'), undefined);
  assert.equal(sanitizeSourceUrl('https://user:pass@example.com/a'), undefined);
  assert.equal(sanitizeSourceUrl('https://example.com/' + 'a'.repeat(2048)), undefined);
  assert.equal(sanitizeSourceUrl('https://example.com/a'), 'https://example.com/a');
  assert.equal(isHttpUrl('https://example.com/a'), true);
  assert.equal(isHttpUrl('file:///etc/passwd'), false);
});

test('titles strip Markdown/autolink delimiters', () => {
  const title = sanitizeTitle('Click <https://evil.example> [x] \\ end');
  assert.doesNotMatch(title, /[[\]<>\\]/);
  assert.equal(title, 'Click https://evil.example x end');
});

test('short metadata strips Markdown delimiters', () => {
  const value = sanitizeMetadata('2026-01-01)([x](https://evil.example)', 64);
  assert.doesNotMatch(value, /[[\]()<>\\]/);
  assert.match(value, /^2026-01-01/);
});

test('block text preserves Markdown line breaks and strips controls', () => {
  const value = sanitizeBlock('a\u0000b\r\nc\td\u000B', 100);
  assert.equal(value, 'ab\nc\td');
  assert.equal(sanitizeBlock('abcdefghij', 5), 'abcde');
});
