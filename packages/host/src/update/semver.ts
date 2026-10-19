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

type ComparatorOperator = '>=' | '>' | '<=' | '<' | '=';

interface Comparator {
  readonly operator: ComparatorOperator;
  readonly version: ParsedVersion;
}

function makeVersion(major: number, minor: number, patch: number): ParsedVersion {
  const raw = `${major}.${minor}.${patch}`;
  return { major, minor, patch, prerelease: [], raw };
}

function sameTuple(left: ParsedVersion, right: ParsedVersion): boolean {
  return left.major === right.major && left.minor === right.minor && left.patch === right.patch;
}

function expandCaret(version: ParsedVersion): Comparator[] {
  const upper = version.major > 0
    ? makeVersion(version.major + 1, 0, 0)
    : version.minor > 0
      ? makeVersion(0, version.minor + 1, 0)
      : makeVersion(0, 0, version.patch + 1);
  return [{ operator: '>=', version }, { operator: '<', version: upper }];
}

function expandTilde(version: ParsedVersion): Comparator[] {
  return [
    { operator: '>=', version },
    { operator: '<', version: makeVersion(version.major, version.minor + 1, 0) },
  ];
}

function parseComparatorSet(text: string): Comparator[] | undefined {
  const normalized = text.trim().replace(/(>=|<=|>|<|=|\^|~)\s+/g, '$1');
  if (normalized === '') return undefined;
  if (normalized === '*') return [];
  const comparators: Comparator[] = [];
  for (const token of normalized.split(/\s+/)) {
    if (token === '*') continue;
    const match = /^(>=|<=|>|<|=|\^|~)?(.+)$/.exec(token);
    if (match === null) return undefined;
    const operator = match[1];
    const version = parseVersion(match[2]);
    if (version === undefined) return undefined;
    if (operator === undefined || operator === '=') {
      comparators.push({ operator: '=', version });
    } else if (operator === '^') {
      comparators.push(...expandCaret(version));
    } else if (operator === '~') {
      comparators.push(...expandTilde(version));
    } else if (operator === '>=' || operator === '>' || operator === '<=' || operator === '<') {
      comparators.push({ operator, version });
    } else {
      return undefined;
    }
  }
  return comparators;
}

function parseRange(range: string): Comparator[][] | undefined {
  if (typeof range !== 'string') return undefined;
  const alternatives = range.split('||');
  const sets: Comparator[][] = [];
  for (const alternative of alternatives) {
    const set = parseComparatorSet(alternative);
    if (set === undefined) return undefined;
    sets.push(set);
  }
  return sets.length === 0 ? undefined : sets;
}

function testComparator(version: ParsedVersion, comparator: Comparator): boolean {
  const order = compareVersions(version, comparator.version);
  switch (comparator.operator) {
    case '>=':
      return order >= 0;
    case '>':
      return order > 0;
    case '<=':
      return order <= 0;
    case '<':
      return order < 0;
    case '=':
      return order === 0;
  }
}

/**
 * Test a version against the small semver range subset used by `engines.dsh`:
 * comparator sets separated by `||`, with `>=`, `>`, `<=`, `<`, `=`, `^`, `~`
 * and `*`. Returns undefined when the range uses unsupported syntax, so callers
 * can distinguish "incompatible" from "could not verify".
 */
export function satisfiesRange(version: ParsedVersion | string, range: string): boolean | undefined {
  const parsed = typeof version === 'string' ? parseVersion(version) : version;
  const sets = parseRange(range);
  if (parsed === undefined || sets === undefined) return undefined;
  for (const set of sets) {
    if (!set.every((comparator) => testComparator(parsed, comparator))) continue;
    // Match node-semver's prerelease rule: a prerelease only satisfies a set
    // when a comparator with the same [major, minor, patch] also has one.
    if (parsed.prerelease.length > 0
      && !set.some((comparator) => comparator.version.prerelease.length > 0
        && sameTuple(comparator.version, parsed))) {
      continue;
    }
    return true;
  }
  return false;
}
