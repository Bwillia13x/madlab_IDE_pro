import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { handleError } from '@/lib/errors';
import { showErrorToast } from '@/lib/errors/toast';
// import { zFinancials } from './schemas';
import { getDataProvider, getProvider } from './providers';
import { loadData, preloadData, refreshData, type LoadOptions } from './loader';
import { measureDataFetch } from '@/lib/performance/monitor';
import type { PricePoint, PriceRange, KpiData } from './providers';
// Legacy imports for backward compatibility
import type { 
  Kpis, 
  VolConePoint, 
  RiskSummary,
  VolSurface,
  CorrelationMatrix
} from './providers';

// Cache for data with TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const pending = new Map<string, Promise<unknown>>();
const MAX_HOOK_CACHE_ENTRIES = 300;

function getCachedData<T>(key: string, ttlMs: number = 300000): T | null {
  const entry = cache.get(key);
  if (entry && (Date.now() - entry.timestamp) < entry.ttl) {
    return entry.data as T;
  }
  if (entry) {
    cache.delete(key);
  }
  return null;
}

function setCachedData<T>(key: string, data: T, ttlMs: number = 300000): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs
  });
  if (cache.size > MAX_HOOK_CACHE_ENTRIES) {
    const firstKey = cache.keys().next().value as string | undefined;
    if (firstKey) cache.delete(firstKey);
  }
}

// Enhanced KPI hook with async support and advanced loading
export function useKpis(symbol?: string, options?: LoadOptions) {
  const sym = (symbol || 'AAPL').toUpperCase();
  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let mounted = true;
    
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setFromCache(false);

      try {
        const result = await measureDataFetch(`kpi-${sym}`, () => 
          loadData<KpiData>(
            'kpi-provider', 
            { symbol: sym },
            {
              ttl: 300000, // 5 minutes
              backgroundRefresh: true,
            prefetchRelated: true,
            timeout: 8000,
            priority: 1,
            ...options,
          }
        ));
        
        if (mounted && !abortControllerRef.current?.signal.aborted) {
          setData(result.data);
          setFromCache(result.fromCache);
        }
      } catch (err) {
        if (mounted && !abortControllerRef.current?.signal.aborted) {
          const message = err instanceof Error ? err.message : 'Failed to fetch KPI data';
          setError(message);
          if (!abortControllerRef.current?.signal.aborted) {
            const enhanced = handleError(err instanceof Error ? err : new Error(String(err)), {
              component: 'useKpis',
              hook: 'useKpis',
              symbol: sym,
            });
            showErrorToast(enhanced, { showRecovery: false });
          }
        }
      } finally {
        if (mounted && !abortControllerRef.current?.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    
    return () => {
      mounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [sym, options]);

  const refresh = useCallback(async () => {
    if (!sym) return;
    
    try {
      setLoading(true);
      const result = await refreshData<KpiData>(
        'kpi-provider', 
        { symbol: sym },
        options
      );
      setData(result.data);
      setFromCache(false);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh KPI data';
      setError(message);
      const enhanced = handleError(err instanceof Error ? err : new Error(String(err)), {
        component: 'useKpis',
        hook: 'useKpis.refresh',
        symbol: sym,
      });
      showErrorToast(enhanced, { showRecovery: false });
    } finally {
      setLoading(false);
    }
  }, [sym, options]);

  return { data, loading, error, fromCache, refresh };
}

// Enhanced prices hook
export function usePrices(symbol?: string, range: PriceRange = '6M') {
  const sym = (symbol || 'AAPL').toUpperCase();
  const [data, setData] = useState<PricePoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      const cacheKey = `prices:${sym}:${range}`;
      const cached = getCachedData<PricePoint[]>(cacheKey);
      
      if (cached) {
        if (mounted) {
          setData(cached);
          setLoading(false);
        }
        return;
      }

      try {
        const provider = getDataProvider();
        if (!provider) {
          throw new Error('No data provider available');
        }
        
        // Deduplicate concurrent requests for the same key
        let p = pending.get(cacheKey);
        if (!p) {
          p = provider.getPrices(sym, range);
          pending.set(cacheKey, p);
        }
        const result = await p as PricePoint[];
        
        setCachedData(cacheKey, result);
        pending.delete(cacheKey);

        if (mounted) {
          setData(result);
        }
      } catch (err) {
        pending.delete(cacheKey);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch price data');
        }
        try {
          const enhanced = handleError(err instanceof Error ? err : new Error(String(err)), {
            component: 'usePrices',
            hook: 'usePrices',
            symbol: sym,
            range,
          });
          showErrorToast(enhanced, { showRecovery: false });
        } catch {}
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    
    return () => {
      mounted = false;
    };
  }, [sym, range]);

  return { data, loading, error };
}

// Enhanced financials hook
export function useFinancials(symbol?: string) {
  const sym = (symbol || 'ACME').toUpperCase();
  const [data, setData] = useState<unknown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      const cacheKey = `financials:${sym}`;
      const cached = getCachedData<any>(cacheKey);
      
      if (cached) {
        if (mounted) {
          setData(cached);
          setLoading(false);
        }
        return;
      }

      try {
        const provider = getDataProvider();
        if (!provider) {
          throw new Error('No data provider available');
        }
        
        // Not all providers implement financials in this app version
        const anyProv: any = provider as any;
        if (typeof anyProv.getFinancials !== 'function') {
          throw new Error('Financials not supported by current provider');
        }
        const cacheKey = `financials:${sym}`;
        let p = pending.get(cacheKey);
        if (!p) {
          const newP: Promise<unknown> = anyProv.getFinancials(sym);
          pending.set(cacheKey, newP);
          p = newP;
        }
        const result = await p;
        pending.delete(cacheKey);
        
        setCachedData(cacheKey, result);
        
        if (mounted) {
          setData(result);
        }
      } catch (err) {
        try { pending.delete(`financials:${sym}`) } catch {}
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch financial data');
        }
        try {
          const enhanced = handleError(err instanceof Error ? err : new Error(String(err)), {
            component: 'useFinancials',
            hook: 'useFinancials',
            symbol: sym,
          });
          showErrorToast(enhanced, { showRecovery: false });
        } catch {}
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    
    return () => {
      mounted = false;
    };
  }, [sym]);

  return { data, loading, error };
}

// Enhanced vol surface hook
export function useVolSurface(symbol?: string) {
  const sym = (symbol || 'ACME').toUpperCase();
  const [data, setData] = useState<VolSurface | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      const cacheKey = `volsurface:${sym}`;
      const cached = getCachedData<VolSurface>(cacheKey);
      
      if (cached) {
        if (mounted) {
          setData(cached);
          setLoading(false);
        }
        return;
      }

      try {
        const provider = getDataProvider() || getProvider();
        let result: VolSurface;
        
        if (provider.getVolSurface.constructor.name === 'AsyncFunction') {
          const cacheKey = `volsurface:${sym}`;
          let p = pending.get(cacheKey);
          if (!p) {
            const newP: Promise<unknown> = provider.getVolSurface(sym);
            pending.set(cacheKey, newP);
            p = newP;
          }
          result = await p as VolSurface;
          pending.delete(cacheKey);
        } else {
          // Fallback to sync method
          const syncData = provider.getVolSurface_sync?.(sym);
          if (syncData) {
            result = {
              symbol: sym,
              underlyingPrice: 100,
              points: syncData.map(p => ({
                strike: 100,
                expiry: new Date(Date.now() + p.dte * 24 * 60 * 60 * 1000),
                impliedVol: p.current
              })),
              timestamp: new Date()
            };
          } else {
            throw new Error('No vol surface data available');
          }
        }
        
        setCachedData(cacheKey, result);
        
        if (mounted) {
          setData(result);
        }
      } catch (err) {
        try { pending.delete(`volsurface:${sym}`) } catch {}
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch vol surface data');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    
    return () => {
      mounted = false;
    };
  }, [sym]);

  return { data, loading, error };
}

// Correlation matrix hook
export function useCorrelation(symbols: string[], period: string = '1Y') {
  const [data, setData] = useState<CorrelationMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const symbolsKey = symbols.sort().join(',');

  useEffect(() => {
    let mounted = true;
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      const cacheKey = `correlation:${symbolsKey}:${period}`;
      const cached = getCachedData<CorrelationMatrix>(cacheKey);
      
      if (cached) {
        if (mounted) {
          setData(cached);
          setLoading(false);
        }
        return;
      }

      try {
        const provider = getDataProvider() || getProvider();
        
        if (provider.getCorrelation) {
          const cacheKey = `correlation:${symbolsKey}:${period}`;
          let p = pending.get(cacheKey);
          if (!p) {
            const newP: Promise<unknown> = provider.getCorrelation(symbols, period);
            pending.set(cacheKey, newP);
            p = newP;
          }
          const result = await p as CorrelationMatrix;
          pending.delete(cacheKey);
          setCachedData(cacheKey, result);
          
          if (mounted) {
            setData(result);
          }
        } else {
          if (mounted) {
            setError('Correlation data not available from current provider');
          }
        }
      } catch (err) {
        try { pending.delete(`correlation:${symbolsKey}:${period}`) } catch {}
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch correlation data');
        }
        try {
          const enhanced = handleError(err instanceof Error ? err : new Error(String(err)), {
            component: 'useCorrelation',
            hook: 'useCorrelation',
            symbols: symbolsKey,
            period,
          });
          showErrorToast(enhanced, { showRecovery: false });
        } catch {}
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (symbols.length > 0) {
      fetchData();
    }
    
    return () => {
      mounted = false;
    };
  }, [symbolsKey, period, symbols.length]);

  return { data, loading, error };
}

// Legacy hooks for backward compatibility
export function useKpis_legacy(symbol?: string) {
  const sym = (symbol || 'ACME').toUpperCase();
  const [data, setData] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    try {
      const provider = getProvider();
      const d = provider.getKpis_sync ? provider.getKpis_sync(sym) : null;
      if (mounted) setData(d);
    } finally {
      if (mounted) setLoading(false);
    }
    return () => {
      mounted = false;
    };
  }, [sym]);

  return { data, loading };
}

export function useVolCone(symbol?: string) {
  const sym = (symbol || 'ACME').toUpperCase();
  const [data, setData] = useState<VolConePoint[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    try {
      const provider = getProvider();
      const d = provider.getVolSurface_sync ? provider.getVolSurface_sync(sym) : null;
      if (mounted) setData(d);
    } finally {
      if (mounted) setLoading(false);
    }
    return () => {
      mounted = false;
    };
  }, [sym]);

  return { data, loading };
}

export function useRisk(symbol?: string) {
  const sym = (symbol || 'ACME').toUpperCase();
  const [data, setData] = useState<RiskSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    try {
      const provider = getProvider();
      const d = provider.getRisk ? provider.getRisk(sym) : null;
      if (mounted) setData(d);
    } finally {
      if (mounted) setLoading(false);
    }
    return () => {
      mounted = false;
    };
  }, [sym]);

  return { data, loading };
}

// Utility hook for cache management
export function useDataCache() {
  const clearCache = useCallback(() => {
    cache.clear();
  }, []);

  const getCacheStats = useCallback(() => {
    return {
      size: cache.size,
      keys: Array.from(cache.keys())
    };
  }, []);

  return { clearCache, getCacheStats };
}
