import type { ImpactSummary, RepositoryInfo } from '../types.js';
export declare function formatImpactHeader(summary: ImpactSummary, newVersion: string): string;
export declare function formatCompareLink(repository: RepositoryInfo, previousVersion: string | null, newTag: string): string;
export declare function formatReleaseNotes(impactHeader: string, llmBody: string, compareLink: string): string;
//# sourceMappingURL=notes-formatter.d.ts.map