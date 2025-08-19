import { EventEmitter } from 'events';

export interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  rules: TradingRule[];
  riskManagement: RiskParameters;
  created: Date;
  lastUpdated: Date;
}

export interface TradingRule {
  id: string;
  type: 'entry' | 'exit' | 'stop_loss' | 'take_profit';
  condition: string;
  action: string;
  parameters: Record<string, any>;
  priority: number;
}

export interface RiskParameters {
  maxPositionSize: number;
  maxDailyLoss: number;
  maxDrawdown: number;
  positionSizing: 'fixed' | 'percent_capital' | 'kelly' | 'volatility_adjusted';
  stopLossPercent: number;
  takeProfitPercent: number;
}

export interface BacktestResult {
  strategyId: string;
  startDate: Date;
  endDate: Date;
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  trades: BacktestTrade[];
  metrics: BacktestMetrics;
  performance: PerformanceData[];
}

export interface BacktestTrade {
  id: string;
  symbol: string;
  entryDate: Date;
  exitDate: Date;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  direction: 'long' | 'short';
  profit: number;
  commission: number;
  slippage: number;
}

export interface BacktestMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  averageTradeDuration: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
}

export interface PerformanceData {
  date: Date;
  portfolioValue: number;
  dailyReturn: number;
  cumulativeReturn: number;
  drawdown: number;
  exposedCapital: number;
}

export interface OptimizationResult {
  strategyId: string;
  parameter: string;
  originalValue: any;
  optimizedValue: any;
  originalMetric: number;
  optimizedMetric: number;
  improvement: number;
}

export class TradingEngine extends EventEmitter {
  private strategies: Map<string, TradingStrategy> = new Map();
  private backtestResults: Map<string, BacktestResult> = new Map();
  private isRunning: boolean = false;

  constructor() {
    super();
  }

  async createStrategy(strategy: Omit<TradingStrategy, 'id' | 'created' | 'lastUpdated'>): Promise<TradingStrategy> {
    const newStrategy: TradingStrategy = {
      ...strategy,
      id: `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created: new Date(),
      lastUpdated: new Date()
    };

    this.strategies.set(newStrategy.id, newStrategy);
    this.emit('strategyCreated', newStrategy);
    
    return newStrategy;
  }

  async updateStrategy(strategyId: string, updates: Partial<TradingStrategy>): Promise<TradingStrategy | null> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy ${strategyId} not found`);
    }

    const updatedStrategy = {
      ...strategy,
      ...updates,
      id: strategy.id,
      created: strategy.created,
      lastUpdated: new Date()
    };

    this.strategies.set(strategyId, updatedStrategy);
    this.emit('strategyUpdated', updatedStrategy);
    
    return updatedStrategy;
  }

  async deleteStrategy(strategyId: string): Promise<boolean> {
    const deleted = this.strategies.delete(strategyId);
    if (deleted) {
      this.backtestResults.delete(strategyId);
      this.emit('strategyDeleted', strategyId);
    }
    return deleted;
  }

  getStrategy(strategyId: string): TradingStrategy | null {
    return this.strategies.get(strategyId) || null;
  }

  getAllStrategies(): TradingStrategy[] {
    return Array.from(this.strategies.values());
  }

  async backtest(
    strategyId: string,
    startDate: Date,
    endDate: Date,
    initialCapital: number = 100000,
    options: {
      commission?: number;
      slippage?: number;
      symbols?: string[];
      benchmark?: string;
    } = {}
  ): Promise<BacktestResult> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy ${strategyId} not found`);
    }

    this.emit('backtestStarted', { strategyId, startDate, endDate });

    const {
      commission = 0.001,
      slippage = 0.0005,
      symbols = ['SPY'],
      benchmark = 'SPY'
    } = options;

    const trades: BacktestTrade[] = [];
    const performance: PerformanceData[] = [];
    let portfolioValue = initialCapital;
    let maxDrawdownValue = initialCapital;
    let currentDrawdown = 0;
    let maxDrawdown = 0;

    // Simulate backtest execution
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i < daysDiff; i++) {
      const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      
      // Simulate price movements and strategy execution
      const dailyReturn = (Math.random() - 0.5) * 0.04; // ±2% daily volatility
      const newValue = portfolioValue * (1 + dailyReturn);
      
      // Calculate drawdown
      if (newValue > maxDrawdownValue) {
        maxDrawdownValue = newValue;
        currentDrawdown = 0;
      } else {
        currentDrawdown = (maxDrawdownValue - newValue) / maxDrawdownValue;
        maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
      }

      performance.push({
        date: currentDate,
        portfolioValue: newValue,
        dailyReturn,
        cumulativeReturn: (newValue / initialCapital) - 1,
        drawdown: currentDrawdown,
        exposedCapital: newValue * 0.8 // Assume 80% capital exposure
      });

      portfolioValue = newValue;

      // Simulate occasional trades
      if (Math.random() < 0.1) { // 10% chance of trade per day
        const trade: BacktestTrade = {
          id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          symbol: symbols[Math.floor(Math.random() * symbols.length)],
          entryDate: currentDate,
          exitDate: new Date(currentDate.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000),
          entryPrice: 100 + Math.random() * 50,
          exitPrice: 0,
          quantity: Math.floor(portfolioValue * 0.1 / 150), // 10% position size
          direction: Math.random() > 0.5 ? 'long' : 'short',
          profit: 0,
          commission: commission * portfolioValue * 0.1,
          slippage: slippage * portfolioValue * 0.1
        };
        
        trade.exitPrice = trade.entryPrice * (1 + (Math.random() - 0.5) * 0.1);
        trade.profit = (trade.exitPrice - trade.entryPrice) * trade.quantity * (trade.direction === 'long' ? 1 : -1);
        
        trades.push(trade);
      }
    }

    // Calculate metrics
    const totalReturn = (portfolioValue / initialCapital) - 1;
    const annualizedReturn = Math.pow(1 + totalReturn, 365 / daysDiff) - 1;
    const returns = performance.map(p => p.dailyReturn);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const returnStd = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
    const sharpeRatio = avgReturn / returnStd * Math.sqrt(252); // Annualized

    const winningTrades = trades.filter(t => t.profit > 0);
    const losingTrades = trades.filter(t => t.profit <= 0);
    const winRate = winningTrades.length / trades.length;
    const averageWin = winningTrades.reduce((sum, t) => sum + t.profit, 0) / winningTrades.length || 0;
    const averageLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.profit, 0) / losingTrades.length) || 0;
    const profitFactor = averageWin / averageLoss || 0;

    const metrics: BacktestMetrics = {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      averageWin,
      averageLoss,
      largestWin: Math.max(...trades.map(t => t.profit)),
      largestLoss: Math.min(...trades.map(t => t.profit)),
      averageTradeDuration: trades.reduce((sum, t) => sum + (t.exitDate.getTime() - t.entryDate.getTime()), 0) / trades.length / (24 * 60 * 60 * 1000),
      maxConsecutiveWins: this.calculateMaxConsecutive(trades, true),
      maxConsecutiveLosses: this.calculateMaxConsecutive(trades, false)
    };

    const result: BacktestResult = {
      strategyId,
      startDate,
      endDate,
      totalReturn,
      annualizedReturn,
      sharpeRatio,
      maxDrawdown,
      winRate,
      profitFactor,
      trades,
      metrics,
      performance
    };

    this.backtestResults.set(strategyId, result);
    this.emit('backtestCompleted', result);
    
    return result;
  }

  private calculateMaxConsecutive(trades: BacktestTrade[], wins: boolean): number {
    let maxConsecutive = 0;
    let currentConsecutive = 0;
    
    for (const trade of trades) {
      const isWin = trade.profit > 0;
      if (isWin === wins) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    }
    
    return maxConsecutive;
  }

  async optimizeStrategy(
    strategyId: string,
    parameters: string[],
    ranges: Record<string, [number, number, number]>, // [min, max, step]
    metric: 'sharpeRatio' | 'totalReturn' | 'profitFactor' = 'sharpeRatio',
    startDate: Date,
    endDate: Date
  ): Promise<OptimizationResult[]> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy ${strategyId} not found`);
    }

    this.emit('optimizationStarted', { strategyId, parameters, metric });

    const results: OptimizationResult[] = [];
    
    for (const parameter of parameters) {
      const range = ranges[parameter];
      if (!range) continue;

      const [min, max, step] = range;
      const originalValue = strategy.parameters[parameter];
      let bestValue = originalValue;
      let bestMetric = 0;

      // Test different parameter values
      for (let value = min; value <= max; value += step) {
        // Update strategy parameter
        const testStrategy = {
          ...strategy,
          parameters: { ...strategy.parameters, [parameter]: value }
        };
        
        this.strategies.set(strategyId, testStrategy);
        
        // Run backtest with new parameter
        const backtestResult = await this.backtest(strategyId, startDate, endDate);
        const currentMetric = backtestResult[metric];
        
        if (currentMetric > bestMetric) {
          bestMetric = currentMetric;
          bestValue = value;
        }
      }

      // Get original metric value
      const originalStrategy = { ...strategy, parameters: { ...strategy.parameters, [parameter]: originalValue } };
      this.strategies.set(strategyId, originalStrategy);
      const originalBacktest = await this.backtest(strategyId, startDate, endDate);
      const originalMetric = originalBacktest[metric];

      results.push({
        strategyId,
        parameter,
        originalValue,
        optimizedValue: bestValue,
        originalMetric,
        optimizedMetric: bestMetric,
        improvement: ((bestMetric - originalMetric) / originalMetric) * 100
      });

      // Update strategy with best parameter
      strategy.parameters[parameter] = bestValue;
    }

    this.strategies.set(strategyId, strategy);
    this.emit('optimizationCompleted', { strategyId, results });
    
    return results;
  }

  getBacktestResult(strategyId: string): BacktestResult | null {
    return this.backtestResults.get(strategyId) || null;
  }

  getAllBacktestResults(): BacktestResult[] {
    return Array.from(this.backtestResults.values());
  }

  async startLiveTrading(strategyId: string): Promise<void> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy ${strategyId} not found`);
    }

    if (this.isRunning) {
      throw new Error('Trading engine is already running');
    }

    this.isRunning = true;
    this.emit('liveTradingStarted', strategyId);
    
    // In a real implementation, this would connect to broker APIs
    // and execute trades based on strategy rules
  }

  async stopLiveTrading(): Promise<void> {
    this.isRunning = false;
    this.emit('liveTradingStopped');
  }

  isLiveTradingActive(): boolean {
    return this.isRunning;
  }

  async calculatePositionSize(
    strategy: TradingStrategy,
    symbol: string,
    price: number,
    portfolioValue: number,
    volatility: number
  ): Promise<number> {
    const { riskManagement } = strategy;
    
    switch (riskManagement.positionSizing) {
      case 'fixed':
        return riskManagement.maxPositionSize;
      
      case 'percent_capital':
        return Math.floor(portfolioValue * (riskManagement.maxPositionSize / 100) / price);
      
      case 'volatility_adjusted':
        const targetRisk = riskManagement.maxPositionSize / 100; // Convert to decimal
        const positionRisk = volatility * Math.sqrt(252); // Annualized volatility
        const adjustedSize = (portfolioValue * targetRisk) / (price * positionRisk);
        return Math.floor(adjustedSize);
      
      case 'kelly':
        // Simplified Kelly criterion calculation
        const winRate = 0.55; // Assumed from historical data
        const avgWin = 0.02; // Assumed 2% average win
        const avgLoss = 0.015; // Assumed 1.5% average loss
        const kellyPercent = winRate - ((1 - winRate) / (avgWin / avgLoss));
        return Math.floor(portfolioValue * Math.max(0, Math.min(kellyPercent, 0.25)) / price);
      
      default:
        return Math.floor(portfolioValue * 0.02 / price); // Default 2% position
    }
  }

  async exportStrategy(strategyId: string): Promise<string> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy ${strategyId} not found`);
    }

    return JSON.stringify(strategy, null, 2);
  }

  async importStrategy(strategyJson: string): Promise<TradingStrategy> {
    const strategy = JSON.parse(strategyJson) as TradingStrategy;
    
    // Generate new ID and timestamps
    strategy.id = `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    strategy.created = new Date();
    strategy.lastUpdated = new Date();
    
    this.strategies.set(strategy.id, strategy);
    this.emit('strategyImported', strategy);
    
    return strategy;
  }
}

export const tradingEngine = new TradingEngine();