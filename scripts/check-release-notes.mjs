import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { extractReleaseNotes } from './release-notes.mjs';

const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('../packages/host/package.json', import.meta.url), 'utf8'));
const cli = fileURLToPath(new URL('./release-notes.mjs', import.meta.url));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertThrows(fn, message, expected) {
  try {
    fn();
  } catch (error) {
    if (expected !== undefined && !String(error?.message).includes(expected)) {
      throw new Error(`${message}: unexpected error: ${error?.message}`);
    }
    return;
  }
  throw new Error(`expected an error: ${message}`);
}

const versions = [...changelog.matchAll(/^## \[([^\]]+)\]/gm)]
  .map((match) => match[1])
  .filter((version) => version !== 'Unreleased');
assert(versions.length > 0, 'CHANGELOG.md has no version sections');
for (const version of versions) {
  const notes = extractReleaseNotes(changelog, version);
  const headings = notes.split('\n').filter((line) => line.startsWith('## ['));
  assert(headings.length === 1, `release notes for ${version} contain ${headings.length} headings`);
  assert(
    headings[0].startsWith(`## [${version}]`),
    `release notes for ${version} start with ${headings[0]}`,
  );
  assert(!notes.includes('## [Unreleased]'), `release notes for ${version} include Unreleased`);
}
assert(
  extractReleaseNotes(changelog, pkg.version).startsWith(`## [${pkg.version}]`),
  `release notes for package version ${pkg.version} are missing`,
);

const fixture = `# Changelog

## [Unreleased]

- unreleased entry.

## [2.3.0] - 2026-10-19

### Added

- current entry.

## [2.2.0] - 2026-10-18

- older entry.

[2.3.0]: https://example.com/2.3.0
`;
const fixtureNotes = extractReleaseNotes(fixture, '2.3.0');
assert(fixtureNotes.includes('current entry.'), 'fixture: missing the current entry');
assert(!fixtureNotes.includes('unreleased entry.'), 'fixture: included Unreleased');
assert(!fixtureNotes.includes('older entry.'), 'fixture: included an older section');

const lastSection = `## [1.0.0] - 2026-10-18

- last entry.

[1.0.0]: https://example.com/1.0.0
`;
const lastNotes = extractReleaseNotes(lastSection, '1.0.0');
assert(lastNotes.includes('last entry.'), 'last section: missing the entry');
assert(!lastNotes.includes('[1.0.0]:'), 'last section: included the link definition');

const footer = `## [1.0.0] - 2026-10-18

- footer entry.

## License

MIT
`;
const footerNotes = extractReleaseNotes(footer, '1.0.0');
assert(footerNotes.includes('footer entry.'), 'footer: missing the entry');
assert(!footerNotes.includes('## License'), 'footer: included the next section');

const prerelease = `## [2.3.0-rc.1] - 2026-10-19

- rc entry.

## [2.3.0] - 2026-10-20

- stable entry.
`;
const stableNotes = extractReleaseNotes(prerelease, '2.3.0');
assert(stableNotes.includes('stable entry.'), 'prerelease: stable entry missing');
assert(!stableNotes.includes('rc entry.'), 'prerelease: rc entry leaked');
const rcNotes = extractReleaseNotes(prerelease, '2.3.0-rc.1');
assert(rcNotes.includes('rc entry.'), 'prerelease: rc entry missing');
assert(!rcNotes.includes('stable entry.'), 'prerelease: stable entry leaked');

const crlf = '## [2.3.0] - 2026-10-19\r\n\r\n- crlf entry.\r\n\r\n## [2.2.0] - 2026-10-18\r\n';
const crlfNotes = extractReleaseNotes(crlf, '2.3.0');
assert(crlfNotes.includes('crlf entry.'), 'CRLF: entry missing');
assert(!crlfNotes.includes('## [2.2.0]'), 'CRLF: next section leaked');

assertThrows(
  () => extractReleaseNotes(fixture, '9.9.9'),
  'missing section',
  'has no section for 9.9.9',
);
assertThrows(() => extractReleaseNotes(fixture, ''), 'empty version', 'version is required');
assertThrows(
  () => extractReleaseNotes('## [2.3.0] - 2026-10-19\n\n## [2.2.0] - 2026-10-18\n', '2.3.0'),
  'empty section',
  'is empty',
);
assertThrows(
  () => extractReleaseNotes('## [2.3.0]\n\n- one\n\n## [2.3.0]\n\n- two\n', '2.3.0'),
  'duplicate section',
  '2 sections for 2.3.0',
);

const cliRun = spawnSync(process.execPath, [cli, pkg.version], { encoding: 'utf8' });
assert(cliRun.status === 0, `CLI failed: ${cliRun.stderr}`);
assert(
  cliRun.stdout === extractReleaseNotes(changelog, pkg.version),
  'CLI output differs from the extracted section',
);
const cliMissing = spawnSync(process.execPath, [cli], { encoding: 'utf8' });
assert(cliMissing.status !== 0, 'CLI accepted a missing version');

console.log(`release notes ok: ${versions.length} versions, CLI and fixtures pass`);
