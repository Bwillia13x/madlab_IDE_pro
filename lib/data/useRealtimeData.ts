import { useState, useEffect, useCallback, useRef } from 'react';
import { getRealtimeService, type RealtimeData, type RealtimeConfig } from './realtime';
import type { PricePoint, KpiData } from './provider.types';

export interface UseRealtimeDataOptions {
  symbols: string[];
  types?: ('price' | 'kpi' | 'volume')[];
  updateInterval?: number;
  enableWebSocket?: boolean;
  webSocketUrl?: string;
}

export interface RealtimeDataState {
  data: RealtimeData[];
  isConnected: boolean;
  isRunning: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

export function useRealtimeData(options: UseRealtimeDataOptions): RealtimeDataState & {
  start: () => Promise<void>;
  stop: () => void;
  addSymbol: (symbol: string) => void;
  removeSymbol: (symbol: string) => void;
  updateConfig: (newConfig: Partial<RealtimeConfig>) => void;
} {
  const [state, setState] = useState<RealtimeDataState>({
    data: [],
    isConnected: false,
    isRunning: false,
    error: null,
    lastUpdate: null,
  });

  const serviceRef = useRef(getRealtimeService());
  const dataRef = useRef<RealtimeData[]>([]);

  // Initialize service with options
  useEffect(() => {
    const service = serviceRef.current;
    
    const config: RealtimeConfig = {
      symbols: options.symbols,
      updateInterval: options.updateInterval || 5000,
      enableWebSocket: options.enableWebSocket || false,
      webSocketUrl: options.webSocketUrl,
    };

    service.updateConfig(config);
  }, [options.symbols, options.updateInterval, options.enableWebSocket, options.webSocketUrl]);

  // Set up event listeners
  useEffect(() => {
    const service = serviceRef.current;

    const handleData = (data: RealtimeData) => {
      // Filter by types if specified
      if (options.types && !options.types.includes(data.type)) {
        return;
      }

      // Filter by symbols
      if (!options.symbols.includes(data.symbol)) {
        return;
      }

      // Update data
      dataRef.current = [...dataRef.current, data];
      
      // Keep only last 1000 data points to prevent memory issues
      if (dataRef.current.length > 1000) {
        dataRef.current = dataRef.current.slice(-1000);
      }

      setState(prev => ({
        ...prev,
        data: [...dataRef.current],
        lastUpdate: new Date(),
      }));
    };

    const handleConnected = () => {
      setState(prev => ({
        ...prev,
        isConnected: true,
        error: null,
      }));
    };

    const handleDisconnected = () => {
      setState(prev => ({
        ...prev,
        isConnected: false,
      }));
    };

    const handleError = (error: any) => {
      setState(prev => ({
        ...prev,
        error: error?.message || 'Real-time data error',
      }));
    };

    // Add event listeners
    service.on('data', handleData);
    service.on('connected', handleConnected);
    service.on('disconnected', handleDisconnected);
    service.on('error', handleError);

    // Get initial status
    const status = service.getStatus();
    setState(prev => ({
      ...prev,
      isConnected: status.isConnected,
      isRunning: status.isRunning,
    }));

    // Cleanup
    return () => {
      service.off('data', handleData);
      service.off('connected', handleConnected);
      service.off('disconnected', handleDisconnected);
      service.off('error', handleError);
    };
  }, [options.symbols, options.types]);

  const start = useCallback(async () => {
    try {
      await serviceRef.current.start();
      setState(prev => ({
        ...prev,
        isRunning: true,
        error: null,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start real-time service',
      }));
    }
  }, []);

  const stop = useCallback(() => {
    serviceRef.current.stop();
    setState(prev => ({
      ...prev,
      isRunning: false,
    }));
  }, []);

  const addSymbol = useCallback((symbol: string) => {
    serviceRef.current.addSymbol(symbol);
  }, []);

  const removeSymbol = useCallback((symbol: string) => {
    serviceRef.current.removeSymbol(symbol);
  }, []);

  const updateConfig = useCallback((newConfig: Partial<RealtimeConfig>) => {
    serviceRef.current.updateConfig(newConfig);
  }, []);

  return {
    ...state,
    start,
    stop,
    addSymbol,
    removeSymbol,
    updateConfig,
  };
}

// Specialized hooks for specific data types
export function useRealtimePrices(symbols: string[], updateInterval = 5000) {
  const { data, ...rest } = useRealtimeData({
    symbols,
    types: ['price'],
    updateInterval,
  });

  const prices = data
    .filter(d => d.type === 'price')
    .map(d => ({ ...d.data as PricePoint, symbol: d.symbol }));

  return {
    ...rest,
    prices,
    data,
  };
}

export function useRealtimeKPIs(symbols: string[], updateInterval = 10000) {
  const { data, ...rest } = useRealtimeData({
    symbols,
    types: ['kpi'],
    updateInterval,
  });

  const kpis = data
    .filter(d => d.type === 'kpi')
    .map(d => d.data as KpiData);

  return {
    ...rest,
    kpis,
    data,
  };
}

export function useRealtimeVolume(symbols: string[], updateInterval = 2000) {
  const { data, ...rest } = useRealtimeData({
    symbols,
    types: ['volume'],
    updateInterval,
  });

  const volumes = data
    .filter(d => d.type === 'volume')
    .map(d => d.data as number);

  return {
    ...rest,
    volumes,
    data,
  };
}