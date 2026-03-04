import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../../../src/utils/retry.js';

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on retryable errors and succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 429, message: 'rate limit' })
      .mockResolvedValue('ok');

    const result = await withRetry(fn, {
      baseDelayMs: 1,
      maxDelayMs: 5,
    });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after max attempts', async () => {
    const error = { status: 500, message: 'server error' };
    const fn = vi.fn().mockRejectedValue(error);

    await expect(
      withRetry(fn, { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 5 }),
    ).rejects.toEqual(error);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry non-retryable errors', async () => {
    const error = new Error('bad request');
    const fn = vi.fn().mockRejectedValue(error);

    await expect(
      withRetry(fn, { baseDelayMs: 1 }),
    ).rejects.toThrow('bad request');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on network errors', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue('ok');

    const result = await withRetry(fn, { baseDelayMs: 1, maxDelayMs: 5 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on 502/503/504 errors', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 502 })
      .mockRejectedValueOnce({ status: 503 })
      .mockResolvedValue('ok');

    const result = await withRetry(fn, {
      maxAttempts: 4,
      baseDelayMs: 1,
      maxDelayMs: 5,
    });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('accepts custom retryOn predicate', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('custom'))
      .mockResolvedValue('ok');

    const result = await withRetry(fn, {
      baseDelayMs: 1,
      retryOn: (err) => err instanceof Error && err.message === 'custom',
    });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('handles response.status pattern', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ response: { status: 429 } })
      .mockResolvedValue('ok');

    const result = await withRetry(fn, { baseDelayMs: 1, maxDelayMs: 5 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
