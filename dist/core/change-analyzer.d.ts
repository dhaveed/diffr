import type { ChangeEntry, ImpactSummary, ReleaseContext, RepositoryInfo, VersionInfo } from '../types.js';
export interface ConventionalCommitParsed {
    type: string;
    scope?: string;
    isBreaking: boolean;
    description: string;
}
export declare function parseConventionalCommit(message: string): ConventionalCommitParsed | null;
export declare function analyzeChanges(entries: ChangeEntry[]): ChangeEntry[];
export declare function generateImpactSummary(entries: ChangeEntry[]): ImpactSummary;
export declare function buildReleaseContext(entries: ChangeEntry[], repository: RepositoryInfo, previousVersion: string | null, versionInfo: VersionInfo): ReleaseContext;
//# sourceMappingURL=change-analyzer.d.ts.map