import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareVersions,
  parseVersion,
  sameMajor,
} from '../dist/update/semver.js';

test('parseVersion accepts stable and prerelease versions', () => {
  assert.deepEqual(parseVersion('1.2.3'), {
    major: 1,
    minor: 2,
    patch: 3,
    prerelease: [],
    raw: '1.2.3',
  });
  assert.equal(parseVersion('v1.2.3-rc.1')?.raw, '1.2.3-rc.1');
  assert.equal(parseVersion('1.2.3+build.5')?.raw, '1.2.3');
  assert.equal(parseVersion('1.2'), undefined);
  assert.equal(parseVersion('1.2.3-'), undefined);
  assert.equal(parseVersion(undefined), undefined);
});

test('compareVersions follows SemVer precedence', () => {
  assert.equal(compareVersions('1.2.3', '1.2.3'), 0);
  assert.equal(compareVersions('1.2.4', '1.2.3'), 1);
  assert.equal(compareVersions('1.3.0', '1.2.9'), 1);
  assert.equal(compareVersions('2.0.0', '1.9.9'), 1);
  assert.equal(compareVersions('1.2.3-rc.1', '1.2.3'), -1);
  assert.equal(compareVersions('1.2.3-rc.2', '1.2.3-rc.1'), 1);
  assert.equal(compareVersions('1.2.3-rc.10', '1.2.3-rc.2'), 1);
  assert.equal(compareVersions('1.2.3-alpha', '1.2.3-beta'), -1);
  assert.throws(() => compareVersions('nope', '1.0.0'), /invalid/);
});

test('sameMajor compares only the major field', () => {
  assert.equal(sameMajor('1.9.9', '1.0.0'), true);
  assert.equal(sameMajor('2.0.0', '1.9.9'), false);
  assert.equal(sameMajor('bad', '1.0.0'), false);
});
