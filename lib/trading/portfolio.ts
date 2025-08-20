import { EventEmitter } from 'events';

export interface Portfolio {
  id: string;
  name: string;
  description: string;
  baseCurrency: string;
  totalValue: number;
  cashBalance: number;
  positions: Position[];
  performance: PortfolioPerformance;
  riskMetrics: RiskMetrics;
  created: Date;
  lastUpdated: Date;
}

export interface Position {
  id: string;
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
  costBasis: number;
  weight: number;
  sector: string;
  assetClass: 'equity' | 'bond' | 'commodity' | 'crypto' | 'option' | 'forex';
  beta: number;
  dividend: number;
  lastUpdated: Date;
}

export interface PortfolioPerformance {
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  calmarRatio: number;
  alpha: number;
  beta: number;
  informationRatio: number;
  treynorRatio: number;
  trackingError: number;
  returnsData: DailyReturn[];
}

export interface DailyReturn {
  date: Date;
  value: number;
  return: number;
  cumulativeReturn: number;
  benchmarkReturn: number;
  relativeReturn: number;
}

export interface RiskMetrics {
  var95: number; // Value at Risk (95% confidence)
  var99: number; // Value at Risk (99% confidence)
  expectedShortfall: number;
  conditionalDrawdown: number;
  correlationMatrix: number[][];
  sectorExposure: Record<string, number>;
  geographicExposure: Record<string, number>;
  currencyExposure: Record<string, number>;
  concentrationRisk: number;
  liquidityRisk: number;
  stressTestResults: StressTestResult[];
}

export interface StressTestResult {
  scenario: string;
  description: string;
  portfolioChange: number;
  portfolioChangePercent: number;
  worstPosition: string;
  worstPositionChange: number;
  duration: number;
  probability: number;
}

export interface RebalancingRecommendation {
  positionId: string;
  symbol: string;
  currentWeight: number;
  targetWeight: number;
  currentQuantity: number;
  targetQuantity: number;
  action: 'buy' | 'sell' | 'hold';
  quantity: number;
  estimatedCost: number;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AllocationTarget {
  type: 'sector' | 'assetClass' | 'geographic' | 'individual';
  identifier: string;
  targetPercent: number;
  currentPercent: number;
  tolerance: number;
  rebalanceThreshold: number;
}

export class PortfolioManager extends EventEmitter {
  private portfolios: Map<string, Portfolio> = new Map();
  private marketData: Map<string, number> = new Map();
  private benchmarkData: Map<string, DailyReturn[]> = new Map();

  constructor() {
    super();
    this.initializeBenchmarkData();
  }

  private initializeBenchmarkData(): void {
    // Initialize with sample SPY benchmark data
    const spyReturns: DailyReturn[] = [];
    const startDate = new Date('2023-01-01');
    
    for (let i = 0; i < 365; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dailyReturn = (Math.random() - 0.5) * 0.03; // ±1.5% daily volatility
      
      spyReturns.push({
        date,
        value: 4000 * Math.exp(dailyReturn * i / 365),
        return: dailyReturn,
        cumulativeReturn: Math.exp(dailyReturn * i / 365) - 1,
        benchmarkReturn: dailyReturn,
        relativeReturn: 0
      });
    }
    
    this.benchmarkData.set('SPY', spyReturns);
  }

  async createPortfolio(portfolio: Omit<Portfolio, 'id' | 'created' | 'lastUpdated'>): Promise<Portfolio> {
    const newPortfolio: Portfolio = {
      ...portfolio,
      id: `portfolio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created: new Date(),
      lastUpdated: new Date()
    };

    this.portfolios.set(newPortfolio.id, newPortfolio);
    this.emit('portfolioCreated', newPortfolio);
    
    return newPortfolio;
  }

  async updatePortfolio(portfolioId: string, updates: Partial<Portfolio>): Promise<Portfolio | null> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    const updatedPortfolio = {
      ...portfolio,
      ...updates,
      id: portfolio.id,
      created: portfolio.created,
      lastUpdated: new Date()
    };

    this.portfolios.set(portfolioId, updatedPortfolio);
    await this.recalculatePortfolioMetrics(portfolioId);
    this.emit('portfolioUpdated', updatedPortfolio);
    
    return updatedPortfolio;
  }

  async addPosition(portfolioId: string, position: Omit<Position, 'id' | 'lastUpdated'>): Promise<Position> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    const newPosition: Position = {
      ...position,
      id: `position_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lastUpdated: new Date()
    };

    portfolio.positions.push(newPosition);
    await this.recalculatePortfolioMetrics(portfolioId);
    this.emit('positionAdded', { portfolioId, position: newPosition });
    
    return newPosition;
  }

  async updatePosition(portfolioId: string, positionId: string, updates: Partial<Position>): Promise<Position | null> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    const positionIndex = portfolio.positions.findIndex(p => p.id === positionId);
    if (positionIndex === -1) {
      return null;
    }

    portfolio.positions[positionIndex] = {
      ...portfolio.positions[positionIndex],
      ...updates,
      id: positionId,
      lastUpdated: new Date()
    };

    await this.recalculatePortfolioMetrics(portfolioId);
    this.emit('positionUpdated', { portfolioId, position: portfolio.positions[positionIndex] });
    
    return portfolio.positions[positionIndex];
  }

  async removePosition(portfolioId: string, positionId: string): Promise<boolean> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    const initialLength = portfolio.positions.length;
    portfolio.positions = portfolio.positions.filter(p => p.id !== positionId);
    
    if (portfolio.positions.length < initialLength) {
      await this.recalculatePortfolioMetrics(portfolioId);
      this.emit('positionRemoved', { portfolioId, positionId });
      return true;
    }
    
    return false;
  }

  async updateMarketData(symbol: string, price: number): Promise<void> {
    this.marketData.set(symbol, price);
    
    // Update all portfolios that have this symbol
    for (const [portfolioId, portfolio] of Array.from(this.portfolios)) {
      const position = portfolio.positions.find(p => p.symbol === symbol);
      if (position) {
        position.currentPrice = price;
        position.marketValue = position.quantity * price;
        position.unrealizedPnL = position.marketValue - position.costBasis;
        position.lastUpdated = new Date();
        
        await this.recalculatePortfolioMetrics(portfolioId);
      }
    }
    
    this.emit('marketDataUpdated', { symbol, price });
  }

  async recalculatePortfolioMetrics(portfolioId: string): Promise<void> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) return;

    // Update portfolio totals
    const totalMarketValue = portfolio.positions.reduce((sum, pos) => sum + pos.marketValue, 0);
    portfolio.totalValue = totalMarketValue + portfolio.cashBalance;

    // Update position weights
    portfolio.positions.forEach(position => {
      position.weight = position.marketValue / portfolio.totalValue;
    });

    // Calculate performance metrics
    await this.calculatePerformanceMetrics(portfolio);
    
    // Calculate risk metrics
    await this.calculateRiskMetrics(portfolio);

    portfolio.lastUpdated = new Date();
    this.emit('portfolioMetricsUpdated', portfolio);
  }

  private async calculatePerformanceMetrics(portfolio: Portfolio): Promise<void> {
    const returns = this.generateReturnsSeries(portfolio);
    const benchmarkReturns = this.benchmarkData.get('SPY') || [];
    
    if (returns.length === 0) return;

    const totalReturn = returns[returns.length - 1].cumulativeReturn;
    const totalReturnPercent = totalReturn * 100;
    const annualizedReturn = Math.pow(1 + totalReturn, 252 / returns.length) - 1;
    
    const returnValues = returns.map(r => r.return);
    const avgReturn = returnValues.reduce((sum, r) => sum + r, 0) / returnValues.length;
    const volatility = Math.sqrt(returnValues.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returnValues.length) * Math.sqrt(252);
    
    const sharpeRatio = (annualizedReturn - 0.02) / volatility; // Assuming 2% risk-free rate
    
    // Calculate downside deviation for Sortino ratio
    const downsideReturns = returnValues.filter(r => r < 0);
    const downsideDeviation = downsideReturns.length > 0 
      ? Math.sqrt(downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length) * Math.sqrt(252)
      : volatility;
    const sortinoRatio = (annualizedReturn - 0.02) / downsideDeviation;

    // Calculate maximum drawdown
    let maxValue = portfolio.totalValue;
    let maxDrawdown = 0;
    for (const returnData of returns) {
      if (returnData.value > maxValue) {
        maxValue = returnData.value;
      } else {
        const drawdown = (maxValue - returnData.value) / maxValue;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    }

    const calmarRatio = annualizedReturn / maxDrawdown;

    // Calculate beta and alpha
    const portfolioReturns = returns.map(r => r.return);
    const benchmarkReturn = benchmarkReturns.map(r => r.return);
    const beta = this.calculateBeta(portfolioReturns, benchmarkReturn);
    const benchmarkAvgReturn = benchmarkReturn.reduce((sum, r) => sum + r, 0) / benchmarkReturn.length;
    const alpha = avgReturn - (0.02 / 252 + beta * (benchmarkAvgReturn - 0.02 / 252)); // Daily alpha

    portfolio.performance = {
      totalReturn,
      totalReturnPercent,
      annualizedReturn,
      volatility,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      calmarRatio,
      alpha: alpha * 252, // Annualized alpha
      beta,
      informationRatio: this.calculateInformationRatio(portfolioReturns, benchmarkReturn),
      treynorRatio: (annualizedReturn - 0.02) / beta,
      trackingError: this.calculateTrackingError(portfolioReturns, benchmarkReturn),
      returnsData: returns
    };
  }

  private calculateBeta(portfolioReturns: number[], benchmarkReturns: number[]): number {
    const minLength = Math.min(portfolioReturns.length, benchmarkReturns.length);
    const portReturns = portfolioReturns.slice(-minLength);
    const benchReturns = benchmarkReturns.slice(-minLength);
    
    const portAvg = portReturns.reduce((sum, r) => sum + r, 0) / portReturns.length;
    const benchAvg = benchReturns.reduce((sum, r) => sum + r, 0) / benchReturns.length;
    
    let covariance = 0;
    let benchVariance = 0;
    
    for (let i = 0; i < minLength; i++) {
      const portDiff = portReturns[i] - portAvg;
      const benchDiff = benchReturns[i] - benchAvg;
      covariance += portDiff * benchDiff;
      benchVariance += benchDiff * benchDiff;
    }
    
    return benchVariance !== 0 ? covariance / benchVariance : 1;
  }

  private calculateInformationRatio(portfolioReturns: number[], benchmarkReturns: number[]): number {
    const minLength = Math.min(portfolioReturns.length, benchmarkReturns.length);
    const excessReturns = portfolioReturns.slice(-minLength).map((r, i) => r - benchmarkReturns[i]);
    const avgExcess = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
    const trackingError = Math.sqrt(excessReturns.reduce((sum, r) => sum + Math.pow(r - avgExcess, 2), 0) / excessReturns.length);
    
    return trackingError !== 0 ? (avgExcess * Math.sqrt(252)) / (trackingError * Math.sqrt(252)) : 0;
  }

  private calculateTrackingError(portfolioReturns: number[], benchmarkReturns: number[]): number {
    const minLength = Math.min(portfolioReturns.length, benchmarkReturns.length);
    const excessReturns = portfolioReturns.slice(-minLength).map((r, i) => r - benchmarkReturns[i]);
    const avgExcess = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
    
    return Math.sqrt(excessReturns.reduce((sum, r) => sum + Math.pow(r - avgExcess, 2), 0) / excessReturns.length) * Math.sqrt(252);
  }

  private generateReturnsSeries(portfolio: Portfolio): DailyReturn[] {
    // This would typically come from historical data
    // For now, generate sample return series
    const returns: DailyReturn[] = [];
    const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    let cumulativeReturn = 0;
    
    for (let i = 0; i < 365; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dailyReturn = (Math.random() - 0.45) * 0.03; // Slightly positive bias
      cumulativeReturn = (1 + cumulativeReturn) * (1 + dailyReturn) - 1;
      
      returns.push({
        date,
        value: portfolio.totalValue * (1 + cumulativeReturn),
        return: dailyReturn,
        cumulativeReturn,
        benchmarkReturn: (Math.random() - 0.5) * 0.025,
        relativeReturn: 0
      });
    }
    
    return returns;
  }

  private async calculateRiskMetrics(portfolio: Portfolio): Promise<void> {
    const returns = portfolio.performance.returnsData.map(r => r.return);
    
    // Value at Risk calculations
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const var95Index = Math.floor(returns.length * 0.05);
    const var99Index = Math.floor(returns.length * 0.01);
    
    const var95 = sortedReturns[var95Index] * portfolio.totalValue;
    const var99 = sortedReturns[var99Index] * portfolio.totalValue;
    
    // Expected Shortfall (Conditional VaR)
    const tailLosses = sortedReturns.slice(0, var95Index);
    const expectedShortfall = tailLosses.length > 0 
      ? (tailLosses.reduce((sum, r) => sum + r, 0) / tailLosses.length) * portfolio.totalValue
      : var95;

    // Sector exposure
    const sectorExposure: Record<string, number> = {};
    portfolio.positions.forEach(position => {
      sectorExposure[position.sector] = (sectorExposure[position.sector] || 0) + position.weight;
    });

    // Asset class exposure
    const assetClassExposure: Record<string, number> = {};
    portfolio.positions.forEach(position => {
      assetClassExposure[position.assetClass] = (assetClassExposure[position.assetClass] || 0) + position.weight;
    });

    // Concentration risk (Herfindahl-Hirschman Index)
    const concentrationRisk = portfolio.positions.reduce((sum, pos) => sum + Math.pow(pos.weight, 2), 0);

    // Generate stress test scenarios
    const stressTestResults: StressTestResult[] = [
      {
        scenario: 'Market Crash 2008',
        description: 'Simulates conditions similar to the 2008 financial crisis',
        portfolioChange: -0.35 * portfolio.totalValue,
        portfolioChangePercent: -35,
        worstPosition: portfolio.positions[0]?.symbol || 'N/A',
        worstPositionChange: -0.45,
        duration: 180,
        probability: 0.02
      },
      {
        scenario: 'COVID-19 Pandemic',
        description: 'Simulates the initial market shock from COVID-19',
        portfolioChange: -0.25 * portfolio.totalValue,
        portfolioChangePercent: -25,
        worstPosition: portfolio.positions[0]?.symbol || 'N/A',
        worstPositionChange: -0.40,
        duration: 30,
        probability: 0.05
      },
      {
        scenario: 'Interest Rate Shock',
        description: 'Rapid increase in interest rates by 300bp',
        portfolioChange: -0.15 * portfolio.totalValue,
        portfolioChangePercent: -15,
        worstPosition: portfolio.positions[0]?.symbol || 'N/A',
        worstPositionChange: -0.25,
        duration: 90,
        probability: 0.10
      }
    ];

    portfolio.riskMetrics = {
      var95,
      var99,
      expectedShortfall,
      conditionalDrawdown: Math.abs(expectedShortfall / portfolio.totalValue),
      correlationMatrix: this.calculateCorrelationMatrix(portfolio.positions),
      sectorExposure,
      geographicExposure: { 'US': 0.8, 'International': 0.2 }, // Simplified
      currencyExposure: { [portfolio.baseCurrency]: 1.0 },
      concentrationRisk,
      liquidityRisk: this.calculateLiquidityRisk(portfolio.positions),
      stressTestResults
    };
  }

  private calculateCorrelationMatrix(positions: Position[]): number[][] {
    // Simplified correlation matrix - in reality would use historical price data
    const size = positions.length;
    const matrix: number[][] = [];
    
    for (let i = 0; i < size; i++) {
      matrix[i] = [];
      for (let j = 0; j < size; j++) {
        if (i === j) {
          matrix[i][j] = 1.0;
        } else {
          // Generate realistic correlation (0.3-0.8 for same sector, 0.1-0.5 for different)
          const sameSector = positions[i].sector === positions[j].sector;
          matrix[i][j] = sameSector ? 0.3 + Math.random() * 0.5 : 0.1 + Math.random() * 0.4;
        }
      }
    }
    
    return matrix;
  }

  private calculateLiquidityRisk(positions: Position[]): number {
    // Simplified liquidity risk calculation based on position sizes and asset classes
    let liquidityScore = 0;
    
    positions.forEach(position => {
      let assetLiquidity = 1.0;
      
      // Adjust based on asset class
      switch (position.assetClass) {
        case 'equity':
          assetLiquidity = position.marketValue < 1000000 ? 0.9 : 0.7;
          break;
        case 'bond':
          assetLiquidity = 0.6;
          break;
        case 'commodity':
          assetLiquidity = 0.5;
          break;
        case 'crypto':
          assetLiquidity = 0.4;
          break;
        case 'option':
          assetLiquidity = 0.3;
          break;
        default:
          assetLiquidity = 0.8;
      }
      
      liquidityScore += position.weight * assetLiquidity;
    });
    
    return 1.0 - liquidityScore; // Higher score means higher risk
  }

  async generateRebalancingRecommendations(
    portfolioId: string,
    targets: AllocationTarget[]
  ): Promise<RebalancingRecommendation[]> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`);
    }

    const recommendations: RebalancingRecommendation[] = [];
    
    for (const target of targets) {
      const deviation = Math.abs(target.currentPercent - target.targetPercent);
      
      if (deviation > target.rebalanceThreshold) {
        const targetValue = portfolio.totalValue * (target.targetPercent / 100);
        // const currentValue = portfolio.totalValue * (target.currentPercent / 100);
        // const difference = targetValue - currentValue;
        
        // Find positions that match this target
        const relevantPositions = portfolio.positions.filter(pos => {
          switch (target.type) {
            case 'sector':
              return pos.sector === target.identifier;
            case 'assetClass':
              return pos.assetClass === target.identifier;
            case 'individual':
              return pos.symbol === target.identifier;
            default:
              return false;
          }
        });

        for (const position of relevantPositions) {
          const newTargetValue = (targetValue / relevantPositions.length);
          const currentPositionValue = position.marketValue;
          const positionDifference = newTargetValue - currentPositionValue;
          const quantity = Math.abs(Math.floor(positionDifference / position.currentPrice));
          
          if (quantity > 0) {
            recommendations.push({
              positionId: position.id,
              symbol: position.symbol,
              currentWeight: position.weight * 100,
              targetWeight: (newTargetValue / portfolio.totalValue) * 100,
              currentQuantity: position.quantity,
              targetQuantity: position.quantity + Math.floor(positionDifference / position.currentPrice),
              action: positionDifference > 0 ? 'buy' : 'sell',
              quantity,
              estimatedCost: quantity * position.currentPrice,
              reasoning: `Rebalance ${target.type} ${target.identifier} from ${target.currentPercent.toFixed(1)}% to ${target.targetPercent.toFixed(1)}%`,
              priority: deviation > target.tolerance * 2 ? 'high' : deviation > target.tolerance ? 'medium' : 'low'
            });
          }
        }
      }
    }

    this.emit('rebalancingRecommendationsGenerated', { portfolioId, recommendations });
    return recommendations;
  }

  getPortfolio(portfolioId: string): Portfolio | null {
    return this.portfolios.get(portfolioId) || null;
  }

  getAllPortfolios(): Portfolio[] {
    return Array.from(this.portfolios.values());
  }

  async deletePortfolio(portfolioId: string): Promise<boolean> {
    const deleted = this.portfolios.delete(portfolioId);
    if (deleted) {
      this.emit('portfolioDeleted', portfolioId);
    }
    return deleted;
  }
}

export const portfolioManager = new PortfolioManager();