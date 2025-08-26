import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useWorkspaceStore } from '@/lib/store';
import { getProvider, getProviderCapabilities } from './providers';
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

// Typed error mapping
export type DataErrorType = 'rateLimit' | 'invalidKey' | 'network' | 'unauthorized' | 'aborted' | 'unknown';

export function classifyError(error: unknown): { type: DataErrorType; message: string } {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return { type: 'aborted', message: 'Request aborted' };
  }
  const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  if (/rate limit|quota|too many/i.test(message)) return { type: 'rateLimit', message };
  if (/invalid api key|invalid key|api key required/i.test(message)) return { type: 'invalidKey', message };
  if (/forbidden|unauthorized|401/i.test(message)) return { type: 'unauthorized', message };
  if (/network|fetch failed|failed to fetch|timeout|dns/i.test(message)) return { type: 'network', message };
  return { type: 'unknown', message };
}

function backoffDelay(baseMs: number, attempt: number): number {
  const maxJitter = 0.3;
  const exp = Math.min(6, attempt); // cap exponent
  const delay = baseMs * Math.pow(2, exp);
  const jitter = delay * (Math.random() * maxJitter);
  return delay + jitter;
}

export async function fetchWithBackoff<T>(fn: () => Promise<T>, opts?: { signal?: AbortSignal; retries?: number; baseDelayMs?: number }): Promise<T> {
  const retries = opts?.retries ?? 3;
  const base = opts?.baseDelayMs ?? 250;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (opts?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      return await fn();
    } catch (err) {
      const { type } = classifyError(err);
      if (opts?.signal?.aborted || type === 'invalidKey' || type === 'unauthorized') throw err;
      if (attempt === retries) throw err;
      const delay = backoffDelay(base, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  // Unreachable, but satisfies TS return type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  throw new Error('Unexpected backoff flow');
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
      // Capability check: prefer realtime if available, but allow historical-backed KPIs too
      const caps = getProviderCapabilities(dataProvider);
      if (!caps.realtime && !caps.historical) {
        const msg = 'This feature requires a provider with realtime or historical quotes.';
        setError(msg);
        toast.info('This feature requires a provider with quotes (e.g., Alpha Vantage or Polygon).');
        setData(null);
        return;
      }
      try {
        const kpiData = await fetchWithBackoff(() => provider.getKpis(sym), { signal: controller.signal, retries: 3, baseDelayMs: 250 });
        setData(kpiData);
        setCachedData(cacheKey, kpiData);
      } catch (primaryErr) {
        const classified = classifyError(primaryErr);
        // Graceful demo fallback: if auth/key issue on real provider, serve mock data
        if ((classified.type === 'invalidKey' || classified.type === 'unauthorized') && dataProvider !== 'mock') {
          try {
            const mock = getProvider('mock');
            const mockData = await mock.getKpis(sym);
            setData(mockData);
            setCachedData(cacheKey, mockData);
            toast.info('Using mock data due to provider authentication issue.');
            return;
          } catch {
            throw primaryErr;
          }
        }
        throw primaryErr;
      }
    } catch (err) {
      const { type, message } = classifyError(err);
      setError(message || 'Failed to fetch KPI data');
      if (type === 'rateLimit') toast.warning('Rate limit reached. Please try again shortly.');
      else if (type === 'invalidKey') toast.error('Invalid API key. Update your provider key in Settings.');
      else if (type === 'network') toast.error('Network error. Check your connection and retry.');
      else if (type !== 'aborted') toast.error(message);
    } finally {
      setLoading(false);
      }
  }, [symbol, globalSymbol, dataProvider, abortRef]);

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
      const caps = getProviderCapabilities(dataProvider);
      if (!caps.historical) {
        const msg = 'This feature requires a provider with historical data.';
        setError(msg);
        toast.info('This feature requires historical data (e.g., Alpha Vantage or Polygon).');
        setData([]);
        return;
      }
      try {
        const priceData = await fetchWithBackoff(() => provider.getPrices(sym, rng), { signal: controller.signal, retries: 3, baseDelayMs: 250 });
        setData(priceData);
        setCachedData(cacheKey, priceData);
      } catch (primaryErr) {
        const classified = classifyError(primaryErr);
        if ((classified.type === 'invalidKey' || classified.type === 'unauthorized') && dataProvider !== 'mock') {
          try {
            const mock = getProvider('mock');
            const mockData = await mock.getPrices(sym, rng);
            setData(mockData);
            setCachedData(cacheKey, mockData);
            toast.info('Using mock data due to provider authentication issue.');
            return;
          } catch {
            throw primaryErr;
          }
        }
        throw primaryErr;
      }
    } catch (err) {
      const { type, message } = classifyError(err);
      setError(message || 'Failed to fetch price data');
      setData([]);
      if (type === 'rateLimit') toast.warning('Rate limit reached. Please try again shortly.');
      else if (type === 'invalidKey') toast.error('Invalid API key. Update your provider key in Settings.');
      else if (type === 'network') toast.error('Network error. Check your connection and retry.');
      else if (type !== 'aborted') toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [symbol, range, dataProvider, globalSymbol, globalTimeframe, abortRef]);

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
      const caps = getProviderCapabilities(dataProvider);
      if (!caps.historical) {
        const msg = 'This feature requires a provider with fundamentals support.';
        setError(msg);
        toast.info('This feature requires fundamentals from a provider like Alpha Vantage or Polygon.');
        setData(null);
        return;
      }
      try {
        const financialData = await fetchWithBackoff(() => provider.getFinancials(sym), { signal: controller.signal, retries: 3, baseDelayMs: 250 });
        setData(financialData);
        setCachedData(cacheKey, financialData);
      } catch (primaryErr) {
        const classified = classifyError(primaryErr);
        if ((classified.type === 'invalidKey' || classified.type === 'unauthorized') && dataProvider !== 'mock') {
          try {
            const mock = getProvider('mock');
            const mockData = await mock.getFinancials(sym);
            setData(mockData);
            setCachedData(cacheKey, mockData);
            toast.info('Using mock data due to provider authentication issue.');
            return;
          } catch {
            throw primaryErr;
          }
        }
        throw primaryErr;
      }
    } catch (err) {
      const { type, message } = classifyError(err);
      setError(message || 'Failed to fetch financial data');
      setData(null);
      if (type === 'rateLimit') toast.warning('Rate limit reached. Please try again shortly.');
      else if (type === 'invalidKey') toast.error('Invalid API key. Update your provider key in Settings.');
      else if (type === 'network') toast.error('Network error. Check your connection and retry.');
      else if (type !== 'aborted') toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [symbol, dataProvider, globalSymbol, abortRef]);

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
