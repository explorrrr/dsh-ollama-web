import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../packages/host/package.json', import.meta.url), 'utf8'));
const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
const compatibility = readFileSync(new URL('../docs/COMPATIBILITY.md', import.meta.url), 'utf8');
const packageReadme = readFileSync(new URL('../packages/host/README.md', import.meta.url), 'utf8');

if (pkg.name !== 'dsh-ollama-web') throw new Error(`unexpected package name: ${pkg.name}`);
if (typeof pkg.version !== 'string' || pkg.version.length === 0) {
  throw new Error('package version is missing');
}
if (!changelog.includes(`## [${pkg.version}]`)) {
  throw new Error(`CHANGELOG.md has no section for ${pkg.version}`);
}

const dshRange = pkg.engines?.dsh;
if (typeof dshRange !== 'string' || dshRange.length === 0) {
  throw new Error('package.json engines.dsh is missing');
}
const peerRange = pkg.peerDependencies?.['@deepseek-ai/dsh-web'];
if (peerRange !== dshRange) {
  throw new Error('engines.dsh and the @deepseek-ai/dsh-web peer range differ');
}
if (!compatibility.includes(dshRange)) {
  throw new Error('docs/COMPATIBILITY.md does not mention the package engines.dsh range');
}
if (!packageReadme.includes(dshRange)) {
  throw new Error('packages/host/README.md does not mention the package engines.dsh range');
}

console.log(`version ok: ${pkg.name}@${pkg.version} (DSH ${dshRange})`);
