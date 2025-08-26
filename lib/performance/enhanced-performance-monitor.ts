import { useEffect, useState, useCallback, useRef } from 'react';
import React from 'react';

interface PerformanceMetrics {
  // Core Web Vitals
  cls: number; // Cumulative Layout Shift
  fid: number; // First Input Delay
  lcp: number; // Largest Contentful Paint

  // Additional metrics
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
  loadTime: number; // Total page load time

  // Custom metrics
  widgetRenderTime: number;
  dataFetchTime: number;
  memoryUsage: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

interface PerformanceThresholds {
  excellent: { cls: 0.1, fid: 100, lcp: 1000, loadTime: 1000 };
  good: { cls: 0.25, fid: 300, lcp: 2500, loadTime: 3000 };
  fair: { cls: 0.4, fid: 500, lcp: 4000, loadTime: 5000 };
  poor: { cls: 0.5, fid: 1000, lcp: 6000, loadTime: 8000 };
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  hitRate: number;
}

export class EnhancedPerformanceMonitor {
  private static instance: EnhancedPerformanceMonitor;
  private observers: PerformanceObserver[] = [];
  private metrics: Partial<PerformanceMetrics> = {};
  private cache = new Map<string, CacheEntry<any>>();
  private cacheStats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    hitRate: 0
  };
  private thresholds: PerformanceThresholds;
  private listeners = new Set<(metrics: PerformanceMetrics) => void>();
  private slowOperations = new Map<string, number>();

  private constructor() {
    this.thresholds = {
      excellent: { cls: 0.1, fid: 100, lcp: 1000, loadTime: 1000 },
      good: { cls: 0.25, fid: 300, lcp: 2500, loadTime: 3000 },
      fair: { cls: 0.4, fid: 500, lcp: 4000, loadTime: 5000 },
      poor: { cls: 0.5, fid: 1000, lcp: 6000, loadTime: 8000 }
    };

    if (typeof window !== 'undefined') {
      this.initializeObservers();
    }
  }

  static getInstance(): EnhancedPerformanceMonitor {
    if (!EnhancedPerformanceMonitor.instance) {
      EnhancedPerformanceMonitor.instance = new EnhancedPerformanceMonitor();
    }
    return EnhancedPerformanceMonitor.instance;
  }

  private initializeObservers() {
    try {
      // Core Web Vitals observers
      this.observeCLS();
      this.observeFID();
      this.observeLCP();
      this.observeFCP();
      this.observeNavigationTiming();

      // Resource timing for assets
      this.observeResourceTiming();

      // Long tasks for main thread blocking
      this.observeLongTasks();
    } catch (error) {
      console.warn('Performance observer not supported:', error);
    }
  }

  private observeCLS() {
    try {
      let clsValue = 0;
      let sessionEntries: PerformanceEntry[] = [];

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
            sessionEntries.push(entry);
          }
        }

        this.metrics.cls = clsValue;
        this.notifyListeners();
      });

      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('CLS observation failed:', error);
    }
  }

  private observeFID() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.metrics.fid = (entry as any).processingStart - entry.startTime;
          this.notifyListeners();
        }
      });

      observer.observe({ entryTypes: ['first-input'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('FID observation failed:', error);
    }
  }

  private observeLCP() {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        this.metrics.lcp = lastEntry.startTime;
        this.notifyListeners();
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('LCP observation failed:', error);
    }
  }

  private observeFCP() {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        this.metrics.fcp = lastEntry.startTime;
        this.notifyListeners();
      });

      observer.observe({ entryTypes: ['paint'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('FCP observation failed:', error);
    }
  }

  private observeNavigationTiming() {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          const navEntry = entry as PerformanceNavigationTiming;
          this.metrics.ttfb = navEntry.responseStart - navEntry.requestStart;
          this.metrics.loadTime = navEntry.loadEventEnd - navEntry.startTime;
        }
        this.notifyListeners();
      });

      observer.observe({ entryTypes: ['navigation'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Navigation timing observation failed:', error);
    }
  }

  private observeResourceTiming() {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        let totalResourceTime = 0;

        for (const entry of entries) {
          const resourceEntry = entry as PerformanceResourceTiming;
          totalResourceTime += resourceEntry.responseEnd - resourceEntry.requestStart;
        }

        // Calculate average resource load time
        if (entries.length > 0) {
          this.metrics.dataFetchTime = totalResourceTime / entries.length;
        }
        this.notifyListeners();
      });

      observer.observe({ entryTypes: ['resource'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Resource timing observation failed:', error);
    }
  }

  private observeLongTasks() {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          const longTaskEntry = entry as any;
          this.recordSlowOperation('long-task', longTaskEntry.duration);
        }
      });

      observer.observe({ entryTypes: ['longtask'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Long task observation failed:', error);
    }
  }

  // Cache management
  setCache<T>(key: string, data: T, ttl: number = 300000): void { // 5 minutes default
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      ttl,
      accessCount: 0
    });
    this.cacheStats.size = this.cache.size;
    this.evictExpiredEntries();
  }

  getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.cacheStats.misses++;
      this.updateHitRate();
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.cacheStats.misses++;
      this.cacheStats.evictions++;
      this.cacheStats.size = this.cache.size;
      this.updateHitRate();
      return null;
    }

    entry.accessCount++;
    this.cacheStats.hits++;
    this.updateHitRate();
    return entry.data;
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheStats = { hits: 0, misses: 0, evictions: 0, size: 0, hitRate: 0 };
  }

  private evictExpiredEntries(): void {
    const now = Date.now();
    let evicted = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        evicted++;
      }
    }

    if (evicted > 0) {
      this.cacheStats.evictions += evicted;
      this.cacheStats.size = this.cache.size;
    }
  }

  private updateHitRate(): void {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    this.cacheStats.hitRate = total > 0 ? (this.cacheStats.hits / total) * 100 : 0;
  }

  // Performance metrics
  recordWidgetRenderTime(widgetType: string, renderTime: number): void {
    this.metrics.widgetRenderTime = renderTime;
    this.notifyListeners();
  }

  recordDataFetchTime(fetchTime: number): void {
    this.metrics.dataFetchTime = fetchTime;
    this.notifyListeners();
  }

  recordMemoryUsage(): void {
    if ('memory' in performance) {
      this.metrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
      this.notifyListeners();
    }
  }

  recordSlowOperation(operation: string, duration: number): void {
    const count = this.slowOperations.get(operation) || 0;
    this.slowOperations.set(operation, count + 1);

    if (duration > 100) {
      console.warn(`Slow operation detected: ${operation} took ${duration}ms`);
    }
  }

  // Connection quality monitoring
  monitorConnectionQuality(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        const downlink = connection.downlink; // Mbps
        const rtt = connection.rtt; // Round trip time in ms

        let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
        if (downlink >= 5 && rtt <= 50) quality = 'excellent';
        else if (downlink >= 2 && rtt <= 100) quality = 'good';
        else if (downlink >= 1 && rtt <= 200) quality = 'fair';
        else quality = 'poor';

        this.metrics.connectionQuality = quality;
        this.notifyListeners();
      }
    }
  }

  // Get current performance metrics
  getMetrics(): PerformanceMetrics {
    return {
      cls: this.metrics.cls || 0,
      fid: this.metrics.fid || 0,
      lcp: this.metrics.lcp || 0,
      fcp: this.metrics.fcp || 0,
      ttfb: this.metrics.ttfb || 0,
      loadTime: this.metrics.loadTime || 0,
      widgetRenderTime: this.metrics.widgetRenderTime || 0,
      dataFetchTime: this.metrics.dataFetchTime || 0,
      memoryUsage: this.metrics.memoryUsage || 0,
      connectionQuality: this.metrics.connectionQuality || 'good'
    };
  }

  getCacheStats(): CacheStats {
    return { ...this.cacheStats };
  }

  getPerformanceScore(): 'excellent' | 'good' | 'fair' | 'poor' {
    const metrics = this.getMetrics();
    const scores: ('excellent' | 'good' | 'fair' | 'poor')[] = [];

    // Calculate individual scores
    const clsScore = this.getScore(metrics.cls, 'cls');
    const fidScore = this.getScore(metrics.fid, 'fid');
    const lcpScore = this.getScore(metrics.lcp, 'lcp');
    const loadTimeScore = this.getScore(metrics.loadTime, 'loadTime');

    scores.push(clsScore, fidScore, lcpScore, loadTimeScore);

    // Return the worst score
    if (scores.includes('poor')) return 'poor';
    if (scores.includes('fair')) return 'fair';
    if (scores.includes('good')) return 'good';
    return 'excellent';
  }

  private getScore(value: number, metric: keyof PerformanceThresholds['excellent']): 'excellent' | 'good' | 'fair' | 'poor' {
    if (value <= this.thresholds.excellent[metric]) return 'excellent';
    if (value <= this.thresholds.good[metric]) return 'good';
    if (value <= this.thresholds.fair[metric]) return 'fair';
    return 'poor';
  }

  // Optimization recommendations
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.getMetrics();
    const cacheStats = this.getCacheStats();

    if (metrics.cls > this.thresholds.good.cls) {
      recommendations.push('Consider reducing layout shifts by reserving space for dynamic content');
    }

    if (metrics.lcp > this.thresholds.good.lcp) {
      recommendations.push('Optimize Largest Contentful Paint by improving image loading and reducing render-blocking resources');
    }

    if (metrics.fid > this.thresholds.good.fid) {
      recommendations.push('Reduce First Input Delay by minimizing main thread blocking and optimizing JavaScript execution');
    }

    if (cacheStats.hitRate < 50) {
      recommendations.push('Improve cache hit rate by optimizing data caching strategies');
    }

    if (metrics.memoryUsage > 50 * 1024 * 1024) { // 50MB
      recommendations.push('Monitor memory usage and consider implementing memory optimizations');
    }

    if (this.slowOperations.size > 0) {
      recommendations.push('Address slow operations detected in performance monitoring');
    }

    return recommendations;
  }

  // Event listeners
  onMetricsUpdate(listener: (metrics: PerformanceMetrics) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const metrics = this.getMetrics();
    this.listeners.forEach(listener => listener(metrics));
  }

  // Cleanup
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.listeners.clear();
    this.cache.clear();
    this.slowOperations.clear();
  }
}

// React hook for using performance monitoring
export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(() => EnhancedPerformanceMonitor.getInstance().getMetrics());
  const [cacheStats, setCacheStats] = useState<CacheStats>(() => EnhancedPerformanceMonitor.getInstance().getCacheStats());
  const monitorRef = useRef(EnhancedPerformanceMonitor.getInstance());

  useEffect(() => {
    const monitor = monitorRef.current;

    // Subscribe to metrics updates
    const unsubscribe = monitor.onMetricsUpdate((newMetrics) => {
      setMetrics(newMetrics);
      setCacheStats(monitor.getCacheStats());
    });

    // Start monitoring
    const interval = setInterval(() => {
      monitor.recordMemoryUsage();
      monitor.monitorConnectionQuality();
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const recordWidgetRenderTime = useCallback((widgetType: string, renderTime: number) => {
    monitorRef.current.recordWidgetRenderTime(widgetType, renderTime);
  }, []);

  const recordDataFetchTime = useCallback((fetchTime: number) => {
    monitorRef.current.recordDataFetchTime(fetchTime);
  }, []);

  const getPerformanceScore = useCallback(() => {
    return monitorRef.current.getPerformanceScore();
  }, []);

  const getOptimizationRecommendations = useCallback(() => {
    return monitorRef.current.getOptimizationRecommendations();
  }, []);

  return {
    metrics,
    cacheStats,
    recordWidgetRenderTime,
    recordDataFetchTime,
    getPerformanceScore,
    getOptimizationRecommendations
  };
}

// Performance optimization utilities
export class PerformanceOptimizer {
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  static memoize<T extends (...args: any[]) => any>(
    func: T,
    getKey?: (...args: Parameters<T>) => string
  ): T {
    const cache = new Map<string, ReturnType<T>>();

    return ((...args: Parameters<T>) => {
      const key = getKey ? getKey(...args) : JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key)!;
      }

      const result = func(...args);
      cache.set(key, result);
      return result;
    }) as T;
  }

  static lazyLoadComponent(importFunc: () => Promise<any>, fallback?: React.ComponentType) {
    return React.lazy(importFunc);
  }

  static preloadImage(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = src;
    });
  }

  static optimizeImage(src: string, width: number, height: number, quality: number = 80): string {
    // This would integrate with an image optimization service
    return `${src}?w=${width}&h=${height}&q=${quality}`;
  }
}
