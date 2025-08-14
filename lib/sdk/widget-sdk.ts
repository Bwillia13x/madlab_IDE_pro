/**
 * MAD LAB Widget SDK
 * Provides developers with tools to create custom widgets for the financial workbench
 */

import { z } from 'zod';
import { trackFeature } from '@/lib/analytics/customer';
import type { WidgetDefinition, WidgetProps } from '@/lib/widgets/schema';

// SDK version for compatibility checking
export const SDK_VERSION = '1.0.0';

// Widget development utilities
export interface WidgetSDK {
  // Widget lifecycle
  createWidget: (definition: WidgetDefinition) => void;
  registerWidget: (type: string, component: React.ComponentType<WidgetProps>) => void;
  
  // Data access
  fetchData: <T>(source: string, params?: Record<string, any>) => Promise<T>;
  
  // UI utilities
  showNotification: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  
  // Analytics
  trackEvent: (event: string, properties?: Record<string, any>) => void;
  
  // State management
  getWorkspaceState: () => any;
  updateWidgetProps: (widgetId: string, props: Record<string, any>) => void;
}

// Financial data types for SDK
export interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

export interface ChartPoint {
  date: string;
  value: number;
  volume?: number;
}

export interface FinancialMetrics {
  revenue?: number;
  netIncome?: number;
  eps?: number;
  pe?: number;
  marketCap?: number;
  [key: string]: number | undefined;
}

// Widget template helpers
export class WidgetTemplate {
  private definition: Partial<WidgetDefinition>;

  constructor(type: string, title: string) {
    // Align with WidgetDefinition shape: meta + runtime
    this.definition = {
      meta: {
        type,
        name: title,
        description: `Custom ${title} widget`,
        category: 'analysis',
        version: '1',
        configSchema: z.object({}).optional() as unknown as z.ZodType<any>,
        defaultConfig: {},
        defaultSize: { w: 6, h: 4 },
        capabilities: {
          resizable: true,
          configurable: true,
          dataBinding: false,
          exportable: false,
          realTimeData: false,
        },
        tags: ['custom', 'developer'],
      },
      runtime: {
        component: undefined as unknown as React.ComponentType<WidgetProps>,
      },
    } as unknown as Partial<WidgetDefinition>;
  }

  withDescription(description: string): WidgetTemplate {
    if (this.definition.meta) this.definition.meta.description = description as any;
    return this;
  }

  withCategory(category: string): WidgetTemplate {
    if (this.definition.meta) this.definition.meta.category = category as any;
    return this;
  }

  withTags(tags: string[]): WidgetTemplate {
    if (this.definition.meta) this.definition.meta.tags = tags;
    return this;
  }

  withConfig(schema: z.ZodSchema): WidgetTemplate {
    if (this.definition.meta) this.definition.meta.configSchema = schema as any;
    return this;
  }

  withDefaultProps(props: Record<string, any>): WidgetTemplate {
    if (this.definition.meta) this.definition.meta.defaultConfig = props;
    return this;
  }

  withComponent(component: React.ComponentType<WidgetProps>): WidgetTemplate {
    if (this.definition.runtime) this.definition.runtime.component = component;
    return this;
  }

  build(): WidgetDefinition {
    const def = this.definition as WidgetDefinition;
    if (!def.runtime?.component) {
      throw new Error('Widget component is required');
    }
    return def;
  }
}

// Data fetching utilities
export class DataFetcher {
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  static async fetch<T>(
    url: string, 
    options: {
      cache?: boolean;
      ttl?: number;
      headers?: Record<string, string>;
      transform?: (data: any) => T;
    } = {}
  ): Promise<T> {
    const {
      cache = true,
      ttl = 300000, // 5 minutes
      headers = {},
      transform = (data) => data,
    } = options;

    // Check cache first
    if (cache) {
      const cached = this.cache.get(url);
      if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
        return transform(cached.data);
      }
    }

    // Fetch fresh data
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const transformedData = transform(data);

    // Cache the result
    if (cache) {
      this.cache.set(url, {
        data: transformedData,
        timestamp: Date.now(),
        ttl,
      });
    }

    return transformedData;
  }

  static clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}

// Financial data helpers
export class FinancialData {
  // Calculate common financial ratios
  static calculatePE(price: number, eps: number): number {
    return eps > 0 ? price / eps : NaN;
  }

  static calculatePEG(pe: number, growthRate: number): number {
    return growthRate > 0 ? pe / growthRate : NaN;
  }

  static calculateROE(netIncome: number, shareholderEquity: number): number {
    return shareholderEquity > 0 ? (netIncome / shareholderEquity) * 100 : NaN;
  }

  static calculateDebtToEquity(totalDebt: number, shareholderEquity: number): number {
    return shareholderEquity > 0 ? totalDebt / shareholderEquity : NaN;
  }

  // Format financial numbers for display
  static formatCurrency(value: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  }

  static formatPercent(value: number, decimals = 2): string {
    return `${value.toFixed(decimals)}%`;
  }

  static formatLargeNumber(value: number): string {
    if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toFixed(0);
  }

  // Technical analysis utilities
  static calculateSMA(prices: number[], period: number): number[] {
    const sma: number[] = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  static calculateEMA(prices: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // First EMA value is SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += prices[i];
    }
    ema.push(sum / period);
    
    // Calculate subsequent EMA values
    for (let i = period; i < prices.length; i++) {
      const prevEma = ema[ema.length - 1];
      ema.push((prices[i] - prevEma) * multiplier + prevEma);
    }
    
    return ema;
  }

  static calculateRSI(prices: number[], period = 14): number[] {
    const gains: number[] = [];
    const losses: number[] = [];
    
    // Calculate price changes
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    // Calculate RSI
    const rsi: number[] = [];
    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      
      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    }
    
    return rsi;
  }
}

// Widget development hooks
export function useWidgetData<T>(
  source: string,
  params: Record<string, any> = {},
  options: { 
    refetchInterval?: number;
    enabled?: boolean;
    onError?: (error: Error) => void;
  } = {}
) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const { refetchInterval, enabled = true, onError } = options;

  const fetchData = React.useCallback(async () => {
    if (!enabled) return;
    
    setLoading(true);
    setError(null);

    try {
      // This would integrate with the existing data provider system
      const result = await DataFetcher.fetch<T>(`/api/data/${source}`, {
        cache: true,
        transform: (data) => data,
      });
      setData(result);
      trackFeature(`data_fetch_${source}`, params);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [source, enabled, onError]);

  React.useEffect(() => {
    fetchData();

    if (refetchInterval && refetchInterval > 0) {
      const interval = setInterval(fetchData, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refetchInterval]);

  return { data, loading, error, refetch: fetchData };
}

// Widget configuration helpers
export function createConfigSchema<T extends Record<string, any>>(schema: {
  [K in keyof T]: {
    type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect';
    default: T[K];
    label: string;
    description?: string;
    options?: Array<{ value: T[K]; label: string }>;
    min?: number;
    max?: number;
    step?: number;
  }
}): z.ZodSchema<T> {
  const zodSchema: Record<string, z.ZodTypeAny> = {};

  for (const [key, config] of Object.entries(schema)) {
    let field: z.ZodTypeAny;

    switch (config.type) {
      case 'string':
        field = z.string().default(config.default);
        break;
      case 'number':
        {
          let numField = z.number();
          if (config.min !== undefined) numField = numField.min(config.min);
          if (config.max !== undefined) numField = numField.max(config.max);
          field = numField.default(config.default as number);
        }
        break;
      case 'boolean':
        field = z.boolean().default(config.default);
        break;
      case 'select':
      case 'multiselect':
        if (config.options) {
          const values = (config.options as Array<{ value: any; label: string }>).map((opt) => String(opt.value));
          const enumSchema = z.enum(values as [string, ...string[]]);
          field = config.type === 'multiselect'
            ? z.array(enumSchema).default((config.default as unknown as string[]) ?? [])
            : enumSchema.default(String(config.default));
        } else {
          field = z.string().default(String(config.default));
        }
        break;
      default:
        field = z.unknown().default(config.default);
    }

    if (config.description) {
      field = field.describe(config.description);
    }

    zodSchema[key] = field;
  }

  return z.object(zodSchema) as unknown as z.ZodSchema<T>;
}

// Export SDK instance
export const SDK: WidgetSDK = {
  createWidget: (definition: WidgetDefinition) => {
    // This would integrate with the widget registry
    console.log('Creating widget:', definition.meta.type);
    trackFeature('widget_created', { type: definition.meta.type });
  },

  registerWidget: (type: string, component: React.ComponentType<WidgetProps>) => {
    // This would register with the widget system
    console.log('Registering widget:', type);
    trackFeature('widget_registered', { type });
  },

  fetchData: async <T>(source: string, params?: Record<string, any>): Promise<T> => {
    return DataFetcher.fetch<T>(`/api/data/${source}`, {
      cache: true,
      transform: (data) => data,
    });
  },

  showNotification: (message: string, type = 'info') => {
    // This would integrate with the toast system
    console.log(`[${type.toUpperCase()}] ${message}`);
  },

  trackEvent: (event: string, properties?: Record<string, any>) => {
    trackFeature(event, properties);
  },

  getWorkspaceState: () => {
    // This would integrate with the workspace store
    return {};
  },

  updateWidgetProps: (widgetId: string, props: Record<string, any>) => {
    // This would update widget props in the store
    console.log('Updating widget props:', widgetId, props);
  },
};

// Add React import for hooks
import React from 'react';