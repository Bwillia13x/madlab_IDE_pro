import { describe, it, expect, vi, afterEach } from 'vitest';
import { AdvancedCache } from '@/lib/data/cache';

afterEach(() => {
  vi.useRealTimers();
});

describe('AdvancedCache', () => {
  it('sets and gets values', () => {
    const cache = new AdvancedCache({ maxSize: 10, defaultTTL: 1000 });
    cache.set('a', 123);
    expect(cache.get('a')).toBe(123);
    expect(cache.has('a')).toBe(true);
    cache.destroy();
  });

  it('respects TTL expiration', async () => {
    vi.useFakeTimers();
    const cache = new AdvancedCache({ maxSize: 10, defaultTTL: 50, cleanupInterval: 10 });
    cache.set('k', 'v');
    expect(cache.get('k')).toBe('v');
    vi.advanceTimersByTime(80);
    expect(cache.get('k')).toBeNull();
    cache.destroy();
  });

  it('evicts by LRU when full', () => {
    const cache = new AdvancedCache({ maxSize: 2, evictionStrategy: 'lru', defaultTTL: 1000 });
    cache.set('k1', 'v1');
    cache.set('k2', 'v2');
    // Access k2 so k1 becomes LRU
    expect(cache.get('k2')).toBe('v2');
    cache.set('k3', 'v3');
    expect(cache.get('k1')).toBeNull();
    cache.destroy();
  });

  it('tracks performance metrics when enabled', () => {
    const cache = new AdvancedCache({ enablePerformanceTracking: true });
    cache.set('x', 'y');
    cache.get('x');
    const stats = cache.getStats();
    expect(stats.performanceMetrics).toBeDefined();
    expect((stats.performanceMetrics as any).totalRequests).toBeGreaterThan(0);
    cache.destroy();
  });
});
