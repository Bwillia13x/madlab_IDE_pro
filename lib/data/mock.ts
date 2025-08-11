import type { PriceRange } from './providers';

// Types used in tests
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
  // Extended fields for legacy tests
  revenue?: number;
  netIncome?: number;
  cashFlow?: number;
  fcf?: number;
  revChange?: number;
  niChange?: number;
  cfChange?: number;
  fcfChange?: number;
}

// Deterministic PRNG
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
  const today = new Date();
  const anchorUtcMidnight = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
    0,
    0,
    0,
    0
  );

  for (let i = 0; i < n; i++) {
    const shock = (r() - 0.5) * vol;
    const prevClose = currentPrice;

    currentPrice = currentPrice * (1 + drift + shock);
    const high = prevClose * (1 + Math.abs(shock) * 0.5 + r() * 0.01);
    const low = prevClose * (1 - Math.abs(shock) * 0.5 - r() * 0.01);
    const open = prevClose * (1 + (r() - 0.5) * 0.005);
    const volume = Math.round(50000 + r() * 200000);
    const date = new Date(anchorUtcMidnight - (n - i - 1) * 24 * 60 * 60 * 1000);

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
  const revenue = 30_000_000 + r() * 70_000_000;
  const netIncome = 1_000_000 + r() * 9_000_000;
  const cashFlow = 20_000_000 + r() * 60_000_000;
  const fcf = 3_000_000 + r() * 12_000_000;

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
    revenue,
    netIncome,
    cashFlow,
    fcf,
    revChange: (r() - 0.5) * 0.1,
    niChange: (r() - 0.5) * 0.1,
    cfChange: (r() - 0.5) * 0.1,
    fcfChange: (r() - 0.5) * 0.1,
  };
}

export const mockProvider = {
  name: 'mock',

  getKpis_sync: (symbol: string): KpiData => generateKpis(symbol),
  getPrices_sync: (symbol: string, range: PriceRange = '6M'): PricePoint[] =>
    generatePrices(symbol, range),
  getVolSurface_sync: (_symbol: string) => {
    // Simple deterministic 5 points surface equivalent shape
    const today = new Date();
    const anchor = Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
      0,
      0,
      0,
      0
    );
    return Array.from({ length: 5 }).map((_, i) => ({
      strike: 80 + i * 10,
      expiry: new Date(anchor + i * 7 * 24 * 60 * 60 * 1000),
      impliedVol: 0.2 + i * 0.02,
      delta: 0.5 - i * 0.05,
      gamma: 0.01 + i * 0.001,
      theta: -0.02 - i * 0.001,
      vega: 0.1 + i * 0.01,
    }));
  },
  getRisk: (_symbol: string) => ({
    var: 0.05,
    es: 0.07,
    timestamp: new Date(),
  }),

  async getKpis(symbol: string): Promise<KpiData> {
    await new Promise((r) => setTimeout(r, 10));
    return generateKpis(symbol);
  },
  async getPrices(symbol: string, range: PriceRange = '6M'): Promise<PricePoint[]> {
    await new Promise((r) => setTimeout(r, 10));
    return generatePrices(symbol, range);
  },
  async getVolSurface(symbol: string) {
    await new Promise((r) => setTimeout(r, 10));
    return {
      symbol: symbol.toUpperCase(),
      underlyingPrice: 100,
      points: (mockProvider.getVolSurface_sync as any)(symbol),
      timestamp: new Date(),
    };
  },
  async getCorrelation(symbols: string[], period: PriceRange = '1Y') {
    await new Promise((r) => setTimeout(r, 10));
    const n = symbols.length;
    const matrix = Array.from({ length: n }, () => Array<number>(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) matrix[i][j] = i === j ? 1 : 0.5;
    }
    return { symbols, matrix, period, timestamp: new Date() };
  },
  isAvailable: () => true,
  getLastUpdate: (_symbol: string) => new Date(Date.now() - 1000),
};