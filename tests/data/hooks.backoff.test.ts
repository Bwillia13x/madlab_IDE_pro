import { describe, it, expect, vi } from 'vitest';

// Import private helpers via module path and re-exported names if needed
import { classifyError, fetchWithBackoff } from '@/lib/data/hooks';

describe('hooks backoff and error mapping', () => {
  it('classifies rate limit errors', () => {
    const res = classifyError('Rate limit exceeded: please wait');
    expect(res?.type).toBe('rateLimit');
  });

  it('aborts quickly on invalidKey', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('Invalid API key'))
      .mockResolvedValueOnce('ok');
    try {
      await fetchWithBackoff(fn, { retries: 3 });
      expect(false).toBe(true);
    } catch (e) {
      expect(fn).toHaveBeenCalledTimes(1);
    }
  });
});


