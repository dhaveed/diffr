import type { ReleaseContext } from '../types.js';
export declare function getSystemPrompt(): string;
export declare function buildUserPrompt(context: ReleaseContext): string;
export declare function estimateTokens(text: string): number;
export declare function truncateContext(context: ReleaseContext, maxTokens: number): ReleaseContext;
