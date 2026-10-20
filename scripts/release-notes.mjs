import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const changelogUrl = new URL('../CHANGELOG.md', import.meta.url);

export function extractReleaseNotes(changelog, version) {
  if (typeof version !== 'string' || version === '') {
    throw new Error('version is required');
  }

  const lines = changelog.split('\n');
  const heading = `## [${version}]`;
  const matches = [];
  for (const [index, line] of lines.entries()) {
    if (line.startsWith(heading)) matches.push(index);
  }
  if (matches.length === 0) {
    throw new Error(`CHANGELOG.md has no section for ${version}`);
  }
  if (matches.length > 1) {
    throw new Error(`CHANGELOG.md has ${matches.length} sections for ${version}`);
  }

  const start = matches[0];
  const end = lines.findIndex((line, index) => {
    if (index <= start) return false;
    return line.startsWith('## ') || /^\[[^\]]+\]:\s*\S/.test(line);
  });
  const stop = end === -1 ? lines.length : end;
  const body = lines.slice(start + 1, stop).join('\n').trim();
  if (body === '') {
    throw new Error(`CHANGELOG.md section for ${version} is empty`);
  }

  return `${lines.slice(start, stop).join('\n').trimEnd()}\n`;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const version = process.argv[2];
  if (version === undefined || version === '') {
    throw new Error('usage: node scripts/release-notes.mjs <version>');
  }
  process.stdout.write(extractReleaseNotes(readFileSync(changelogUrl, 'utf8'), version));
}
