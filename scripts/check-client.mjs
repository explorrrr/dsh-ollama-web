import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const packageDir = new URL('../packages/client/', import.meta.url);
const pkg = JSON.parse(readFileSync(new URL('package.json', packageDir), 'utf8'));
const source = readFileSync(new URL('client.js', packageDir), 'utf8');

if (pkg.dsh?.client?.platform !== 'web') throw new Error('dsh.client.platform must be web');
for (const dependency of [
  '@deepseek-ai/dsh-client-ui-plugin-manager',
  '@deepseek-ai/dsh-client-ui-primitives',
]) {
  if (!pkg.dsh.client.inject?.includes(dependency)) {
    throw new Error(`dsh.client.inject is missing ${dependency}`);
  }
}
if (pkg.dsh?.bundle?.patch !== './cordis.patch.yml') throw new Error('client bundle patch is not declared');
for (const file of ['client.js', 'index.js', 'cordis.patch.yml', 'README.md', 'LICENSE', 'CHANGELOG.md']) {
  if (!existsSync(new URL(file, packageDir))) throw new Error(`missing client package file: ${file}`);
}

const forbidden = [
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
];
for (const pattern of forbidden) {
  if (pattern.test(source)) throw new Error(`client.js matched forbidden pattern ${pattern}`);
}

const requires = [...source.matchAll(/require\((['"])([^'"]+)\1\)/g)].map((match) => match[2]);
const allowed = new Set(['react', '@deepseek-ai/dsh-client-ui-primitives']);
for (const id of requires) {
  if (!allowed.has(id)) throw new Error(`client.js requires unexpected module: ${id}`);
}
if (!requires.includes('react') || !requires.includes('@deepseek-ai/dsh-client-ui-primitives')) {
  throw new Error('client.js must require react and the official primitives');
}
if (!source.includes("plugins.row.config") || !source.includes('dsh-ollama-web#ollama-web')) {
  throw new Error('client.js does not register the expected row config slot');
}
if (!source.includes('ollama-web-update')) {
  throw new Error('client.js does not use the update RPC channel');
}
if (!source.includes('plugins.detail.section')) {
  throw new Error('client.js does not register the update detail section');
}
const inject = /const inject\s*=\s*\[([^\]]*)\]/.exec(source);
if (inject !== null && inject[1].includes("'connection'")) {
  throw new Error('client.js must not add connection to inject; resolve it at render time');
}

const syntax = spawnSync(process.execPath, ['--check', new URL('client.js', packageDir).pathname], {
  encoding: 'utf8',
});
if (syntax.status !== 0) throw new Error(`client.js syntax error: ${syntax.stderr}`);

console.log(`client ok: ${requires.length} requires, row slot registered, syntax valid`);
