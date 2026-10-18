import { readFileSync } from 'node:fs';

const host = JSON.parse(readFileSync(new URL('../packages/host/package.json', import.meta.url), 'utf8'));
const client = JSON.parse(readFileSync(new URL('../packages/client/package.json', import.meta.url), 'utf8'));
const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');

if (host.name !== 'dsh-ollama-web') throw new Error(`unexpected host name: ${host.name}`);
if (client.name !== 'dsh-ollama-web-client') throw new Error(`unexpected client name: ${client.name}`);
if (host.version !== client.version) {
  throw new Error(`host/client versions differ: ${host.version} vs ${client.version}`);
}
if (!changelog.includes(`## [${host.version}]`)) {
  throw new Error(`CHANGELOG.md has no section for ${host.version}`);
}

console.log(`versions ok: ${host.name}@${host.version}, ${client.name}@${client.version}`);
