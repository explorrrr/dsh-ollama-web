import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const packageDir = new URL('../packages/host/', import.meta.url);
const distDir = new URL('dist/', packageDir);
const pkg = JSON.parse(readFileSync(new URL('package.json', packageDir), 'utf8'));

for (const script of ['preinstall', 'install', 'postinstall', 'prepare']) {
  if (pkg.scripts?.[script] !== undefined) {
    throw new Error(`host package must not define a ${script} script`);
  }
}

const required = ['dist/index.js', 'dist/index.d.ts', 'cordis.patch.yml', 'README.md', 'LICENSE', 'CHANGELOG.md'];
for (const file of required) {
  if (!existsSync(new URL(file, packageDir))) throw new Error(`missing package file: ${file}`);
}

const forbidden = [
  /child_process/,
  /node:fs/,
  /\bfs\./,
  /\beval\s*\(/,
  /new\s+Function\s*\(/,
  /console\.(log|warn|error|info|debug)/,
];
const files = readdirSync(distDir).filter((name) => name.endsWith('.js'));
for (const file of files) {
  const source = readFileSync(join(distDir.pathname, file), 'utf8');
  for (const pattern of forbidden) {
    if (pattern.test(source)) throw new Error(`${file} matched forbidden pattern ${pattern}`);
  }
}

const index = await import(new URL('dist/index.js', packageDir).href);
if (index.name !== 'ollama-web') throw new Error(`unexpected plugin name: ${index.name}`);
if (index.inject?.length !== 1 || index.inject[0] !== 'web') throw new Error('inject must be [web]');
if (typeof index.apply !== 'function') throw new Error('apply is not a function');

console.log(`dist ok: ${files.length} host runtime files, no forbidden APIs`);
