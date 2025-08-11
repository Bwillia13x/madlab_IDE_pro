import { useEffect, useState } from 'react';
import { mockProvider } from './mock';

export function useKpis(symbol: string | undefined) {
  const [data, setData] = useState<Awaited<ReturnType<typeof mockProvider.getKpis>> | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!symbol) {
        setData(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const k = await mockProvider.getKpis(symbol);
        if (!cancelled) setData(k);
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return { data, loading, error };
}

export function useDataCache() {
  return {
    clearCache: () => {
      // no-op for prototype
    },
  };
}