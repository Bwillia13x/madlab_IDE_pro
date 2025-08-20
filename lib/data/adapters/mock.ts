/**
 * Mock Data Provider Adapter
 * Provides deterministic synthetic financial data for testing and demos
 */

import type { Provider, PricePoint, PriceRange, KpiData, FinancialData } from '../provider.types';
import { zPriceSeries, zKpiData, zFinancials } from '../schemas';

// Simple deterministic PRNG seeded by symbol
function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seeded(symbol: string, suffix = '') {
  const seed = xmur3(symbol.toUpperCase() + suffix)();
  return mulberry32(seed);
}

function generatePrices(symbol: string, range: PriceRange): PricePoint[] {
  const r = seeded(symbol, ':' + range);
  const pointsByRange: Record<PriceRange, number> = {
    '1D': 24,
    '5D': 120,
    '1M': 22,
    '3M': 66,
    '6M': 132,
    '1Y': 252,
    '2Y': 504,
    '5Y': 1260,
    MAX: 2520,
  };
  const n = pointsByRange[range] || 132;
  const basePrice = 80 + r() * 60; // 80..140
  const drift = (r() - 0.5) * 0.001;
  const vol = 0.02 + r() * 0.03;

  const prices: PricePoint[] = [];
  let currentPrice = basePrice;
  const now = new Date();

  for (let i = 0; i < n; i++) {
    const shock = (r() - 0.5) * vol;
    const prevClose = currentPrice;

    // Generate OHLC data
    currentPrice = currentPrice * (1 + drift + shock);
    const high = prevClose * (1 + Math.abs(shock) * 0.5 + r() * 0.01);
    const low = prevClose * (1 - Math.abs(shock) * 0.5 - r() * 0.01);
    const open = prevClose * (1 + (r() - 0.5) * 0.005);
    const volume = Math.round(50000 + r() * 200000);

    const date = new Date(now.getTime() - (n - i - 1) * 24 * 60 * 60 * 1000);

    prices.push({
      date,
      open: Number(open.toFixed(2)),
      high: Number(Math.max(high, currentPrice, open).toFixed(2)),
      low: Number(Math.min(low, currentPrice, open).toFixed(2)),
      close: Number(currentPrice.toFixed(2)),
      volume,
    });
  }

  return prices;
}

function generateKpis(symbol: string): KpiData {
  const r = seeded(symbol, ':KPI');
  const price = 80 + r() * 60;
  const change = (r() - 0.5) * 10;
  const changePercent = (change / price) * 100;

  return {
    symbol: symbol.toUpperCase(),
    name: `${symbol.toUpperCase()} Corp`,
    price: Number(price.toFixed(2)),
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    volume: Math.round(1000000 + r() * 5000000),
    marketCap: Math.round(5000000000 + r() * 50000000000),
    peRatio: 15 + r() * 20,
    eps: 2 + r() * 8,
    dividend: r() * 3,
    divYield: r() * 5,
    beta: 0.5 + r() * 1.5,
    fiftyTwoWeekHigh: price * (1.1 + r() * 0.3),
    fiftyTwoWeekLow: price * (0.7 + r() * 0.2),
    timestamp: new Date(),
  };
}

function generateFinancials(symbol: string): FinancialData {
  const r = seeded(symbol, ':FIN');
  const revenue = 30_000_000 + r() * 70_000_000;
  const netIncome = 1_000_000 + r() * 9_000_000;
  const cashFlow = 20_000_000 + r() * 60_000_000;
  const fcf = 3_000_000 + r() * 12_000_000;

  return {
    symbol: symbol.toUpperCase(),
    revenue,
    netIncome,
    cashFlow,
    fcf,
    timestamp: new Date(),
  };
}

export const mockAdapter: Provider = {
  name: 'mock',

  async getPrices(symbol: string, range: PriceRange = '6M'): Promise<PricePoint[]> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 100));
    const series = generatePrices(symbol, range);
    const parsed = zPriceSeries.safeParse(series);
    if (!parsed.success) {
      console.error('Mock adapter produced invalid price series', parsed.error.format());
      throw new Error('Invalid mock price series');
    }
    return parsed.data;
  },

  async getKpis(symbol: string): Promise<KpiData> {
    await new Promise((resolve) => setTimeout(resolve, 30 + Math.random() * 70));
    const k = generateKpis(symbol);
    const parsed = zKpiData.safeParse(k);
    if (!parsed.success) {
      console.error('Mock adapter produced invalid KPI payload', parsed.error.format());
      throw new Error('Invalid mock KPI payload');
    }
    return parsed.data;
  },

  async getFinancials(symbol: string): Promise<FinancialData> {
    await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 150));
    const f = generateFinancials(symbol);
    const parsed = zFinancials.safeParse(f);
    if (!parsed.success) {
      console.error('Mock adapter produced invalid Financials payload', parsed.error.format());
      throw new Error('Invalid mock Financials payload');
    }
    return parsed.data;
  },

  async isAvailable(): Promise<boolean> {
    return true;
  },

  async getLastUpdate(_symbol: string): Promise<Date | null> {
    // Random time within last minute
    return new Date(Date.now() - Math.random() * 60000);
  },

  async isAuthenticated(): Promise<boolean> {
    return true; // Mock adapter is always available
  },
};
