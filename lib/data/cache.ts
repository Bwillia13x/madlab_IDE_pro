export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // Size in bytes
  compressed: boolean;
  priority: 'low' | 'normal' | 'high' | 'critical';
  compressionRatio?: number; // New: track actual compression ratio
  accessPattern?: number[]; // New: track access timing patterns
}

export interface CacheOptions {
  maxSize?: number;
  defaultTTL?: number;
  cleanupInterval?: number;
  enableCompression?: boolean;
  enablePredictiveCaching?: boolean;
  maxMemoryUsage?: number; // in bytes
  evictionStrategy?: 'lru' | 'lfu' | 'hybrid' | 'priority';
  enableMetrics?: boolean; // New: enable detailed metrics collection
  enablePerformanceTracking?: boolean; // New: enable performance tracking
}

export class AdvancedCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxSize: number;
  private readonly defaultTTL: number;
  private readonly cleanupInterval: number;
  private readonly enableCompression: boolean;
  private readonly enablePredictiveCaching: boolean;
  private readonly maxMemoryUsage: number;
  private readonly evictionStrategy: 'lru' | 'lfu' | 'hybrid' | 'priority';
  private readonly enableMetrics: boolean;
  private readonly enablePerformanceTracking: boolean;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private totalMemoryUsage = 0;
  private accessPatterns = new Map<string, number[]>(); // Track access patterns for predictive caching
  
  // New: Performance tracking properties
  private performanceMetrics = {
    totalRequests: 0,
    totalHits: 0,
    totalMisses: 0,
    averageResponseTime: 0,
    responseTimeHistory: [] as number[],
    evictionCount: 0,
    compressionCount: 0,
    lastResetTime: Date.now(),
  };

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minutes
    this.cleanupInterval = options.cleanupInterval || 60 * 1000; // 1 minute
    this.enableCompression = options.enableCompression || false;
    this.enablePredictiveCaching = options.enablePredictiveCaching || false;
    this.maxMemoryUsage = options.maxMemoryUsage || 100 * 1024 * 1024; // 100MB
    this.evictionStrategy = options.evictionStrategy || 'hybrid';
    this.enableMetrics = options.enableMetrics || true;
    this.enablePerformanceTracking = options.enablePerformanceTracking || true;
    
    this.startCleanupTimer();
  }

  /**
   * Set a value in the cache with optional TTL and priority
   */
  set<T>(key: string, data: T, options: { ttl?: number; priority?: 'low' | 'normal' | 'high' | 'critical'; compress?: boolean } = {}): void {
    const startTime = performance.now();
    const { ttl, priority = 'normal', compress = this.enableCompression } = options;
    
    // Compress data if enabled and beneficial
    let processedData = data;
    let compressed = false;
    let size = this.estimateSize(data);
    let compressionRatio = 1;
    
    if (compress && size > 1024) { // Only compress if > 1KB
      try {
        const originalSize = size;
        processedData = this.compressData(data) as T;
        compressed = true;
        size = this.estimateSize(processedData);
        compressionRatio = size / originalSize;
        
        if (this.enablePerformanceTracking) {
          this.performanceMetrics.compressionCount++;
        }
      } catch {
        // Fallback to uncompressed data
        compressed = false;
        compressionRatio = 1;
      }
    }

    const entry: CacheEntry<T> = {
      data: processedData,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      accessCount: 1,
      lastAccessed: Date.now(),
      size,
      compressed,
      priority,
      compressionRatio,
      accessPattern: [],
    };

    // Check memory constraints
    while (this.totalMemoryUsage + size > this.maxMemoryUsage && this.cache.size > 0) {
      this.evictByStrategy();
    }

    // If cache is full, remove entries based on strategy
    while (this.cache.size >= this.maxSize && this.cache.size > 0) {
      this.evictByStrategy();
    }

    this.cache.set(key, entry);
    this.totalMemoryUsage += size;
    
    // Track access patterns for predictive caching
    if (this.enablePredictiveCaching) {
      this.trackAccessPattern(key);
    }

    // Track performance metrics
    if (this.enablePerformanceTracking) {
      const responseTime = performance.now() - startTime;
      this.trackResponseTime(responseTime);
    }

    // Ensure size constraints are respected after insertion
    while (this.cache.size > this.maxSize && this.cache.size > 0) {
      this.evictByStrategy();
    }
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | null {
    const startTime = performance.now();
    const entry = this.cache.get(key);
    
    if (!entry) {
      if (this.enablePerformanceTracking) {
        this.performanceMetrics.totalMisses++;
        this.performanceMetrics.totalRequests++;
        this.trackResponseTime(performance.now() - startTime);
      }
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      if (this.enablePerformanceTracking) {
        this.performanceMetrics.totalMisses++;
        this.performanceMetrics.totalRequests++;
        this.trackResponseTime(performance.now() - startTime);
      }
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    // Update access pattern
    if (entry.accessPattern) {
      entry.accessPattern.push(Date.now());
      if (entry.accessPattern.length > 10) {
        entry.accessPattern.shift();
      }
    }

    if (this.enablePerformanceTracking) {
      this.performanceMetrics.totalHits++;
      this.performanceMetrics.totalRequests++;
      this.trackResponseTime(performance.now() - startTime);
    }

    // Decompress on read if needed (simple wrapper format)
    if (entry.compressed && entry.data && typeof entry.data === 'object' && (entry.data as any).compressed && typeof (entry.data as any).data === 'string') {
      try {
        const raw = (entry.data as any).data as string;
        return JSON.parse(raw) as T;
      } catch {
        // Fallback to returning as-is
        return (entry.data as unknown) as T | null;
      }
    }

    return entry.data as T | null;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete a specific key from the cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.totalMemoryUsage -= entry.size;
    }
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
    this.totalMemoryUsage = 0;
  }

  /**
   * Get cache statistics with enhanced metrics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    totalHits: number;
    totalMisses: number;
    averageTTL: number;
    memoryUsage: number;
    maxMemoryUsage: number;
    compressionRatio: number;
    averageEntrySize: number;
    priorityDistribution: Record<string, number>;
    performanceMetrics?: {
      totalRequests: number;
      averageResponseTime: number;
      evictionCount: number;
      compressionCount: number;
      uptime: number;
      requestsPerSecond: number;
    };
  } {
    let totalHits = 0;
    let totalTTL = 0;
    let totalCompressedSize = 0;
    let totalUncompressedSize = 0;
    const priorityCounts: Record<string, number> = { low: 0, normal: 0, high: 0, critical: 0 };
    
    for (const entry of Array.from(this.cache.values())) {
      totalHits += entry.accessCount;
      totalTTL += entry.ttl;
      priorityCounts[entry.priority]++;
      
      if (entry.compressed) {
        totalCompressedSize += entry.size;
      } else {
        totalUncompressedSize += entry.size;
      }
    }

    const averageTTL = this.cache.size > 0 ? totalTTL / this.cache.size : 0;
    const totalMisses = this.cache.size; // Simplified for now
    const hitRate = totalHits > 0 ? totalHits / (totalHits + totalMisses) : 0;
    const compressionRatio = totalUncompressedSize > 0 ? totalCompressedSize / totalUncompressedSize : 1;
    const averageEntrySize = this.cache.size > 0 ? this.totalMemoryUsage / this.cache.size : 0;

    const baseStats: {
      size: number;
      maxSize: number;
      hitRate: number;
      totalHits: number;
      totalMisses: number;
      averageTTL: number;
      memoryUsage: number;
      maxMemoryUsage: number;
      compressionRatio: number;
      averageEntrySize: number;
      priorityDistribution: Record<string, number>;
      performanceMetrics?: {
        totalRequests: number;
        averageResponseTime: number;
        evictionCount: number;
        compressionCount: number;
        uptime: number;
        requestsPerSecond: number;
      };
    } = {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate,
      totalHits,
      totalMisses,
      averageTTL,
      memoryUsage: this.totalMemoryUsage,
      maxMemoryUsage: this.maxMemoryUsage,
      compressionRatio,
      averageEntrySize,
      priorityDistribution: priorityCounts,
    };

    // Add performance metrics if enabled
    if (this.enablePerformanceTracking) {
      const uptime = Date.now() - this.performanceMetrics.lastResetTime;
      const requestsPerSecond = uptime > 0 ? (this.performanceMetrics.totalRequests / uptime) * 1000 : 0;
      
      baseStats.performanceMetrics = {
        totalRequests: this.performanceMetrics.totalRequests,
        averageResponseTime: this.performanceMetrics.averageResponseTime,
        evictionCount: this.performanceMetrics.evictionCount,
        compressionCount: this.performanceMetrics.compressionCount,
        uptime,
        requestsPerSecond,
      };
    }

    return baseStats;
  }

  /**
   * Get detailed performance metrics
   */
  getDetailedPerformanceMetrics(): {
    cacheEfficiency: number;
    memoryEfficiency: number;
    compressionEfficiency: number;
    responseTimePercentiles: {
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    };
    throughputMetrics: {
      requestsPerSecond: number;
      hitsPerSecond: number;
      missesPerSecond: number;
    };
    resourceUtilization: {
      memoryUsagePercent: number;
      cacheSizePercent: number;
      compressionSavings: number;
    };
  } {
    const stats = this.getStats();
    const responseTimes = this.performanceMetrics.responseTimeHistory.sort((a, b) => a - b);
    
    // Calculate percentiles
    const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)] || 0;
    const p90 = responseTimes[Math.floor(responseTimes.length * 0.9)] || 0;
    const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)] || 0;
    const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)] || 0;

    const uptime = Date.now() - this.performanceMetrics.lastResetTime;
    const requestsPerSecond = uptime > 0 ? (this.performanceMetrics.totalRequests / uptime) * 1000 : 0;
    const hitsPerSecond = uptime > 0 ? (this.performanceMetrics.totalHits / uptime) * 1000 : 0;
    const missesPerSecond = uptime > 0 ? (this.performanceMetrics.totalMisses / uptime) * 1000 : 0;

    const memoryUsagePercent = (stats.memoryUsage / stats.maxMemoryUsage) * 100;
    const cacheSizePercent = (stats.size / stats.maxSize) * 100;
    const compressionSavings = stats.compressionRatio < 1 ? (1 - stats.compressionRatio) * 100 : 0;

    return {
      cacheEfficiency: stats.hitRate,
      memoryEfficiency: 1 - (stats.memoryUsage / stats.maxMemoryUsage),
      compressionEfficiency: compressionSavings,
      responseTimePercentiles: { p50, p90, p95, p99 },
      throughputMetrics: { requestsPerSecond, hitsPerSecond, missesPerSecond },
      resourceUtilization: { memoryUsagePercent, cacheSizePercent, compressionSavings },
    };
  }

  /**
   * Reset performance metrics
   */
  resetMetrics(): void {
    if (this.enablePerformanceTracking) {
      this.resetPerformanceMetrics();
    }
  }

  /**
   * Get cache health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const stats = this.getStats();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check memory usage
    if (stats.memoryUsage / stats.maxMemoryUsage > 0.9) {
      issues.push('Memory usage is above 90%');
      recommendations.push('Consider increasing maxMemoryUsage or implementing more aggressive eviction');
    } else if (stats.memoryUsage / stats.maxMemoryUsage > 0.7) {
      issues.push('Memory usage is above 70%');
      recommendations.push('Monitor memory usage closely');
    }

    // Check hit rate
    if (stats.hitRate < 0.5) {
      issues.push('Cache hit rate is below 50%');
      recommendations.push('Review cache TTL settings and consider increasing cache size');
    } else if (stats.hitRate < 0.7) {
      issues.push('Cache hit rate is below 70%');
      recommendations.push('Consider optimizing cache keys and TTL strategies');
    }

    // Check cache size
    if (stats.size / stats.maxSize > 0.95) {
      issues.push('Cache is nearly full');
      recommendations.push('Consider increasing maxSize or implementing more aggressive cleanup');
    }

    // Determine overall status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (issues.length > 2) {
      status = 'critical';
    } else if (issues.length > 0) {
      status = 'warning';
    }

    return { status, issues, recommendations };
  }

  /**
   * Get all keys in the cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Preload data into cache
   */
  preload<T>(entries: Array<{ key: string; data: T; ttl?: number; priority?: 'low' | 'normal' | 'high' | 'critical'; compress?: boolean }>): void {
    for (const entry of entries) {
      this.set(entry.key, entry.data, {
        ttl: entry.ttl,
        priority: entry.priority,
        compress: entry.compress,
      });
    }
  }

  /**
   * Batch get multiple keys
   */
  batchGet<T>(keys: string[]): Map<string, T | null> {
    const results = new Map<string, T | null>();
    
    for (const key of keys) {
      results.set(key, this.get<T>(key));
    }
    
    return results;
  }

  /**
   * Batch set multiple entries
   */
  batchSet<T>(entries: Array<{ key: string; data: T; ttl?: number; priority?: 'low' | 'normal' | 'high' | 'critical'; compress?: boolean }>): void {
    for (const entry of entries) {
      this.set(entry.key, entry.data, {
        ttl: entry.ttl,
        priority: entry.priority,
        compress: entry.compress,
      });
    }
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern: RegExp): number {
    let invalidatedCount = 0;
    
    for (const key of Array.from(this.cache.keys())) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }
    
    return invalidatedCount;
  }

  /**
   * Invalidate cache entries by prefix
   */
  invalidatePrefix(prefix: string): number {
    let invalidatedCount = 0;
    
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }
    
    return invalidatedCount;
  }

  /**
   * Warm up cache with frequently accessed data
   */
  warmup<T>(warmupData: Array<{ key: string; data: T; ttl?: number }>): void {
    // Sort by access frequency (if available) and preload
    const sortedData = warmupData.sort((a, b) => {
      const aEntry = this.cache.get(a.key);
      const bEntry = this.cache.get(b.key);
      
      if (!aEntry && !bEntry) return 0;
      if (!aEntry) return 1;
      if (!bEntry) return -1;
      
      return bEntry.accessCount - aEntry.accessCount;
    });

    this.preload(sortedData);
  }

  /**
   * Predictive cache warming based on access patterns
   */
  predictAndWarm(): void {
    if (!this.enablePredictiveCaching) return;
    
    const predictions = this.analyzeAccessPatterns();
    for (const prediction of predictions) {
      // Implement predictive warming logic here
      // This could involve prefetching related data or extending TTL
      console.log('Prediction:', prediction.key, prediction.confidence);
    }
  }

  /**
   * Get cache performance metrics
   */
  getPerformanceMetrics(): {
    averageResponseTime: number;
    cacheEfficiency: number;
    memoryEfficiency: number;
    compressionEfficiency: number;
  } {
    // Calculate performance metrics based on cache usage
    const stats = this.getStats();
    const memoryEfficiency = stats.memoryUsage / stats.maxMemoryUsage;
    const compressionEfficiency = 1 - stats.compressionRatio;
    
    return {
      averageResponseTime: 0.1, // Placeholder - would be measured in real implementation
      cacheEfficiency: stats.hitRate,
      memoryEfficiency,
      compressionEfficiency,
    };
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey)!;
      this.totalMemoryUsage -= entry.size;
      this.cache.delete(oldestKey);
      
      if (this.enablePerformanceTracking) {
        this.performanceMetrics.evictionCount++;
      }
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  private cleanup(): void {
    const keysToDelete: string[] = [];

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      const entry = this.cache.get(key)!;
      this.totalMemoryUsage -= entry.size;
      this.cache.delete(key);
    }
  }

  /**
   * Destroy the cache and cleanup timers
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
    this.totalMemoryUsage = 0;
    this.accessPatterns.clear();
  }

  // Private helper methods
  private estimateSize(data: unknown): number {
    try {
      const jsonString = JSON.stringify(data);
      return new Blob([jsonString]).size;
    } catch {
      return 1024; // Default size if serialization fails
    }
  }

  private compressData(data: unknown): unknown {
    try {
      const jsonString = JSON.stringify(data);
      // Simple compression - in production, use proper compression libraries
      if (jsonString.length > 1000) {
        // For demo purposes, return a compressed representation
        return { compressed: true, originalSize: jsonString.length, data: jsonString };
      }
      return data;
    } catch {
      return data; // Return original data if compression fails
    }
  }

  private trackAccessPattern(key: string): void {
    const now = Date.now();
    if (!this.accessPatterns.has(key)) {
      this.accessPatterns.set(key, []);
    }
    
    const pattern = this.accessPatterns.get(key)!;
    pattern.push(now);
    
    // Keep only last 10 access times for pattern analysis
    if (pattern.length > 10) {
      pattern.shift();
    }
  }

  private analyzeAccessPatterns(): Array<{ key: string; confidence: number; nextAccessTime: number }> {
    const predictions: Array<{ key: string; confidence: number; nextAccessTime: number }> = [];
    
    for (const [key, pattern] of Array.from(this.accessPatterns.entries())) {
      if (pattern.length >= 3) {
        // Simple pattern analysis - calculate average interval
        const intervals: number[] = [];
        for (let i = 1; i < pattern.length; i++) {
          intervals.push(pattern[i] - pattern[i - 1]);
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const lastAccess = pattern[pattern.length - 1];
        const nextAccessTime = lastAccess + avgInterval;
        const confidence = Math.min(0.9, 1 - (intervals.length > 1 ? this.calculateVariance(intervals) / avgInterval : 0));
        
        predictions.push({ key, confidence, nextAccessTime });
      }
    }
    
    return predictions.sort((a, b) => b.confidence - a.confidence);
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  private evictByStrategy(): void {
    switch (this.evictionStrategy) {
      case 'lru':
        this.evictLRU();
        break;
      case 'lfu':
        this.evictLFU();
        break;
      case 'priority':
        this.evictByPriority();
        break;
      case 'hybrid':
      default:
        this.evictHybrid();
        break;
    }
  }

  private evictLFU(): void {
    let leastFrequentKey: string | null = null;
    let leastFrequentCount = Infinity;

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.accessCount < leastFrequentCount) {
        leastFrequentCount = entry.accessCount;
        leastFrequentKey = key;
      }
    }

    if (leastFrequentKey) {
      const entry = this.cache.get(leastFrequentKey)!;
      this.totalMemoryUsage -= entry.size;
      this.cache.delete(leastFrequentKey);
      
      if (this.enablePerformanceTracking) {
        this.performanceMetrics.evictionCount++;
      }
    }
  }

  private evictByPriority(): void {
    const priorityOrder = ['low', 'normal', 'high', 'critical'];
    
    for (const priority of priorityOrder) {
      const lowPriorityEntries = Array.from(this.cache.entries())
        .filter(([_, entry]) => entry.priority === priority)
        .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
      
      if (lowPriorityEntries.length > 0) {
        const [key, entry] = lowPriorityEntries[0];
        this.totalMemoryUsage -= entry.size;
        this.cache.delete(key);
        
        if (this.enablePerformanceTracking) {
          this.performanceMetrics.evictionCount++;
        }
        return;
      }
    }
  }

  private evictHybrid(): void {
    // Combine LRU and LFU with priority weighting
    let bestEvictionKey: string | null = null;
    let bestEvictionScore = -Infinity;

    for (const [key, entry] of Array.from(this.cache.entries())) {
      const timeScore = (Date.now() - entry.lastAccessed) / 1000; // seconds since last access
      const frequencyScore = 1 / (entry.accessCount + 1); // inverse of access count
      const priorityScore = this.getPriorityScore(entry.priority);
      
      const evictionScore = timeScore * 0.4 + frequencyScore * 0.4 + priorityScore * 0.2;
      
      if (evictionScore > bestEvictionScore) {
        bestEvictionScore = evictionScore;
        bestEvictionKey = key;
      }
    }

    if (bestEvictionKey) {
      const entry = this.cache.get(bestEvictionKey)!;
      this.totalMemoryUsage -= entry.size;
      this.cache.delete(bestEvictionKey);
      
      if (this.enablePerformanceTracking) {
        this.performanceMetrics.evictionCount++;
      }
    }
  }

  private getPriorityScore(priority: string): number {
    switch (priority) {
      case 'critical': return 0;
      case 'high': return 0.3;
      case 'normal': return 0.6;
      case 'low': return 1;
      default: return 0.5;
    }
  }

  // New: Performance tracking methods
  private trackResponseTime(responseTime: number): void {
    if (!this.enablePerformanceTracking) return;

    this.performanceMetrics.responseTimeHistory.push(responseTime);
    
    // Keep only last 1000 response times to prevent memory bloat
    if (this.performanceMetrics.responseTimeHistory.length > 1000) {
      this.performanceMetrics.responseTimeHistory.shift();
    }

    // Calculate average response time
    const currentAverage = this.performanceMetrics.averageResponseTime;
    const newAverage = (currentAverage * (this.performanceMetrics.responseTimeHistory.length - 1) + responseTime) / this.performanceMetrics.responseTimeHistory.length;
    this.performanceMetrics.averageResponseTime = newAverage;
  }

  private resetPerformanceMetrics(): void {
    if (!this.enablePerformanceTracking) return;

    this.performanceMetrics.totalRequests = 0;
    this.performanceMetrics.totalHits = 0;
    this.performanceMetrics.totalMisses = 0;
    this.performanceMetrics.averageResponseTime = 0;
    this.performanceMetrics.responseTimeHistory = [];
    this.performanceMetrics.evictionCount = 0;
    this.performanceMetrics.compressionCount = 0;
    this.performanceMetrics.lastResetTime = Date.now();
  }
}

// Global cache instance for data providers
export const globalDataCache = new AdvancedCache({
  maxSize: 2000,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  cleanupInterval: 60 * 1000, // 1 minute
  enableCompression: true,
  enablePredictiveCaching: true,
  maxMemoryUsage: 200 * 1024 * 1024, // 200MB
  evictionStrategy: 'hybrid',
  enableMetrics: true,
  enablePerformanceTracking: true,
});

// Specialized caches for different data types
export const priceCache = new AdvancedCache({
  maxSize: 1000,
  defaultTTL: 1 * 60 * 1000, // 1 minute for price data
  cleanupInterval: 30 * 1000, // 30 seconds
  enableCompression: true,
  enablePredictiveCaching: true,
  maxMemoryUsage: 100 * 1024 * 1024, // 100MB
  evictionStrategy: 'lru', // Price data benefits from LRU
  enableMetrics: true,
  enablePerformanceTracking: true,
});

export const financialCache = new AdvancedCache({
  maxSize: 500,
  defaultTTL: 60 * 60 * 1000, // 1 hour for financial data
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
  enableCompression: true,
  enablePredictiveCaching: false, // Financial data is less predictable
  maxMemoryUsage: 50 * 1024 * 1024, // 50MB
  evictionStrategy: 'priority', // Financial data has clear priorities
  enableMetrics: true,
  enablePerformanceTracking: true,
});

export const kpiCache = new AdvancedCache({
  maxSize: 500,
  defaultTTL: 5 * 60 * 1000, // 5 minutes for KPI data
  cleanupInterval: 60 * 1000, // 1 minute
  enableCompression: false, // KPI data is usually small
  enablePredictiveCaching: true,
  maxMemoryUsage: 25 * 1024 * 1024, // 25MB
  evictionStrategy: 'hybrid',
  enableMetrics: true,
  enablePerformanceTracking: true,
});

// New specialized caches for enhanced performance
export const technicalIndicatorsCache = new AdvancedCache({
  maxSize: 300,
  defaultTTL: 2 * 60 * 1000, // 2 minutes for technical indicators
  cleanupInterval: 30 * 1000, // 30 seconds
  enableCompression: true,
  enablePredictiveCaching: true,
  maxMemoryUsage: 30 * 1024 * 1024, // 30MB
  evictionStrategy: 'lfu', // Technical indicators benefit from frequency-based eviction
  enableMetrics: true,
  enablePerformanceTracking: true,
});

export const sentimentCache = new AdvancedCache({
  maxSize: 200,
  defaultTTL: 10 * 60 * 1000, // 10 minutes for sentiment data
  cleanupInterval: 2 * 60 * 1000, // 2 minutes
  enableCompression: true,
  enablePredictiveCaching: true,
  maxMemoryUsage: 20 * 1024 * 1024, // 20MB
  evictionStrategy: 'hybrid',
  enableMetrics: true,
  enablePerformanceTracking: true,
});

export const newsCache = new AdvancedCache({
  maxSize: 100,
  defaultTTL: 15 * 60 * 1000, // 15 minutes for news data
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
  enableCompression: true,
  enablePredictiveCaching: false, // News is unpredictable
  maxMemoryUsage: 15 * 1024 * 1024, // 15MB
  evictionStrategy: 'lru', // News benefits from time-based eviction
  enableMetrics: true,
  enablePerformanceTracking: true,
});
