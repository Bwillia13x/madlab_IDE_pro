import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { webSocketService } from './websocketService';
import { multiExchangeAggregator } from './multiExchangeAggregator';
import { highFrequencyHandler } from './highFrequencyHandler';

interface ConnectionStatus {
  status: string;
}

interface AggregatedData {
  symbol: string;
  midPrice: number;
  totalVolume: number;
}

interface ExchangeData {
  exchange: string;
  data: {
    symbol: string;
    price: number;
  };
}

interface HighFrequencyUpdate {
  symbol: string;
  data: unknown[];
}

interface QualityMetricsData {
  [key: string]: unknown;
}

// Real-time price data hook
export function useRealtimePrices(symbols: string[], updateInterval: number = 1000) {
  const [prices, setPrices] = useState<Array<{
    symbol: string;
    price: number;
    timestamp: number;
    source: string;
  }>>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  
  const symbolsRef = useRef(symbols);
  const updateIntervalRef = useRef(updateInterval);
  const subscriptionRefs = useRef<Map<string, () => void>>(new Map());

  // Update refs when props change
  useEffect(() => {
    symbolsRef.current = symbols;
    updateIntervalRef.current = updateInterval;
  }, [symbols, updateInterval]);

  // Connection status management
  useEffect(() => {
    const handleConnection = (status: ConnectionStatus) => {
      setIsConnected(status.status === 'connected');
      if (status.status === 'connected' && isRunning) {
        // Resubscribe to symbols when reconnected
        symbolsRef.current.forEach(symbol => {
          if (!subscriptionRefs.current.has(symbol)) {
            const unsubscribe = multiExchangeAggregator.subscribeToSymbol(symbol);
            subscriptionRefs.current.set(symbol, unsubscribe);
          }
        });
      }
    };

    const handleError = (error: Error) => {
      setError(error.message);
    };

    webSocketService.on('connection', handleConnection);
    webSocketService.on('error', handleError);

    return () => {
      webSocketService.off('connection', handleConnection);
      webSocketService.off('error', handleError);
    };
  }, [isRunning]);

  // Start real-time updates
  const start = useCallback(async () => {
    try {
      setError(null);
      setIsRunning(true);

      // Connect WebSocket if not connected
      if (!webSocketService.getConnectionStatus().isConnected) {
        await webSocketService.connect();
      }

      // Subscribe to all symbols
      symbolsRef.current.forEach(symbol => {
        if (!subscriptionRefs.current.has(symbol)) {
          const unsubscribe = multiExchangeAggregator.subscribeToSymbol(symbol);
          subscriptionRefs.current.set(symbol, unsubscribe);
        }
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start real-time updates');
      setIsRunning(false);
    }
  }, []);

  // Stop real-time updates
  const stop = useCallback(() => {
    setIsRunning(false);
    
    // Unsubscribe from all symbols
    subscriptionRefs.current.forEach(unsubscribe => unsubscribe());
    subscriptionRefs.current.clear();
  }, []);

  // Data subscription
  useEffect(() => {
    if (!isRunning) return;

    const handleAggregatedData = (data: AggregatedData) => {
      if (symbolsRef.current.includes(data.symbol)) {
        setPrices(prev => {
          const existing = prev.find(p => p.symbol === data.symbol);
          if (existing) {
            return prev.map(p => 
              p.symbol === data.symbol 
                ? { ...p, price: data.midPrice, timestamp: Date.now(), source: 'aggregated' }
                : p
            );
          } else {
            return [...prev, {
              symbol: data.symbol,
              price: data.midPrice,
              timestamp: Date.now(),
              source: 'aggregated',
            }];
          }
        });
        setLastUpdate(Date.now());
      }
    };

    const handleExchangeData = (data: ExchangeData) => {
      if (symbolsRef.current.includes(data.data.symbol)) {
        setPrices(prev => {
          const existing = prev.find(p => p.symbol === data.data.symbol);
          if (existing) {
            return prev.map(p => 
              p.symbol === data.data.symbol 
                ? { ...p, price: data.data.price, timestamp: Date.now(), source: data.exchange }
                : p
            );
          } else {
            return [...prev, {
              symbol: data.data.symbol,
              price: data.data.price,
              timestamp: Date.now(),
              source: data.exchange,
            }];
          }
        });
        setLastUpdate(Date.now());
      }
    };

    // Subscribe to aggregated data updates
    multiExchangeAggregator.on('aggregatedDataUpdate', handleAggregatedData);
    
    // Subscribe to individual exchange updates
    multiExchangeAggregator.on('exchangeDataUpdate', handleExchangeData);

    return () => {
      multiExchangeAggregator.off('aggregatedDataUpdate', handleAggregatedData);
      multiExchangeAggregator.off('exchangeDataUpdate', handleExchangeData);
    };
  }, [isRunning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  // Memoized values for performance
  const memoizedPrices = useMemo(() => prices, [prices]);
  const memoizedLastUpdate = useMemo(() => lastUpdate, [lastUpdate]);

  return {
    prices: memoizedPrices,
    isConnected,
    isRunning,
    error,
    lastUpdate: memoizedLastUpdate,
    start,
    stop,
  };
}

// Real-time KPI data hook
export function useRealtimeKPIs(symbols: string[], updateInterval: number = 5000) {
  const [kpis, setKpis] = useState<Array<{
    symbol: string;
    change: number;
    changePercent: number;
    volume: number;
    timestamp: number;
    source: string;
  }>>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  
  const symbolsRef = useRef(symbols);
  const updateIntervalRef = useRef(updateInterval);
  const subscriptionRefs = useRef<Map<string, () => void>>(new Map());

  // Update refs when props change
  useEffect(() => {
    symbolsRef.current = symbols;
    updateIntervalRef.current = updateInterval;
  }, [symbols, updateInterval]);

  // Connection status management
  useEffect(() => {
    const handleConnection = (status: ConnectionStatus) => {
      setIsConnected(status.status === 'connected');
      if (status.status === 'connected' && isRunning) {
        // Resubscribe to symbols when reconnected
        symbolsRef.current.forEach(symbol => {
          if (!subscriptionRefs.current.has(symbol)) {
            const unsubscribe = multiExchangeAggregator.subscribeToSymbol(symbol);
            subscriptionRefs.current.set(symbol, unsubscribe);
          }
        });
      }
    };

    const handleError = (error: Error) => {
      setError(error.message);
    };

    webSocketService.on('connection', handleConnection);
    webSocketService.on('error', handleError);

    return () => {
      webSocketService.off('connection', handleConnection);
      webSocketService.off('error', handleError);
    };
  }, [isRunning]);

  // Start real-time updates
  const start = useCallback(async () => {
    try {
      setError(null);
      setIsRunning(true);

      // Connect WebSocket if not connected
      if (!webSocketService.getConnectionStatus().isConnected) {
        await webSocketService.connect();
      }

      // Subscribe to all symbols
      symbolsRef.current.forEach(symbol => {
        if (!subscriptionRefs.current.has(symbol)) {
          const unsubscribe = multiExchangeAggregator.subscribeToSymbol(symbol);
          subscriptionRefs.current.set(symbol, unsubscribe);
        }
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start real-time updates');
      setIsRunning(false);
    }
  }, []);

  // Stop real-time updates
  const stop = useCallback(() => {
    setIsRunning(false);
    
    // Unsubscribe from all symbols
    subscriptionRefs.current.forEach(unsubscribe => unsubscribe());
    subscriptionRefs.current.clear();
  }, []);

  // Data subscription
  useEffect(() => {
    if (!isRunning) return;

    const handleAggregatedData = (data: AggregatedData) => {
      if (symbolsRef.current.includes(data.symbol)) {
        // Calculate KPI metrics from aggregated data
        const exchangeData = multiExchangeAggregator.getExchangeData(data.symbol);
        if (exchangeData) {
          const exchanges = Array.from(exchangeData.values());
          const avgPrice = exchanges.reduce((sum, ex) => sum + ex.price, 0) / exchanges.length;
          const change = data.midPrice - avgPrice;
          const changePercent = (change / avgPrice) * 100;

          setKpis(prev => {
            const existing = prev.find(k => k.symbol === data.symbol);
            if (existing) {
              return prev.map(k => 
                k.symbol === data.symbol 
                  ? { ...k, change, changePercent, volume: data.totalVolume, timestamp: Date.now(), source: 'aggregated' }
                  : k
              );
            } else {
              return [...prev, {
                symbol: data.symbol,
                change,
                changePercent,
                volume: data.totalVolume,
                timestamp: Date.now(),
                source: 'aggregated',
              }];
            }
          });
          setLastUpdate(Date.now());
        }
      }
    };

    // Subscribe to aggregated data updates
    multiExchangeAggregator.on('aggregatedDataUpdate', handleAggregatedData);

    return () => {
      multiExchangeAggregator.off('aggregatedDataUpdate', handleAggregatedData);
    };
  }, [isRunning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  // Memoized values for performance
  const memoizedKpis = useMemo(() => kpis, [kpis]);
  const memoizedLastUpdate = useMemo(() => lastUpdate, [lastUpdate]);

  return {
    kpis: memoizedKpis,
    isConnected,
    isRunning,
    error,
    lastUpdate: memoizedLastUpdate,
    start,
    stop,
  };
}

// High-frequency data hook
export function useHighFrequencyData(symbol: string, type: 'raw' | 'compressed' = 'compressed') {
  const [data, setData] = useState<unknown[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  
  const symbolRef = useRef(symbol);
  const typeRef = useRef(type);

  // Update refs when props change
  useEffect(() => {
    symbolRef.current = symbol;
    typeRef.current = type;
  }, [symbol, type]);

  // Data subscription
  useEffect(() => {
    const handleRawData = (update: HighFrequencyUpdate) => {
      if (update.symbol === symbolRef.current && typeRef.current === 'raw') {
        setData(update.data);
        setLastUpdate(Date.now());
      }
    };

    const handleCompressedData = (update: HighFrequencyUpdate) => {
      if (update.symbol === symbolRef.current && typeRef.current === 'compressed') {
        setData(update.data);
        setLastUpdate(Date.now());
      }
    };

    const handleError = (error: Error) => {
      setError(error.message);
    };

    // Subscribe to data updates
    highFrequencyHandler.on('rawData', handleRawData);
    highFrequencyHandler.on('compressedData', handleCompressedData);
    highFrequencyHandler.on('error', handleError);

    // Get initial data
    const initialData = highFrequencyHandler.getData(symbolRef.current, typeRef.current);
    if (initialData.length > 0) {
      setData(initialData);
      setLastUpdate(Date.now());
    }

    return () => {
      highFrequencyHandler.off('rawData', handleRawData);
      highFrequencyHandler.off('compressedData', handleCompressedData);
      highFrequencyHandler.off('error', handleError);
    };
  }, [symbol, type]);

  // Memoized values for performance
  const memoizedData = useMemo(() => data, [data]);
  const memoizedLastUpdate = useMemo(() => lastUpdate, [lastUpdate]);

  return {
    data: memoizedData,
    error,
    lastUpdate: memoizedLastUpdate,
  };
}

// Exchange quality metrics hook
export function useExchangeQualityMetrics() {
  const [metrics, setMetrics] = useState<Map<string, QualityMetricsData>>(new Map());
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  useEffect(() => {
    const handleQualityMetrics = (newMetrics: Map<string, QualityMetricsData>) => {
      setMetrics(newMetrics);
      setLastUpdate(Date.now());
    };

    // Get initial metrics
    const initialMetrics = multiExchangeAggregator.getQualityMetrics();
    setMetrics(initialMetrics);
    setLastUpdate(Date.now());

    // Subscribe to metrics updates
    multiExchangeAggregator.on('qualityMetrics', handleQualityMetrics);

    return () => {
      multiExchangeAggregator.off('qualityMetrics', handleQualityMetrics);
    };
  }, []);

  // Memoized values for performance
  const memoizedMetrics = useMemo(() => metrics, [metrics]);
  const memoizedLastUpdate = useMemo(() => lastUpdate, [lastUpdate]);

  return {
    metrics: memoizedMetrics,
    lastUpdate: memoizedLastUpdate,
  };
}

// Performance statistics hook
export function usePerformanceStats() {
  const [stats, setStats] = useState({
    totalSymbols: 0,
    totalExchanges: 0,
    averageConfidence: 0,
    dataUpdateRate: 0,
  });
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  useEffect(() => {
    const updateStats = () => {
      const newStats = multiExchangeAggregator.getPerformanceStats();
      setStats(newStats);
      setLastUpdate(Date.now());
    };

    // Update stats immediately
    updateStats();

    // Update stats every 10 seconds
    const interval = setInterval(updateStats, 10000);

    return () => clearInterval(interval);
  }, []);

  // Memoized values for performance
  const memoizedStats = useMemo(() => stats, [stats]);
  const memoizedLastUpdate = useMemo(() => lastUpdate, [lastUpdate]);

  return {
    stats: memoizedStats,
    lastUpdate: memoizedLastUpdate,
  };
}

// Connection status hook
export function useConnectionStatus() {
  const [status, setStatus] = useState(webSocketService.getConnectionStatus());

  useEffect(() => {
    const updateStatus = () => {
      setStatus(webSocketService.getConnectionStatus());
    };

    const handleConnection = () => {
      updateStatus();
    };

    // Update status immediately
    updateStatus();

    // Subscribe to connection events
    webSocketService.on('connection', handleConnection);

    // Update status every 5 seconds
    const interval = setInterval(updateStatus, 5000);

    return () => {
      webSocketService.off('connection', handleConnection);
      clearInterval(interval);
    };
  }, []);

  // Memoized values for performance
  const memoizedStatus = useMemo(() => status, [status]);

  return memoizedStatus;
}