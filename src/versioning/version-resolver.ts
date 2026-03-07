import * as semver from 'semver';
import type { BumpType, VersionInfo } from '../types.js';

export interface ResolveVersionOptions {
  lastTag: string | null;
  explicitVersion?: string;
  prefix: string;
  initialVersion: string;
  bumpHint?: BumpType;
}

export function resolveVersion(options: ResolveVersionOptions): VersionInfo {
  const { lastTag, explicitVersion, prefix, initialVersion } = options;

  // Explicit version override
  if (explicitVersion) {
    const cleaned = semver.clean(explicitVersion);
    if (!cleaned) {
      throw new Error(`Invalid explicit version: ${explicitVersion}`);
    }
    return {
      version: cleaned,
      tag: `${prefix}${cleaned}`,
      bump: null,
      isInitial: false,
    };
  }

  // No previous tag — first release
  if (!lastTag) {
    const cleaned = semver.clean(initialVersion);
    if (!cleaned) {
      throw new Error(`Invalid initial version: ${initialVersion}`);
    }
    return {
      version: cleaned,
      tag: `${prefix}${cleaned}`,
      bump: null,
      isInitial: true,
    };
  }

  // Auto-increment from last tag
  const stripped = stripPrefix(lastTag, prefix);
  const parsed = semver.parse(stripped);
  if (!parsed) {
    throw new Error(`Cannot parse version from tag: ${lastTag}`);
  }

  const bump: BumpType = options.bumpHint ?? 'patch';
  const newVersion = incrementVersion(parsed.version, bump);

  return {
    version: newVersion,
    tag: `${prefix}${newVersion}`,
    bump,
    isInitial: false,
  };
}

export function stripPrefix(tag: string, prefix: string): string {
  if (prefix && tag.startsWith(prefix)) {
    return tag.slice(prefix.length);
  }
  return tag;
}

export function incrementVersion(version: string, bump: BumpType): string {
  const result = semver.inc(version, bump);
  if (!result) {
    throw new Error(`Failed to increment version ${version} by ${bump}`);
  }
  return result;
}
