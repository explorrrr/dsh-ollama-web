import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../packages/host/package.json', import.meta.url), 'utf8'));
const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');

if (pkg.name !== 'dsh-ollama-web') throw new Error(`unexpected package name: ${pkg.name}`);
if (typeof pkg.version !== 'string' || pkg.version.length === 0) {
  throw new Error('package version is missing');
}
if (!changelog.includes(`## [${pkg.version}]`)) {
  throw new Error(`CHANGELOG.md has no section for ${pkg.version}`);
}

console.log(`version ok: ${pkg.name}@${pkg.version}`);
