export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOn?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryOn: defaultRetryOn,
};

function defaultRetryOn(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('network') || msg.includes('econnreset') || msg.includes('etimedout')) {
      return true;
    }
  }
  if (isHttpError(error)) {
    const status = getHttpStatus(error);
    if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
      return true;
    }
  }
  return false;
}

function isHttpError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('status' in error || 'response' in error)
  );
}

function getHttpStatus(error: unknown): number | undefined {
  const err = error as Record<string, unknown>;
  if (typeof err.status === 'number') return err.status;
  if (typeof err.response === 'object' && err.response !== null) {
    const resp = err.response as Record<string, unknown>;
    if (typeof resp.status === 'number') return resp.status;
  }
  return undefined;
}

function jitteredDelay(baseMs: number, attempt: number, maxMs: number): number {
  const exponential = baseMs * Math.pow(2, attempt);
  const capped = Math.min(exponential, maxMs);
  const jitter = capped * (0.5 + Math.random() * 0.5);
  return jitter;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === opts.maxAttempts - 1 || !opts.retryOn(error)) {
        throw error;
      }
      const delay = jitteredDelay(opts.baseDelayMs, attempt, opts.maxDelayMs);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
