import test from 'node:test';
import assert from 'node:assert/strict';
import { readDshVersion } from '../dist/update/dsh.js';

test('reads the running DSH version from the launch environment', () => {
  assert.equal(readDshVersion({ DSH_CLIENT_VERSION: '0.2.1-rc.2' }), '0.2.1-rc.2');
  assert.equal(readDshVersion({ DSH_APP_VERSION: 'v0.2.2+build.5' }), '0.2.2');
  assert.equal(
    readDshVersion({ DSH_CLIENT_VERSION: 'not-a-version', DSH_APP_VERSION: '0.3.0' }),
    '0.3.0',
  );
  assert.equal(readDshVersion({}), null);
  assert.equal(readDshVersion({ DSH_CLIENT_VERSION: '0.2' }), null);
  assert.equal(readDshVersion({ DSH_CLIENT_VERSION: '1'.repeat(200) }), null);
  assert.equal(readDshVersion({ DSH_CLIENT_VERSION: '0.2.1-rc.2', DSH_APP_VERSION: '0.3.0' }), '0.2.1-rc.2');
});
