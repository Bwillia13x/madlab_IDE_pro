import { EventEmitter } from 'events';

interface BacktestStrategy {
  id: string;
  name: string;
  description: string;
  symbol: string;
  timeframe: string;
  startDate: Date;
  endDate: Date;
  parameters: Record<string, number>;
  rules: StrategyRule[];
  riskManagement: RiskManagement;
  createdAt: Date;
  createdBy: string;
}

interface StrategyRule {
  id: string;
  type: 'entry' | 'exit' | 'risk' | 'filter';
  condition: string;
  action: string;
  parameters: Record<string, unknown>;
  priority: number;
}

interface RiskManagement {
  maxPositionSize: number;
  stopLoss: number;
  takeProfit: number;
  maxDrawdown: number;
  positionSizing: 'fixed' | 'percentage' | 'kelly' | 'volatility';
}

interface BacktestResult {
  id: string;
  strategyId: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  averageWin: number;
  averageLoss: number;
  equityCurve: EquityPoint[];
  trades: Trade[];
  parameters: Record<string, number>;
  metadata: {
    executionTime: number;
    dataPoints: number;
    errors: string[];
  };
}

interface EquityPoint {
  date: Date;
  equity: number;
  drawdown: number;
  position: number;
}

interface Trade {
  id: string;
  entryDate: Date;
  exitDate: Date;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  exitReason: string;
}

interface OptimizationResult {
  id: string;
  strategyId: string;
  parameterRanges: Record<string, { min: number; max: number; step: number }>;
  results: Array<{
    parameters: Record<string, number>;
    metrics: {
      totalReturn: number;
      sharpeRatio: number;
      maxDrawdown: number;
      winRate: number;
    };
  }>;
  bestParameters: Record<string, number>;
  bestMetrics: {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
  };
  optimizationTime: number;
}

export class AIBacktestingEngine extends EventEmitter {
  private strategies: Map<string, BacktestStrategy> = new Map();
  private results: Map<string, BacktestResult> = new Map();
  private optimizations: Map<string, OptimizationResult> = new Map();
  private isRunning = false;

  constructor() {
    super();
  }

  /**
   * Create a strategy from natural language description
   */
  async createStrategyFromText(
    description: string,
    symbol: string,
    timeframe: string,
    startDate: Date,
    endDate: Date,
    createdBy: string
  ): Promise<string> {
    const strategyId = `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Parse natural language description using AI
    const parsedStrategy = await this.parseStrategyDescription(description);
    
    const strategy: BacktestStrategy = {
      id: strategyId,
      name: parsedStrategy.name,
      description: description,
      symbol,
      timeframe,
      startDate,
      endDate,
      parameters: parsedStrategy.parameters,
      rules: parsedStrategy.rules,
      riskManagement: parsedStrategy.riskManagement,
      createdAt: new Date(),
      createdBy
    };

    this.strategies.set(strategyId, strategy);
    this.emit('strategyCreated', { strategyId, strategy });

    return strategyId;
  }

  /**
   * Parse natural language strategy description using AI
   */
  private async parseStrategyDescription(description: string): Promise<{
    name: string;
    parameters: Record<string, number>;
    rules: StrategyRule[];
    riskManagement: RiskManagement;
  }> {
    // Mock AI parsing - in real implementation, this would use LLM
    const strategyName = this.extractStrategyName(description);
    const parameters = this.extractParameters(description);
    const rules = this.extractRules(description);
    const riskManagement = this.extractRiskManagement(description);

    return {
      name: strategyName,
      parameters,
      rules,
      riskManagement
    };
  }

  /**
   * Extract strategy name from description
   */
  private extractStrategyName(description: string): string {
    // Simple extraction - in real implementation, use NLP
    const lines = description.split('\n');
    const firstLine = lines[0].trim();
    
    if (firstLine.includes('Strategy:') || firstLine.includes('Name:')) {
      return firstLine.split(':')[1]?.trim() || 'Custom Strategy';
    }
    
    return 'Custom Strategy';
  }

  /**
   * Extract parameters from description
   */
  private extractParameters(description: string): Record<string, number> {
    const parameters: Record<string, number> = {};
    
    // Extract common parameters
    const paramPatterns = [
      { pattern: /RSI\s*period\s*(\d+)/i, name: 'rsiPeriod', default: 14 },
      { pattern: /MA\s*period\s*(\d+)/i, name: 'maPeriod', default: 20 },
      { pattern: /stop\s*loss\s*(\d+(?:\.\d+)?)/i, name: 'stopLoss', default: 2.0 },
      { pattern: /take\s*profit\s*(\d+(?:\.\d+)?)/i, name: 'takeProfit', default: 4.0 },
      { pattern: /volatility\s*period\s*(\d+)/i, name: 'volatilityPeriod', default: 20 }
    ];

    paramPatterns.forEach(({ pattern, name, default: defaultValue }) => {
      const match = description.match(pattern);
      parameters[name] = match ? parseFloat(match[1]) : defaultValue;
    });

    return parameters;
  }

  /**
   * Extract trading rules from description
   */
  private extractRules(description: string): StrategyRule[] {
    const rules: StrategyRule[] = [];
    
    // Extract entry rules
    if (description.toLowerCase().includes('buy') || description.toLowerCase().includes('long')) {
      rules.push({
        id: `rule_${Date.now()}_1`,
        type: 'entry',
        condition: 'RSI oversold and price above MA',
        action: 'BUY',
        parameters: { rsiThreshold: 30, maType: 'SMA' },
        priority: 1
      });
    }

    // Extract exit rules
    if (description.toLowerCase().includes('sell') || description.toLowerCase().includes('exit')) {
      rules.push({
        id: `rule_${Date.now()}_2`,
        type: 'exit',
        condition: 'RSI overbought or stop loss hit',
        action: 'SELL',
        parameters: { rsiThreshold: 70, stopLoss: 2.0 },
        priority: 2
      });
    }

    // Extract risk rules
    rules.push({
      id: `rule_${Date.now()}_3`,
      type: 'risk',
      condition: 'Position size exceeds max',
      action: 'REDUCE_POSITION',
      parameters: { maxPositionSize: 0.1 },
      priority: 3
    });

    return rules;
  }

  /**
   * Extract risk management from description
   */
  private extractRiskManagement(description: string): RiskManagement {
    const riskManagement: RiskManagement = {
      maxPositionSize: 0.1,
      stopLoss: 2.0,
      takeProfit: 4.0,
      maxDrawdown: 20.0,
      positionSizing: 'percentage'
    };

    // Extract risk parameters
    const stopLossMatch = description.match(/stop\s*loss\s*(\d+(?:\.\d+)?)/i);
    if (stopLossMatch) {
      riskManagement.stopLoss = parseFloat(stopLossMatch[1]);
    }

    const takeProfitMatch = description.match(/take\s*profit\s*(\d+(?:\.\d+)?)/i);
    if (takeProfitMatch) {
      riskManagement.takeProfit = parseFloat(takeProfitMatch[1]);
    }

    const maxDrawdownMatch = description.match(/max\s*drawdown\s*(\d+(?:\.\d+)?)/i);
    if (maxDrawdownMatch) {
      riskManagement.maxDrawdown = parseFloat(maxDrawdownMatch[1]);
    }

    return riskManagement;
  }

  /**
   * Run backtest for a strategy
   */
  async runBacktest(
    strategyId: string,
    initialCapital: number = 100000,
    customParameters?: Record<string, number>
  ): Promise<string> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error('Strategy not found');
    }

    if (this.isRunning) {
      throw new Error('Backtest already running');
    }

    this.isRunning = true;
    const resultId = `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      this.emit('backtestStarted', { resultId, strategyId });

      // Merge custom parameters with strategy parameters
      const parameters = { ...strategy.parameters, ...customParameters };

      // Run the backtest
      const result = await this.executeBacktest(strategy, parameters, initialCapital);
      
      this.results.set(resultId, result);
      this.emit('backtestCompleted', { resultId, result });

      return resultId;
    } catch (error) {
      this.emit('backtestError', { resultId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Execute the actual backtest
   */
  private async executeBacktest(
    strategy: BacktestStrategy,
    parameters: Record<string, number>,
    initialCapital: number
  ): Promise<BacktestResult> {
    const startTime = Date.now();
    
    // Mock backtest execution - in real implementation, this would:
    // 1. Fetch historical data
    // 2. Apply strategy rules
    // 3. Calculate positions and P&L
    // 4. Generate results

    const result: BacktestResult = {
      id: `result_${Date.now()}`,
      strategyId: strategy.id,
      startDate: strategy.startDate,
      endDate: strategy.endDate,
      initialCapital,
      finalCapital: initialCapital * (1 + Math.random() * 0.5 - 0.1), // Mock result
      totalReturn: 0,
      annualizedReturn: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      winRate: 0,
      profitFactor: 0,
      totalTrades: Math.floor(Math.random() * 100) + 20,
      winningTrades: 0,
      losingTrades: 0,
      averageWin: 0,
      averageLoss: 0,
      equityCurve: [],
      trades: [],
      parameters,
      metadata: {
        executionTime: Date.now() - startTime,
        dataPoints: Math.floor(Math.random() * 1000) + 500,
        errors: []
      }
    };

    // Calculate derived metrics
    this.calculateBacktestMetrics(result);

    return result;
  }

  /**
   * Calculate backtest metrics
   */
  private calculateBacktestMetrics(result: BacktestResult): void {
    // Calculate total return
    result.totalReturn = ((result.finalCapital - result.initialCapital) / result.initialCapital) * 100;

    // Calculate annualized return
    const days = (result.endDate.getTime() - result.startDate.getTime()) / (1000 * 60 * 60 * 24);
    result.annualizedReturn = (Math.pow(1 + result.totalReturn / 100, 365 / days) - 1) * 100;

    // Mock other metrics
    result.sharpeRatio = Math.random() * 2 + 0.5;
    result.maxDrawdown = Math.random() * 15 + 5;
    result.winRate = Math.random() * 30 + 50;
    result.profitFactor = Math.random() * 2 + 1;

    // Calculate trade metrics
    result.winningTrades = Math.floor(result.totalTrades * result.winRate / 100);
    result.losingTrades = result.totalTrades - result.winningTrades;
    result.averageWin = result.totalReturn > 0 ? result.totalReturn / result.winningTrades : 0;
    result.averageLoss = result.totalReturn < 0 ? Math.abs(result.totalReturn) / result.losingTrades : 0;

    // Generate mock equity curve
    result.equityCurve = this.generateMockEquityCurve(result);
  }

  /**
   * Generate mock equity curve
   */
  private generateMockEquityCurve(result: BacktestResult): EquityPoint[] {
    const curve: EquityPoint[] = [];
    const days = (result.endDate.getTime() - result.startDate.getTime()) / (1000 * 60 * 60 * 24);
    
    for (let i = 0; i <= days; i++) {
      const date = new Date(result.startDate);
      date.setDate(date.getDate() + i);
      
      const progress = i / days;
      const volatility = 0.02; // 2% daily volatility
      const randomFactor = (Math.random() - 0.5) * volatility;
      
      const equity = result.initialCapital * (1 + (result.totalReturn / 100) * progress + randomFactor);
      const drawdown = Math.max(0, (result.initialCapital - equity) / result.initialCapital * 100);
      
      curve.push({
        date,
        equity,
        drawdown,
        position: Math.random() > 0.5 ? 1 : 0
      });
    }

    return curve;
  }

  /**
   * Optimize strategy parameters
   */
  async optimizeParameters(
    strategyId: string,
    parameterRanges: Record<string, { min: number; max: number; step: number }>,
    optimizationMetric: 'sharpeRatio' | 'totalReturn' | 'maxDrawdown' | 'winRate' = 'sharpeRatio'
  ): Promise<string> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error('Strategy not found');
    }

    const optimizationId = `optimization_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.emit('optimizationStarted', { optimizationId, strategyId });

    try {
      // Generate parameter combinations
      const parameterCombinations = this.generateParameterCombinations(parameterRanges);
      const results: OptimizationResult['results'] = [];

      // Test each combination
      for (const parameters of parameterCombinations) {
        const result = await this.runBacktest(strategyId, 100000, parameters);
        const backtestResult = this.results.get(result);
        
        if (backtestResult) {
          results.push({
            parameters,
            metrics: {
              totalReturn: backtestResult.totalReturn,
              sharpeRatio: backtestResult.sharpeRatio,
              maxDrawdown: backtestResult.maxDrawdown,
              winRate: backtestResult.winRate
            }
          });
        }
      }

      // Find best parameters
      const bestResult = results.reduce((best, current) => {
        return current.metrics[optimizationMetric] > best.metrics[optimizationMetric] ? current : best;
      });

      const optimization: OptimizationResult = {
        id: optimizationId,
        strategyId,
        parameterRanges,
        results,
        bestParameters: bestResult.parameters,
        bestMetrics: bestResult.metrics,
        optimizationTime: Date.now()
      };

      this.optimizations.set(optimizationId, optimization);
      this.emit('optimizationCompleted', { optimizationId, optimization });

      return optimizationId;
    } catch (error) {
      this.emit('optimizationError', { optimizationId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Generate parameter combinations for optimization
   */
  private generateParameterCombinations(
    parameterRanges: Record<string, { min: number; max: number; step: number }>
  ): Record<string, number>[] {
    const combinations: Record<string, number>[] = [];
    const parameters = Object.keys(parameterRanges);
    
    // Generate all possible combinations
    const generateCombinations = (index: number, current: Record<string, number>) => {
      if (index === parameters.length) {
        combinations.push({ ...current });
        return;
      }

      const param = parameters[index];
      const { min, max, step } = parameterRanges[param];
      
      for (let value = min; value <= max; value += step) {
        current[param] = value;
        generateCombinations(index + 1, current);
      }
    };

    generateCombinations(0, {});
    return combinations;
  }

  /**
   * Get strategy by ID
   */
  async getStrategy(strategyId: string): Promise<BacktestStrategy | null> {
    return this.strategies.get(strategyId) || null;
  }

  /**
   * Get all strategies
   */
  async getAllStrategies(): Promise<BacktestStrategy[]> {
    return Array.from(this.strategies.values());
  }

  /**
   * Get backtest result by ID
   */
  async getBacktestResult(resultId: string): Promise<BacktestResult | null> {
    return this.results.get(resultId) || null;
  }

  /**
   * Get optimization result by ID
   */
  async getOptimizationResult(optimizationId: string): Promise<OptimizationResult | null> {
    return this.optimizations.get(optimizationId) || null;
  }

  /**
   * Delete strategy
   */
  async deleteStrategy(strategyId: string): Promise<boolean> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return false;

    this.strategies.delete(strategyId);
    this.emit('strategyDeleted', { strategyId });
    return true;
  }

  /**
   * Update strategy
   */
  async updateStrategy(strategyId: string, updates: Partial<BacktestStrategy>): Promise<boolean> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return false;

    Object.assign(strategy, updates);
    this.strategies.set(strategyId, strategy);
    this.emit('strategyUpdated', { strategyId, strategy });
    return true;
  }

  /**
   * Get strategy performance summary
   */
  async getStrategyPerformance(strategyId: string): Promise<{
    totalBacktests: number;
    averageReturn: number;
    bestReturn: number;
    worstReturn: number;
    successRate: number;
  } | null> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return null;

    const strategyResults = Array.from(this.results.values())
      .filter(result => result.strategyId === strategyId);

    if (strategyResults.length === 0) {
      return {
        totalBacktests: 0,
        averageReturn: 0,
        bestReturn: 0,
        worstReturn: 0,
        successRate: 0
      };
    }

    const returns = strategyResults.map(result => result.totalReturn);
    const averageReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const bestReturn = Math.max(...returns);
    const worstReturn = Math.min(...returns);
    const successRate = (returns.filter(ret => ret > 0).length / returns.length) * 100;

    return {
      totalBacktests: strategyResults.length,
      averageReturn,
      bestReturn,
      worstReturn,
      successRate
    };
  }
}
