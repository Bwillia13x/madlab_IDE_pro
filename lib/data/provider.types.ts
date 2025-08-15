export type PriceRange = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y' | 'MAX';

export interface PricePoint {
  date: Date;
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
  marketCap: number;
  peRatio?: number;
  eps?: number;
  dividend?: number;
  divYield?: number;
  beta?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  timestamp: Date;
}

export interface FinancialData {
  symbol: string;
  revenue: number;
  netIncome: number;
  cashFlow: number;
  fcf: number;
  timestamp: Date;
}

export interface Provider {
  name: string;
  getPrices(symbol: string, range?: PriceRange): Promise<PricePoint[]>;
  getKpis(symbol: string): Promise<KpiData>;
  getFinancials(symbol: string): Promise<FinancialData>;
  isAvailable(): Promise<boolean>;
  getLastUpdate(symbol: string): Promise<Date | null>;
}

export interface DataCache {
  prices: Map<string, { data: PricePoint[]; timestamp: number; range: PriceRange }>;
  kpis: Map<string, { data: KpiData; timestamp: number }>;
  financials: Map<string, { data: FinancialData; timestamp: number }>;
}

export interface DataProviderContext {
  currentProvider: string;
  providers: Record<string, Provider>;
  cache: DataCache;
}