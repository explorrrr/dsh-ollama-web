import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

export const REGISTRY = 'https://registry.example/';

export function makeTempDir(prefix = 'dsh-update-') {
  return mkdtempSync(join(tmpdir(), prefix));
}

export function cleanup(directory) {
  rmSync(directory, { recursive: true, force: true });
}

export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function writeText(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value);
}

export function readText(path) {
  return readFileSync(path, 'utf8');
}

export function sha512Integrity(bytes) {
  return `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
}

function writeOctal(buffer, offset, length, value) {
  const text = value.toString(8).padStart(length - 1, '0');
  buffer.write(text, offset, 'ascii');
  buffer[offset + length - 1] = 0;
}

function checksumOctal(buffer, value) {
  const text = value.toString(8).padStart(6, '0');
  buffer.write(text, 148, 'ascii');
  buffer[154] = 0;
  buffer[155] = 0x20;
}

function tarHeader(name, size, type = '0', mode = 0o644) {
  const header = Buffer.alloc(512);
  header.write(name.slice(0, 100), 0, 'utf8');
  writeOctal(header, 100, 8, mode);
  writeOctal(header, 108, 8, 0);
  writeOctal(header, 116, 8, 0);
  writeOctal(header, 124, 12, size);
  writeOctal(header, 136, 12, Math.floor(Date.now() / 1000));
  header.fill(0x20, 148, 156);
  header[156] = type.charCodeAt(0);
  header.write('ustar\0', 257, 'ascii');
  header.write('00', 263, 'ascii');
  let sum = 0;
  for (const byte of header) sum += byte;
  checksumOctal(header, sum);
  return header;
}

function pad(data) {
  const remainder = data.length % 512;
  if (remainder === 0) return Buffer.alloc(0);
  return Buffer.alloc(512 - remainder);
}

export function paxRecord(key, value) {
  const body = ` ${key}=${value}\n`;
  let length = Buffer.byteLength(body) + 2;
  for (;;) {
    const text = `${length}${body}`;
    const actual = Buffer.byteLength(text);
    if (actual === length) return text;
    length = actual;
  }
}

export function makeTar(entries) {
  const chunks = [];
  for (const entry of entries) {
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data ?? '', 'utf8');
    if (entry.pax) {
      const pax = Buffer.from(entry.pax, 'utf8');
      chunks.push(tarHeader('PaxHeader', pax.length, 'x'), pax, pad(pax));
    }
    chunks.push(tarHeader(entry.name, data.length, entry.type ?? '0', entry.mode ?? 0o644), data, pad(data));
  }
  chunks.push(Buffer.alloc(1024));
  return Buffer.concat(chunks);
}

export function makePackageTarball({ name, version, dependencies = {}, extra = {} }) {
  const client = name === 'dsh-ollama-web-client';
  const manifest = {
    name,
    version,
    type: 'module',
    main: client ? './index.js' : './dist/index.js',
    dsh: {
      bundle: { patch: './cordis.patch.yml' },
      ...(client ? { client: { platform: 'web', inject: [] } } : {}),
    },
    dependencies,
  };
  const files = {
    'package/package.json': `${JSON.stringify(manifest, null, 2)}\n`,
    'package/cordis.patch.yml': '- insert: []\n',
    ...(client
      ? {
        'package/client.js': 'window.__ModuleLoader__.load({ id: "dsh-ollama-web-client", factory: () => ({}) });\n',
        'package/index.js': 'export function apply() {}\n',
      }
      : {
        'package/dist/index.js': 'export const version = "test";\n',
      }),
    ...extra,
  };
  const entries = Object.entries(files).map(([name, data]) => ({ name, data }));
  return gzipSync(makeTar(entries));
}

export function makePackument({
  name,
  version,
  tarball,
  integrity,
  publishedAt = '2026-10-01T00:00:00.000Z',
  provenance = true,
}) {
  return {
    name,
    'dist-tags': { latest: version },
    versions: {
      [version]: {
        name,
        version,
        dist: {
          tarball,
          integrity,
          ...(provenance ? { attestations: { url: `https://registry.example/-/npm/v1/attestations/${name}@${version}` } } : {}),
        },
      },
    },
    time: { [version]: publishedAt },
  };
}

export function makeRegistryResponder({ host, client, tarballs = {}, calls = [] }) {
  return async (input) => {
    const url = String(input);
    calls.push(url);
    if (url === `${REGISTRY}${host.name}`) {
      return new Response(JSON.stringify(host), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url === `${REGISTRY}${client.name}`) {
      return new Response(JSON.stringify(client), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    const tarball = tarballs[url];
    if (tarball !== undefined) {
      return new Response(tarball, { status: 200, headers: { 'content-type': 'application/octet-stream' } });
    }
    return new Response('not found', { status: 404 });
  };
}

export function makeRelease({ version, hostTarball, clientTarball, publishedAt = '2026-10-01T00:00:00.000Z', registry = REGISTRY }) {
  const host = makePackument({
    name: 'dsh-ollama-web',
    version,
    tarball: `${registry}dsh-ollama-web/-/dsh-ollama-web-${version}.tgz`,
    integrity: sha512Integrity(hostTarball),
    publishedAt,
  });
  const client = makePackument({
    name: 'dsh-ollama-web-client',
    version,
    tarball: `${registry}dsh-ollama-web-client/-/dsh-ollama-web-client-${version}.tgz`,
    integrity: sha512Integrity(clientTarball),
    publishedAt,
  });
  const target = {
    host: {
      name: 'dsh-ollama-web',
      version,
      tarball: host.versions[version].dist.tarball,
      integrity: host.versions[version].dist.integrity,
      publishedAt,
      provenance: true,
    },
    client: {
      name: 'dsh-ollama-web-client',
      version,
      tarball: client.versions[version].dist.tarball,
      integrity: client.versions[version].dist.integrity,
      publishedAt,
      provenance: true,
    },
    version,
    publishedAt,
    eligibleAt: publishedAt,
    releaseUrl: `https://github.com/explorrrr/dsh-ollama-web/releases/tag/v${version}`,
    provenance: true,
    registry,
  };
  return { host, client, target };
}

export function makeProfile({
  root,
  hostVersion = '1.0.0',
  clientVersion = '1.0.0',
  minimumReleaseAge = 0,
}) {
  const profileDir = join(root, 'profiles', 'test');
  const hostDir = join(profileDir, 'node_modules', 'dsh-ollama-web');
  const clientDir = join(profileDir, 'node_modules', 'dsh-ollama-web-client');
  writeJson(join(profileDir, 'package.json'), {
    name: 'dsh-profile-test',
    private: true,
    dependencies: {
      'dsh-ollama-web': hostVersion,
      'dsh-ollama-web-client': clientVersion,
    },
    dsh: { profile: { bundles: ['dsh-ollama-web', 'dsh-ollama-web-client'] } },
  });
  writeText(
    join(profileDir, 'pnpm-workspace.yaml'),
    minimumReleaseAge === undefined
      ? 'packages:\n  - .\n'
      : `minimumReleaseAge: ${minimumReleaseAge}\n`,
  );
  writeJson(join(hostDir, 'package.json'), {
    name: 'dsh-ollama-web',
    version: hostVersion,
    type: 'module',
    main: './dist/index.js',
    dsh: { bundle: { patch: './cordis.patch.yml' } },
    dependencies: { 'legacy-dep': '1.0.0' },
  });
  writeText(join(hostDir, 'dist', 'index.js'), `export const version = "${hostVersion}";\n`);
  writeText(join(hostDir, 'cordis.patch.yml'), '- insert: []\n');
  writeJson(join(hostDir, 'node_modules', 'legacy-dep', 'package.json'), {
    name: 'legacy-dep',
    version: '1.0.0',
    main: 'index.js',
  });
  writeText(join(hostDir, 'node_modules', 'legacy-dep', 'index.js'), 'module.exports = 1;\n');
  writeJson(join(clientDir, 'package.json'), {
    name: 'dsh-ollama-web-client',
    version: clientVersion,
    type: 'module',
    main: './index.js',
    dsh: { bundle: { patch: './cordis.patch.yml' }, client: { platform: 'web', inject: [] } },
  });
  writeText(join(clientDir, 'client.js'), 'window.__ModuleLoader__.load({ id: "dsh-ollama-web-client", factory: () => ({}) });\n');
  writeText(join(clientDir, 'index.js'), 'export function apply() {}\n');
  writeText(join(clientDir, 'cordis.patch.yml'), '- insert: []\n');
  return {
    root,
    profileDir,
    profile: {
      dir: profileDir,
      name: 'test',
      profilesRoot: join(root, 'profiles'),
      restartKind: 'host',
    },
    profileUrl: pathToFileURL(profileDir).href,
    hostDir,
    clientDir,
  };
}

export function assertFile(path, expected) {
  if (!existsSync(path)) throw new Error(`missing file: ${path}`);
  if (expected !== undefined && readText(path).trim() !== expected.trim()) {
    throw new Error(`unexpected content in ${path}: ${readText(path)}`);
  }
}
