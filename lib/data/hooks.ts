import { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkspaceStore } from '@/lib/store';
import { getProvider } from './providers';
import type { PriceRange, KpiData, PricePoint, FinancialData } from './provider.types';

// In-flight request cancellation helpers
function useAbortRef() {
  const ref = useRef<AbortController | null>(null);
  useEffect(() => () => {
    ref.current?.abort();
  }, []);
  return ref;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Cache for data
const cache = new Map<string, CacheEntry<unknown>>();

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
  
  return cached.data as T;
}

function setCachedData<T>(key: string, data: T, ttl: number = CACHE_TTL): void {
  cache.set(key, { data, timestamp: Date.now(), ttl });
}

export function useKpis(symbol?: string) {
  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { dataProvider, globalSymbol } = useWorkspaceStore();
  const abortRef = useAbortRef();

  const fetchData = useCallback(async () => {
    const sym = (symbol || globalSymbol || '').toUpperCase();
    if (!sym) return;
    
    const cacheKey = getCacheKey('kpis', sym);
    const cached = getCachedData<KpiData>(cacheKey);
    
    if (cached) {
      setData(cached);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;
      const provider = getProvider(dataProvider);
      const attempt = async (tries = 2, delay = 250): Promise<KpiData> => {
        try {
          return await provider.getKpis(sym);
        } catch (e) {
          if (tries <= 0 || controller.signal.aborted) throw e;
          await new Promise((r) => setTimeout(r, delay));
          return attempt(tries - 1, Math.min(delay * 2, 2000));
        }
      };
      const kpiData = await attempt();
      setData(kpiData);
      setCachedData(cacheKey, kpiData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch KPI data');
    } finally {
      setLoading(false);
      }
  }, [symbol, globalSymbol, dataProvider]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function usePrices(symbol?: string, range?: PriceRange) {
  const [data, setData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { dataProvider, globalSymbol, globalTimeframe } = useWorkspaceStore();
  const abortRef = useAbortRef();

  const fetchData = useCallback(async () => {
    const sym = (symbol || globalSymbol || '').toUpperCase();
    const rng = range || globalTimeframe || '6M';
    if (!sym) return;
    
    const cacheKey = getCacheKey('prices', sym, rng);
    const cached = getCachedData<PricePoint[]>(cacheKey);
    
    if (cached) {
      setData(cached);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;
      const provider = getProvider(dataProvider);
      const attempt = async (tries = 2, delay = 250): Promise<PricePoint[]> => {
        try {
          return await provider.getPrices(sym, rng);
        } catch (e) {
          if (tries <= 0 || controller.signal.aborted) throw e;
          await new Promise((r) => setTimeout(r, delay));
          return attempt(tries - 1, Math.min(delay * 2, 2000));
        }
      };
      const priceData = await attempt();
      setData(priceData);
      setCachedData(cacheKey, priceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch price data');
    } finally {
      setLoading(false);
    }
  }, [symbol, range, dataProvider, globalSymbol, globalTimeframe]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useFinancials(symbol?: string) {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { dataProvider, globalSymbol } = useWorkspaceStore();
  const abortRef = useAbortRef();

  const fetchData = useCallback(async () => {
    const sym = (symbol || globalSymbol || '').toUpperCase();
    if (!sym) return;
    
    const cacheKey = getCacheKey('financials', sym);
    const cached = getCachedData<FinancialData>(cacheKey);
    
    if (cached) {
      setData(cached);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;
      const provider = getProvider(dataProvider);
      const attempt = async (tries = 2, delay = 250): Promise<FinancialData> => {
        try {
          return await provider.getFinancials(sym);
        } catch (e) {
          if (tries <= 0 || controller.signal.aborted) throw e;
          await new Promise((r) => setTimeout(r, delay));
          return attempt(tries - 1, Math.min(delay * 2, 2000));
        }
      };
      const financialData = await attempt();
      setData(financialData);
      setCachedData(cacheKey, financialData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch financial data');
    } finally {
      setLoading(false);
    }
  }, [symbol, dataProvider, globalSymbol]);

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

// Additional demo hooks for richer mock surfaces
export function usePeerKpis(symbols: string[]) {
  const [data, setData] = useState<Record<string, KpiData>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { dataProvider } = useWorkspaceStore();

  const fetchData = useCallback(async () => {
    if (!symbols || symbols.length === 0) return;
    const norm = symbols.map((s) => s.toUpperCase());
    const key = getCacheKey('peer-kpis', norm.join(','));
    const cached = getCachedData<Record<string, KpiData>>(key);
    if (cached) {
      setData(cached);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const provider = getProvider(dataProvider);
      const results: Record<string, KpiData> = {};
      for (const sym of norm) {
        // Sequential to keep deterministic and simple
        results[sym] = await provider.getKpis(sym);
      }
      setData(results);
      setCachedData(key, results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch peer KPIs');
    } finally {
      setLoading(false);
    }
  }, [symbols, dataProvider]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useQuarterlyFinancials(symbol?: string, quarters = 8) {
  type QRow = { period: string; revenue: number; netIncome: number; fcf: number };
  const [data, setData] = useState<QRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { dataProvider } = useWorkspaceStore();

  const fetchData = useCallback(async () => {
    if (!symbol) return;
    const key = getCacheKey('q-financials', symbol, String(quarters));
    const cached = getCachedData<QRow[]>(key);
    if (cached) {
      setData(cached);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const provider = getProvider(dataProvider);
      // Base financials to seed series
      const f = await provider.getFinancials(symbol);
      const baseRev = f.revenue;
      const baseNi = f.netIncome;
      const baseFcf = f.fcf;
      // Deterministic pseudo-random based on symbol
      const rng = (seed: number) => {
        let x = seed | 0;
        return () => {
          x ^= x << 13;
          x ^= x >> 17;
          x ^= x << 5;
          return (Math.abs(x) % 1000) / 1000;
        };
      };
      const r = rng(symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
      const now = new Date();
      const series: QRow[] = Array.from({ length: quarters }).map((_, idxFromEnd) => {
        const i = quarters - idxFromEnd; // 1..quarters
        const drift = 1 + (i - quarters / 2) * 0.01;
        const noise = (r() - 0.5) * 0.08;
        const rev = Math.max(1, baseRev * 0.25 * drift * (1 + noise));
        const ni = Math.max(0.1, baseNi * 0.25 * drift * (1 + (r() - 0.5) * 0.12));
        const free = Math.max(0.1, baseFcf * 0.25 * drift * (1 + (r() - 0.5) * 0.12));
        const d = new Date(now.getFullYear(), now.getMonth() - (quarters - i) * 3, 1);
        const label = `${d.getFullYear()} Q${Math.floor(d.getMonth() / 3) + 1}`;
        return { period: label, revenue: rev, netIncome: ni, fcf: free };
      });
      setData(series);
      setCachedData(key, series);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to build quarterly series');
    } finally {
      setLoading(false);
    }
  }, [symbol, quarters, dataProvider]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
