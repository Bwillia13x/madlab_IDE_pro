import { EventEmitter } from 'events';

export interface DataPoint {
  symbol: string;
  timestamp: number;
  price: number;
  volume: number;
  bid?: number;
  ask?: number;
  bidSize?: number;
  askSize?: number;
}

export interface CompressedDataPoint {
  symbol: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tradeCount: number;
}

export interface DataCache {
  raw: DataPoint[];
  compressed: CompressedDataPoint[];
  lastUpdate: number;
  cacheSize: number;
}

export interface CompressionConfig {
  timeWindow: number; // milliseconds
  maxDataPoints: number;
  compressionThreshold: number; // minimum points to trigger compression
  enableDeltaCompression: boolean;
  enableVolumeAggregation: boolean;
}

export class HighFrequencyDataHandler extends EventEmitter {
  private dataCache: { [symbol: string]: DataCache } = {};
  private compressionConfig: CompressionConfig;
  private updateQueue: Map<string, DataPoint[]> = new Map();
  private processingQueue = false;
  private compressionTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private performanceMetrics = {
    totalMessages: 0,
    compressedMessages: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageProcessingTime: 0,
    compressionRatio: 0,
  };

  constructor(config?: Partial<CompressionConfig>) {
    super();
    this.compressionConfig = {
      timeWindow: 1000, // 1 second
      maxDataPoints: 1000,
      compressionThreshold: 100,
      enableDeltaCompression: true,
      enableVolumeAggregation: true,
      ...config,
    };

    this.startCompressionTimer();
    this.startCleanupTimer();
  }

  // Data ingestion with batching
  addDataPoint(dataPoint: DataPoint): void {
    const { symbol } = dataPoint;
    
    if (!this.updateQueue.has(symbol)) {
      this.updateQueue.set(symbol, []);
    }

    this.updateQueue.get(symbol)!.push(dataPoint);
    this.performanceMetrics.totalMessages++;

    // Trigger processing if queue is getting large
    if (this.updateQueue.get(symbol)!.length >= this.compressionConfig.compressionThreshold) {
      this.processQueue();
    }
  }

  // Batch processing for performance
  private async processQueue(): Promise<void> {
    if (this.processingQueue) return;
    
    this.processingQueue = true;
    const startTime = performance.now();

    try {
      const promises: Promise<void>[] = [];

      for (const [symbol, dataPoints] of Array.from(this.updateQueue.entries())) {
        if (dataPoints.length > 0) {
          promises.push(this.processSymbolData(symbol, dataPoints));
        }
      }

      await Promise.all(promises);
      this.updateQueue.clear();

      // Update performance metrics
      const processingTime = performance.now() - startTime;
      this.performanceMetrics.averageProcessingTime = 
        (this.performanceMetrics.averageProcessingTime + processingTime) / 2;

    } catch (error) {
      console.error('Error processing data queue:', error);
      this.emit('error', error);
    } finally {
      this.processingQueue = false;
    }
  }

  // Process data for a specific symbol
  private async processSymbolData(symbol: string, dataPoints: DataPoint[]): Promise<void> {
    // Initialize cache for symbol if needed
    if (!this.dataCache[symbol]) {
      this.dataCache[symbol] = {
        raw: [],
        compressed: [],
        lastUpdate: Date.now(),
        cacheSize: 0,
      };
    }

    const cache = this.dataCache[symbol];
    
    // Add raw data points
    cache.raw.push(...dataPoints);
    
    // Maintain cache size limits
    if (cache.raw.length > this.compressionConfig.maxDataPoints) {
      const excess = cache.raw.length - this.compressionConfig.maxDataPoints;
      cache.raw.splice(0, excess);
    }

    // Compress data if threshold is met
    if (cache.raw.length >= this.compressionConfig.compressionThreshold) {
      const compressed = this.compressData(symbol, cache.raw);
      cache.compressed = compressed;
      cache.lastUpdate = Date.now();
      cache.cacheSize = this.calculateCacheSize(cache);
      
      this.performanceMetrics.compressedMessages += compressed.length;
      
      // Emit compressed data
      this.emit('compressedData', {
        symbol,
        data: compressed,
        timestamp: Date.now(),
      });
    }

    // Emit raw data for real-time applications
    this.emit('rawData', {
      symbol,
      data: dataPoints,
      timestamp: Date.now(),
    });
  }

  // Data compression algorithms
  private compressData(symbol: string, dataPoints: DataPoint[]): CompressedDataPoint[] {
    if (dataPoints.length === 0) return [];

    const compressed: CompressedDataPoint[] = [];
    const timeWindow = this.compressionConfig.timeWindow;
    let currentWindow: DataPoint[] = [];
    let windowStart = dataPoints[0].timestamp;

    for (const point of dataPoints) {
      if (point.timestamp - windowStart >= timeWindow) {
        // Compress current window
        if (currentWindow.length > 0) {
          compressed.push(this.compressWindow(currentWindow));
        }
        
        // Start new window
        currentWindow = [point];
        windowStart = point.timestamp;
      } else {
        currentWindow.push(point);
      }
    }

    // Compress final window
    if (currentWindow.length > 0) {
      compressed.push(this.compressWindow(currentWindow));
    }

    return compressed;
  }

  // Compress a time window of data points
  private compressWindow(dataPoints: DataPoint[]): CompressedDataPoint {
    const prices = dataPoints.map(p => p.price);
    const volumes = dataPoints.map(p => p.volume);
    
    return {
      symbol: dataPoints[0].symbol,
      timestamp: dataPoints[0].timestamp,
      open: prices[0],
      high: Math.max(...prices),
      low: Math.min(...prices),
      close: prices[prices.length - 1],
      volume: volumes.reduce((sum, vol) => sum + vol, 0),
      tradeCount: dataPoints.length,
    };
  }

  // Delta compression for price changes
  private compressDelta(prices: number[]): number[] {
    if (prices.length <= 1) return prices;
    
    const deltas: number[] = [prices[0]];
    for (let i = 1; i < prices.length; i++) {
      deltas.push(prices[i] - prices[i - 1]);
    }
    
    return deltas;
  }

  // Volume aggregation
  private aggregateVolume(volumes: number[], timeIntervals: number[]): number[] {
    const aggregated: number[] = [];
    let currentVolume = 0;
    let currentInterval = 0;
    
    for (let i = 0; i < volumes.length; i++) {
      if (timeIntervals[i] !== currentInterval) {
        if (currentVolume > 0) {
          aggregated.push(currentVolume);
        }
        currentVolume = volumes[i];
        currentInterval = timeIntervals[i];
      } else {
        currentVolume += volumes[i];
      }
    }
    
    if (currentVolume > 0) {
      aggregated.push(currentVolume);
    }
    
    return aggregated;
  }

  // Data retrieval with caching
  getData(symbol: string, type: 'raw' | 'compressed' = 'compressed', timeRange?: { start: number; end: number }): DataPoint[] | CompressedDataPoint[] {
    const cache = this.dataCache[symbol];
    if (!cache) {
      this.performanceMetrics.cacheMisses++;
      return [];
    }

    this.performanceMetrics.cacheHits++;
    
    if (type === 'raw') {
      let data = cache.raw;
      
      // Filter by time range if specified
      if (timeRange) {
        data = data.filter(point => 
          point.timestamp >= timeRange.start && point.timestamp <= timeRange.end
        );
      }
      
      return data;
    } else {
      let data = cache.compressed;
      
      // Filter by time range if specified
      if (timeRange) {
        data = data.filter(point => 
          point.timestamp >= timeRange.start && point.timestamp <= timeRange.end
        );
      }
      
      return data;
    }
  }

  // Real-time data streaming
  streamData(symbol: string, callback: (data: DataPoint | CompressedDataPoint) => void): () => void {
    const rawHandler = (data: { symbol: string; data: DataPoint[] }) => {
      if (data.symbol === symbol) {
        callback(data.data[0]); // Send first data point from batch
      }
    };

    const compressedHandler = (data: { symbol: string; data: CompressedDataPoint[] }) => {
      if (data.symbol === symbol) {
        callback(data.data[0]); // Send first compressed point from batch
      }
    };

    this.on('rawData', rawHandler);
    this.on('compressedData', compressedHandler);

    // Return unsubscribe function
    return () => {
      this.off('rawData', rawHandler);
      this.off('compressedData', compressedHandler);
    };
  }

  // Cache management
  private calculateCacheSize(cache: DataCache): number {
    return JSON.stringify(cache).length;
  }

  private startCompressionTimer(): void {
    this.compressionTimer = setInterval(() => {
      this.processQueue();
    }, this.compressionConfig.timeWindow);
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupCache();
    }, 60000); // Clean up every minute
  }

  private cleanupCache(): void {
    const now = Date.now();
    const maxAge = 300000; // 5 minutes

    for (const [symbol, cache] of Object.entries(this.dataCache)) {
      if (now - cache.lastUpdate > maxAge) {
        // Remove old data
        cache.raw = cache.raw.filter(point => now - point.timestamp <= maxAge);
        cache.compressed = cache.compressed.filter(point => now - point.timestamp <= maxAge);
        
        // Remove symbol if no data remains
        if (cache.raw.length === 0 && cache.compressed.length === 0) {
          delete this.dataCache[symbol];
        }
      }
    }
  }

  // Performance monitoring
  getPerformanceMetrics(): typeof this.performanceMetrics {
    return { ...this.performanceMetrics };
  }

  // Configuration updates
  updateCompressionConfig(config: Partial<CompressionConfig>): void {
    this.compressionConfig = { ...this.compressionConfig, ...config };
    
    // Restart timers with new configuration
    if (this.compressionTimer) {
      clearInterval(this.compressionTimer);
      this.startCompressionTimer();
    }
  }

  // Memory usage monitoring
  getMemoryUsage(): { totalSize: number; symbolCount: number; averageSymbolSize: number } {
    const symbolCount = Object.keys(this.dataCache).length;
    const totalSize = Object.values(this.dataCache).reduce((sum, cache) => sum + cache.cacheSize, 0);
    
    return {
      totalSize,
      symbolCount,
      averageSymbolSize: symbolCount > 0 ? totalSize / symbolCount : 0,
    };
  }

  // Data export for analysis
  exportData(symbol: string, format: 'json' | 'csv' = 'json'): string {
    const cache = this.dataCache[symbol];
    if (!cache) return '';

    if (format === 'csv') {
      const headers = 'timestamp,open,high,low,close,volume,tradeCount\n';
      const rows = cache.compressed.map(point => 
        `${point.timestamp},${point.open},${point.high},${point.low},${point.close},${point.volume},${point.tradeCount}`
      ).join('\n');
      return headers + rows;
    } else {
      return JSON.stringify(cache.compressed, null, 2);
    }
  }

  // Cleanup and destruction
  destroy(): void {
    if (this.compressionTimer) {
      clearInterval(this.compressionTimer);
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.dataCache = {};
    this.updateQueue.clear();
    this.removeAllListeners();
  }
}

// Singleton instance
export const highFrequencyHandler = new HighFrequencyDataHandler();

// Export for use in other modules
export default highFrequencyHandler;