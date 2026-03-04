export interface RetryOptions {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    retryOn?: (error: unknown) => boolean;
}
export declare function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
//# sourceMappingURL=retry.d.ts.map