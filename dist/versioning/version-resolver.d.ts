import type { BumpType, VersionInfo } from '../types.js';
export interface ResolveVersionOptions {
    lastTag: string | null;
    explicitVersion?: string;
    prefix: string;
    initialVersion: string;
}
export declare function resolveVersion(options: ResolveVersionOptions): VersionInfo;
export declare function stripPrefix(tag: string, prefix: string): string;
export declare function incrementVersion(version: string, bump: BumpType): string;
