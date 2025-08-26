/**
 * Advanced Data Processing Pipeline for Visualizations
 *
 * Handles data transformations, aggregations, filtering, and caching
 * for high-performance visualization rendering.
 */

import type { DataPoint, ChartSeries } from './core';

export interface DataQuery {
  symbol: string;
  timeframe: string;
  indicators?: string[];
  startDate?: Date;
  endDate?: Date;
  aggregation?: '1m' | '5m' | '15m' | '1H' | '4H' | '1D' | '1W' | '1M';
  filters?: Record<string, any>;
}

export interface ProcessedData {
  series: ChartSeries[];
  metadata: {
    symbol: string;
    timeframe: string;
    dataPoints: number;
    lastUpdated: Date;
    indicators: string[];
  };
  stats: {
    min: number;
    max: number;
    avg: number;
    volatility: number;
    trend: 'up' | 'down' | 'sideways';
  };
}

export interface IndicatorConfig {
  name: string;
  params: Record<string, any>;
  style: {
    color: string;
    lineWidth: number;
    opacity: number;
  };
}

export class DataProcessor {
  private cache = new Map<string, { data: ProcessedData; timestamp: number; ttl: number }>();
  private maxCacheSize = 50;
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Process raw data for visualization
   */
  async processData(query: DataQuery, rawData: any[]): Promise<ProcessedData> {
    const cacheKey = this.generateCacheKey(query);

    // Check cache first
    const cached = this.getCached(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Transform raw data to standardized format
      const transformedData = this.transformData(rawData, query);

      // Apply filters
      const filteredData = this.applyFilters(transformedData, query.filters);

      // Aggregate data if needed
      const aggregatedData = this.aggregateData(filteredData, query.aggregation);

      // Calculate indicators
      const indicatorData = await this.calculateIndicators(aggregatedData, query.indicators);

      // Generate chart series
      const series = this.generateSeries(indicatorData, query);

      // Calculate statistics
      const stats = this.calculateStats(aggregatedData);

      // Create metadata
      const metadata = {
        symbol: query.symbol,
        timeframe: query.timeframe,
        dataPoints: aggregatedData.length,
        lastUpdated: new Date(),
        indicators: query.indicators || []
      };

      const processedData: ProcessedData = {
        series,
        metadata,
        stats
      };

      // Cache the result
      this.setCache(cacheKey, processedData);

      return processedData;
    } catch (error) {
      console.error('Data processing failed:', error);
      throw new Error(`Failed to process data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Transform raw data to standardized DataPoint format
   */
  private transformData(rawData: any[], query: DataQuery): DataPoint[] {
    return rawData.map((item, index) => ({
      timestamp: new Date(item.timestamp || item.date || item.time),
      x: index, // Normalized x-coordinate
      y: item.close || item.price || item.value || 0,
      value: item.close || item.price || item.value || 0,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close || item.price || item.value || 0,
      volume: item.volume,
      symbol: query.symbol,
      // Additional fields that might be present
      ...item
    }));
  }

  /**
   * Apply filters to the data
   */
  private applyFilters(data: DataPoint[], filters?: Record<string, any>): DataPoint[] {
    if (!filters || Object.keys(filters).length === 0) {
      return data;
    }

    return data.filter(point => {
      return Object.entries(filters).every(([key, value]) => {
        const pointValue = (point as any)[key];
        if (value.min !== undefined && pointValue < value.min) return false;
        if (value.max !== undefined && pointValue > value.max) return false;
        if (value.equals !== undefined && pointValue !== value.equals) return false;
        if (value.in !== undefined && !value.in.includes(pointValue)) return false;
        return true;
      });
    });
  }

  /**
   * Aggregate data based on timeframe
   */
  private aggregateData(data: DataPoint[], aggregation?: string): DataPoint[] {
    if (!aggregation || aggregation === '1m') {
      return data;
    }

    const aggregated: DataPoint[] = [];
    const intervalMap = {
      '5m': 5,
      '15m': 15,
      '1H': 60,
      '4H': 240,
      '1D': 1440,
      '1W': 10080,
      '1M': 43200
    };

    const intervalMinutes = intervalMap[aggregation as keyof typeof intervalMap] || 1;
    const dataPointsPerBar = Math.max(1, Math.floor(data.length / (data.length / intervalMinutes)));

    for (let i = 0; i < data.length; i += dataPointsPerBar) {
      const chunk = data.slice(i, i + dataPointsPerBar);
      if (chunk.length > 0) {
        aggregated.push({
          timestamp: chunk[0].timestamp,
          x: i / dataPointsPerBar,
          y: chunk[chunk.length - 1].y,
          value: chunk[chunk.length - 1].value,
          open: chunk[0].open || chunk[0].value,
          high: Math.max(...chunk.map(d => d.high || d.value || 0)),
          low: Math.min(...chunk.map(d => d.low || d.value || 0)),
          close: chunk[chunk.length - 1].close || chunk[chunk.length - 1].value,
          volume: chunk.reduce((sum, d) => sum + (d.volume || 0), 0),
          symbol: chunk[0].symbol
        });
      }
    }

    return aggregated;
  }

  /**
   * Calculate technical indicators
   */
  private async calculateIndicators(data: DataPoint[], indicators: string[] = []): Promise<DataPoint[]> {
    const enhancedData = [...data];

    for (const indicator of indicators) {
      switch (indicator) {
        case 'sma':
          this.calculateSMA(enhancedData, 20);
          this.calculateSMA(enhancedData, 50);
          break;
        case 'ema':
          this.calculateEMA(enhancedData, 12);
          this.calculateEMA(enhancedData, 26);
          break;
        case 'rsi':
          this.calculateRSI(enhancedData, 14);
          break;
        case 'macd':
          this.calculateMACD(enhancedData);
          break;
        case 'bollinger':
          this.calculateBollingerBands(enhancedData, 20, 2);
          break;
        case 'volume_sma':
          this.calculateVolumeSMA(enhancedData, 20);
          break;
        default:
          console.warn(`Unknown indicator: ${indicator}`);
      }
    }

    return enhancedData;
  }

  /**
   * Calculate Simple Moving Average
   */
  private calculateSMA(data: DataPoint[], period: number): void {
    const smaKey = `sma_${period}`;
    let sum = 0;

    for (let i = 0; i < data.length; i++) {
      sum += Number(data[i].y) || 0;

      if (i >= period) {
        sum -= Number(data[i - period].y) || 0;
        (data[i] as any)[smaKey] = sum / period;
      } else {
        (data[i] as any)[smaKey] = null;
      }
    }
  }

  /**
   * Calculate Exponential Moving Average
   */
  private calculateEMA(data: DataPoint[], period: number): void {
    const emaKey = `ema_${period}`;
    const multiplier = 2 / (period + 1);
    let ema = Number(data[0]?.y) || 0;

    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        (data[i] as any)[emaKey] = data[i].y;
      } else {
        ema = ((Number(data[i].y) || 0) - ema) * multiplier + ema;
        (data[i] as any)[emaKey] = ema;
      }
    }
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  private calculateRSI(data: DataPoint[], period: number): void {
    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate price changes
    for (let i = 1; i < data.length; i++) {
      const change = (Number(data[i].y) || 0) - (Number(data[i - 1].y) || 0);
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // Calculate average gains and losses
    for (let i = period; i < data.length; i++) {
      const avgGain = gains.slice(i - period, i).reduce((sum, g) => sum + g, 0) / period;
      const avgLoss = losses.slice(i - period, i).reduce((sum, l) => sum + l, 0) / period;

      if (avgLoss === 0) {
        (data[i] as any).rsi = 100;
      } else {
        const rs = avgGain / avgLoss;
        (data[i] as any).rsi = 100 - (100 / (1 + rs));
      }
    }
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  private calculateMACD(data: DataPoint[]): void {
    const ema12 = data.map(d => (d as any).ema_12 || d.y || 0);
    const ema26 = data.map(d => (d as any).ema_26 || d.y || 0);

    for (let i = 0; i < data.length; i++) {
      const macd = ema12[i] - ema26[i];
      (data[i] as any).macd = macd;

      // Signal line (EMA of MACD)
      if (i >= 9) {
        const signalData = data.slice(i - 9, i + 1).map(d => (d as any).macd);
        (data[i] as any).macd_signal = signalData.reduce((sum, val) => sum + val, 0) / signalData.length;
        (data[i] as any).macd_histogram = macd - ((data[i] as any).macd_signal || 0);
      }
    }
  }

  /**
   * Calculate Bollinger Bands
   */
  private calculateBollingerBands(data: DataPoint[], period: number, stdDev: number): void {
    this.calculateSMA(data, period);

    for (let i = period - 1; i < data.length; i++) {
      const sma = (data[i] as any)[`sma_${period}`];
      if (sma === null) continue;

      const slice = data.slice(i - period + 1, i + 1);
      const variance = slice.reduce((sum, d) => sum + Math.pow((Number(d.y) || 0) - sma, 2), 0) / period;
      const std = Math.sqrt(variance);

      (data[i] as any).bb_upper = sma + stdDev * std;
      (data[i] as any).bb_middle = sma;
      (data[i] as any).bb_lower = sma - stdDev * std;
    }
  }

  /**
   * Calculate Volume SMA
   */
  private calculateVolumeSMA(data: DataPoint[], period: number): void {
    let sum = 0;

    for (let i = 0; i < data.length; i++) {
      sum += data[i].volume || 0;

      if (i >= period) {
        sum -= data[i - period].volume || 0;
        (data[i] as any).volume_sma = sum / period;
      } else {
        (data[i] as any).volume_sma = null;
      }
    }
  }

  /**
   * Generate chart series from processed data
   */
  private generateSeries(data: DataPoint[], query: DataQuery): ChartSeries[] {
    const series: ChartSeries[] = [];

    // Main price series
    series.push({
      id: 'price',
      name: `${query.symbol} Price`,
      data,
      type: 'line',
      color: '#7DC8F7',
      interactive: true
    });

    // Volume series
    if (data.some(d => d.volume && d.volume > 0)) {
      const volumeData = data.map(d => ({
        ...d,
        y: (d.volume || 0) / 1000000 // Scale volume
      }));

      series.push({
        id: 'volume',
        name: 'Volume (M)',
        data: volumeData,
        type: 'bar',
        color: 'rgba(125, 200, 247, 0.3)',
        interactive: true
      });
    }

    // Add indicator series
    query.indicators?.forEach(indicator => {
      switch (indicator) {
        case 'sma':
          this.addIndicatorSeries(series, data, 'sma_20', 'SMA 20', '#FF6B6B');
          this.addIndicatorSeries(series, data, 'sma_50', 'SMA 50', '#4ECDC4');
          break;
        case 'ema':
          this.addIndicatorSeries(series, data, 'ema_12', 'EMA 12', '#FFD93D');
          this.addIndicatorSeries(series, data, 'ema_26', 'EMA 26', '#FF6B6B');
          break;
        case 'bollinger':
          this.addIndicatorSeries(series, data, 'bb_upper', 'BB Upper', '#45B7D1');
          this.addIndicatorSeries(series, data, 'bb_middle', 'BB Middle', '#7DC8F7');
          this.addIndicatorSeries(series, data, 'bb_lower', 'BB Lower', '#45B7D1');
          break;
      }
    });

    return series;
  }

  /**
   * Add indicator series to the series array
   */
  private addIndicatorSeries(
    series: ChartSeries[],
    data: DataPoint[],
    field: string,
    name: string,
    color: string
  ): void {
    const indicatorData = data.map(d => ({
      ...d,
      y: (d as any)[field] || 0
    })).filter(d => (d as any)[field] !== null);

    if (indicatorData.length > 0) {
      series.push({
        id: field,
        name,
        data: indicatorData,
        type: 'line',
        color,
        interactive: false,
        style: { lineWidth: 1.5, opacity: 0.8 }
      });
    }
  }

  /**
   * Calculate statistics for the dataset
   */
  private calculateStats(data: DataPoint[]): ProcessedData['stats'] {
    if (data.length === 0) {
      return { min: 0, max: 0, avg: 0, volatility: 0, trend: 'sideways' };
    }

    const values = data.map(d => Number(d.y) || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;

    // Calculate volatility (standard deviation)
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    const volatility = Math.sqrt(variance);

    // Determine trend
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const trend = secondAvg > firstAvg * 1.02 ? 'up' :
                  secondAvg < firstAvg * 0.98 ? 'down' : 'sideways';

    return { min, max, avg, volatility, trend };
  }

  /**
   * Generate cache key for data query
   */
  private generateCacheKey(query: DataQuery): string {
    return `${query.symbol}_${query.timeframe}_${query.aggregation}_${JSON.stringify(query.indicators)}_${JSON.stringify(query.filters)}`;
  }

  /**
   * Get cached data
   */
  private getCached(key: string): ProcessedData | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now > cached.timestamp + cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cached data
   */
  private setCache(key: string, data: ProcessedData, ttl = this.defaultTTL): void {
    // Implement LRU cache eviction
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hits: number; misses: number; hitRate: number } {
    // In a real implementation, you'd track hits and misses
    return {
      size: this.cache.size,
      hits: 0,
      misses: 0,
      hitRate: 0
    };
  }
}

// Export singleton instance
export const dataProcessor = new DataProcessor();
