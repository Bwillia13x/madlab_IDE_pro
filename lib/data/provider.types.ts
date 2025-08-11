import type { PriceRange as RangeFromProviders } from './providers';
export type PriceRange = RangeFromProviders;

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
  peRatio: number;
  eps: number;
  dividend: number;
  divYield: number;
  beta: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
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
  getPrices(symbol: string, range: PriceRange): Promise<PricePoint[]>;
  getKpis(symbol: string): Promise<KpiData>;
  getFinancials(symbol: string): Promise<FinancialData>;
  isAvailable(): Promise<boolean>;
  getLastUpdate(symbol: string): Promise<Date | null>;
}