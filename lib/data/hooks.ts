import { useState, useEffect, useCallback } from 'react';
import { useWorkspaceStore } from '@/lib/store';
import { mockAdapter } from './adapters/mock';
import type { PriceRange, KpiData, PricePoint, FinancialData } from './provider.types';

// Data provider registry
const providers = {
  mock: mockAdapter,
  // TODO: Add real providers (Alpha Vantage, Yahoo Finance, etc.)
};

// Cache for data
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(type: string, symbol: string, range?: string): string {
  return `${type}:${symbol}:${range || 'default'}`;
}

function getCachedData<T>(key: string): T | null {
  const cached = cache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > cached.ttl) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
}

function setCachedData(key: string, data: any, ttl: number = CACHE_TTL): void {
  cache.set(key, { data, timestamp: Date.now(), ttl });
}

export function useKpis(symbol?: string) {
  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { dataProvider } = useWorkspaceStore();

  const fetchData = useCallback(async () => {
    if (!symbol) return;
    
    const cacheKey = getCacheKey('kpis', symbol);
    const cached = getCachedData<KpiData>(cacheKey);
    
    if (cached) {
      setData(cached);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const provider = providers[dataProvider as keyof typeof providers] || providers.mock;
      const kpiData = await provider.getKpis(symbol);
      setData(kpiData);
      setCachedData(cacheKey, kpiData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch KPI data');
    } finally {
      setLoading(false);
    }
  }, [symbol, dataProvider]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function usePrices(symbol?: string, range: PriceRange = '6M') {
  const [data, setData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { dataProvider } = useWorkspaceStore();

  const fetchData = useCallback(async () => {
    if (!symbol) return;
    
    const cacheKey = getCacheKey('prices', symbol, range);
    const cached = getCachedData<PricePoint[]>(cacheKey);
    
    if (cached) {
      setData(cached);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const provider = providers[dataProvider as keyof typeof providers] || providers.mock;
      const priceData = await provider.getPrices(symbol, range);
      setData(priceData);
      setCachedData(cacheKey, priceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch price data');
    } finally {
      setLoading(false);
    }
  }, [symbol, range, dataProvider]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useFinancials(symbol?: string) {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { dataProvider } = useWorkspaceStore();

  const fetchData = useCallback(async () => {
    if (!symbol) return;
    
    const cacheKey = getCacheKey('financials', symbol);
    const cached = getCachedData<FinancialData>(cacheKey);
    
    if (cached) {
      setData(cached);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const provider = providers[dataProvider as keyof typeof providers] || providers.mock;
      const financialData = await provider.getFinancials(symbol);
      setData(financialData);
      setCachedData(cacheKey, financialData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch financial data');
    } finally {
      setLoading(false);
    }
  }, [symbol, dataProvider]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useDataCache() {
  const clearCache = useCallback(() => {
    cache.clear();
  }, []);

  const clearSymbolCache = useCallback((symbol: string) => {
    Array.from(cache.keys()).forEach(key => {
      if (key.includes(`:${symbol}:`)) {
        cache.delete(key);
      }
    });
  }, []);

  return { clearCache, clearSymbolCache };
}