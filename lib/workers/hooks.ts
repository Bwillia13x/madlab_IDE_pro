/**
 * React hooks for financial calculations using Web Workers
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  financialWorker, 
  calculateMonteCarlo,
  calculateVaR,
  calculateBlackScholes,
  type WorkerRequest 
} from './financial-worker';
import { analytics } from '../analytics';

interface CalculationState<T = any> {
  data: T | null;
  loading: boolean;
  error: string | null;
  executionTime: number | null;
}

/**
 * Hook for Monte Carlo simulations
 */
export function useMonteCarloSimulation() {
  const [state, setState] = useState<CalculationState>({
    data: null,
    loading: false,
    error: null,
    executionTime: null,
  });

  const calculate = useCallback(async (params: Parameters<typeof calculateMonteCarlo>[0]) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const startTime = performance.now();
      const result = await calculateMonteCarlo(params);
      const executionTime = performance.now() - startTime;
      
      setState({
        data: result,
        loading: false,
        error: null,
        executionTime,
      });

      // Track calculation in analytics
      analytics.trackPerformance({
        name: 'monte_carlo_simulation',
        value: executionTime,
        context: {
          simulations: params.numSimulations,
          steps: params.numSteps,
        },
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Calculation failed';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage,
        executionTime: performance.now() - performance.now(),
      }));
      
      analytics.track('calculation_error', {
        type: 'monte_carlo',
        error: errorMessage,
      }, 'error');
      
      throw error;
    }
  }, []);

  return { ...state, calculate };
}

/**
 * Hook for Value at Risk calculations
 */
export function useVaRCalculation() {
  const [state, setState] = useState<CalculationState>({
    data: null,
    loading: false,
    error: null,
    executionTime: null,
  });

  const calculate = useCallback(async (params: Parameters<typeof calculateVaR>[0]) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const startTime = performance.now();
      const result = await calculateVaR(params);
      const executionTime = performance.now() - startTime;
      
      setState({
        data: result,
        loading: false,
        error: null,
        executionTime,
      });

      analytics.trackPerformance({
        name: 'var_calculation',
        value: executionTime,
        context: {
          method: params.method,
          confidence_level: params.confidenceLevel,
          sample_size: params.returns.length,
        },
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Calculation failed';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage,
        executionTime: performance.now() - performance.now(),
      }));
      
      analytics.track('calculation_error', {
        type: 'var_calculation',
        error: errorMessage,
      }, 'error');
      
      throw error;
    }
  }, []);

  return { ...state, calculate };
}

/**
 * Hook for Black-Scholes option pricing
 */
export function useBlackScholesCalculation() {
  const [state, setState] = useState<CalculationState>({
    data: null,
    loading: false,
    error: null,
    executionTime: null,
  });

  const calculate = useCallback(async (params: Parameters<typeof calculateBlackScholes>[0]) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const startTime = performance.now();
      const result = await calculateBlackScholes(params);
      const executionTime = performance.now() - startTime;
      
      setState({
        data: result,
        loading: false,
        error: null,
        executionTime,
      });

      analytics.trackPerformance({
        name: 'black_scholes_calculation',
        value: executionTime,
        context: {
          option_type: params.optionType,
          time_to_expiry: params.timeToExpiry,
          spot_price: params.spot,
          strike_price: params.strike,
        },
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Calculation failed';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage,
        executionTime: performance.now() - performance.now(),
      }));
      
      analytics.track('calculation_error', {
        type: 'black_scholes',
        error: errorMessage,
      }, 'error');
      
      throw error;
    }
  }, []);

  return { ...state, calculate };
}

/**
 * Generic hook for any financial calculation
 */
export function useFinancialCalculation<T = any>() {
  const [state, setState] = useState<CalculationState<T>>({
    data: null,
    loading: false,
    error: null,
    executionTime: null,
  });

  const calculate = useCallback(async (request: WorkerRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const startTime = performance.now();
      const result = await financialWorker.calculate<T>(request);
      const executionTime = performance.now() - startTime;
      
      setState({
        data: result,
        loading: false,
        error: null,
        executionTime,
      });

      analytics.trackPerformance({
        name: `financial_calculation_${request.type}`,
        value: executionTime,
        context: request.payload,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Calculation failed';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage,
        executionTime: performance.now() - performance.now(),
      }));
      
      analytics.track('calculation_error', {
        type: request.type,
        error: errorMessage,
      }, 'error');
      
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      executionTime: null,
    });
  }, []);

  return { ...state, calculate, reset };
}

/**
 * Hook for managing multiple concurrent calculations
 */
export function useCalculationQueue() {
  const [queue, setQueue] = useState<Array<{
    id: string;
    request: WorkerRequest;
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: any;
    error?: string;
    executionTime?: number;
  }>>([]);

  const activeCount = useRef(0);
  const maxConcurrent = 3; // Limit concurrent calculations

  const addCalculation = useCallback((request: WorkerRequest) => {
    const id = `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    setQueue(prev => [...prev, {
      id,
      request,
      status: 'pending',
    }]);

    return id;
  }, []);

  const processQueue = useCallback(async () => {
    if (activeCount.current >= maxConcurrent) return;

    setQueue(prev => {
      const nextPending = prev.find(calc => calc.status === 'pending');
      if (!nextPending) return prev;

      activeCount.current++;
      
      // Start the calculation
      (async () => {
        try {
          setQueue(current => current.map(calc => 
            calc.id === nextPending.id 
              ? { ...calc, status: 'running' as const }
              : calc
          ));

          const startTime = performance.now();
          const result = await financialWorker.calculate(nextPending.request);
          const executionTime = performance.now() - startTime;

          setQueue(current => current.map(calc => 
            calc.id === nextPending.id 
              ? { 
                  ...calc, 
                  status: 'completed' as const, 
                  result, 
                  executionTime 
                }
              : calc
          ));
        } catch (error) {
          setQueue(current => current.map(calc => 
            calc.id === nextPending.id 
              ? { 
                  ...calc, 
                  status: 'failed' as const, 
                  error: error instanceof Error ? error.message : 'Calculation failed' 
                }
              : calc
          ));
        } finally {
          activeCount.current--;
          // Process next in queue
          setTimeout(processQueue, 0);
        }
      })();

      return prev.map(calc => 
        calc.id === nextPending.id 
          ? { ...calc, status: 'running' as const }
          : calc
      );
    });
  }, []);

  // Auto-process queue when new items are added
  useEffect(() => {
    processQueue();
  }, [queue.length, processQueue]);

  const removeCalculation = useCallback((id: string) => {
    setQueue(prev => prev.filter(calc => calc.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setQueue(prev => prev.filter(calc => calc.status !== 'completed' && calc.status !== 'failed'));
  }, []);

  const clearAll = useCallback(() => {
    setQueue([]);
    activeCount.current = 0;
  }, []);

  return {
    queue,
    addCalculation,
    removeCalculation,
    clearCompleted,
    clearAll,
    stats: {
      total: queue.length,
      pending: queue.filter(c => c.status === 'pending').length,
      running: queue.filter(c => c.status === 'running').length,
      completed: queue.filter(c => c.status === 'completed').length,
      failed: queue.filter(c => c.status === 'failed').length,
    },
  };
}

// Cleanup worker on app unmount
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    financialWorker.terminate();
  });
}