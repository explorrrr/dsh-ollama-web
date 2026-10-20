import { readFileSync } from 'node:fs';

const version = process.argv[2];
if (version === undefined || version === '') {
  throw new Error('usage: node scripts/release-notes.mjs <version>');
}

const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
const lines = changelog.split('\n');
const heading = `## [${version}]`;
const start = lines.findIndex((line) => line.startsWith(heading));
if (start === -1) {
  throw new Error(`CHANGELOG.md has no section for ${version}`);
}

const nextHeading = lines.findIndex((line, index) => index > start && line.startsWith('## ['));
const end = nextHeading === -1 ? lines.length : nextHeading;
const body = lines.slice(start + 1, end).join('\n').trim();
if (body === '') {
  throw new Error(`CHANGELOG.md section for ${version} is empty`);
}

process.stdout.write(`${lines.slice(start, end).join('\n').trimEnd()}\n`);
