import { EventEmitter } from 'events';
import { webSocketService } from './websocketService';
import { highFrequencyHandler } from './highFrequencyHandler';

export interface ExchangeData {
  exchange: string;
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
  bid?: number;
  ask?: number;
  bidSize?: number;
  askSize?: number;
  lastUpdate: number;
  reliability: number; // 0-1 score based on data quality
}

export interface AggregatedData {
  symbol: string;
  bestBid: number;
  bestAsk: number;
  midPrice: number;
  spread: number;
  totalVolume: number;
  exchangeCount: number;
  lastUpdate: number;
  exchanges: {
    [exchange: string]: ExchangeData;
  };
  confidence: number; // Overall data confidence score
}

export interface ExchangeConfig {
  name: string;
  priority: number; // Higher priority exchanges are preferred
  weight: number; // Weight in aggregation calculations
  maxLatency: number; // Maximum acceptable latency in ms
  reliabilityThreshold: number; // Minimum reliability score
  supportedSymbols: string[];
}



interface ExchangeDataMessage {
  source: string;
  data: {
    symbol: string;
    price: string | number;
    volume: string | number;
    timestamp?: number;
    bid?: string | number;
    ask?: string | number;
    bidSize?: string | number;
    askSize?: string | number;
  };
}

interface ConnectionStatus {
  source: string;
  status: string;
}

interface QualityMetrics {
  [key: string]: unknown;
}

export class MultiExchangeAggregator extends EventEmitter {
  private exchangeData: Map<string, Map<string, ExchangeData>> = new Map();
  private aggregatedData: Map<string, AggregatedData> = new Map();
  private exchangeConfigs: Map<string, ExchangeConfig> = new Map();
  private updateTimers: Map<string, NodeJS.Timeout> = new Map();
  private exchangeLatencies: Map<string, number[]> = new Map();
  private dataQualityMetrics: Map<string, {
    totalUpdates: number;
    successfulUpdates: number;
    averageLatency: number;
    lastUpdate: number;
  }> = new Map();

  constructor() {
    super();
    this.initializeExchangeConfigs();
    this.setupWebSocketListeners();
    this.startDataQualityMonitoring();
  }

  // Initialize exchange configurations
  private initializeExchangeConfigs(): void {
    const configs: ExchangeConfig[] = [
      {
        name: 'Alpha Vantage',
        priority: 1,
        weight: 0.4,
        maxLatency: 1000,
        reliabilityThreshold: 0.8,
        supportedSymbols: ['*'],
      },
      {
        name: 'Polygon.io',
        priority: 2,
        weight: 0.35,
        maxLatency: 500,
        reliabilityThreshold: 0.9,
        supportedSymbols: ['*'],
      },
      {
        name: 'Finnhub',
        priority: 3,
        weight: 0.25,
        maxLatency: 2000,
        reliabilityThreshold: 0.7,
        supportedSymbols: ['*'],
      },
    ];

    configs.forEach(config => {
      this.exchangeConfigs.set(config.name, config);
      this.exchangeData.set(config.name, new Map());
      this.exchangeLatencies.set(config.name, []);
      this.dataQualityMetrics.set(config.name, {
        totalUpdates: 0,
        successfulUpdates: 0,
        averageLatency: 0,
        lastUpdate: 0,
      });
    });
  }

  // Setup WebSocket listeners for real-time data
  private setupWebSocketListeners(): void {
    webSocketService.on('price', (message: ExchangeDataMessage) => {
      this.processExchangeData(message.source, message.data);
    });

    webSocketService.on('trade', (message: ExchangeDataMessage) => {
      this.processExchangeData(message.source, message.data);
    });

    webSocketService.on('connection', (status: ConnectionStatus) => {
      if (status.status === 'connected') {
        this.emit('exchangeConnected', { exchange: status.source, timestamp: Date.now() });
      } else {
        this.emit('exchangeDisconnected', { exchange: status.source, timestamp: Date.now() });
      }
    });
  }

  // Process incoming exchange data
  private processExchangeData(exchange: string, data: ExchangeDataMessage['data']): void {
    const config = this.exchangeConfigs.get(exchange);
    if (!config) return;

    const startTime = performance.now();
    
    try {
      // Extract and validate data
      const exchangeData: ExchangeData = {
        exchange,
        symbol: data.symbol,
        price: parseFloat(data.price as string) || 0,
        volume: parseFloat(data.volume as string) || 0,
        timestamp: data.timestamp || Date.now(),
        bid: parseFloat(data.bid as string) || undefined,
        ask: parseFloat(data.ask as string) || undefined,
        bidSize: parseFloat(data.bidSize as string) || undefined,
        askSize: parseFloat(data.askSize as string) || undefined,
        lastUpdate: Date.now(),
        reliability: this.calculateReliability(exchange, data),
      };

      // Validate data quality
      if (exchangeData.reliability >= config.reliabilityThreshold) {
        this.updateExchangeData(exchange, exchangeData);
        this.aggregateData(exchangeData.symbol);
        
        // Update quality metrics
        this.updateQualityMetrics(exchange, startTime, true);
      } else {
        this.updateQualityMetrics(exchange, startTime, false);
      }

    } catch (error) {
      console.error(`Error processing data from ${exchange}:`, error);
      this.updateQualityMetrics(exchange, startTime, false);
    }
  }

  // Update exchange-specific data
  private updateExchangeData(exchange: string, data: ExchangeData): void {
    const exchangeMap = this.exchangeData.get(exchange);
    if (!exchangeMap) return;

    exchangeMap.set(data.symbol, data);
    
    // Emit exchange data update
    this.emit('exchangeDataUpdate', { exchange, data });
  }

  // Aggregate data from multiple exchanges
  private aggregateData(symbol: string): void {
    const exchanges = Array.from(this.exchangeData.keys());
    const validData: ExchangeData[] = [];

    // Collect valid data from all exchanges
    for (const exchange of exchanges) {
      const exchangeMap = this.exchangeData.get(exchange);
      if (!exchangeMap) continue;

      const data = exchangeMap.get(symbol);
      if (data && this.isDataValid(data)) {
        validData.push(data);
      }
    }

    if (validData.length === 0) return;

    // Calculate aggregated values
    const aggregated: AggregatedData = {
      symbol,
      bestBid: this.calculateBestBid(validData),
      bestAsk: this.calculateBestAsk(validData),
      midPrice: 0,
      spread: 0,
      totalVolume: this.calculateTotalVolume(validData),
      exchangeCount: validData.length,
      lastUpdate: Date.now(),
      exchanges: {},
      confidence: this.calculateConfidence(validData),
    };

    // Calculate mid price and spread
    if (aggregated.bestBid && aggregated.bestAsk) {
      aggregated.midPrice = (aggregated.bestBid + aggregated.bestAsk) / 2;
      aggregated.spread = aggregated.bestAsk - aggregated.bestBid;
    } else if (validData.length > 0) {
      // Use weighted average price if bid/ask not available
      aggregated.midPrice = this.calculateWeightedAveragePrice(validData);
    }

    // Build exchanges object
    validData.forEach(data => {
      aggregated.exchanges[data.exchange] = data;
    });

    // Update aggregated data
    this.aggregatedData.set(symbol, aggregated);

    // Emit aggregated data update
    this.emit('aggregatedDataUpdate', aggregated);

    // Send to high-frequency handler
    highFrequencyHandler.addDataPoint({
      symbol,
      timestamp: aggregated.lastUpdate,
      price: aggregated.midPrice,
      volume: aggregated.totalVolume,
      bid: aggregated.bestBid,
      ask: aggregated.bestAsk,
    });
  }

  // Calculate best bid across exchanges
  private calculateBestBid(data: ExchangeData[]): number {
    const bids = data
      .filter(d => d.bid !== undefined)
      .map(d => d.bid!)
      .sort((a, b) => b - a); // Sort descending (best bid first)

    return bids.length > 0 ? bids[0] : 0;
  }

  // Calculate best ask across exchanges
  private calculateBestAsk(data: ExchangeData[]): number {
    const asks = data
      .filter(d => d.ask !== undefined)
      .map(d => d.ask!)
      .sort((a, b) => a - b); // Sort ascending (best ask first)

    return asks.length > 0 ? asks[0] : 0;
  }

  // Calculate total volume across exchanges
  private calculateTotalVolume(data: ExchangeData[]): number {
    return data.reduce((sum, d) => sum + d.volume, 0);
  }

  // Calculate weighted average price
  private calculateWeightedAveragePrice(data: ExchangeData[]): number {
    let totalWeight = 0;
    let weightedSum = 0;

    data.forEach(d => {
      const config = this.exchangeConfigs.get(d.exchange);
      const weight = config ? config.weight : 1;
      totalWeight += weight;
      weightedSum += d.price * weight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  // Calculate data confidence score
  private calculateConfidence(data: ExchangeData[]): number {
    if (data.length === 0) return 0;

    const factors = [
      data.length / this.exchangeConfigs.size, // Coverage factor
      data.reduce((sum, d) => sum + d.reliability, 0) / data.length, // Average reliability
      this.calculateLatencyFactor(data), // Latency factor
      this.calculateConsistencyFactor(data), // Price consistency factor
    ];

    return factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
  }

  // Calculate latency factor
  private calculateLatencyFactor(data: ExchangeData[]): number {
    const now = Date.now();
    const latencies = data.map(d => now - d.lastUpdate);
    const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    
    // Normalize to 0-1 range (lower latency = higher score)
    return Math.max(0, 1 - avgLatency / 5000);
  }

  // Calculate price consistency factor
  private calculateConsistencyFactor(data: ExchangeData[]): number {
    if (data.length <= 1) return 1;

    const prices = data.map(d => d.price);
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    
    // Normalize to 0-1 range (lower std dev = higher consistency)
    return Math.max(0, 1 - (stdDev / mean));
  }

  // Calculate exchange-specific reliability score
  private calculateReliability(exchange: string, data: ExchangeDataMessage['data']): number {
    const config = this.exchangeConfigs.get(exchange);
    if (!config) return 0;

    let score = 1.0;

    // Check data completeness
    if (!data.price || !data.volume) score -= 0.3;
    if (!data.timestamp) score -= 0.2;

    // Check data validity
    if (Number(data.price) <= 0 || Number(data.volume) < 0) score -= 0.4;

    // Check timestamp freshness
    const age = Date.now() - (data.timestamp || Date.now());
    if (age > config.maxLatency) score -= 0.3;

    return Math.max(0, score);
  }

  // Validate data quality
  private isDataValid(data: ExchangeData): boolean {
    const config = this.exchangeConfigs.get(data.exchange);
    if (!config) return false;

    return (
      data.reliability >= config.reliabilityThreshold &&
      data.price > 0 &&
      data.volume >= 0 &&
      (Date.now() - data.lastUpdate) <= config.maxLatency
    );
  }

  // Update quality metrics for an exchange
  private updateQualityMetrics(exchange: string, startTime: number, success: boolean): void {
    const metrics = this.dataQualityMetrics.get(exchange);
    if (!metrics) return;

    const latency = performance.now() - startTime;
    
    metrics.totalUpdates++;
    if (success) metrics.successfulUpdates++;
    
    // Update average latency
    metrics.averageLatency = (metrics.averageLatency + latency) / 2;
    metrics.lastUpdate = Date.now();

    // Update exchange latencies
    const latencies = this.exchangeLatencies.get(exchange) || [];
    latencies.push(latency);
    if (latencies.length > 100) latencies.shift(); // Keep last 100 measurements
    this.exchangeLatencies.set(exchange, latencies);
  }

  // Start data quality monitoring
  private startDataQualityMonitoring(): void {
    setInterval(() => {
      this.emit('qualityMetrics', this.getQualityMetrics());
    }, 30000); // Every 30 seconds
  }

  // Get aggregated data for a symbol
  getAggregatedData(symbol: string): AggregatedData | undefined {
    return this.aggregatedData.get(symbol);
  }

  // Get all aggregated data
  getAllAggregatedData(): AggregatedData[] {
    return Array.from(this.aggregatedData.values());
  }

  // Get exchange data for a symbol
  getExchangeData(symbol: string): Map<string, ExchangeData> | undefined {
    const result = new Map<string, ExchangeData>();
    
    for (const [exchange, exchangeMap] of Array.from(this.exchangeData.entries())) {
      const data = exchangeMap.get(symbol);
      if (data) {
        result.set(exchange, data);
      }
    }
    
    return result.size > 0 ? result : undefined;
  }

  // Get quality metrics
  getQualityMetrics(): Map<string, QualityMetrics> {
    const metrics = new Map<string, QualityMetrics>();
    
    for (const [exchange, quality] of Array.from(this.dataQualityMetrics.entries())) {
      const latencies = this.exchangeLatencies.get(exchange) || [];
      const config = this.exchangeConfigs.get(exchange);
      
      metrics.set(exchange, {
        ...quality,
        successRate: quality.totalUpdates > 0 ? quality.successfulUpdates / quality.totalUpdates : 0,
        currentLatency: latencies.length > 0 ? latencies[latencies.length - 1] : 0,
        config: config ? {
          priority: config.priority,
          weight: config.weight,
          maxLatency: config.maxLatency,
          reliabilityThreshold: config.reliabilityThreshold,
        } : null,
      });
    }
    
    return metrics;
  }

  // Subscribe to symbol updates
  subscribeToSymbol(symbol: string): () => void {
    // Ensure WebSocket is connected
    if (!webSocketService.getConnectionStatus().isConnected) {
      webSocketService.connect();
    }

    // Subscribe to symbol
    webSocketService.subscribe(symbol);

    // Return unsubscribe function
    return () => {
      webSocketService.unsubscribe(symbol);
    };
  }

  // Get exchange configuration
  getExchangeConfig(exchange: string): ExchangeConfig | undefined {
    return this.exchangeConfigs.get(exchange);
  }

  // Update exchange configuration
  updateExchangeConfig(exchange: string, config: Partial<ExchangeConfig>): void {
    const existing = this.exchangeConfigs.get(exchange);
    if (existing) {
      this.exchangeConfigs.set(exchange, { ...existing, ...config });
    }
  }

  // Get performance statistics
  getPerformanceStats(): {
    totalSymbols: number;
    totalExchanges: number;
    averageConfidence: number;
    dataUpdateRate: number;
  } {
    const totalSymbols = this.aggregatedData.size;
    const totalExchanges = this.exchangeConfigs.size;
    const averageConfidence = totalSymbols > 0 
      ? Array.from(this.aggregatedData.values()).reduce((sum, data) => sum + data.confidence, 0) / totalSymbols
      : 0;

    // Calculate data update rate (updates per second)
    let totalUpdates = 0;
    for (const metrics of Array.from(this.dataQualityMetrics.values())) {
      totalUpdates += metrics.totalUpdates;
    }
    const dataUpdateRate = totalUpdates / 60; // Assuming metrics are collected every minute

    return {
      totalSymbols,
      totalExchanges,
      averageConfidence,
      dataUpdateRate,
    };
  }

  // Cleanup and destruction
  destroy(): void {
    // Clear all timers
    for (const timer of Array.from(this.updateTimers.values())) {
      clearTimeout(timer);
    }
    this.updateTimers.clear();

    // Clear data
    this.exchangeData.clear();
    this.aggregatedData.clear();
    this.exchangeLatencies.clear();
    this.dataQualityMetrics.clear();

    // Remove listeners
    this.removeAllListeners();
  }
}

// Singleton instance
export const multiExchangeAggregator = new MultiExchangeAggregator();

// Export for use in other modules
export default multiExchangeAggregator;