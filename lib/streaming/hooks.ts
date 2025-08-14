import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { isMarketOpen } from '@/lib/data/quality'
import { getDataProvider } from '@/lib/data/providers'
import { useWorkspaceStore } from '@/lib/store'
import { analytics } from '@/lib/analytics'
import { recordStreamingLatencyMs } from '@/lib/performance/client-metrics'

export type LivePrice = {
  symbol: string
  price: number
  volume: number
  timestamp: number
  change?: number
  changePercent?: number
  high?: number
  low?: number
  open?: number
}

export type StreamConnectionState = 'idle' | 'connecting' | 'open' | 'error' | 'closed'

export function useLivePrices(symbols: string[], intervalMs = 1000) {
  const syms = useMemo(() => Array.from(new Set((symbols || []).map(s => s.toUpperCase()))).slice(0, 25), [symbols])
  const [state, setState] = useState<StreamConnectionState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Record<string, LivePrice>>({})
  const esRef = useRef<EventSource | null>(null)
  const lastSeenRef = useRef<number>(0)
  const [isStale, setIsStale] = useState(false)
  const fallbackSubRef = useRef<string | null>(null)
  const fallbackActiveRef = useRef(false)
  const pollTimerRef = useRef<number | null>(null)
  const isTest = typeof process !== 'undefined' && (
    (process as any).env?.NODE_ENV === 'test' || (process as any).env?.VITEST_WORKER_ID
  )
  const streamMode = ((useWorkspaceStore.getState().streamMode as string) || 'auto') as 'auto'|'websocket'|'polling'
  const pollingIntervalPref = Number(useWorkspaceStore.getState().pollingIntervalMs || intervalMs)

  useEffect(() => {
    if (syms.length === 0) return
    // Disable streaming during unit tests to avoid performance regressions
    if (isTest) {
      setState('closed')
      setError(null)
      return
    }
    // Decide mode based on user pref
    const preferPolling = streamMode === 'polling'
    const preferWs = streamMode === 'websocket'

    if (preferPolling) {
      // Polling path only
      ;(async () => {
        try {
          const provider = getDataProvider()
          if (!provider) return
          const doPoll = async () => {
            try {
              await Promise.all(syms.map(async (sym) => {
                const kpi = await provider.getKpis(sym)
                const lp: LivePrice = {
                  symbol: sym,
                  price: kpi.price,
                  volume: kpi.volume,
                  timestamp: Date.now(),
                  change: kpi.change,
                  changePercent: kpi.changePercent,
                  high: kpi.fiftyTwoWeekHigh ?? kpi.price,
                  low: kpi.fiftyTwoWeekLow ?? kpi.price,
                  open: kpi.price - kpi.change,
                }
                setData(prev => ({ ...prev, [lp.symbol]: lp }))
              }))
              lastSeenRef.current = Date.now()
              setState('open')
            } catch {/* ignore */}
          }
          const cadence = isMarketOpen() ? Math.max(500, pollingIntervalPref) : Math.max(5000, pollingIntervalPref)
          await doPoll()
          pollTimerRef.current = (setInterval(doPoll, cadence) as unknown) as number
        } catch {/* ignore */}
      })()
      return () => {
        if (pollTimerRef.current) { try { clearInterval(pollTimerRef.current as unknown as number) } catch {}; pollTimerRef.current = null }
      }
    }

    if (typeof window === 'undefined' || typeof (window as any).EventSource === 'undefined' || (preferWs === true)) {
      // Fallback to WS in non-EventSource environments
      try {
        setState('connecting')
        fallbackActiveRef.current = true
        ;(async () => {
          try {
            const { streamingManager } = await import('./index')
            await streamingManager.connect()
            fallbackSubRef.current = streamingManager.subscribe(syms, (upd: any) => {
              const lp: LivePrice = {
                symbol: upd.symbol,
                price: upd.price,
                volume: upd.volume,
                timestamp: upd.timestamp,
                change: upd.change,
                changePercent: upd.changePercent,
                high: upd.high,
                low: upd.low,
                open: upd.open,
              }
              setData(prev => ({ ...prev, [lp.symbol]: lp }))
              lastSeenRef.current = Date.now()
              setState('open')
            }, { throttle: intervalMs, batch: true })
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Streaming unavailable')
            setState('error')
          }
        })()
      } catch {
        setState('closed')
      }
      return
    }
    const dynPref = Number(pollingIntervalPref || intervalMs)
    const dynamicInterval = isMarketOpen() ? dynPref : Math.max(dynPref, 5000)
    const qs = new URLSearchParams({ symbols: syms.join(','), interval: String(dynamicInterval) })
    const url = `/api/stream?${qs.toString()}`
    setState('connecting')
    setError(null)

    const es = new EventSource(url)
    esRef.current = es

    const onOpen = () => setState('open')
    const onError = async () => {
      // If SSE fails, gracefully fallback to WebSocket-based streaming
      if (!fallbackActiveRef.current && (streamMode as string) !== 'polling') {
        try {
          fallbackActiveRef.current = true
          setState('connecting')
          const { streamingManager } = await import('./index')
          await streamingManager.connect()
          fallbackSubRef.current = streamingManager.subscribe(syms, (upd: any) => {
            const lp: LivePrice = {
              symbol: upd.symbol,
              price: upd.price,
              volume: upd.volume,
              timestamp: upd.timestamp,
              change: upd.change,
              changePercent: upd.changePercent,
              high: upd.high,
              low: upd.low,
              open: upd.open,
            }
            setData(prev => ({ ...prev, [lp.symbol]: lp }))
            lastSeenRef.current = Date.now()
            setState('open')
          }, { throttle: intervalMs, batch: true })
          return
        } catch (e) {
          // Final fallback: polling provider KPIs periodically
          try {
            const provider = getDataProvider()
            if (provider) {
              const doPoll = async () => {
                try {
                  await Promise.all(syms.map(async (sym) => {
                    const kpi = await provider.getKpis(sym)
                    const lp: LivePrice = {
                      symbol: sym,
                      price: kpi.price,
                      volume: kpi.volume,
                      timestamp: Date.now(),
                      change: kpi.change,
                      changePercent: kpi.changePercent,
                      high: kpi.fiftyTwoWeekHigh ?? kpi.price,
                      low: kpi.fiftyTwoWeekLow ?? kpi.price,
                      open: kpi.price - kpi.change,
                    }
                    setData(prev => ({ ...prev, [lp.symbol]: lp }))
                  }))
                  lastSeenRef.current = Date.now()
                  setState('open')
                } catch {
                  // Keep trying silently
                }
              }
              // Start polling at a conservative cadence
              const cadence = isMarketOpen() ? Math.max(500, pollingIntervalPref) : Math.max(5000, pollingIntervalPref)
              // Immediate poll, then schedule
              doPoll()
              pollTimerRef.current = (setInterval(doPoll, cadence) as unknown) as number
              return
            }
          } catch {}
          setError(e instanceof Error ? e.message : 'Streaming unavailable')
        }
      }
      setState('error')
      setError('Stream connection error')
    }
    const onMessage = (evt: MessageEvent) => {
      // default event not used
    }
    const onHeartbeat = (evt: MessageEvent) => {
      lastSeenRef.current = Date.now()
      try {
        const payload = JSON.parse((evt as any).data || '{}') as { ts?: number }
        if (payload && typeof payload.ts === 'number') {
          const now = Date.now()
          recordStreamingLatencyMs(now - payload.ts)
        }
      } catch {}
    }
    const onPrice = (evt: MessageEvent) => {
      try {
        const payload = JSON.parse(evt.data) as LivePrice
        setData(prev => ({ ...prev, [payload.symbol]: payload }))
        lastSeenRef.current = Date.now()
        analytics.track('stream_price_update', { symbol: payload.symbol, ts: payload.timestamp }, 'performance')
      } catch {}
    }

    es.addEventListener('open', onOpen as any)
    es.addEventListener('error', onError as any)
    es.addEventListener('message', onMessage)
    es.addEventListener('heartbeat', onHeartbeat as any)
    es.addEventListener('price_update', onPrice as any)

    return () => {
      es.removeEventListener('open', onOpen as any)
      es.removeEventListener('error', onError as any)
      es.removeEventListener('message', onMessage)
      es.removeEventListener('heartbeat', onHeartbeat as any)
      es.removeEventListener('price_update', onPrice as any)
      es.close()
      setState('closed')
      // Cleanup WS fallback if used
      if (fallbackActiveRef.current && fallbackSubRef.current) {
        import('./index').then(({ streamingManager }) => {
          try { streamingManager.unsubscribe(fallbackSubRef.current!) } catch {}
          fallbackSubRef.current = null
          fallbackActiveRef.current = false
        })
      }
      // Cleanup polling fallback
      if (pollTimerRef.current) {
        try { clearInterval(pollTimerRef.current as unknown as number) } catch {}
        pollTimerRef.current = null
      }
    }
  }, [syms.join(','), intervalMs, streamMode, pollingIntervalPref])

  // Staleness detector
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now()
      setIsStale(now - lastSeenRef.current > 10_000) // 10s without updates
    }, 2000)
    return () => clearInterval(id)
  }, [])

  return { state, error, data, isStale }
}

/**
 * React hooks for real-time data streaming
 */

import { streamingManager, type StreamData, type StreamSubscription } from './index';

/**
 * Hook for single symbol real-time price updates
 */
export function useRealtimePrice(symbol: string, options?: StreamSubscription['options']) {
  const [data, setData] = useState<StreamData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionId = useRef<string | null>(null);

  useEffect(() => {
    const connect = async () => {
      try {
        setError(null);
        await streamingManager.connect();
        setIsConnected(true);
        
        subscriptionId.current = streamingManager.subscribe(
          [symbol],
          (update) => {
            setData(update);
            setError(null);
          },
          options
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Connection failed';
        console.error('[useRealtimePrice] Connection failed:', errorMessage);
        setError(errorMessage);
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      if (subscriptionId.current) {
        streamingManager.unsubscribe(subscriptionId.current);
        subscriptionId.current = null;
      }
    };
  }, [symbol, options?.throttle, options?.batch]);

  // Monitor connection state
  useEffect(() => {
    const checkConnection = () => {
      const state = streamingManager.getConnectionState();
      setIsConnected(state === 'connected');
    };

    const interval = setInterval(checkConnection, 1000);
    return () => clearInterval(interval);
  }, []);

  return { data, isConnected, error };
}

/**
 * Hook for multiple symbols real-time price updates
 */
export function useRealtimePrices(symbols: string[], options?: StreamSubscription['options']) {
  const [data, setData] = useState<Map<string, StreamData>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionId = useRef<string | null>(null);

  useEffect(() => {
    if (symbols.length === 0) return;

    const connect = async () => {
      try {
        setError(null);
        await streamingManager.connect();
        setIsConnected(true);
        
        subscriptionId.current = streamingManager.subscribe(
          symbols,
          (update) => {
            setData(prev => {
              const newMap = new Map(prev);
              newMap.set(update.symbol, update);
              return newMap;
            });
            setError(null);
          },
          options
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Connection failed';
        console.error('[useRealtimePrices] Connection failed:', errorMessage);
        setError(errorMessage);
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      if (subscriptionId.current) {
        streamingManager.unsubscribe(subscriptionId.current);
        subscriptionId.current = null;
      }
    };
  }, [symbols.join(','), options?.throttle, options?.batch]);

  // Monitor connection state
  useEffect(() => {
    const checkConnection = () => {
      const state = streamingManager.getConnectionState();
      setIsConnected(state === 'connected');
    };

    const interval = setInterval(checkConnection, 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper to get data for a specific symbol
  const getSymbolData = useCallback((symbol: string) => {
    return data.get(symbol.toUpperCase());
  }, [data]);

  return { 
    data, 
    isConnected, 
    error,
    getSymbolData,
    symbolsCount: data.size,
    symbols: Array.from(data.keys())
  };
}

/**
 * Hook for streaming manager statistics
 */
export function useStreamingStats() {
  const [stats, setStats] = useState(() => streamingManager.getStats());

  useEffect(() => {
    const updateStats = () => {
      setStats(streamingManager.getStats());
    };

    const interval = setInterval(updateStats, 1000);
    updateStats(); // Initial update

    return () => clearInterval(interval);
  }, []);

  return stats;
}

/**
 * Hook for managing streaming connection lifecycle
 */
export function useStreamingConnection() {
  const [connectionState, setConnectionState] = useState(() => streamingManager.getConnectionState());

  useEffect(() => {
    const checkConnection = () => {
      setConnectionState(streamingManager.getConnectionState());
    };

    const interval = setInterval(checkConnection, 500);
    checkConnection(); // Initial check

    return () => clearInterval(interval);
  }, []);

  const connect = useCallback(async (endpoint?: string) => {
    try {
      await streamingManager.connect(endpoint);
      return true;
    } catch (error) {
      console.error('[useStreamingConnection] Connect failed:', error);
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    streamingManager.disconnect();
  }, []);

  const reconnect = useCallback(async () => {
    streamingManager.disconnect();
    // Wait a bit before reconnecting
    await new Promise(resolve => setTimeout(resolve, 1000));
    return connect();
  }, [connect]);

  return {
    connectionState,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting',
    isReconnecting: connectionState === 'reconnecting',
    hasError: connectionState === 'error',
    connect,
    disconnect,
    reconnect,
  };
}

/**
 * Hook for portfolio real-time updates
 */
export function usePortfolioStreaming(symbols: string[], options?: {
  throttle?: number;
  calculateTotals?: boolean;
}) {
  const { data, isConnected, error } = useRealtimePrices(symbols, {
    throttle: options?.throttle || 1000, // Default 1 second throttle for portfolio
    batch: true, // Batch updates for better performance
  });

  const [portfolio, setPortfolio] = useState<{
    positions: Map<string, StreamData>;
    totalValue: number;
    totalChange: number;
    totalChangePercent: number;
    lastUpdate: number;
  }>({
    positions: new Map(),
    totalValue: 0,
    totalChange: 0,
    totalChangePercent: 0,
    lastUpdate: 0,
  });

  useEffect(() => {
    if (options?.calculateTotals && data.size > 0) {
      let totalValue = 0;
      let totalChange = 0;
      
      data.forEach((position) => {
        totalValue += position.price;
        totalChange += position.change;
      });

      const totalChangePercent = totalValue > 0 ? (totalChange / totalValue) * 100 : 0;

      setPortfolio({
        positions: data,
        totalValue,
        totalChange,
        totalChangePercent,
        lastUpdate: Date.now(),
      });
    } else {
      setPortfolio(prev => ({
        ...prev,
        positions: data,
        lastUpdate: Date.now(),
      }));
    }
  }, [data, options?.calculateTotals]);

  return {
    portfolio,
    isConnected,
    error,
    symbolsTracked: symbols.length,
    positionsActive: data.size,
  };
}

/**
 * Hook for watchlist with streaming updates
 */
export function useWatchlistStreaming(watchlist: Array<{ symbol: string; quantity?: number }>) {
  const symbols = watchlist.map(item => item.symbol);
  const { data, isConnected, error } = useRealtimePrices(symbols, {
    throttle: 500, // Fast updates for watchlist
  });

  const watchlistData = watchlist.map(item => {
    const streamData = data.get(item.symbol);
    return {
      ...item,
      ...streamData,
      totalValue: streamData && item.quantity ? streamData.price * item.quantity : undefined,
      totalChange: streamData && item.quantity ? streamData.change * item.quantity : undefined,
    };
  });

  return {
    watchlist: watchlistData,
    isConnected,
    error,
    lastUpdate: Math.max(...Array.from(data.values()).map(d => d.timestamp), 0),
  };
}