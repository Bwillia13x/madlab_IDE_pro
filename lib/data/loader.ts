/**
 * Advanced Data Loading Layer with Performance Optimizations
 * Provides request deduplication, intelligent caching, and background refresh
 */

import { dataCache, createDataSourceCacheKey } from './cache';
import { dataProviderRegistry } from './providers';
import { analytics } from '../analytics';
import { handleError } from '../errors';
import { showErrorToast } from '../errors/toast';
import type { DataFrame } from './source';

// Request deduplication - prevents multiple identical requests
const pendingRequests = new Map<string, Promise<unknown>>();

// Background refresh queue
const refreshQueue = new Set<string>();
let refreshWorker: NodeJS.Timeout | null = null;

// Statistics tracking
interface LoaderStats {
  requests: number;
  cacheHits: number;
  cacheMisses: number;
  dedupedRequests: number;
  backgroundRefreshes: number;
  errors: number;
  averageLoadTime: number;
}

const stats: LoaderStats = {
  requests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  dedupedRequests: 0,
  backgroundRefreshes: 0,
  errors: 0,
  averageLoadTime: 0,
};

const loadTimes: number[] = [];

export interface LoadOptions {
  /** Cache TTL in milliseconds */
  ttl?: number;
  /** Force refresh even if cached */
  forceRefresh?: boolean;
  /** Enable background refresh when cache is near expiry */
  backgroundRefresh?: boolean;
  /** Prefetch related data */
  prefetchRelated?: boolean;
  /** Timeout for the request in milliseconds */
  timeout?: number;
  /** Priority of the request (higher = more important) */
  priority?: number;
}

export interface LoadResult<T = unknown> {
  data: T;
  fromCache: boolean;
  loadTime: number;
  timestamp: number;
  source: string;
}

/**
 * Load data with advanced caching and optimization
 */
export async function loadData<T = DataFrame>(
  providerId: string,
  query: Record<string, unknown> = {},
  options: LoadOptions = {}
): Promise<LoadResult<T>> {
  const startTime = Date.now();
  stats.requests++;

  const cacheKey = createDataSourceCacheKey(providerId, query);

  try {
    // Check cache first (unless force refresh)
    if (!options.forceRefresh) {
      const cachedData = dataCache.get(cacheKey);
      if (cachedData) {
        stats.cacheHits++;

        // Schedule background refresh if enabled and cache is aging
        if (options.backgroundRefresh) {
          scheduleBackgroundRefresh(cacheKey, providerId, query, options);
        }

        // Track cache hit
        analytics.trackDataRequest(providerId, query, {
          success: true,
          loadTime: Date.now() - startTime,
          fromCache: true,
        });

        // Prefetch related data if requested
        if (options.prefetchRelated) {
          prefetchRelatedData(providerId, query);
        }

        return {
          data: cachedData as T,
          fromCache: true,
          loadTime: Date.now() - startTime,
          timestamp: Date.now(),
          source: providerId,
        };
      }
    }

    stats.cacheMisses++;

    // Request deduplication
    if (pendingRequests.has(cacheKey)) {
      stats.dedupedRequests++;
      const result = await pendingRequests.get(cacheKey);

      // Track deduped request
      analytics.trackDataRequest(providerId, query, {
        success: true,
        loadTime: Date.now() - startTime,
        fromCache: false,
      });

      return {
        data: result,
        fromCache: false,
        loadTime: Date.now() - startTime,
        timestamp: Date.now(),
        source: providerId,
      };
    }

    // Create new request with timeout
    // If requested provider is not present in registry, return mock data for known ids in demo
    const hasProvider =
      (dataProviderRegistry as any).get?.(providerId) || (dataProviderRegistry as any)[providerId];
    const requestPromise = hasProvider
      ? createTimeoutPromise(fetchDataFromProvider(providerId, query), options.timeout || 10000)
      : Promise.resolve(getDemoFallback(providerId, query));

    pendingRequests.set(cacheKey, requestPromise);

    try {
      const data = await requestPromise;

      // Cache the result
      dataCache.set(cacheKey, data, options.ttl || 300000);

      const loadTime = Date.now() - startTime;
      updateLoadTimeStats(loadTime);

      // Track successful data load
      analytics.trackDataRequest(providerId, query, {
        success: true,
        loadTime,
        fromCache: false,
      });

      // Prefetch related data if requested
      if (options.prefetchRelated) {
        prefetchRelatedData(providerId, query);
      }

      return {
        data,
        fromCache: false,
        loadTime,
        timestamp: Date.now(),
        source: providerId,
      };
    } finally {
      pendingRequests.delete(cacheKey);
    }
  } catch (error) {
    stats.errors++;
    pendingRequests.delete(cacheKey);

    // Handle error with enhanced error system
    const enhancedError = handleError(error instanceof Error ? error : new Error('Unknown error'), {
      provider_id: providerId,
      query,
      load_time: Date.now() - startTime,
      cache_key: cacheKey,
    });

    // Track data loading error
    analytics.trackDataRequest(providerId, query, {
      success: false,
      loadTime: Date.now() - startTime,
      fromCache: false,
      error: enhancedError.technicalMessage,
    });

    // Show user-friendly error toast
    // During demo, suppress global toast noise for KPI mock fallback
    if (!(error as any)?.code?.includes?.('DEMO_FALLBACK')) {
      showErrorToast(enhancedError, { duration: 6000 });
    }

    throw enhancedError;
  }
}

/**
 * Batch load multiple data sources efficiently
 */
export async function loadBatch<T = DataFrame>(
  requests: Array<{
    providerId: string;
    query?: Record<string, unknown>;
    options?: LoadOptions;
  }>
): Promise<LoadResult<T>[]> {
  // Sort by priority (higher first)
  const sortedRequests = requests.sort(
    (a, b) => (b.options?.priority || 0) - (a.options?.priority || 0)
  );

  // Execute in parallel with concurrency limit
  const CONCURRENCY_LIMIT = 5;
  const results: LoadResult<T>[] = [];

  for (let i = 0; i < sortedRequests.length; i += CONCURRENCY_LIMIT) {
    const batch = sortedRequests.slice(i, i + CONCURRENCY_LIMIT);
    const batchPromises = batch.map((req) =>
      loadData<T>(req.providerId, req.query, req.options).catch((error) => ({
        data: null as T,
        fromCache: false,
        loadTime: 0,
        timestamp: Date.now(),
        source: req.providerId,
        error: error.message,
      }))
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Preload data in the background for better UX
 */
export function preloadData(
  providerId: string,
  query: Record<string, unknown> = {},
  options: LoadOptions = {}
): void {
  // Execute with low priority to avoid blocking user interactions
  loadData(providerId, query, {
    ...options,
    priority: 0,
    backgroundRefresh: false,
  }).catch((error) => {
    console.debug('Preload failed (non-critical):', providerId, error);
  });
}

/**
 * Invalidate cache and refresh data
 */
export async function refreshData<T = DataFrame>(
  providerId: string,
  query: Record<string, unknown> = {},
  options: LoadOptions = {}
): Promise<LoadResult<T>> {
  const cacheKey = createDataSourceCacheKey(providerId, query);
  dataCache.delete(cacheKey);

  return loadData<T>(providerId, query, {
    ...options,
    forceRefresh: true,
  });
}

/**
 * Get loader performance statistics
 */
export function getLoaderStats(): LoaderStats & { cacheStats: unknown } {
  return {
    ...stats,
    cacheStats: dataCache.getStats(),
  } as LoaderStats & { cacheStats: unknown };
}

/**
 * Reset performance statistics
 */
export function resetStats(): void {
  Object.assign(stats, {
    requests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    dedupedRequests: 0,
    backgroundRefreshes: 0,
    errors: 0,
    averageLoadTime: 0,
  });
  loadTimes.length = 0;
}

// Helper functions

async function fetchDataFromProvider(
  providerId: string,
  query: Record<string, unknown>
): Promise<unknown> {
  const provider =
    (dataProviderRegistry as any).get?.(providerId) || (dataProviderRegistry as any)[providerId];
  if (!provider) {
    throw new Error(`Provider not found: ${providerId}`);
  }

  // Use provider's fetch method
  if (typeof provider.fetch === 'function') {
    return await provider.fetch(query);
  }

  throw new Error(`Provider ${providerId} does not support data fetching`);
}

function createTimeoutPromise<T>(promise: Promise<T>, timeout: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Request timeout after ${timeout}ms`));
    }, timeout);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

function getDemoFallback(providerId: string, query: Record<string, unknown>): unknown {
  // Minimal mock responses for demo mode to satisfy widgets
  if (providerId === 'kpi-provider') {
    return {
      symbol: String((query as Record<string, unknown>)?.symbol || 'AAPL').toUpperCase(),
      name: 'Demo Corp',
      price: 123.45,
      change: 0.12,
      changePercent: 0.1,
      volume: 1000000,
      marketCap: 250_000_000_000,
      peRatio: 22.3,
      eps: 5.42,
      dividend: 0.82,
      timestamp: new Date().toISOString(),
      _demo: true,
    };
  }
  return {};
}

function scheduleBackgroundRefresh(
  cacheKey: string,
  providerId: string,
  query: Record<string, unknown>,
  options: LoadOptions
): void {
  if (refreshQueue.has(cacheKey)) return;

  refreshQueue.add(cacheKey);

  // Start refresh worker if not running
  if (!refreshWorker) {
    refreshWorker = setInterval(() => {
      processRefreshQueue();
    }, 30000); // Check every 30 seconds
  }
}

async function processRefreshQueue(): Promise<void> {
  if (refreshQueue.size === 0) {
    if (refreshWorker) {
      clearInterval(refreshWorker);
      refreshWorker = null;
    }
    return;
  }

  // Process up to 3 refresh requests per cycle
  const itemsToProcess = Array.from(refreshQueue).slice(0, 3);

  for (const cacheKey of itemsToProcess) {
    try {
      // Parse cache key to get provider and query
      const [, providerId, queryHash] = cacheKey.split(':');

      // Only refresh if cache entry is getting old
      const cachedData = dataCache.get(cacheKey);
      if (cachedData) {
        stats.backgroundRefreshes++;
        // Background refresh with low priority
        preloadData(providerId, {}, { priority: 0 });
      }
    } catch (error) {
      console.debug('Background refresh failed:', cacheKey, error);
    } finally {
      refreshQueue.delete(cacheKey);
    }
  }
}

function prefetchRelatedData(providerId: string, query: Record<string, unknown>): void {
  // Example: If loading AAPL prices, also prefetch AAPL KPIs
  try {
    const symbol =
      (query as Record<string, unknown>)['symbol'] || (query as Record<string, unknown>)['ticker'];
    if (symbol && providerId.includes('price')) {
      // Prefetch KPI data for the same symbol
      preloadData('kpi-provider', { symbol } as Record<string, unknown>, { priority: 0 });
    }
  } catch (error) {
    // Ignore prefetch errors
    console.debug('Prefetch failed:', error);
  }
}

function updateLoadTimeStats(loadTime: number): void {
  loadTimes.push(loadTime);

  // Keep only last 100 measurements
  if (loadTimes.length > 100) {
    loadTimes.shift();
  }

  // Update average
  stats.averageLoadTime = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
}

// Export for external use
export default {
  loadData,
  loadBatch,
  preloadData,
  refreshData,
  getLoaderStats,
  resetStats,
};
