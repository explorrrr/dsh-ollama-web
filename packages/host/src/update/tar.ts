import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { UpdateFailure } from './errors.js';

const BLOCK = 512;
const DEFAULT_MAX_BYTES = 64 * 1024 * 1024;
const DEFAULT_MAX_ENTRIES = 1024;
const DEFAULT_MAX_FILE_BYTES = 16 * 1024 * 1024;

export interface ExtractOptions {
  readonly maxBytes?: number;
  readonly maxEntries?: number;
  readonly maxFileBytes?: number;
}

function isZero(block: Buffer): boolean {
  for (const byte of block) {
    if (byte !== 0) return false;
  }
  return true;
}

function readString(buffer: Buffer, offset: number, length: number): string {
  const slice = buffer.subarray(offset, offset + length);
  const end = slice.indexOf(0);
  return slice.subarray(0, end === -1 ? slice.length : end).toString('utf8');
}

function readOctal(buffer: Buffer, offset: number, length: number): number {
  const text = buffer.subarray(offset, offset + length).toString('ascii').replace(/\0.*$/s, '').trim();
  if (text === '') return 0;
  if (!/^[0-7]+$/.test(text)) {
    throw new UpdateFailure('archive', 'update archive has an invalid octal field');
  }
  const value = Number.parseInt(text, 8);
  if (!Number.isSafeInteger(value)) {
    throw new UpdateFailure('archive', 'update archive has an oversized field');
  }
  return value;
}

function verifyChecksum(header: Buffer): void {
  const expected = readOctal(header, 148, 8);
  let checked = 0;
  for (let index = 0; index < BLOCK; index += 1) {
    checked += index >= 148 && index < 156 ? 0x20 : (header[index] ?? 0);
  }
  if (checked !== expected) {
    throw new UpdateFailure('archive', 'update archive header checksum does not match');
  }
}

function headerName(header: Buffer): string {
  const name = readString(header, 0, 100);
  const prefix = readString(header, 345, 155);
  return prefix.length === 0 ? name : `${prefix}/${name}`;
}

function roundUp(value: number): number {
  return Math.ceil(value / BLOCK) * BLOCK;
}

function parsePax(data: Buffer): Record<string, string> {
  const fields: Record<string, string> = {};
  let offset = 0;
  while (offset < data.length) {
    const space = data.indexOf(0x20, offset);
    if (space === -1) break;
    const lengthText = data.subarray(offset, space).toString('ascii');
    if (!/^\d+$/.test(lengthText)) {
      throw new UpdateFailure('archive', 'update archive has an invalid pax header');
    }
    const length = Number(lengthText);
    if (!Number.isSafeInteger(length) || length <= 0 || offset + length > data.length) {
      throw new UpdateFailure('archive', 'update archive has an invalid pax record');
    }
    const record = data.subarray(space + 1, offset + length - 1).toString('utf8');
    const equals = record.indexOf('=');
    if (equals > 0) fields[record.slice(0, equals)] = record.slice(equals + 1);
    offset += length;
  }
  return fields;
}

function normalizeEntryPath(name: string): string | null {
  if (name.includes('\\')) {
    throw new UpdateFailure('archive', 'update archive contains a backslash path');
  }
  let path = name;
  while (path.startsWith('./')) path = path.slice(2);
  if (path === 'package' || path === 'package/' || path === '') return null;
  if (path.startsWith('/') || /^[A-Za-z]:/.test(path)) {
    throw new UpdateFailure('archive', 'update archive contains an absolute path');
  }
  if (!path.startsWith('package/')) {
    throw new UpdateFailure('archive', 'update archive entry is outside the package root');
  }
  const parts: string[] = [];
  for (const segment of path.slice('package/'.length).split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      throw new UpdateFailure('archive', 'update archive contains a parent-directory path');
    }
    if (segment.includes('\0')) {
      throw new UpdateFailure('archive', 'update archive contains a NUL path');
    }
    parts.push(segment);
  }
  if (parts.length === 0) return null;
  return parts.join('/');
}

function isInside(directory: string, target: string): boolean {
  return target === directory || target.startsWith(directory + sep);
}

function modeOf(header: Buffer): number {
  const mode = readOctal(header, 100, 8) & 0o755;
  return mode === 0 ? 0o644 : mode;
}

/**
 * Extract an npm package tarball into a fresh directory. Only regular files and
 * directories under `package/` are admitted; symlinks, hardlinks, devices,
 * absolute paths and parent-directory segments are rejected.
 */
export async function extractPackageTarball(
  gzip: Uint8Array,
  destination: string,
  options: ExtractOptions = {},
): Promise<void> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  let tar: Buffer;
  try {
    tar = gunzipSync(Buffer.from(gzip), { maxOutputLength: maxBytes });
  } catch (error) {
    throw new UpdateFailure('archive', 'update archive is not a valid gzip stream', error);
  }
  const root = resolve(destination);
  let offset = 0;
  let entries = 0;
  let total = 0;
  let pendingPath: string | undefined;
  let pendingSize: number | undefined;
  while (offset + BLOCK <= tar.length) {
    const header = tar.subarray(offset, offset + BLOCK);
    if (isZero(header)) break;
    verifyChecksum(header);
    const type = header[156] === 0 || header[156] === undefined ? '0' : String.fromCharCode(header[156]);
    const headerSize = readOctal(header, 124, 12);
    const dataStart = offset + BLOCK;
    const effectiveSize = pendingSize ?? headerSize;
    if (dataStart + effectiveSize > tar.length) {
      throw new UpdateFailure('archive', 'update archive is truncated');
    }
    if (type === 'x' || type === 'g') {
      const pax = parsePax(tar.subarray(dataStart, dataStart + headerSize));
      if (type === 'x') {
        if (pax.path !== undefined) pendingPath = pax.path;
        if (pax.size !== undefined) {
          const size = Number(pax.size);
          if (!Number.isSafeInteger(size) || size < 0) {
            throw new UpdateFailure('archive', 'update archive has an invalid pax size');
          }
          pendingSize = size;
        }
      }
      offset = dataStart + roundUp(headerSize);
      continue;
    }
    if (type === 'L') {
      pendingPath = tar.subarray(dataStart, dataStart + headerSize).toString('utf8').replace(/\0+$/s, '');
      offset = dataStart + roundUp(headerSize);
      continue;
    }
    if (type === 'K') {
      offset = dataStart + roundUp(headerSize);
      continue;
    }
    const name = pendingPath ?? headerName(header);
    pendingPath = undefined;
    pendingSize = undefined;
    const relative = normalizeEntryPath(name);
    if (relative === null) {
      offset = dataStart + roundUp(effectiveSize);
      continue;
    }
    entries += 1;
    if (entries > maxEntries) {
      throw new UpdateFailure('archive', 'update archive contains too many entries');
    }
    const target = resolve(root, relative);
    if (!isInside(root, target)) {
      throw new UpdateFailure('archive', 'update archive escapes its destination');
    }
    if (type === '5') {
      if (effectiveSize !== 0) {
        throw new UpdateFailure('archive', 'update archive directory carries content');
      }
      await mkdir(target, { recursive: true, mode: 0o755 });
    } else if (type === '0') {
      if (effectiveSize > maxFileBytes) {
        throw new UpdateFailure('archive', 'update archive contains an oversized file');
      }
      total += effectiveSize;
      if (total > maxBytes) {
        throw new UpdateFailure('archive', 'update archive expands beyond its size limit');
      }
      await mkdir(dirname(target), { recursive: true, mode: 0o755 });
      await writeFile(target, tar.subarray(dataStart, dataStart + effectiveSize), {
        mode: modeOf(header),
        flag: 'wx',
      });
    } else {
      throw new UpdateFailure('archive', `update archive contains unsupported entry type ${JSON.stringify(type)}`);
    }
    offset = dataStart + roundUp(effectiveSize);
  }
}
