import { EventEmitter } from 'events';

export interface OrderBook {
  symbol: string;
  timestamp: Date;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  midPrice: number;
  totalBidVolume: number;
  totalAskVolume: number;
  imbalance: number;
  depth: number;
  microstructureMetrics: MicrostructureMetrics;
}

export interface OrderBookLevel {
  price: number;
  size: number;
  orders: number;
  side: 'bid' | 'ask';
  timestamp: Date;
}

export interface Trade {
  id: string;
  symbol: string;
  price: number;
  size: number;
  timestamp: Date;
  side: 'buy' | 'sell';
  aggressor: 'buyer' | 'seller' | 'unknown';
  venue: string;
  conditions: string[];
  tradeType: 'regular' | 'block' | 'sweep' | 'iceberg';
}

export interface Quote {
  symbol: string;
  timestamp: Date;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  venue: string;
  quoteCondition: string;
}

export interface MicrostructureMetrics {
  effectiveSpread: number;
  realizedSpread: number;
  priceImpact: number;
  volatility: number;
  trades_per_minute: number;
  average_trade_size: number;
  order_flow_imbalance: number;
  quote_slope: number;
  market_depth: number;
  liquidity_ratio: number;
  arrival_rate: number;
  cancellation_rate: number;
  fill_rate: number;
  toxicity_index: number;
  adverse_selection: number;
  probability_informed_trading: number;
}

export interface LiquidityMetrics {
  symbol: string;
  timestamp: Date;
  spread_bps: number;
  depth_usd: number;
  resiliency_score: number;
  turnover_rate: number;
  price_impact_coefficient: number;
  amihud_illiquidity: number;
  kyle_lambda: number;
  relative_spread: number;
  depth_imbalance: number;
  quote_frequency: number;
  trade_frequency: number;
}

export interface MarketImpactModel {
  symbol: string;
  linear_coefficient: number;
  square_root_coefficient: number;
  temporary_impact: number;
  permanent_impact: number;
  decay_rate: number;
  participation_rate_threshold: number;
  volatility_adjustment: number;
  confidence_interval: [number, number];
  r_squared: number;
  prediction_error: number;
}

export interface OrderFlowAnalysis {
  symbol: string;
  timeframe: string;
  buy_volume: number;
  sell_volume: number;
  net_flow: number;
  trade_count: number;
  large_trade_ratio: number;
  sweep_activity: number;
  block_activity: number;
  institutional_activity: number;
  retail_activity: number;
  momentum_score: number;
  flow_toxicity: number;
  information_content: number;
}

export interface VenueAnalysis {
  venue: string;
  symbol: string;
  market_share: number;
  average_spread: number;
  fill_rate: number;
  latency_ms: number;
  adverse_selection_cost: number;
  effective_spread: number;
  price_improvement_rate: number;
  hidden_liquidity_ratio: number;
  order_size_distribution: SizeDistribution[];
  quality_score: number;
}

export interface SizeDistribution {
  size_bucket: string;
  percentage: number;
  average_price_improvement: number;
  fill_rate: number;
}

export interface FlashCrashDetection {
  symbol: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  price_move_percent: number;
  volume_spike: number;
  liquidity_evaporation: number;
  order_book_disruption: number;
  recovery_time_seconds: number;
  trigger_events: string[];
  confidence_score: number;
}

export interface ArbitrageOpportunity {
  id: string;
  symbol: string;
  opportunity_type: 'spatial' | 'temporal' | 'statistical' | 'triangular';
  venues: string[];
  prices: number[];
  sizes: number[];
  expected_profit_bps: number;
  execution_cost_bps: number;
  net_profit_bps: number;
  confidence: number;
  duration_estimate_ms: number;
  risk_score: number;
  timestamp: Date;
  expires_at: Date;
}

export interface LatencyAnalysis {
  venue: string;
  symbol: string;
  feed_latency: LatencyMetrics;
  order_latency: LatencyMetrics;
  execution_latency: LatencyMetrics;
  market_data_latency: LatencyMetrics;
  total_latency: LatencyMetrics;
  jitter: number;
  packet_loss: number;
  timestamp_accuracy: number;
}

export interface LatencyMetrics {
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  std_dev: number;
  sample_count: number;
}

export class MarketMicrostructureAnalyzer extends EventEmitter {
  private orderBooks: Map<string, OrderBook> = new Map();
  private trades: Map<string, Trade[]> = new Map();
  private quotes: Map<string, Quote[]> = new Map();
  private liquidityMetrics: Map<string, LiquidityMetrics> = new Map();
  private impactModels: Map<string, MarketImpactModel> = new Map();
  private venueAnalysis: Map<string, VenueAnalysis[]> = new Map();
  private flashCrashAlerts: Map<string, FlashCrashDetection[]> = new Map();
  private arbitrageOpportunities: Map<string, ArbitrageOpportunity[]> = new Map();

  constructor() {
    super();
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    // Initialize with sample microstructure data
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'];
    
    symbols.forEach(symbol => {
      this.generateSampleOrderBook(symbol);
      this.generateSampleTrades(symbol);
      this.generateSampleQuotes(symbol);
      this.calculateLiquidityMetrics(symbol);
    });
  }

  private generateSampleOrderBook(symbol: string): void {
    const midPrice = 150 + Math.random() * 100;
    const spread = 0.01 + Math.random() * 0.05;
    
    const bids: OrderBookLevel[] = [];
    const asks: OrderBookLevel[] = [];
    
    // Generate bid levels
    for (let i = 0; i < 10; i++) {
      const price = midPrice - spread/2 - i * 0.01;
      bids.push({
        price,
        size: 100 + Math.random() * 1000,
        orders: 1 + Math.floor(Math.random() * 5),
        side: 'bid',
        timestamp: new Date()
      });
    }
    
    // Generate ask levels
    for (let i = 0; i < 10; i++) {
      const price = midPrice + spread/2 + i * 0.01;
      asks.push({
        price,
        size: 100 + Math.random() * 1000,
        orders: 1 + Math.floor(Math.random() * 5),
        side: 'ask',
        timestamp: new Date()
      });
    }

    const totalBidVolume = bids.reduce((sum, level) => sum + level.size, 0);
    const totalAskVolume = asks.reduce((sum, level) => sum + level.size, 0);
    const imbalance = (totalBidVolume - totalAskVolume) / (totalBidVolume + totalAskVolume);

    const orderBook: OrderBook = {
      symbol,
      timestamp: new Date(),
      bids,
      asks,
      spread,
      midPrice,
      totalBidVolume,
      totalAskVolume,
      imbalance,
      depth: Math.min(bids.length, asks.length),
      microstructureMetrics: this.calculateMicrostructureMetrics(symbol, midPrice, spread, totalBidVolume, totalAskVolume)
    };

    this.orderBooks.set(symbol, orderBook);
    this.emit('orderBookUpdated', orderBook);
  }

  private calculateMicrostructureMetrics(
    symbol: string, 
    midPrice: number, 
    spread: number, 
    bidVolume: number, 
    askVolume: number
  ): MicrostructureMetrics {
    return {
      effectiveSpread: spread * 1.2,
      realizedSpread: spread * 0.8,
      priceImpact: spread * 0.6,
      volatility: 0.02 + Math.random() * 0.03,
      trades_per_minute: 10 + Math.random() * 40,
      average_trade_size: 200 + Math.random() * 800,
      order_flow_imbalance: (bidVolume - askVolume) / (bidVolume + askVolume),
      quote_slope: 0.001 + Math.random() * 0.005,
      market_depth: bidVolume + askVolume,
      liquidity_ratio: (bidVolume + askVolume) / (midPrice * 1000),
      arrival_rate: 5 + Math.random() * 15,
      cancellation_rate: 0.3 + Math.random() * 0.4,
      fill_rate: 0.6 + Math.random() * 0.3,
      toxicity_index: Math.random() * 0.2,
      adverse_selection: Math.random() * 0.15,
      probability_informed_trading: 0.1 + Math.random() * 0.3
    };
  }

  private generateSampleTrades(symbol: string): void {
    const trades: Trade[] = [];
    const basePrice = 150 + Math.random() * 100;
    
    for (let i = 0; i < 100; i++) {
      const price = basePrice + (Math.random() - 0.5) * 2;
      const size = 100 + Math.random() * 500;
      const side = Math.random() > 0.5 ? 'buy' : 'sell';
      
      trades.push({
        id: `trade_${Date.now()}_${i}`,
        symbol,
        price,
        size,
        timestamp: new Date(Date.now() - (100 - i) * 1000),
        side,
        aggressor: Math.random() > 0.5 ? 'buyer' : 'seller',
        venue: ['NASDAQ', 'NYSE', 'BATS'][Math.floor(Math.random() * 3)],
        conditions: [],
        tradeType: size > 1000 ? 'block' : 'regular'
      });
    }
    
    this.trades.set(symbol, trades);
  }

  private generateSampleQuotes(symbol: string): void {
    const quotes: Quote[] = [];
    const basePrice = 150 + Math.random() * 100;
    
    for (let i = 0; i < 200; i++) {
      const bid = basePrice + (Math.random() - 0.5) * 2;
      const ask = bid + 0.01 + Math.random() * 0.05;
      
      quotes.push({
        symbol,
        timestamp: new Date(Date.now() - (200 - i) * 500),
        bid,
        ask,
        bidSize: 100 + Math.random() * 500,
        askSize: 100 + Math.random() * 500,
        venue: ['NASDAQ', 'NYSE', 'BATS'][Math.floor(Math.random() * 3)],
        quoteCondition: 'regular'
      });
    }
    
    this.quotes.set(symbol, quotes);
  }

  async analyzeOrderFlow(symbol: string, timeframe: '1m' | '5m' | '15m' | '1h' = '5m'): Promise<OrderFlowAnalysis> {
    const trades = this.trades.get(symbol) || [];
    const timeMs = this.getTimeframeMs(timeframe);
    const cutoff = new Date(Date.now() - timeMs);
    
    const recentTrades = trades.filter(trade => trade.timestamp >= cutoff);
    
    const buyVolume = recentTrades
      .filter(trade => trade.side === 'buy')
      .reduce((sum, trade) => sum + trade.size, 0);
    
    const sellVolume = recentTrades
      .filter(trade => trade.side === 'sell')
      .reduce((sum, trade) => sum + trade.size, 0);
    
    const totalVolume = buyVolume + sellVolume;
    const netFlow = buyVolume - sellVolume;
    
    const largeTrades = recentTrades.filter(trade => trade.size > 1000);
    const sweepTrades = recentTrades.filter(trade => trade.tradeType === 'sweep');
    const blockTrades = recentTrades.filter(trade => trade.tradeType === 'block');

    const analysis: OrderFlowAnalysis = {
      symbol,
      timeframe,
      buy_volume: buyVolume,
      sell_volume: sellVolume,
      net_flow: netFlow,
      trade_count: recentTrades.length,
      large_trade_ratio: largeTrades.length / recentTrades.length,
      sweep_activity: sweepTrades.length,
      block_activity: blockTrades.length,
      institutional_activity: blockTrades.reduce((sum, trade) => sum + trade.size, 0) / totalVolume,
      retail_activity: 1 - (blockTrades.reduce((sum, trade) => sum + trade.size, 0) / totalVolume),
      momentum_score: this.calculateMomentumScore(recentTrades),
      flow_toxicity: this.calculateFlowToxicity(recentTrades),
      information_content: this.calculateInformationContent(recentTrades)
    };

    this.emit('orderFlowAnalyzed', analysis);
    return analysis;
  }

  private getTimeframeMs(timeframe: string): number {
    const timeMap = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000
    };
    return timeMap[timeframe as keyof typeof timeMap] || timeMap['5m'];
  }

  private calculateMomentumScore(trades: Trade[]): number {
    if (trades.length < 10) return 0;
    
    // Calculate momentum based on recent price direction and volume
    const sortedTrades = trades.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    let momentum = 0;
    
    for (let i = 1; i < sortedTrades.length; i++) {
      const priceDiff = sortedTrades[i].price - sortedTrades[i-1].price;
      const volumeWeight = sortedTrades[i].size / 1000;
      momentum += (priceDiff > 0 ? 1 : -1) * volumeWeight;
    }
    
    return Math.max(-1, Math.min(1, momentum / trades.length));
  }

  private calculateFlowToxicity(trades: Trade[]): number {
    // Simplified toxicity calculation based on adverse selection
    const buyTrades = trades.filter(t => t.side === 'buy');
    const sellTrades = trades.filter(t => t.side === 'sell');
    
    if (buyTrades.length === 0 || sellTrades.length === 0) return 0;
    
    const avgBuyPrice = buyTrades.reduce((sum, t) => sum + t.price, 0) / buyTrades.length;
    const avgSellPrice = sellTrades.reduce((sum, t) => sum + t.price, 0) / sellTrades.length;
    
    return Math.abs(avgBuyPrice - avgSellPrice) / ((avgBuyPrice + avgSellPrice) / 2);
  }

  private calculateInformationContent(trades: Trade[]): number {
    // Calculate information content based on price impact and volume
    if (trades.length < 5) return 0;
    
    const priceReturns = [];
    for (let i = 1; i < trades.length; i++) {
      priceReturns.push((trades[i].price - trades[i-1].price) / trades[i-1].price);
    }
    
    const variance = priceReturns.reduce((sum, ret) => sum + Math.pow(ret, 2), 0) / priceReturns.length;
    return Math.min(1, variance * 10000); // Scale variance to 0-1 range
  }

  async calculateLiquidityMetrics(symbol: string): Promise<LiquidityMetrics> {
    const orderBook = this.orderBooks.get(symbol);
    const trades = this.trades.get(symbol) || [];
    const quotes = this.quotes.get(symbol) || [];
    
    if (!orderBook) {
      throw new Error(`Order book not found for ${symbol}`);
    }

    const recentTrades = trades.slice(-100); // Last 100 trades
    const recentQuotes = quotes.slice(-100); // Last 100 quotes
    
    const spread_bps = (orderBook.spread / orderBook.midPrice) * 10000;
    const depth_usd = (orderBook.totalBidVolume + orderBook.totalAskVolume) * orderBook.midPrice;
    
    // Calculate Amihud illiquidity ratio
    const amihudRatio = recentTrades.length > 0 ? 
      recentTrades.reduce((sum, trade) => {
        const ret = Math.abs((trade.price - orderBook.midPrice) / orderBook.midPrice);
        const volume = trade.size * trade.price;
        return sum + (ret / volume);
      }, 0) / recentTrades.length : 0;

    const metrics: LiquidityMetrics = {
      symbol,
      timestamp: new Date(),
      spread_bps,
      depth_usd,
      resiliency_score: this.calculateResiliencyScore(symbol),
      turnover_rate: this.calculateTurnoverRate(recentTrades, depth_usd),
      price_impact_coefficient: this.calculatePriceImpactCoefficient(recentTrades),
      amihud_illiquidity: amihudRatio * 1000000, // Scale for readability
      kyle_lambda: this.calculateKyleLambda(recentTrades, orderBook),
      relative_spread: spread_bps / 10000,
      depth_imbalance: Math.abs(orderBook.imbalance),
      quote_frequency: recentQuotes.length / 5, // Quotes per minute (assuming 5 min window)
      trade_frequency: recentTrades.length / 5   // Trades per minute
    };

    this.liquidityMetrics.set(symbol, metrics);
    this.emit('liquidityMetricsCalculated', metrics);
    
    return metrics;
  }

  private calculateResiliencyScore(_symbol: string): number {
    // Simplified resiliency score based on order book recovery after trades
    return 0.7 + Math.random() * 0.3; // Placeholder implementation
  }

  private calculateTurnoverRate(trades: Trade[], depth: number): number {
    const totalVolume = trades.reduce((sum, trade) => sum + trade.size * trade.price, 0);
    return depth > 0 ? totalVolume / depth : 0;
  }

  private calculatePriceImpactCoefficient(trades: Trade[]): number {
    if (trades.length < 10) return 0;
    
    // Linear regression of price impact vs volume
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    const n = trades.length;
    
    for (let i = 1; i < trades.length; i++) {
      const volume = trades[i].size;
      const impact = Math.abs(trades[i].price - trades[i-1].price) / trades[i-1].price;
      
      sumX += volume;
      sumY += impact;
      sumXY += volume * impact;
      sumXX += volume * volume;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return isNaN(slope) ? 0 : slope;
  }

  private calculateKyleLambda(trades: Trade[], _orderBook: OrderBook): number {
    // Kyle's lambda: price impact per unit of order flow
    if (trades.length < 5) return 0;
    
    const priceChanges = [];
    const volumeImbalances = [];
    
    for (let i = 1; i < trades.length; i++) {
      const priceChange = (trades[i].price - trades[i-1].price) / trades[i-1].price;
      const volumeImbalance = trades[i].side === 'buy' ? trades[i].size : -trades[i].size;
      
      priceChanges.push(priceChange);
      volumeImbalances.push(volumeImbalance);
    }
    
    // Simple correlation-based approximation
    const avgPriceChange = priceChanges.reduce((a, b) => a + b) / priceChanges.length;
    const avgVolumeImbalance = volumeImbalances.reduce((a, b) => a + b) / volumeImbalances.length;
    
    let numerator = 0, denominator = 0;
    for (let i = 0; i < priceChanges.length; i++) {
      numerator += (priceChanges[i] - avgPriceChange) * (volumeImbalances[i] - avgVolumeImbalance);
      denominator += Math.pow(volumeImbalances[i] - avgVolumeImbalance, 2);
    }
    
    return denominator !== 0 ? numerator / denominator : 0;
  }

  async detectArbitrageOpportunities(symbols: string[]): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];
    
    for (const symbol of symbols) {
      // Spatial arbitrage (cross-venue)
      const spatialOpp = await this.detectSpatialArbitrage(symbol);
      if (spatialOpp) opportunities.push(spatialOpp);
      
      // Statistical arbitrage
      const statOpp = await this.detectStatisticalArbitrage(symbol);
      if (statOpp) opportunities.push(statOpp);
    }
    
    this.arbitrageOpportunities.set('current', opportunities);
    this.emit('arbitrageOpportunitiesDetected', opportunities);
    
    return opportunities;
  }

  private async detectSpatialArbitrage(symbol: string): Promise<ArbitrageOpportunity | null> {
    // Simulate cross-venue price differences
    const venues = ['NASDAQ', 'NYSE', 'BATS'];
    const prices = venues.map(() => 150 + Math.random() * 2);
    const sizes = venues.map(() => 1000 + Math.random() * 5000);
    
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const spread = maxPrice - minPrice;
    
    if (spread > 0.05) { // 5 cent arbitrage opportunity
      const expectedProfitBps = (spread / minPrice) * 10000;
      const executionCostBps = 2; // Estimated execution cost
      const netProfitBps = expectedProfitBps - executionCostBps;
      
      if (netProfitBps > 1) { // Minimum 1bp net profit
        return {
          id: `arb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          symbol,
          opportunity_type: 'spatial',
          venues,
          prices,
          sizes,
          expected_profit_bps: expectedProfitBps,
          execution_cost_bps: executionCostBps,
          net_profit_bps: netProfitBps,
          confidence: 0.8,
          duration_estimate_ms: 500,
          risk_score: 0.2,
          timestamp: new Date(),
          expires_at: new Date(Date.now() + 10000) // 10 second window
        };
      }
    }
    
    return null;
  }

  private async detectStatisticalArbitrage(symbol: string): Promise<ArbitrageOpportunity | null> {
    // Simplified statistical arbitrage based on mean reversion
    const trades = this.trades.get(symbol) || [];
    if (trades.length < 50) return null;
    
    const recentTrades = trades.slice(-50);
    const prices = recentTrades.map(t => t.price);
    const avgPrice = prices.reduce((a, b) => a + b) / prices.length;
    const currentPrice = prices[prices.length - 1];
    
    const deviation = Math.abs(currentPrice - avgPrice) / avgPrice;
    
    if (deviation > 0.02) { // 2% deviation threshold
      const expectedProfitBps = deviation * 10000;
      const executionCostBps = 5;
      const netProfitBps = expectedProfitBps - executionCostBps;
      
      if (netProfitBps > 2) {
        return {
          id: `arb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          symbol,
          opportunity_type: 'statistical',
          venues: ['NASDAQ'],
          prices: [currentPrice],
          sizes: [5000],
          expected_profit_bps: expectedProfitBps,
          execution_cost_bps: executionCostBps,
          net_profit_bps: netProfitBps,
          confidence: 0.6,
          duration_estimate_ms: 30000,
          risk_score: 0.4,
          timestamp: new Date(),
          expires_at: new Date(Date.now() + 60000)
        };
      }
    }
    
    return null;
  }

  async detectFlashCrash(symbol: string): Promise<FlashCrashDetection | null> {
    const trades = this.trades.get(symbol) || [];
    const orderBook = this.orderBooks.get(symbol);
    
    if (trades.length < 10 || !orderBook) return null;
    
    const recentTrades = trades.slice(-10);
    const prices = recentTrades.map(t => t.price);
    const volumes = recentTrades.map(t => t.size);
    
    const priceChange = (prices[prices.length - 1] - prices[0]) / prices[0];
    const avgVolume = volumes.reduce((a, b) => a + b) / volumes.length;
    const volumeSpike = Math.max(...volumes) / avgVolume;
    
    // Flash crash detection criteria
    const rapidPriceMove = Math.abs(priceChange) > 0.05; // 5% move
    const highVolume = volumeSpike > 3; // 3x average volume
    const lowLiquidity = orderBook.totalBidVolume + orderBook.totalAskVolume < avgVolume * 2;
    
    if (rapidPriceMove && (highVolume || lowLiquidity)) {
      const severity = Math.abs(priceChange) > 0.1 ? 'critical' :
                     Math.abs(priceChange) > 0.07 ? 'high' :
                     Math.abs(priceChange) > 0.05 ? 'medium' : 'low';
      
      const detection: FlashCrashDetection = {
        symbol,
        timestamp: new Date(),
        severity: severity as any,
        price_move_percent: priceChange * 100,
        volume_spike: volumeSpike,
        liquidity_evaporation: 1 - ((orderBook.totalBidVolume + orderBook.totalAskVolume) / (avgVolume * 10)),
        order_book_disruption: orderBook.spread / orderBook.midPrice,
        recovery_time_seconds: 30 + Math.random() * 120,
        trigger_events: rapidPriceMove ? ['rapid_price_move'] : ['liquidity_shock'],
        confidence_score: 0.7 + Math.random() * 0.2
      };
      
      const alertHistory = this.flashCrashAlerts.get(symbol) || [];
      alertHistory.push(detection);
      this.flashCrashAlerts.set(symbol, alertHistory);
      
      this.emit('flashCrashDetected', detection);
      return detection;
    }
    
    return null;
  }

  async analyzeVenueQuality(symbol: string): Promise<VenueAnalysis[]> {
    const venues = ['NASDAQ', 'NYSE', 'BATS', 'EDGX'];
    const analyses: VenueAnalysis[] = [];
    
    for (const venue of venues) {
      const analysis: VenueAnalysis = {
        venue,
        symbol,
        market_share: 0.15 + Math.random() * 0.3,
        average_spread: 0.01 + Math.random() * 0.02,
        fill_rate: 0.85 + Math.random() * 0.1,
        latency_ms: 0.5 + Math.random() * 2,
        adverse_selection_cost: Math.random() * 0.01,
        effective_spread: 0.012 + Math.random() * 0.008,
        price_improvement_rate: 0.3 + Math.random() * 0.4,
        hidden_liquidity_ratio: 0.2 + Math.random() * 0.3,
        order_size_distribution: [
          { size_bucket: '100-500', percentage: 0.4, average_price_improvement: 0.001, fill_rate: 0.95 },
          { size_bucket: '500-1000', percentage: 0.3, average_price_improvement: 0.0008, fill_rate: 0.92 },
          { size_bucket: '1000-5000', percentage: 0.2, average_price_improvement: 0.0005, fill_rate: 0.88 },
          { size_bucket: '5000+', percentage: 0.1, average_price_improvement: 0.0003, fill_rate: 0.82 }
        ],
        quality_score: 70 + Math.random() * 25
      };
      
      analyses.push(analysis);
    }
    
    this.venueAnalysis.set(symbol, analyses);
    this.emit('venueQualityAnalyzed', { symbol, analyses });
    
    return analyses;
  }

  async calculateMarketImpact(_symbol: string, orderSize: number): Promise<number> {
    const orderBook = this.orderBooks.get(_symbol);
    
    if (!orderBook) return 0;
    
    const model = this.impactModels.get(_symbol);
    if (model) {
      // Use existing model
      const linearImpact = model.linear_coefficient * orderSize;
      const sqrtImpact = model.square_root_coefficient * Math.sqrt(orderSize);
      const volatilityAdjustment = model.volatility_adjustment * orderBook.microstructureMetrics.volatility;
      
      return linearImpact + sqrtImpact + volatilityAdjustment;
    } else {
      // Simple impact calculation
      const marketDepth = orderBook.totalBidVolume + orderBook.totalAskVolume;
      // Square root impact model
      return Math.sqrt(orderSize / marketDepth) * orderBook.microstructureMetrics.volatility * 0.1;
    }
  }

  getOrderBook(symbol: string): OrderBook | null {
    return this.orderBooks.get(symbol) || null;
  }

  getTrades(symbol: string, limit: number = 100): Trade[] {
    const symbolTrades = this.trades.get(symbol) || [];
    return symbolTrades.slice(-limit);
  }

  getLiquidityMetrics(symbol: string): LiquidityMetrics | null {
    return this.liquidityMetrics.get(symbol) || null;
  }

  getArbitrageOpportunities(): ArbitrageOpportunity[] {
    return this.arbitrageOpportunities.get('current') || [];
  }

  getFlashCrashAlerts(symbol: string): FlashCrashDetection[] {
    return this.flashCrashAlerts.get(symbol) || [];
  }

  async updateOrderBook(symbol: string, update: Partial<OrderBook>): Promise<void> {
    const currentBook = this.orderBooks.get(symbol);
    if (currentBook) {
      const updatedBook = { ...currentBook, ...update, timestamp: new Date() };
      this.orderBooks.set(symbol, updatedBook);
      this.emit('orderBookUpdated', updatedBook);
    }
  }

  async addTrade(trade: Trade): Promise<void> {
    const symbolTrades = this.trades.get(trade.symbol) || [];
    symbolTrades.push(trade);
    
    // Keep only last 1000 trades
    if (symbolTrades.length > 1000) {
      symbolTrades.splice(0, symbolTrades.length - 1000);
    }
    
    this.trades.set(trade.symbol, symbolTrades);
    this.emit('tradeAdded', trade);
  }
}

export const marketMicrostructureAnalyzer = new MarketMicrostructureAnalyzer();