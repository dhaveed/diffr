import type { ReleaseContext } from '../types.js';
export declare function getSystemPrompt(): string;
/**
 * Strip common prompt-injection patterns from untrusted text
 * before it reaches the LLM.
 */
export declare function sanitizeForPrompt(text: string): string;
export declare function buildUserPrompt(context: ReleaseContext): string;
export declare function estimateTokens(text: string): number;
export interface TruncationResult {
    context: ReleaseContext;
    wasTruncated: boolean;
    droppedCount: number;
}
export declare function truncateContext(context: ReleaseContext, maxTokens: number): ReleaseContext;
export declare function truncateContextWithMeta(context: ReleaseContext, maxTokens: number): TruncationResult;
