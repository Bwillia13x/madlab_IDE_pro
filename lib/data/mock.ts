import type { 
  DataProvider, 
  Kpis, 
  PricePoint, 
  PriceRange, 
  RiskSummary, 
  VolConePoint,
  KpiData,
  VolSurface,
  VolPoint,
  CorrelationMatrix
} from './providers';

// Simple deterministic PRNG seeded by symbol
function xmur3(str: string) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return (h ^= h >>> 16) >>> 0
  }
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seeded(symbol: string) {
  const seed = xmur3(symbol.toUpperCase())()
  const rand = mulberry32(seed)
  return rand
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function generatePrices(symbol: string, range: PriceRange): PricePoint[] {
  const r = seeded(symbol + ':' + range);
  const pointsByRange: Record<PriceRange, number> = { 
    '1D': 24, '5D': 120, '1M': 22, '3M': 66, '6M': 132, '1Y': 252, '2Y': 504, '5Y': 1260, 'MAX': 2520 
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
      volume
    });
  }
  
  return prices;
}

function generateVolSurface(symbol: string): VolSurface {
  const r = seeded(symbol + ':VOL');
  const strikes = [90, 95, 100, 105, 110, 115, 120];
  const expiries = [7, 14, 30, 60, 90, 180].map(days => 
    new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  );
  const underlyingPrice = 100 + (r() - 0.5) * 20;
  const baseVol = 0.20 + r() * 0.15;
  
  const points: VolPoint[] = [];
  
  for (const expiry of expiries) {
    for (const strike of strikes) {
      const moneyness = strike / underlyingPrice;
      const timeToExpiry = (expiry.getTime() - Date.now()) / (365 * 24 * 60 * 60 * 1000);
      
      // Volatility smile/skew
      const skew = 0.1 * Math.exp(-2 * (moneyness - 1));
      const timeDecay = 0.05 * Math.sqrt(timeToExpiry);
      const noise = (r() - 0.5) * 0.02;
      
      const impliedVol = clamp(baseVol + skew + timeDecay + noise, 0.05, 1);
      
      points.push({
        strike,
        expiry,
        impliedVol,
        delta: 0.5 + (r() - 0.5) * 0.4,
        gamma: r() * 0.02,
        theta: -(r() * 0.1),
        vega: r() * 0.3
      });
    }
  }
  
  return {
    symbol,
    underlyingPrice,
    points,
    timestamp: new Date()
  };
}

export const mockProvider: DataProvider = {
  id: 'mock',
  name: 'mock',
  
  // Enhanced async methods
  async getPrices(symbol: string, range: PriceRange = '6M'): Promise<PricePoint[]> {
    // Small delay to simulate network
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    return generatePrices(symbol, range);
  },

  async getKpis(symbol: string): Promise<KpiData> {
    await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 70));
    const r = seeded(symbol);
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
      timestamp: new Date()
    };
  },

  async getQuote(symbol: string): Promise<KpiData> {
    return this.getKpis(symbol);
  },

  async getHistoricalPrices(symbol: string, range: PriceRange = '6M') {
    return this.getPrices(symbol, range);
  },

  async getVolSurface(symbol: string): Promise<VolSurface> {
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    return generateVolSurface(symbol);
  },

  async getCorrelation(symbols: string[], period = '1Y'): Promise<CorrelationMatrix> {
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
    const n = symbols.length;
    const matrix: number[][] = [];
    
    for (let i = 0; i < n; i++) {
      matrix[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else if (i < j) {
          // Only calculate upper triangle to ensure symmetry
          const r = seeded(symbols[i] + symbols[j] + period);
          matrix[i][j] = -0.5 + r();
        } else {
          // Use lower triangle value
          matrix[i][j] = matrix[j][i];
        }
      }
    }
    
    return {
      symbols,
      matrix,
      period,
      timestamp: new Date()
    };
  },

  // Legacy sync methods for backward compatibility
  getKpis_sync(symbol: string): Kpis {
    const r = seeded(symbol);
    const revenue = 30_000_000 + r() * 70_000_000;
    const netIncome = 1_000_000 + r() * 9_000_000;
    const cashFlow = 20_000_000 + r() * 60_000_000;
    const fcf = 3_000_000 + r() * 12_000_000;

    const revChange = r() * 0.4 - 0.2;
    const niChange = r() * 0.4 - 0.2;
    const cfChange = r() * 0.4 - 0.2;
    const fcfChange = r() * 0.4 - 0.2;

    return { revenue, netIncome, cashFlow, fcf, revChange, niChange, cfChange, fcfChange };
  },

  getPrices_sync(symbol: string, range: PriceRange = '6M'): { date: string; value: number; volume: number }[] {
    const r = seeded(symbol + ':' + range);
    const pointsByRange: Record<PriceRange, number> = { 
      '1D': 24, '5D': 120, '1M': 22, '3M': 66, '6M': 132, '1Y': 252, '2Y': 504, '5Y': 1260, 'MAX': 2520 
    };
    const n = pointsByRange[range] || 132;
    const base = 80 + r() * 60;
    const drift = (r() - 0.5) * 0.001;
    const vol = 0.02 + r() * 0.03;

    const out: { date: string; value: number; volume: number }[] = [];
    let value = base;
    for (let i = 0; i < n; i++) {
      const shock = (r() - 0.5) * vol;
      value = value * (1 + drift + shock);
      const volume = Math.round(1000 + r() * 9000);
      out.push({ date: `T${i + 1}`, value: Number(value.toFixed(2)), volume });
    }
    return out;
  },

  getVolSurface_sync(symbol: string): VolConePoint[] {
    const r = seeded(symbol + ':VOL');
    const dtes = [7, 14, 30, 60, 90];
    const out: VolConePoint[] = [];
    const base = 0.18 + r() * 0.12;

    for (const dte of dtes) {
      const jitter = (r() - 0.5) * 0.02;
      const mid = clamp(base + jitter + (dte / 365) * 0.03 * (r() - 0.5), 0.1, 0.6);
      const spread = 0.03 + r() * 0.06;
      const p10 = clamp(mid - spread * 0.8, 0.05, 1);
      const p25 = clamp(mid - spread * 0.4, 0.05, 1);
      const p50 = clamp(mid, 0.05, 1);
      const p75 = clamp(mid + spread * 0.4, 0.05, 1);
      const p90 = clamp(mid + spread * 0.8, 0.05, 1);
      const current = clamp(p50 + (r() - 0.5) * 0.03, 0.05, 1);
      out.push({ dte, p10, p25, p50, p75, p90, current });
    }
    return out;
  },

  getRisk(symbol: string): RiskSummary {
    const r = seeded(symbol + ':RISK');
    const scale = 1_000_000 + r() * 9_000_000;
    const var95 = 0.02 * scale * (0.9 + r() * 0.2);
    const var99 = 0.03 * scale * (0.9 + r() * 0.2);
    const es95 = 0.035 * scale * (0.9 + r() * 0.2);
    const es99 = 0.05 * scale * (0.9 + r() * 0.2);
    return { var95, var99, es95, es99 };
  },

  // Utility methods
  isAvailable(): boolean {
    return true;
  },

  getLastUpdate(symbol: string): Date | null {
    return new Date(Date.now() - Math.random() * 60000); // Random time within last minute
  }
};
