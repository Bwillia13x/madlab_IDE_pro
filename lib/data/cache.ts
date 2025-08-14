/**
 * Data Caching Layer for MAD LAB IDE
 * Provides in-memory and localStorage caching for data sources
 */

import { DataFrame } from './source';

export interface CacheEntry {
  key: string;
  data: DataFrame;
  timestamp: number;
  ttl: number;
  source: string;
}

export interface CacheConfig {
  maxMemoryEntries?: number;
  maxMemoryBytes?: number; // hard limit for in-memory cache
  defaultTTL?: number;
  enableLocalStorage?: boolean;
  localStoragePrefix?: string;
  cleanupInterval?: number;
}

export class DataCache {
  private memoryCache = new Map<string, CacheEntry>();
  private config: Required<CacheConfig>;
  private cleanupTimer?: NodeJS.Timeout;
  private approximateMemoryBytes = 0;

  constructor(config: CacheConfig = {}) {
    // Allow environment overrides with sane defaults
    const envMax = typeof process !== 'undefined' ? Number((process as any).env?.NEXT_PUBLIC_DATA_CACHE_MAX_ENTRIES || (process as any).env?.DATA_CACHE_MAX_ENTRIES) : undefined
    const envTtl = typeof process !== 'undefined' ? Number((process as any).env?.NEXT_PUBLIC_DATA_CACHE_TTL_MS || (process as any).env?.DATA_CACHE_TTL_MS) : undefined
    const envCleanup = typeof process !== 'undefined' ? Number((process as any).env?.NEXT_PUBLIC_DATA_CACHE_CLEANUP_MS || (process as any).env?.DATA_CACHE_CLEANUP_MS) : undefined
    const envMaxBytes = typeof process !== 'undefined' ? Number((process as any).env?.NEXT_PUBLIC_DATA_CACHE_MAX_BYTES || (process as any).env?.DATA_CACHE_MAX_BYTES) : undefined

    this.config = {
      maxMemoryEntries: Number.isFinite(envMax) && envMax! > 0 ? envMax! : 100,
      maxMemoryBytes: Number.isFinite(envMaxBytes) && envMaxBytes! > 1024 ? envMaxBytes! : 50 * 1024 * 1024, // 50MB default
      defaultTTL: Number.isFinite(envTtl) && envTtl! > 0 ? envTtl! : 300000, // 5 minutes
      enableLocalStorage: true,
      localStoragePrefix: 'madlab_cache_',
      cleanupInterval: Number.isFinite(envCleanup) && envCleanup! > 0 ? envCleanup! : 60000, // 1 minute
      ...config,
    };

    this.startCleanupTimer();
  }

  set(key: string, data: DataFrame, options: {
    ttl?: number;
    source?: string;
    memoryOnly?: boolean;
  } = {}): void {
    const ttl = options.ttl || this.config.defaultTTL;
    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      ttl,
      source: options.source || 'unknown',
    };

    const prev = this.memoryCache.get(key);
    if (prev) {
      try { this.approximateMemoryBytes -= JSON.stringify(prev).length * 2 } catch { this.approximateMemoryBytes -= 1000 }
    }
    this.memoryCache.set(key, entry);
    try { this.approximateMemoryBytes += JSON.stringify(entry).length * 2 } catch { this.approximateMemoryBytes += 1000 }

    if (this.memoryCache.size > this.config.maxMemoryEntries) {
      this.evictOldestMemoryEntry();
    }

    // Enforce memory budget (best-effort; uses approximate size)
    while (this.approximateMemoryBytes > this.config.maxMemoryBytes && this.memoryCache.size > 0) {
      this.evictOldestMemoryEntry();
    }

    if (this.config.enableLocalStorage && !options.memoryOnly && this.isLocalStorageAvailable()) {
      try {
        const serializedEntry = JSON.stringify({
          ...entry,
          data: this.serializeDataFrame(entry.data),
        });
        localStorage.setItem(this.config.localStoragePrefix + key, serializedEntry);
      } catch (error) {
        console.warn('Failed to store in localStorage:', error);
      }
    }
  }

  get(key: string): DataFrame | null {
    const memoryEntry = this.memoryCache.get(key);
    
    if (memoryEntry) {
      if (this.isEntryValid(memoryEntry)) {
        return memoryEntry.data;
      } else {
        this.memoryCache.delete(key);
      }
    }

    if (this.config.enableLocalStorage && this.isLocalStorageAvailable()) {
      try {
        const stored = localStorage.getItem(this.config.localStoragePrefix + key);
        if (stored) {
          const entry = JSON.parse(stored) as CacheEntry;
          entry.data = this.deserializeDataFrame(entry.data as any);
          
          if (this.isEntryValid(entry)) {
            this.memoryCache.set(key, entry);
            return entry.data;
          } else {
            localStorage.removeItem(this.config.localStoragePrefix + key);
          }
        }
      } catch (error) {
        console.warn('Failed to retrieve from localStorage:', error);
        try {
          localStorage.removeItem(this.config.localStoragePrefix + key);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }
    }

    return null;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    const prev = this.memoryCache.get(key);
    if (prev) {
      try { this.approximateMemoryBytes -= JSON.stringify(prev).length * 2 } catch { this.approximateMemoryBytes -= 1000 }
    }
    const hadMemoryEntry = this.memoryCache.delete(key);
    
    if (this.config.enableLocalStorage && this.isLocalStorageAvailable()) {
      try {
        localStorage.removeItem(this.config.localStoragePrefix + key);
      } catch (error) {
        console.warn('Failed to remove from localStorage:', error);
      }
    }

    return hadMemoryEntry;
  }

  clear(source?: string): void {
    if (source) {
      const keysToDelete: string[] = [];
      
      this.memoryCache.forEach((entry, key) => {
        if (entry.source === source) {
          keysToDelete.push(key);
        }
      });
      
      keysToDelete.forEach(key => this.delete(key));
    } else {
      this.memoryCache.clear();
      this.approximateMemoryBytes = 0;
      
      if (this.config.enableLocalStorage && this.isLocalStorageAvailable()) {
        try {
          const keysToRemove: string[] = [];
          
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.config.localStoragePrefix)) {
              keysToRemove.push(key);
            }
          }
          
          keysToRemove.forEach(key => localStorage.removeItem(key));
        } catch (error) {
          console.warn('Failed to clear localStorage cache:', error);
        }
      }
    }
  }

  getStats(): {
    memoryEntries: number;
    localStorageEntries: number;
    memorySize: number;
    hitRate?: number;
  } {
    let localStorageEntries = 0;
    
    if (this.config.enableLocalStorage && this.isLocalStorageAvailable()) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.config.localStoragePrefix)) {
            localStorageEntries++;
          }
        }
      } catch (error) {
        // Ignore errors when calculating stats
      }
    }

    return {
      memoryEntries: this.memoryCache.size,
      localStorageEntries,
      memorySize: this.approximateMemoryBytes || this.estimateMemorySize(),
    };
  }

  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.memoryCache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.delete(key));

    if (this.config.enableLocalStorage && this.isLocalStorageAvailable()) {
      try {
        const localKeysToRemove: string[] = [];
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.config.localStoragePrefix)) {
            try {
              const stored = localStorage.getItem(key);
              if (stored) {
                const entry = JSON.parse(stored) as CacheEntry;
                if (now - entry.timestamp > entry.ttl) {
                  localKeysToRemove.push(key);
                }
              }
            } catch (error) {
              localKeysToRemove.push(key);
            }
          }
        }
        
        localKeysToRemove.forEach(key => localStorage.removeItem(key));
      } catch (error) {
        console.warn('Failed to cleanup localStorage cache:', error);
      }
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }

  private isEntryValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  private evictOldestMemoryEntry(): void {
    let oldestKey: string | undefined;
    let oldestTimestamp = Date.now();

    this.memoryCache.forEach((entry, key) => {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private isLocalStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }

  private serializeDataFrame(dataFrame: DataFrame): any {
    return {
      columns: dataFrame.columns,
      rows: dataFrame.rows,
      metadata: {
        ...dataFrame.metadata,
        lastUpdated: dataFrame.metadata?.lastUpdated?.toISOString(),
      },
    };
  }

  private deserializeDataFrame(serialized: any): DataFrame {
    return {
      columns: serialized.columns || [],
      rows: serialized.rows || [],
      metadata: {
        ...serialized.metadata,
        lastUpdated: serialized.metadata?.lastUpdated 
          ? new Date(serialized.metadata.lastUpdated)
          : undefined,
      },
    };
  }

  private estimateMemorySize(): number {
    let size = 0;
    
    this.memoryCache.forEach(entry => {
      try {
        size += JSON.stringify(entry).length * 2;
      } catch (error) {
        size += 1000;
      }
    });

    return size;
  }
}

export const dataCache = new DataCache();

export function getCachedData(key: string): DataFrame | null {
  return dataCache.get(key);
}

export function setCachedData(
  key: string, 
  data: DataFrame, 
  options?: {
    ttl?: number;
    source?: string;
    memoryOnly?: boolean;
  }
): void {
  dataCache.set(key, data, options);
}

export function invalidateCache(key?: string, source?: string): void {
  if (key) {
    dataCache.delete(key);
  } else {
    dataCache.clear(source);
  }
}

export function getCacheStats() {
  return dataCache.getStats();
}

export function createDataSourceCacheKey(sourceId: string, query?: any): string {
  const baseKey = `datasource:${sourceId}`;
  
  if (!query) {
    return baseKey;
  }

  try {
    const queryString = JSON.stringify(query);
    return `${baseKey}:${btoa(queryString).replace(/[+/=]/g, '')}`;
  } catch (error) {
    return `${baseKey}:${Date.now()}`;
  }
}