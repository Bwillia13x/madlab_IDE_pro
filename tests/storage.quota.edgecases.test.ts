import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DataCache } from '@/lib/data/cache';

describe('Storage quota edge cases', () => {
  const originalLocalStorage = globalThis.localStorage;

  const createFailingLocalStorage = () => {
    return {
      setItem: vi.fn(() => {
        throw new Error('QuotaExceededError');
      }),
      getItem: vi.fn(() => {
        throw new Error('QuotaExceededError');
      }),
      removeItem: vi.fn(() => {}),
      key: vi.fn(() => null),
      get length() {
        return 0;
      },
      clear: vi.fn(() => {}),
    } as unknown as Storage;
  };

  beforeEach(() => {
    vi.stubGlobal('localStorage', createFailingLocalStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    // Ensure original is restored if needed
    if (originalLocalStorage) {
      vi.stubGlobal('localStorage', originalLocalStorage);
    }
  });

  it('continues to operate in memory when localStorage throws', () => {
    const cache = new DataCache({ ttl: 1000 });
    const df = { columns: ['a'], rows: [{ a: 1 }], metadata: { lastUpdated: new Date() } } as any;
    cache.set('key', df);

    // Should be retrievable from memory despite storage failures
    const got = cache.get<any>('key');
    expect((got?.rows as any[])?.[0]?.a).toBe(1);
  });
});
