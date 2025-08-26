import { EventEmitter } from 'events';
import type { PricePoint, KpiData, FinancialData } from './provider.types';

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  tags: string[];
  provider: string;
}

export interface CacheConfig {
  maxSize: number; // MB
  defaultTTL: number; // milliseconds
  cleanupInterval: number; // milliseconds
  enableCompression: boolean;
  enablePersistent: boolean;
  maxEntries: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number; // MB
  hitRate: number; // percentage
  missRate: number; // percentage
  evictionCount: number;
  compressionRatio: number;
  memoryUsage: number; // MB
}

export class IntelligentCache extends EventEmitter {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private stats: {
    hits: number;
    misses: number;
    evictions: number;
    totalRequests: number;
  };
  private cleanupTimer?: NodeJS.Timeout;
  private compressionWorker?: Worker;
  
  constructor(config: Partial<CacheConfig> = {}) {
    super();
    
    this.config = {
      maxSize: 100, // 100 MB
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      cleanupInterval: 60 * 1000, // 1 minute
      enableCompression: true,
      enablePersistent: false,
      maxEntries: 10000,
      ...config
    };
    
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0
    };
    
    this.initializeCache();
    this.startCleanupTimer();
    
    if (this.config.enablePersistent) {
      this.loadPersistentCache();
    }
  }

  private initializeCache(): void {
    // Initialize compression worker if enabled
    if (this.config.enableCompression && typeof Worker !== 'undefined') {
      try {
        this.compressionWorker = new Worker(
          URL.createObjectURL(
            new Blob([`
              self.onmessage = function(e) {
                try {
                  const compressed = JSON.stringify(e.data).length;
                  const original = new Blob([JSON.stringify(e.data)]).size;
                  const ratio = compressed / original;
                  self.postMessage({ ratio, compressed, original });
                } catch (error) {
                  self.postMessage({ error: error.message });
                }
              }
            `], { type: 'application/javascript' })
          )
        );
      } catch (error) {
        console.warn('Compression worker initialization failed:', error);
        this.config.enableCompression = false;
      }
    }
  }

  // Set a value in the cache
  set<T>(
    key: string, 
    data: T, 
    options: {
      ttl?: number;
      priority?: 'low' | 'normal' | 'high' | 'critical';
      tags?: string[];
      provider?: string;
    } = {}
  ): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: options.ttl || this.config.defaultTTL,
        accessCount: 0,
        lastAccessed: Date.now(),
        size: this.calculateSize(data),
        priority: options.priority || 'normal',
        tags: options.tags || [],
        provider: options.provider || 'unknown'
      };

      // Check if we need to evict entries before adding
      this.ensureCapacity(entry.size);
      
      this.cache.set(key, entry);
      
      // Emit cache update event
      this.emit('cache-update', { key, action: 'set', entry });
      
      // Save to persistent storage if enabled
      if (this.config.enablePersistent) {
        this.savePersistentCache();
      }
      
    } catch (error) {
      console.error('Cache set error:', error);
      this.emit('cache-error', { error, operation: 'set', key });
    }
  }

  // Get a value from the cache
  get<T>(key: string): T | null {
    try {
      this.stats.totalRequests++;
      
      const entry = this.cache.get(key);
      
      if (!entry) {
        this.stats.misses++;
        this.emit('cache-miss', { key });
        return null;
      }

      // Check if entry has expired
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        this.stats.misses++;
        this.emit('cache-expiry', { key, entry });
        return null;
      }

      // Update access statistics
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      
      this.stats.hits++;
      this.emit('cache-hit', { key, entry });
      
      return entry.data;
      
    } catch (error) {
      console.error('Cache get error:', error);
      this.emit('cache-error', { error, operation: 'get', key });
      return null;
    }
  }

  // Get multiple values by pattern or tags
  getMultiple(pattern?: string | RegExp, tags?: string[]): Array<{ key: string; entry: CacheEntry }> {
    const results: Array<{ key: string; entry: CacheEntry }> = [];
    
    for (const [key, entry] of Array.from(this.cache.entries())) {
      // Check if entry has expired
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        continue;
      }
      
      let matches = true;
      
      // Check pattern match
      if (pattern) {
        if (typeof pattern === 'string') {
          matches = matches && key.includes(pattern);
        } else {
          matches = matches && pattern.test(key);
        }
      }
      
      // Check tags match
      if (tags && tags.length > 0) {
        matches = matches && tags.some(tag => entry.tags.includes(tag));
      }
      
      if (matches) {
        results.push({ key, entry });
      }
    }
    
    return results;
  }

  // Check if a key exists and is valid
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  // Delete a specific key
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.emit('cache-update', { key, action: 'delete' });
      
      if (this.config.enablePersistent) {
        this.savePersistentCache();
      }
    }
    return deleted;
  }

  // Clear all cache entries
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.evictions += size;
    
    this.emit('cache-clear', { clearedEntries: size });
    
    if (this.config.enablePersistent) {
      this.savePersistentCache();
    }
  }

  // Clear cache entries by tags
  clearByTags(tags: string[]): number {
    let clearedCount = 0;
    
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (tags.some(tag => entry.tags.includes(tag))) {
        this.cache.delete(key);
        clearedCount++;
      }
    }
    
    if (clearedCount > 0) {
      this.stats.evictions += clearedCount;
      this.emit('cache-clear-tags', { tags, clearedEntries: clearedCount });
      
      if (this.config.enablePersistent) {
        this.savePersistentCache();
      }
    }
    
    return clearedCount;
  }

  // Clear expired entries
  clearExpired(): number {
    let clearedCount = 0;
    
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        clearedCount++;
      }
    }
    
    if (clearedCount > 0) {
      this.stats.evictions += clearedCount;
      this.emit('cache-clear-expired', { clearedEntries: clearedCount });
    }
    
    return clearedCount;
  }

  // Get cache statistics
  getStats(): CacheStats {
    const totalSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);
    
    const hitRate = this.stats.totalRequests > 0 
      ? (this.stats.hits / this.stats.totalRequests) * 100 
      : 0;
    
    const missRate = 100 - hitRate;
    
    return {
      totalEntries: this.cache.size,
      totalSize: totalSize / (1024 * 1024), // Convert to MB
      hitRate,
      missRate,
      evictionCount: this.stats.evictions,
      compressionRatio: this.calculateCompressionRatio(),
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  // Preload data for better performance
  async preload(keys: string[], loader: (key: string) => Promise<any>): Promise<void> {
    const preloadPromises = keys.map(async (key) => {
      if (!this.has(key)) {
        try {
          const data = await loader(key);
          this.set(key, data, { priority: 'high' });
        } catch (error) {
          console.warn(`Preload failed for ${key}:`, error);
        }
      }
    });
    
    await Promise.allSettled(preloadPromises);
  }

  // Warm up cache with frequently accessed data
  async warmup(patterns: Array<{ pattern: string; priority: 'low' | 'normal' | 'high' | 'critical' }>): Promise<void> {
    for (const { pattern, priority } of patterns) {
      try {
        // This would typically load data based on the pattern
        // For now, we'll just mark these as high priority
        this.emit('cache-warmup', { pattern, priority });
      } catch (error) {
        console.warn(`Warmup failed for pattern ${pattern}:`, error);
      }
    }
  }

  // Private helper methods
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private calculateSize(data: any): number {
    try {
      const jsonString = JSON.stringify(data);
      return new Blob([jsonString]).size;
    } catch (error) {
      // Fallback size estimation
      return 1024; // 1KB default
    }
  }

  private ensureCapacity(newEntrySize: number): void {
    const currentSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);
    
    const maxSizeBytes = this.config.maxSize * 1024 * 1024;
    
    if (currentSize + newEntrySize > maxSizeBytes || this.cache.size >= this.config.maxEntries) {
      this.evictEntries(newEntrySize);
    }
  }

  private evictEntries(requiredSpace: number): void {
    // Sort entries by priority and access patterns
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => {
        // Priority first (critical > high > normal > low)
        const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
        const priorityDiff = priorityOrder[b.entry.priority] - priorityOrder[a.entry.priority];
        
        if (priorityDiff !== 0) return priorityDiff;
        
        // Then by access count and recency
        const accessScore = b.entry.accessCount - a.entry.accessCount;
        if (accessScore !== 0) return accessScore;
        
        return b.entry.lastAccessed - a.entry.lastAccessed;
      });
    
    let freedSpace = 0;
    const evictedKeys: string[] = [];
    
    for (const { key, entry } of entries) {
      if (freedSpace >= requiredSpace) break;
      
      this.cache.delete(key);
      freedSpace += entry.size;
      evictedKeys.push(key);
      this.stats.evictions++;
    }
    
    if (evictedKeys.length > 0) {
      this.emit('cache-eviction', { evictedKeys, freedSpace });
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.clearExpired();
      
      // Emit cleanup event
      this.emit('cache-cleanup', { timestamp: Date.now() });
    }, this.config.cleanupInterval);
  }

  private calculateCompressionRatio(): number {
    if (!this.config.enableCompression) return 1.0;
    
    // This would calculate actual compression ratio
    // For now, return a placeholder
    return 0.8;
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage
    const totalSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);
    
    // Add overhead for Map structure
    const overhead = this.cache.size * 100; // Rough estimate
    
    return (totalSize + overhead) / (1024 * 1024); // Convert to MB
  }

  private async savePersistentCache(): Promise<void> {
    if (!this.config.enablePersistent) return;
    
    try {
      const cacheData = Array.from(this.cache.entries());
      const serialized = JSON.stringify(cacheData);
      
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('madlab_cache', serialized);
      }
    } catch (error) {
      console.warn('Failed to save persistent cache:', error);
    }
  }

  private loadPersistentCache(): void {
    if (!this.config.enablePersistent) return;
    
    try {
      if (typeof localStorage !== 'undefined') {
        const cached = localStorage.getItem('madlab_cache');
        if (cached) {
          const cacheData = JSON.parse(cached);
          
          for (const [key, entry] of cacheData) {
            // Only restore non-expired entries
            if (!this.isExpired(entry)) {
              this.cache.set(key, entry);
            }
          }
          
          console.log(`📦 Loaded ${this.cache.size} entries from persistent cache`);
        }
      }
    } catch (error) {
      console.warn('Failed to load persistent cache:', error);
    }
  }

  // Cleanup method
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    if (this.compressionWorker) {
      this.compressionWorker.terminate();
    }
    
    this.cache.clear();
    this.removeAllListeners();
    
    console.log('🗑️ Intelligent cache destroyed');
  }
}

// Export singleton instance
export const intelligentCache = new IntelligentCache();

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    intelligentCache.destroy();
  });
}

// Types are already exported as interfaces above
