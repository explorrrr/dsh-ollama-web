import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = new URL('../packages/host/', import.meta.url);
const distDir = new URL('dist/', packageDir);
const distPath = fileURLToPath(distDir);
const pkg = JSON.parse(readFileSync(new URL('package.json', packageDir), 'utf8'));

for (const script of ['preinstall', 'install', 'postinstall', 'prepare']) {
  if (pkg.scripts?.[script] !== undefined) {
    throw new Error(`host package must not define a ${script} script`);
  }
}

const required = [
  'dist/index.js',
  'dist/index.d.ts',
  'dist/update/service.js',
  'dist/update/install.js',
  'dist/update/registry.js',
  'dist/update/rpc.js',
  'dist/update/semver.js',
  'dist/update/state.js',
  'dist/update/tar.js',
  'cordis.patch.yml',
  'README.md',
  'LICENSE',
  'CHANGELOG.md',
];
for (const file of required) {
  if (!existsSync(new URL(file, packageDir))) throw new Error(`missing package file: ${file}`);
}

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else if (entry.name.endsWith('.js')) files.push(path);
  }
  return files;
}

const forbiddenAnywhere = [
  /child_process/,
  /\beval\s*\(/,
  /new\s+Function\s*\(/,
  /console\.(log|warn|error|info|debug)/,
];
const forbiddenOutsideUpdate = [
  /node:fs/,
  /\bfs\./,
];
const allowedBuiltins = new Set([
  'node:crypto',
  'node:fs',
  'node:fs/promises',
  'node:module',
  'node:os',
  'node:path',
  'node:url',
  'node:zlib',
]);

const files = walk(distPath);
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const label = relative(distPath, file);
  const isUpdate = label.startsWith('update/');
  for (const pattern of forbiddenAnywhere) {
    if (pattern.test(source)) throw new Error(`${label} matched forbidden pattern ${pattern}`);
  }
  if (!isUpdate) {
    for (const pattern of forbiddenOutsideUpdate) {
      if (pattern.test(source)) throw new Error(`${label} matched forbidden pattern ${pattern}`);
    }
    continue;
  }
  for (const match of source.matchAll(/\bfrom\s+(['"])(node:[^'"]+)\1/g)) {
    if (!allowedBuiltins.has(match[2])) {
      throw new Error(`${label} imports a non-allowlisted builtin: ${match[2]}`);
    }
  }
  for (const match of source.matchAll(/\bimport\(\s*(['"])(node:[^'"]+)\1\s*\)/g)) {
    if (!allowedBuiltins.has(match[2])) {
      throw new Error(`${label} imports a non-allowlisted builtin: ${match[2]}`);
    }
  }
  if (/\brequire\s*\(/.test(source)) {
    throw new Error(`${label} contains require()`);
  }
}

const index = await import(new URL('dist/index.js', packageDir).href);
if (index.name !== 'ollama-web') throw new Error(`unexpected plugin name: ${index.name}`);
if (index.inject?.length !== 1 || index.inject[0] !== 'web') throw new Error('inject must be [web]');
if (typeof index.apply !== 'function') throw new Error('apply is not a function');

console.log(`dist ok: ${files.length} host runtime files, update I/O confined to dist/update`);
