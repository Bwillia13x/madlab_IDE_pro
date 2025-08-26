/**
 * Performance optimization and caching system for production use.
 * Includes intelligent caching, performance monitoring, and optimization strategies.
 */

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  tags: string[];
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  averageAccessTime: number;
  memoryUsage: number;
  maxMemory: number;
}

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  category: 'memory' | 'cpu' | 'network' | 'database' | 'cache' | 'custom';
  metadata: Record<string, unknown>;
}

export interface OptimizationStrategy {
  id: string;
  name: string;
  description: string;
  category: string;
  conditions: (metrics: PerformanceMetric[]) => boolean;
  action: () => Promise<boolean>;
  priority: number;
  lastRun?: number;
  runInterval: number; // milliseconds
}

export class PerformanceOptimizer {
  private cache: Map<string, CacheEntry> = new Map();
  private metrics: PerformanceMetric[] = [];
  private strategies: OptimizationStrategy[] = [];
  private maxCacheSize = 100 * 1024 * 1024; // 100MB
  private maxCacheEntries = 1000;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalAccesses: 0,
  };

  constructor() {
    this.initializeDefaultStrategies();
    this.startPerformanceMonitoring();
  }

  /**
   * Initialize default optimization strategies
   */
  private initializeDefaultStrategies(): void {
    // Memory optimization
    this.addStrategy({
      id: 'memory_cleanup',
      name: 'Memory Cleanup',
      description: 'Clean up unused cache entries when memory usage is high',
      category: 'memory',
      conditions: (metrics) => {
        const memoryMetric = metrics.find(m => m.name === 'memory_usage');
        return !!(memoryMetric && memoryMetric.value > 80); // 80% memory usage
      },
      action: async () => {
        try {
          await this.cleanupCache();
          return true;
        } catch {
          return false;
        }
      },
      priority: 1,
      runInterval: 5 * 60 * 1000, // 5 minutes
    });

    // Cache optimization
    this.addStrategy({
      id: 'cache_optimization',
      name: 'Cache Optimization',
      description: 'Optimize cache by removing least accessed entries',
      category: 'cache',
      conditions: (metrics) => {
        const hitRateMetric = metrics.find(m => m.name === 'cache_hit_rate');
        return !!(hitRateMetric && hitRateMetric.value < 70); // 70% hit rate
      },
      action: async () => {
        try {
          await this.optimizeCache();
          return true;
        } catch {
          return false;
        }
      },
      priority: 2,
      runInterval: 10 * 60 * 1000, // 10 minutes
    });

    // Performance monitoring
    this.addStrategy({
      id: 'performance_alert',
      name: 'Performance Alert',
      description: 'Alert when performance metrics degrade',
      category: 'monitoring',
      conditions: (metrics) => {
        const responseTimeMetric = metrics.find(m => m.name === 'average_response_time');
        return !!(responseTimeMetric && responseTimeMetric.value > 1000); // 1 second
      },
      action: async () => {
        try {
          console.warn('🚨 Performance degradation detected!');
          return true;
        } catch {
          return false;
        }
      },
      priority: 3,
      runInterval: 1 * 60 * 1000, // 1 minute
    });
  }

  /**
   * Add a new optimization strategy
   */
  addStrategy(strategy: OptimizationStrategy): void {
    this.strategies.push(strategy);
    // Sort by priority (lower number = higher priority)
    this.strategies.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Cache a value with intelligent expiration
   */
  setCache<T>(
    key: string,
    value: T,
    options: {
      ttl?: number; // Time to live in milliseconds
      priority?: CacheEntry['priority'];
      tags?: string[];
      size?: number;
    } = {}
  ): void {
    const now = Date.now();
    const ttl = options.ttl || 5 * 60 * 1000; // 5 minutes default
    const size = options.size || this.estimateSize(value);
    
    // Check if we need to evict entries
    if (this.shouldEvict(size)) {
      this.evictEntries(size);
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: now,
      expiresAt: now + ttl,
      accessCount: 0,
      lastAccessed: now,
      size,
      priority: options.priority || 'normal',
      tags: options.tags || [],
    };

    this.cache.set(key, entry);
  }

  /**
   * Get a value from cache
   */
  getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.stats.totalAccesses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.totalAccesses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    this.stats.totalAccesses++;

    return entry.value as T;
  }

  /**
   * Check if a key exists in cache
   */
  hasCache(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? Date.now() <= entry.expiresAt : false;
  }

  /**
   * Remove a specific cache entry
   */
  removeCache(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clearCache(): void {
    this.cache.clear();
    this.stats.evictions += this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    const totalEntries = this.cache.size;
    const totalSize = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);
    const hitRate = this.stats.totalAccesses > 0 ? (this.stats.hits / this.stats.totalAccesses) * 100 : 0;
    const missRate = 100 - hitRate;
    
    return {
      totalEntries,
      totalSize,
      hitRate,
      missRate,
      evictionCount: this.stats.evictions,
      averageAccessTime: this.calculateAverageAccessTime(),
      memoryUsage: totalSize,
      maxMemory: this.maxCacheSize,
    };
  }

  /**
   * Estimate the size of a value in bytes
   */
  private estimateSize(value: unknown): number {
    try {
      const serialized = JSON.stringify(value);
      return new Blob([serialized]).size;
    } catch {
      return 1024; // Default size if serialization fails
    }
  }

  /**
   * Check if we need to evict entries
   */
  private shouldEvict(requiredSize: number): boolean {
    const currentSize = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);
    return currentSize + requiredSize > this.maxCacheSize || this.cache.size >= this.maxCacheEntries;
  }

  /**
   * Evict cache entries to make space
   */
  private evictEntries(requiredSize: number): void {
    const entries = Array.from(this.cache.values());
    
    // Sort by priority and access patterns
    entries.sort((a, b) => {
      // Critical entries last
      if (a.priority === 'critical' && b.priority !== 'critical') return 1;
      if (b.priority === 'critical' && a.priority !== 'critical') return -1;
      
      // Then by access count and last access time
      const aScore = a.accessCount * 0.7 + (Date.now() - a.lastAccessed) * 0.3;
      const bScore = b.accessCount * 0.7 + (Date.now() - b.lastAccessed) * 0.3;
      
      return aScore - bScore;
    });

    let freedSize = 0;
    const toEvict: string[] = [];

    for (const entry of entries) {
      if (freedSize >= requiredSize) break;
      
      toEvict.push(entry.key);
      freedSize += entry.size;
    }

    // Remove evicted entries
    toEvict.forEach(key => {
      this.cache.delete(key);
      this.stats.evictions++;
    });
  }

  /**
   * Clean up expired cache entries
   */
  private async cleanupCache(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.cache.delete(key);
    });

    console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
  }

  /**
   * Optimize cache by removing least accessed entries
   */
  private async optimizeCache(): Promise<void> {
    const entries = Array.from(this.cache.values());
    
    // Remove entries with low access count and old last access
    const cutoffTime = Date.now() - (30 * 60 * 1000); // 30 minutes ago
    const lowAccessEntries = entries.filter(entry => 
      entry.accessCount < 2 && entry.lastAccessed < cutoffTime
    );

    lowAccessEntries.forEach(entry => {
      this.cache.delete(entry.key);
      this.stats.evictions++;
    });

    console.log(`Optimized cache by removing ${lowAccessEntries.length} low-access entries`);
  }

  /**
   * Calculate average access time
   */
  private calculateAverageAccessTime(): number {
    const entries = Array.from(this.cache.values());
    if (entries.length === 0) return 0;
    
    const totalTime = entries.reduce((sum, entry) => sum + entry.lastAccessed, 0);
    return totalTime / entries.length;
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.collectMetrics();
      this.runOptimizationStrategies();
    }, 60 * 1000); // Every minute
  }

  /**
   * Collect performance metrics
   */
  private collectMetrics(): void {
    const now = Date.now();
    
    // Memory metrics
    this.addMetric({
      id: `memory_${now}`,
      name: 'memory_usage',
      value: this.getMemoryUsage(),
      unit: 'MB',
      timestamp: now,
      category: 'memory',
      metadata: {},
    });

    // Cache metrics
    const cacheStats = this.getCacheStats();
    this.addMetric({
      id: `cache_hit_rate_${now}`,
      name: 'cache_hit_rate',
      value: cacheStats.hitRate,
      unit: '%',
      timestamp: now,
      category: 'cache',
      metadata: {},
    });

    // Response time metrics (simulated)
    this.addMetric({
      id: `response_time_${now}`,
      name: 'average_response_time',
      value: Math.random() * 500 + 100, // 100-600ms
      unit: 'ms',
      timestamp: now,
      category: 'custom',
      metadata: {},
    });
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    // In production, use performance.memory if available
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / (1024 * 1024);
    }
    
    // Fallback to cache size estimation
    const cacheStats = this.getCacheStats();
    return cacheStats.memoryUsage / (1024 * 1024);
  }

  /**
   * Add a performance metric
   */
  addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Run optimization strategies
   */
  private async runOptimizationStrategies(): Promise<void> {
    const now = Date.now();
    
    for (const strategy of this.strategies) {
      // Check if strategy should run
      if (strategy.lastRun && (now - strategy.lastRun) < strategy.runInterval) {
        continue;
      }
      
      // Check conditions
      if (strategy.conditions(this.metrics)) {
        try {
          console.log(`Running optimization strategy: ${strategy.name}`);
          const success = await strategy.action();
          
          if (success) {
            strategy.lastRun = now;
            console.log(`Strategy ${strategy.name} completed successfully`);
          }
        } catch (error) {
          console.error(`Strategy ${strategy.name} failed:`, error);
        }
      }
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(category?: string, limit: number = 100): PerformanceMetric[] {
    let filtered = this.metrics;
    
    if (category) {
      filtered = filtered.filter(m => m.category === category);
    }
    
    return filtered.slice(-limit);
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string, limit: number = 100): PerformanceMetric[] {
    return this.metrics
      .filter(m => m.name === name)
      .slice(-limit);
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(olderThan: number): number {
    const cutoffTime = Date.now() - olderThan;
    const initialCount = this.metrics.length;
    
    this.metrics = this.metrics.filter(m => m.timestamp > cutoffTime);
    
    return initialCount - this.metrics.length;
  }

  /**
   * Get all optimization strategies
   */
  getStrategies(): OptimizationStrategy[] {
    return [...this.strategies];
  }

  /**
   * Remove an optimization strategy
   */
  removeStrategy(strategyId: string): boolean {
    const initialLength = this.strategies.length;
    this.strategies = this.strategies.filter(s => s.id !== strategyId);
    return this.strategies.length < initialLength;
  }

  /**
   * Get cache entries by tag
   */
  getCacheByTag(tag: string): Array<{ key: string; entry: CacheEntry }> {
    return Array.from(this.cache.entries())
      .filter(([_, entry]) => entry.tags.includes(tag))
      .map(([key, entry]) => ({ key, entry }));
  }

  /**
   * Invalidate cache entries by tag
   */
  invalidateCacheByTag(tag: string): number {
    const entries = this.getCacheByTag(tag);
    entries.forEach(({ key }) => this.cache.delete(key));
    return entries.length;
  }

  /**
   * Get cache entries by priority
   */
  getCacheByPriority(priority: CacheEntry['priority']): Array<{ key: string; entry: CacheEntry }> {
    return Array.from(this.cache.entries())
      .filter(([_, entry]) => entry.priority === priority)
      .map(([key, entry]) => ({ key, entry }));
  }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizer();
