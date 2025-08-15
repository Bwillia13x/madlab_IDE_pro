/**
 * Data Caching Layer for MAD LAB IDE
 * Provides in-memory and localStorage caching for data sources
 */

import { DataFrame } from './source';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
}

export class DataCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL: number;
  private readonly maxSize: number;

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || 5 * 60 * 1000; // 5 minutes default
    this.maxSize = options.maxSize || 1000; // 1000 entries default
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    };

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, entry);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(prefix?: string): void {
    if (!prefix) {
      this.cache.clear();
      return;
    }
    try {
      for (const key of Array.from(this.cache.keys())) {
        if (key.includes(prefix)) this.cache.delete(key);
      }
    } catch {
      this.cache.clear();
    }
  }

  size(): number {
    return this.cache.size;
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    let expired = 0;
    let valid = 0;

    for (const entry of this.cache.values()) {
      if (now - entry.timestamp > entry.ttl) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      total: this.cache.size,
      valid,
      expired,
      maxSize: this.maxSize,
    };
  }

  // Clean up expired entries
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  // Set multiple entries at once
  setMultiple<T>(entries: Array<{ key: string; data: T; ttl?: number }>): void {
    entries.forEach(({ key, data, ttl }) => {
      this.set(key, data, ttl);
    });
  }

  // Get multiple entries at once
  getMultiple<T>(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {};
    keys.forEach((key) => {
      result[key] = this.get<T>(key);
    });
    return result;
  }
}

// Create cache instances for different data types
export const priceCache = new DataCache({ ttl: 1 * 60 * 1000 }); // 1 minute for prices
export const kpiCache = new DataCache({ ttl: 5 * 60 * 1000 }); // 5 minutes for KPIs
export const financialsCache = new DataCache({ ttl: 24 * 60 * 60 * 1000 }); // 24 hours for financials
export const correlationCache = new DataCache({ ttl: 15 * 60 * 1000 }); // 15 minutes for correlations

// Cache key generators
export const cacheKeys = {
  prices: (symbol: string, range: string) => `prices:${symbol}:${range}`,
  kpi: (symbol: string) => `kpi:${symbol}`,
  financials: (symbol: string) => `financials:${symbol}`,
  correlation: (symbols: string[], period?: string) =>
    `correlation:${symbols.sort().join(',')}:${period || 'default'}`,
  batchQuotes: (symbols: string[]) => `batch:${symbols.sort().join(',')}`,
};

// Auto-cleanup expired entries every minute
if (typeof window !== 'undefined') {
  setInterval(() => {
    priceCache.cleanup();
    kpiCache.cleanup();
    financialsCache.cleanup();
    correlationCache.cleanup();
  }, 60 * 1000);
}

// Common, simple cache used by loader/manager
export const dataCache = new DataCache({ ttl: 5 * 60 * 1000, maxSize: 1000 });

// Convenience wrappers for common operations (legacy compatibility)
export function getCachedData<T>(key: string): T | null {
  return dataCache.get<T>(key);
}

export function setCachedData<T>(key: string, data: T, ttl?: number): void {
  dataCache.set<T>(key, data, ttl);
}

export function invalidateCache(key?: string): void {
  if (!key) {
    dataCache.clear();
    return;
  }
  dataCache.delete(key);
}

export function getCacheStats() {
  return dataCache.getStats();
}

export function createDataSourceCacheKey(providerId: string, query: unknown): string {
  try {
    const q = typeof query === 'string' ? query : JSON.stringify(query || {});
    return `prov:${providerId}:${q}`;
  } catch {
    return `prov:${providerId}:unknown`;
  }
}
