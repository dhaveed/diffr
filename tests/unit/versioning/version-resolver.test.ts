import { describe, it, expect } from 'vitest';
import { resolveVersion, stripPrefix, incrementVersion } from '../../../src/versioning/version-resolver.js';

describe('stripPrefix', () => {
  it('strips v prefix', () => {
    expect(stripPrefix('v1.2.3', 'v')).toBe('1.2.3');
  });

  it('returns unchanged when no prefix match', () => {
    expect(stripPrefix('1.2.3', 'v')).toBe('1.2.3');
  });

  it('handles custom prefix', () => {
    expect(stripPrefix('release-1.0.0', 'release-')).toBe('1.0.0');
  });

  it('handles empty prefix', () => {
    expect(stripPrefix('v1.0.0', '')).toBe('v1.0.0');
  });
});

describe('incrementVersion', () => {
  it('increments patch', () => {
    expect(incrementVersion('1.0.0', 'patch')).toBe('1.0.1');
  });

  it('increments minor', () => {
    expect(incrementVersion('1.0.0', 'minor')).toBe('1.1.0');
  });

  it('increments major', () => {
    expect(incrementVersion('1.0.0', 'major')).toBe('2.0.0');
  });

  it('throws for invalid version', () => {
    expect(() => incrementVersion('invalid', 'patch')).toThrow();
  });
});

describe('resolveVersion', () => {
  it('uses explicit version when provided', () => {
    const result = resolveVersion({
      lastTag: 'v1.0.0',
      explicitVersion: '2.0.0',
      prefix: 'v',
      initialVersion: '0.1.0',
    });
    expect(result.version).toBe('2.0.0');
    expect(result.tag).toBe('v2.0.0');
    expect(result.bump).toBeNull();
    expect(result.isInitial).toBe(false);
  });

  it('uses initial version when no last tag', () => {
    const result = resolveVersion({
      lastTag: null,
      prefix: 'v',
      initialVersion: '0.1.0',
    });
    expect(result.version).toBe('0.1.0');
    expect(result.tag).toBe('v0.1.0');
    expect(result.isInitial).toBe(true);
  });

  it('auto-increments patch from last tag', () => {
    const result = resolveVersion({
      lastTag: 'v1.2.3',
      prefix: 'v',
      initialVersion: '0.1.0',
    });
    expect(result.version).toBe('1.2.4');
    expect(result.tag).toBe('v1.2.4');
    expect(result.bump).toBe('patch');
    expect(result.isInitial).toBe(false);
  });

  it('handles tags with custom prefix', () => {
    const result = resolveVersion({
      lastTag: 'release-1.0.0',
      prefix: 'release-',
      initialVersion: '0.1.0',
    });
    expect(result.version).toBe('1.0.1');
    expect(result.tag).toBe('release-1.0.1');
  });

  it('cleans explicit version with v prefix', () => {
    const result = resolveVersion({
      lastTag: 'v1.0.0',
      explicitVersion: 'v3.0.0',
      prefix: 'v',
      initialVersion: '0.1.0',
    });
    expect(result.version).toBe('3.0.0');
  });

  it('throws for invalid explicit version', () => {
    expect(() =>
      resolveVersion({
        lastTag: 'v1.0.0',
        explicitVersion: 'not-a-version',
        prefix: 'v',
        initialVersion: '0.1.0',
      }),
    ).toThrow('Invalid explicit version');
  });

  it('throws for unparseable last tag', () => {
    expect(() =>
      resolveVersion({
        lastTag: 'bad-tag',
        prefix: 'v',
        initialVersion: '0.1.0',
      }),
    ).toThrow('Cannot parse version');
  });

  it('throws for invalid initial version', () => {
    expect(() =>
      resolveVersion({
        lastTag: null,
        prefix: 'v',
        initialVersion: 'not-valid',
      }),
    ).toThrow('Invalid initial version');
  });
});
