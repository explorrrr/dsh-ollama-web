import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { extractPackageTarball } from '../dist/update/tar.js';
import {
  cleanup,
  makePackageTarball,
  makeTar,
  makeTempDir,
  paxRecord,
} from './update-helpers.mjs';

function tgz(entries) {
  return gzipSync(makeTar(entries));
}

async function extract(tar, directory, options) {
  mkdirSync(directory, { recursive: true });
  await extractPackageTarball(tar, directory, options);
}

test('extracts an npm package tarball under package/', async () => {
  const root = makeTempDir();
  try {
    const tar = makePackageTarball({ name: 'dsh-ollama-web', version: '1.1.0' });
    await extract(tar, join(root, 'out'));
    assert.match(readFileSync(join(root, 'out', 'package.json'), 'utf8'), /"version": "1.1.0"/);
    assert.match(readFileSync(join(root, 'out', 'dist', 'index.js'), 'utf8'), /test/);
  } finally {
    cleanup(root);
  }
});

test('supports pax long paths', async () => {
  const root = makeTempDir();
  try {
    const longName = `package/${'a'.repeat(120)}.txt`;
    const tar = tgz([
      { name: 'placeholder', data: 'long', pax: paxRecord('path', longName) },
    ]);
    await extract(tar, join(root, 'out'));
    assert.equal(readFileSync(join(root, 'out', `${'a'.repeat(120)}.txt`), 'utf8'), 'long');
  } finally {
    cleanup(root);
  }
});

test('rejects parent-directory traversal', async () => {
  const root = makeTempDir();
  try {
    const tar = tgz([{ name: 'package/../evil.txt', data: 'bad' }]);
    await assert.rejects(extract(tar, join(root, 'out')), /parent-directory/);
    assert.equal(existsSync(join(root, 'evil.txt')), false);
  } finally {
    cleanup(root);
  }
});

test('rejects absolute paths and symlinks', async () => {
  const root = makeTempDir();
  try {
    await assert.rejects(
      extract(tgz([{ name: '/package/evil.txt', data: 'bad' }]), join(root, 'absolute')),
      /absolute/,
    );
    await assert.rejects(
      extract(tgz([{ name: 'package/link', data: '', type: '2' }]), join(root, 'symlink')),
      /unsupported/,
    );
  } finally {
    cleanup(root);
  }
});

test('rejects duplicate entries and oversized files', async () => {
  const root = makeTempDir();
  try {
    const duplicate = tgz([
      { name: 'package/same.txt', data: 'one' },
      { name: 'package/same.txt', data: 'two' },
    ]);
    await assert.rejects(extract(duplicate, join(root, 'duplicate')), /EEXIST|archive/i);
    const oversized = tgz([{ name: 'package/big.txt', data: 'x'.repeat(32) }]);
    await assert.rejects(
      extract(oversized, join(root, 'oversized'), { maxFileBytes: 8 }),
      /oversized/,
    );
  } finally {
    cleanup(root);
  }
});

test('rejects a truncated or invalid gzip stream', async () => {
  const root = makeTempDir();
  try {
    await assert.rejects(extract(Buffer.from('not gzip'), join(root, 'bad')), /gzip/);
    const tar = makePackageTarball({ name: 'dsh-ollama-web', version: '1.1.0' });
    await assert.rejects(extract(tar.subarray(0, tar.length - 20), join(root, 'truncated')), /archive|gzip/);
  } finally {
    cleanup(root);
  }
});

test('rejects entries outside package/', async () => {
  const root = makeTempDir();
  try {
    await assert.rejects(
      extract(tgz([{ name: 'evil.txt', data: 'bad' }]), join(root, 'outside')),
      /outside the package root/,
    );
  } finally {
    cleanup(root);
  }
});

test('creates nested directories for files', async () => {
  const root = makeTempDir();
  try {
    await extract(tgz([{ name: 'package/deep/nested/file.txt', data: 'ok' }]), join(root, 'nested'));
    assert.equal(readFileSync(join(root, 'nested', 'deep', 'nested', 'file.txt'), 'utf8'), 'ok');
  } finally {
    cleanup(root);
  }
});
