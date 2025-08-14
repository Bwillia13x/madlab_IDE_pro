
/**
 * Data provider abstraction for MAD LAB IDE
 * Enhanced interfaces for financial data fetching
 */

export type PriceRange = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y' | 'MAX';

export interface PricePoint {
  date: Date | string;  // Support both Date objects and ISO strings
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface KpiData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  peRatio?: number;
  eps?: number;
  dividend?: number;
  divYield?: number;
  beta?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  timestamp: Date;
  // Legacy compatibility aliases
  pe?: number;
  high52w?: number;
  low52w?: number;
  ytdReturn?: number;
  lastUpdated?: string;
}

export interface VolPoint {
  strike: number;
  expiry: Date;
  impliedVol: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

export interface VolSurface {
  symbol: string;
  underlyingPrice: number;
  points: VolPoint[];
  timestamp: Date;
}

export interface CorrelationMatrix {
  symbols: string[];
  matrix: number[][];
  period: string;
  timestamp: Date;
}

// Legacy types for backward compatibility
export type VolConePoint = {
  dte: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  current: number;
};

export type Kpis = {
  revenue: number;
  netIncome: number;
  cashFlow: number;
  fcf: number;
  revChange: number;
  niChange: number;
  cfChange: number;
  fcfChange: number;
};

export type RiskSummary = {
  var95: number;
  var99: number;
  es95: number;
  es99: number;
};

/**
 * Enhanced data provider interface
 */
export interface DataProvider {
  id: string;
  name: string;
  description?: string;
  
  // Core required methods used across the app
  getPrices(symbol: string, range?: PriceRange): Promise<PricePoint[]>;
  getKpis(symbol: string): Promise<KpiData>;
  getVolSurface(symbol: string): Promise<VolSurface>;
  getCorrelation?(symbols: string[], period?: string): Promise<CorrelationMatrix>;
  getFinancials?(symbol: string): Promise<Record<string, unknown>>;
  
  // Enhanced provider methods for better compatibility
  getQuote(symbol: string): Promise<KpiData>;
  getHistoricalPrices(symbol: string, range?: PriceRange): Promise<PricePoint[]>;

  // Optional advanced methods (used by ProviderManager)
  initialize?(): Promise<void>;
  getBatchQuotes?(symbols: string[]): Promise<Record<string, KpiData>>;
  isSymbolSupported?(symbol: string): boolean;
  healthCheck?(): Promise<{ status: 'healthy' | 'degraded' | 'down'; latency: number }>;
  
  // Data export capabilities
  exportData?(symbols: string[], format: 'csv' | 'json' | 'xlsx'): Promise<Blob>;
  supportsExport?(): boolean;
  
  // Legacy sync methods for backward compatibility
  getKpis_sync?(symbol: string): Kpis;
  getPrices_sync?(symbol: string, range?: PriceRange): { date: string; value: number; volume: number }[];
  getVolSurface_sync?(symbol: string): VolConePoint[];
  getRisk?(symbol: string): RiskSummary;
  
  // Utility methods
  isAvailable(): boolean;
  getLastUpdate?(symbol: string): Date | null;
}

/**
 * Provider registry for managing multiple data sources
 */
class ProviderRegistry {
  private currentProvider: DataProvider | null = null;
  private providers = new Map<string, DataProvider>();
  
  register(name: string, provider: DataProvider): void {
    this.providers.set(name, provider);
    if (!this.currentProvider) {
      this.currentProvider = provider;
    }
  }
  
  setActive(name: string): boolean {
    const provider = this.providers.get(name);
    if (provider && (typeof provider.isAvailable !== 'function' || provider.isAvailable())) {
      this.currentProvider = provider;
      return true;
    }
    return false;
  }
  
  getActive(): DataProvider | null {
    return this.currentProvider;
  }
  
  listAvailable(): string[] {
    // Always include 'mock' to ensure a safe fallback is present for UI/E2E
    const names = Array.from(this.providers.entries())
      .filter(([_, provider]) => (typeof provider.isAvailable !== 'function') || provider.isAvailable())
      .map(([name]) => name);
    return Array.from(new Set(['mock', ...names]));
  }
  
  getProvider(name: string): DataProvider | undefined {
    return this.providers.get(name);
  }

  // Non-breaking alias used by loader
  get(name: string): DataProvider | undefined {
    return this.providers.get(name);
  }
}

// Global registry
export const dataProviderRegistry = new ProviderRegistry();

// Enhanced provider functions
export function setDataProvider(name: string): boolean {
  return dataProviderRegistry.setActive(name);
}

export function getDataProvider(): DataProvider | null {
  return dataProviderRegistry.getActive();
}

export function registerDataProvider(name: string, provider: DataProvider): void {
  dataProviderRegistry.register(name, provider);
}

// Legacy functions for backward compatibility
let currentProvider: DataProvider | null = null;

export function setProvider(provider: DataProvider) {
  currentProvider = provider;
  // Also register in new registry
  registerDataProvider(provider.name || 'default', provider);
  setDataProvider(provider.name || 'default');
}

export function getProvider(): DataProvider {
  if (!currentProvider) {
    const active = getDataProvider();
    if (active && (typeof active.isAvailable !== 'function' || active.isAvailable())) {
      currentProvider = active;
      return active;
    }
    throw new Error('Data provider not set. Ensure mockProvider is imported and setProvider called.');
  }
  return currentProvider;
}

// Default provider: mockProvider
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { mockProvider } from './mock';
// Initialize default provider
setProvider(mockProvider);
