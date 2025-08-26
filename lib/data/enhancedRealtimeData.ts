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

interface RealtimeHookOptions {
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  updateInterval?: number;
  enableFallback?: boolean;
  enableCompression?: boolean;
}

// Enhanced real-time price data hook with better error recovery and consistency
export function useEnhancedRealtimePrices(symbols: string[], options: RealtimeHookOptions = {}) {
  const {
    autoReconnect = true,
    maxReconnectAttempts = 5,
    reconnectDelay = 1000,
    updateInterval = 1000,
    enableFallback = true,
    enableCompression = true
  } = options;

  const [prices, setPrices] = useState<Array<{
    symbol: string;
    price: number;
    timestamp: number;
    source: string;
    confidence: number;
    lastUpdate: number;
  }>>([]);

  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: false,
    isReconnecting: false,
    reconnectAttempts: 0,
    lastConnected: null as Date | null
  });

  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [updateStats, setUpdateStats] = useState({
    totalUpdates: 0,
    successfulUpdates: 0,
    failedUpdates: 0,
    averageLatency: 0
  });

  const symbolsRef = useRef(symbols);
  const updateIntervalRef = useRef(updateInterval);
  const subscriptionRefs = useRef<Map<string, () => void>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const lastUpdateTimesRef = useRef<Map<string, number>>(new Map());

  // Update refs when props change
  useEffect(() => {
    symbolsRef.current = symbols;
    updateIntervalRef.current = updateInterval;
  }, [symbols, updateInterval]);

  // Enhanced connection status management with automatic reconnection
  useEffect(() => {
    const handleConnection = (status: ConnectionStatus) => {
      const isConnected = status.status === 'connected';

      setConnectionStatus(prev => ({
        ...prev,
        isConnected,
        isReconnecting: false,
        reconnectAttempts: isConnected ? 0 : prev.reconnectAttempts,
        lastConnected: isConnected ? new Date() : prev.lastConnected
      }));

      if (isConnected) {
        reconnectAttemptsRef.current = 0;
        setError(null);

        if (isRunning) {
          // Resubscribe to symbols when reconnected
          symbolsRef.current.forEach(symbol => {
            if (!subscriptionRefs.current.has(symbol)) {
              try {
                const unsubscribe = multiExchangeAggregator.subscribeToSymbol(symbol);
                subscriptionRefs.current.set(symbol, unsubscribe);
              } catch (err) {
                console.error(`Failed to resubscribe to ${symbol}:`, err);
                setUpdateStats(prev => ({ ...prev, failedUpdates: prev.failedUpdates + 1 }));
              }
            }
          });
        }
      } else if (!isConnected && isRunning && autoReconnect) {
        // Attempt to reconnect with exponential backoff
        attemptReconnect();
      }
    };

    const handleError = (error: Error) => {
      console.error('WebSocket error:', error);
      setError(`Connection error: ${error.message}`);
      setUpdateStats(prev => ({ ...prev, failedUpdates: prev.failedUpdates + 1 }));
    };

    const attemptReconnect = () => {
      if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        setError(`Failed to reconnect after ${maxReconnectAttempts} attempts`);
        setConnectionStatus(prev => ({ ...prev, isReconnecting: false }));
        return;
      }

      const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttemptsRef.current), 30000);
      reconnectAttemptsRef.current++;

      setConnectionStatus(prev => ({
        ...prev,
        isReconnecting: true,
        reconnectAttempts: reconnectAttemptsRef.current
      }));

      reconnectTimeoutRef.current = setTimeout(() => {
        webSocketService.connect().catch(err => {
          console.error(`Reconnection attempt ${reconnectAttemptsRef.current} failed:`, err);
          attemptReconnect(); // Try again
        });
      }, delay);
    };

    webSocketService.on('connection', handleConnection);
    webSocketService.on('error', handleError);

    return () => {
      webSocketService.off('connection', handleConnection);
      webSocketService.off('error', handleError);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [isRunning, autoReconnect, maxReconnectAttempts, reconnectDelay]);

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
          try {
            const unsubscribe = multiExchangeAggregator.subscribeToSymbol(symbol);
            subscriptionRefs.current.set(symbol, unsubscribe);
          } catch (err) {
            console.error(`Failed to subscribe to ${symbol}:`, err);
            setUpdateStats(prev => ({ ...prev, failedUpdates: prev.failedUpdates + 1 }));
          }
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

    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);

  // Enhanced data subscription with better consistency
  useEffect(() => {
    if (!isRunning) return;

    const handleAggregatedData = (data: AggregatedData) => {
      if (symbolsRef.current.includes(data.symbol)) {
        const now = Date.now();
        const startTime = performance.now();

        setPrices(prev => {
          const existing = prev.find(p => p.symbol === data.symbol);
          const confidence = calculateConfidence(data);
          const lastUpdate = lastUpdateTimesRef.current.get(data.symbol) || now;

          if (existing) {
            return prev.map(p =>
              p.symbol === data.symbol
                ? {
                    ...p,
                    price: data.midPrice,
                    timestamp: now,
                    source: 'aggregated',
                    confidence,
                    lastUpdate: now
                  }
                : p
            );
          } else {
            return [...prev, {
              symbol: data.symbol,
              price: data.midPrice,
              timestamp: now,
              source: 'aggregated',
              confidence,
              lastUpdate: now
            }];
          }
        });

        lastUpdateTimesRef.current.set(data.symbol, now);
        setLastUpdate(now);

        // Update stats
        const latency = performance.now() - startTime;
        setUpdateStats(prev => ({
          ...prev,
          totalUpdates: prev.totalUpdates + 1,
          successfulUpdates: prev.successfulUpdates + 1,
          averageLatency: (prev.averageLatency * prev.successfulUpdates + latency) / (prev.successfulUpdates + 1)
        }));
      }
    };

    const handleExchangeData = (data: ExchangeData) => {
      if (symbolsRef.current.includes(data.data.symbol)) {
        const now = Date.now();
        const startTime = performance.now();

        setPrices(prev => {
          const existing = prev.find(p => p.symbol === data.data.symbol);
          const confidence = 0.8; // Lower confidence for single exchange data

          if (existing) {
            return prev.map(p =>
              p.symbol === data.data.symbol
                ? {
                    ...p,
                    price: data.data.price,
                    timestamp: now,
                    source: data.exchange,
                    confidence,
                    lastUpdate: now
                  }
                : p
            );
          } else {
            return [...prev, {
              symbol: data.data.symbol,
              price: data.data.price,
              timestamp: now,
              source: data.exchange,
              confidence,
              lastUpdate: now
            }];
          }
        });

        lastUpdateTimesRef.current.set(data.data.symbol, now);
        setLastUpdate(now);

        // Update stats
        const latency = performance.now() - startTime;
        setUpdateStats(prev => ({
          ...prev,
          totalUpdates: prev.totalUpdates + 1,
          successfulUpdates: prev.successfulUpdates + 1,
          averageLatency: (prev.averageLatency * prev.successfulUpdates + latency) / (prev.successfulUpdates + 1)
        }));
      }
    };

    // Subscribe to data updates
    multiExchangeAggregator.on('aggregatedDataUpdate', handleAggregatedData);
    multiExchangeAggregator.on('exchangeDataUpdate', handleExchangeData);

    return () => {
      multiExchangeAggregator.off('aggregatedDataUpdate', handleAggregatedData);
      multiExchangeAggregator.off('exchangeDataUpdate', handleExchangeData);
    };
  }, [isRunning]);

  // Calculate confidence based on data quality
  const calculateConfidence = (data: AggregatedData): number => {
    // Higher confidence for higher volume and more exchanges
    const volumeScore = Math.min(data.totalVolume / 1000000, 1); // Max at 1M volume
    const exchangeData = multiExchangeAggregator.getExchangeData(data.symbol);
    const exchangeCount = exchangeData ? exchangeData.size : 0;
    const exchangeScore = Math.min(exchangeCount / 5, 1); // Max at 5 exchanges

    return Math.max(0.1, (volumeScore * 0.6 + exchangeScore * 0.4));
  };

  // Fallback polling mechanism when WebSocket is unavailable
  useEffect(() => {
    if (!enableFallback || !isRunning || connectionStatus.isConnected) return;

    const pollData = async () => {
      for (const symbol of symbolsRef.current) {
        try {
          // This would integrate with your existing polling mechanism
          // For now, we'll just mark it as a fallback update
          setUpdateStats(prev => ({
            ...prev,
            totalUpdates: prev.totalUpdates + 1
          }));
        } catch (err) {
          console.error(`Fallback polling failed for ${symbol}:`, err);
          setUpdateStats(prev => ({ ...prev, failedUpdates: prev.failedUpdates + 1 }));
        }
      }
    };

    const interval = setInterval(pollData, updateIntervalRef.current * 5); // Poll less frequently
    return () => clearInterval(interval);
  }, [enableFallback, isRunning, connectionStatus.isConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  // Memoized values for performance
  const memoizedPrices = useMemo(() => prices, [prices]);
  const memoizedLastUpdate = useMemo(() => lastUpdate, [lastUpdate]);

  // Get stale symbols (not updated in last 30 seconds)
  const staleSymbols = useMemo(() => {
    const now = Date.now();
    return symbolsRef.current.filter(symbol => {
      const lastUpdate = lastUpdateTimesRef.current.get(symbol);
      return lastUpdate && (now - lastUpdate) > 30000;
    });
  }, [prices]);

  return {
    prices: memoizedPrices,
    connectionStatus,
    isRunning,
    error,
    lastUpdate: memoizedLastUpdate,
    updateStats,
    staleSymbols,
    start,
    stop,
  };
}

// Enhanced hook for real-time data quality monitoring
export function useRealtimeDataQuality() {
  const [qualityMetrics, setQualityMetrics] = useState({
    averageConfidence: 0,
    staleDataCount: 0,
    connectionUptime: 0,
    averageLatency: 0,
    dataFreshness: 0
  });

  useEffect(() => {
    const updateMetrics = () => {
      // This would integrate with your actual quality monitoring
      // For demo purposes, we'll simulate some metrics
      setQualityMetrics({
        averageConfidence: Math.random() * 0.3 + 0.7, // 70-100%
        staleDataCount: Math.floor(Math.random() * 5),
        connectionUptime: Math.random() * 0.2 + 0.8, // 80-100%
        averageLatency: Math.random() * 50 + 10, // 10-60ms
        dataFreshness: Math.random() * 0.2 + 0.8 // 80-100%
      });
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  return qualityMetrics;
}

