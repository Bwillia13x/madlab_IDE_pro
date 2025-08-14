/**
 * Financial Calculations Web Worker
 * Handles intensive calculations without blocking the UI thread
 */

// Financial calculation types
export interface MonteCarloRequest {
  type: 'monte_carlo';
  payload: {
    initialPrice: number;
    volatility: number;
    riskFreeRate: number;
    timeHorizon: number;
    numSimulations: number;
    numSteps: number;
    seed?: number;
  };
}

export interface VaRRequest {
  type: 'var_calculation';
  payload: {
    returns: number[];
    confidenceLevel: number;
    method: 'historical' | 'parametric' | 'monte_carlo';
  };
}

export interface BlackScholesRequest {
  type: 'black_scholes';
  payload: {
    spot: number;
    strike: number;
    timeToExpiry: number;
    riskFreeRate: number;
    volatility: number;
    optionType: 'call' | 'put';
    dividendYield?: number;
  };
}

export interface PortfolioOptimizationRequest {
  type: 'portfolio_optimization';
  payload: {
    returns: number[][];
    expectedReturns: number[];
    riskFreeRate: number;
    method: 'mean_variance' | 'black_litterman' | 'risk_parity';
  };
}

export type WorkerRequest = 
  | MonteCarloRequest 
  | VaRRequest 
  | BlackScholesRequest 
  | PortfolioOptimizationRequest;

export interface WorkerResponse<T = any> {
  id: string;
  success: boolean;
  data?: T;
  error?: string;
  executionTime: number;
}

// Web Worker implementation
class FinancialWorker {
  private worker: Worker | null = null;
  private messageId = 0;
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (typeof window === 'undefined') return;

    try {
      // Create worker from blob to avoid separate file
      const workerScript = this.getWorkerScript();
      const blob = new Blob([workerScript], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));

      this.worker.onmessage = (event) => {
        const response: WorkerResponse = event.data;
        const pending = this.pendingRequests.get(response.id);
        
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(response.id);
          
          if (response.success) {
            pending.resolve(response);
          } else {
            pending.reject(new Error(response.error || 'Calculation failed'));
          }
        }
      };

      this.worker.onerror = (error) => {
        console.error('[FinancialWorker] Error:', error);
        this.pendingRequests.forEach(({ reject, timeout }) => {
          clearTimeout(timeout);
          reject(new Error('Worker error'));
        });
        this.pendingRequests.clear();
      };
    } catch (error) {
      console.error('[FinancialWorker] Failed to initialize worker:', error);
    }
  }

  /**
   * Execute financial calculation in worker
   */
  async calculate<T = any>(request: WorkerRequest, timeoutMs = 30000): Promise<T> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    return new Promise<T>((resolve, reject) => {
      const id = `req_${++this.messageId}`;
      
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Calculation timeout'));
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve: resolve as any, reject, timeout });

      this.worker!.postMessage({ id, ...request });
    });
  }

  /**
   * Terminate worker
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    this.pendingRequests.forEach(({ timeout }) => clearTimeout(timeout));
    this.pendingRequests.clear();
  }

  /**
   * Get worker script as string
   */
  private getWorkerScript(): string {
    return `
      // Financial calculation functions
      function normalRandom() {
        let u1 = Math.random();
        let u2 = Math.random();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      }

      function monteCarloSimulation(params) {
        const { initialPrice, volatility, riskFreeRate, timeHorizon, numSimulations, numSteps } = params;
        const dt = timeHorizon / numSteps;
        const drift = (riskFreeRate - 0.5 * volatility * volatility) * dt;
        const diffusion = volatility * Math.sqrt(dt);
        
        const results = [];
        
        for (let i = 0; i < numSimulations; i++) {
          let price = initialPrice;
          const path = [price];
          
          for (let j = 0; j < numSteps; j++) {
            const random = normalRandom();
            price *= Math.exp(drift + diffusion * random);
            path.push(price);
          }
          
          results.push({
            finalPrice: price,
            path,
            return: (price - initialPrice) / initialPrice
          });
        }
        
        return {
          simulations: results,
          statistics: {
            meanFinalPrice: results.reduce((sum, r) => sum + r.finalPrice, 0) / results.length,
            meanReturn: results.reduce((sum, r) => sum + r.return, 0) / results.length,
            stdReturn: Math.sqrt(results.reduce((sum, r) => sum + Math.pow(r.return - 
              results.reduce((s, r2) => s + r2.return, 0) / results.length, 2), 0) / results.length)
          }
        };
      }

      function calculateVaR(params) {
        const { returns, confidenceLevel, method } = params;
        
        if (method === 'historical') {
          const sortedReturns = [...returns].sort((a, b) => a - b);
          const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
          return {
            var: -sortedReturns[index],
            expectedShortfall: -sortedReturns.slice(0, index + 1).reduce((sum, r) => sum + r, 0) / (index + 1)
          };
        }
        
        if (method === 'parametric') {
          const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
          const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
          const std = Math.sqrt(variance);
          
          // Approximate normal quantile for common confidence levels
          const quantiles = {
            0.95: 1.645,
            0.99: 2.326,
            0.999: 3.090
          };
          
          const quantile = quantiles[confidenceLevel] || 1.645;
          return {
            var: -(mean - quantile * std),
            expectedShortfall: -(mean - std * Math.exp(-0.5 * quantile * quantile) / (Math.sqrt(2 * Math.PI) * (1 - confidenceLevel)))
          };
        }
        
        throw new Error('Unsupported VaR method');
      }

      function calculateBlackScholes(params) {
        const { spot, strike, timeToExpiry, riskFreeRate, volatility, optionType, dividendYield = 0 } = params;
        
        const d1 = (Math.log(spot / strike) + (riskFreeRate - dividendYield + 0.5 * volatility * volatility) * timeToExpiry) / 
                   (volatility * Math.sqrt(timeToExpiry));
        const d2 = d1 - volatility * Math.sqrt(timeToExpiry);
        
        // Cumulative normal distribution approximation
        function cumulativeNormal(x) {
          const a1 =  0.254829592;
          const a2 = -0.284496736;
          const a3 =  1.421413741;
          const a4 = -1.453152027;
          const a5 =  1.061405429;
          const p  =  0.3275911;
          
          const sign = x < 0 ? -1 : 1;
          x = Math.abs(x) / Math.sqrt(2);
          
          const t = 1 / (1 + p * x);
          const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
          
          return 0.5 * (1 + sign * y);
        }
        
        const Nd1 = cumulativeNormal(d1);
        const Nd2 = cumulativeNormal(d2);
        const NegD1 = cumulativeNormal(-d1);
        const NegD2 = cumulativeNormal(-d2);
        
        let price, delta, gamma, theta, vega, rho;
        
        if (optionType === 'call') {
          price = spot * Math.exp(-dividendYield * timeToExpiry) * Nd1 - 
                  strike * Math.exp(-riskFreeRate * timeToExpiry) * Nd2;
          delta = Math.exp(-dividendYield * timeToExpiry) * Nd1;
          rho = strike * timeToExpiry * Math.exp(-riskFreeRate * timeToExpiry) * Nd2;
        } else {
          price = strike * Math.exp(-riskFreeRate * timeToExpiry) * NegD2 - 
                  spot * Math.exp(-dividendYield * timeToExpiry) * NegD1;
          delta = -Math.exp(-dividendYield * timeToExpiry) * NegD1;
          rho = -strike * timeToExpiry * Math.exp(-riskFreeRate * timeToExpiry) * NegD2;
        }
        
        // Greeks (common for both call and put)
        gamma = Math.exp(-dividendYield * timeToExpiry) * Math.exp(-0.5 * d1 * d1) / 
                (spot * volatility * Math.sqrt(2 * Math.PI * timeToExpiry));
        
        theta = (-spot * Math.exp(-dividendYield * timeToExpiry) * Math.exp(-0.5 * d1 * d1) * volatility / 
                 (2 * Math.sqrt(2 * Math.PI * timeToExpiry))) / 365; // Daily theta
        
        vega = spot * Math.exp(-dividendYield * timeToExpiry) * Math.sqrt(timeToExpiry) * 
               Math.exp(-0.5 * d1 * d1) / Math.sqrt(2 * Math.PI) / 100; // 1% vol change
        
        return { price, delta, gamma, theta, vega, rho, d1, d2 };
      }

      // Worker message handler
      self.onmessage = function(event) {
        const { id, type, payload } = event.data;
        const startTime = performance.now();
        
        try {
          let result;
          
          switch (type) {
            case 'monte_carlo':
              result = monteCarloSimulation(payload);
              break;
            case 'var_calculation':
              result = calculateVaR(payload);
              break;
            case 'black_scholes':
              result = calculateBlackScholes(payload);
              break;
            case 'portfolio_optimization':
              throw new Error('Portfolio optimization not implemented yet');
            default:
              throw new Error('Unknown calculation type: ' + type);
          }
          
          self.postMessage({
            id,
            success: true,
            data: result,
            executionTime: performance.now() - startTime
          });
        } catch (error) {
          self.postMessage({
            id,
            success: false,
            error: error.message,
            executionTime: performance.now() - startTime
          });
        }
      };
    `;
  }
}

// Create singleton instance
export const financialWorker = new FinancialWorker();

// Convenience functions
export const calculateMonteCarlo = (params: MonteCarloRequest['payload']) =>
  financialWorker.calculate<any>({ type: 'monte_carlo', payload: params });

export const calculateVaR = (params: VaRRequest['payload']) =>
  financialWorker.calculate<any>({ type: 'var_calculation', payload: params });

export const calculateBlackScholes = (params: BlackScholesRequest['payload']) =>
  financialWorker.calculate<any>({ type: 'black_scholes', payload: params });

export default financialWorker;