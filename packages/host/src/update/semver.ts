/** Minimal SemVer comparison for update checks. Supports stable and prerelease versions. */

export interface ParsedVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly prerelease: readonly string[];
  readonly raw: string;
}

const VERSION = /^[vV]?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

export function parseVersion(value: unknown): ParsedVersion | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  const match = VERSION.exec(text);
  if (match === null) return undefined;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if (!Number.isSafeInteger(major) || !Number.isSafeInteger(minor) || !Number.isSafeInteger(patch)) {
    return undefined;
  }
  const prerelease = match[4] === undefined ? [] : match[4].split('.');
  if (prerelease.some((part) => part.length === 0)) return undefined;
  return {
    major,
    minor,
    patch,
    prerelease,
    raw: match[4] === undefined
      ? `${major}.${minor}.${patch}`
      : `${major}.${minor}.${patch}-${match[4]}`,
  };
}

function compareIdentifier(left: string, right: string): number {
  const leftNumeric = /^\d+$/.test(left);
  const rightNumeric = /^\d+$/.test(right);
  if (leftNumeric && rightNumeric) {
    const a = Number(left);
    const b = Number(right);
    return a === b ? 0 : a < b ? -1 : 1;
  }
  if (leftNumeric) return -1;
  if (rightNumeric) return 1;
  return left === right ? 0 : left < right ? -1 : 1;
}

/** Compare two versions or version strings. Throws on an unparseable value. */
export function compareVersions(left: ParsedVersion | string, right: ParsedVersion | string): number {
  const a = typeof left === 'string' ? parseVersion(left) : left;
  const b = typeof right === 'string' ? parseVersion(right) : right;
  if (a === undefined || b === undefined) throw new TypeError('invalid semantic version');
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  if (a.prerelease.length === 0 && b.prerelease.length === 0) return 0;
  if (a.prerelease.length === 0) return 1;
  if (b.prerelease.length === 0) return -1;
  const length = Math.max(a.prerelease.length, b.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const aPart = a.prerelease[index];
    const bPart = b.prerelease[index];
    if (aPart === undefined) return -1;
    if (bPart === undefined) return 1;
    const order = compareIdentifier(aPart, bPart);
    if (order !== 0) return order;
  }
  return 0;
}

export function sameMajor(left: ParsedVersion | string, right: ParsedVersion | string): boolean {
  const a = typeof left === 'string' ? parseVersion(left) : left;
  const b = typeof right === 'string' ? parseVersion(right) : right;
  return a !== undefined && b !== undefined && a.major === b.major;
}
