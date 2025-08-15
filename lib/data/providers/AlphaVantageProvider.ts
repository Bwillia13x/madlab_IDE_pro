import type {
  DataProvider,
  PricePoint,
  PriceRange,
  KpiData,
  VolSurface,
} from '@/lib/data/providers';
import { getAlphaVantageKey } from '@/lib/data/apiKeys';

function parseTimeSeriesDaily(raw: any, maxPoints = 200): PricePoint[] {
  const key = Object.keys(raw || {}).find((k) => /Time Series/.test(k));
  const series = key ? raw[key] : undefined;
  if (!series || typeof series !== 'object') return [];
  return Object.entries(series)
    .slice(0, maxPoints)
    .map(([date, v]) => ({
      date: new Date(String(date)),
      open: Number((v as any)['1. open'] || (v as any).open || 0),
      high: Number((v as any)['2. high'] || (v as any).high || 0),
      low: Number((v as any)['3. low'] || (v as any).low || 0),
      close: Number((v as any)['4. close'] || (v as any).close || 0),
      volume: Number((v as any)['6. volume'] || (v as any).volume || 0),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

async function avJson(url: string): Promise<any> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Alpha Vantage error: ${res.status}`);
  const data = await res.json();
  if (data && (data['Error Message'] || data['Note'])) {
    throw new Error(String(data['Error Message'] || data['Note']));
  }
  return data;
}

export const alphaVantageProvider: DataProvider = {
  id: 'alpha-vantage',
  name: 'alpha-vantage',
  description: 'Alpha Vantage public API',

  async getPrices(symbol: string, range: PriceRange = '6M'): Promise<PricePoint[]> {
    const key = getAlphaVantageKey();
    if (!key) throw new Error('Alpha Vantage API key not set');
    // Use compact daily series; intraday requires interval handling and tighter limits
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&outputsize=compact&apikey=${encodeURIComponent(key)}`;
    const raw = await avJson(url);
    return parseTimeSeriesDaily(raw);
  },

  async getKpis(symbol: string): Promise<KpiData> {
    const key = getAlphaVantageKey();
    if (!key) throw new Error('Alpha Vantage API key not set');
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`;
    const raw = await avJson(url);
    const q = raw?.['Global Quote'] || {};
    return {
      symbol,
      name: symbol,
      price: Number(q['05. price'] || 0),
      change: Number(q['09. change'] || 0),
      changePercent: Number(String(q['10. change percent'] || '0').replace('%', '')),
      volume: Number(q['06. volume'] || 0),
      marketCap: undefined,
      timestamp: new Date(),
    } as KpiData;
  },

  async getVolSurface(_symbol: string): Promise<VolSurface> {
    // Alpha Vantage does not provide options IV surface on free tier; return minimal stub
    return { symbol: _symbol, underlyingPrice: 0, points: [], timestamp: new Date() };
  },

  async getCorrelation(symbols: string[], period?: string) {
    // Not supported directly; caller can compute using prices
    throw new Error('Correlation not supported by Alpha Vantage provider');
  },

  async getFinancials(symbol: string) {
    const key = getAlphaVantageKey();
    if (!key) throw new Error('Alpha Vantage API key not set');
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`;
    return avJson(url);
  },

  async initialize() {},
  async getBatchQuotes(symbols: string[]) {
    const out: Record<string, KpiData> = {} as any;
    await Promise.all(
      symbols.map(async (s) => {
        try {
          out[s] = await this.getKpis(s);
        } catch {
          // leave missing
        }
      })
    );
    return out;
  },
  isSymbolSupported() {
    return true;
  },
  async healthCheck() {
    const key = getAlphaVantageKey();
    if (!key) return { status: 'down', latency: 0 };
    const start = Date.now();
    try {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${encodeURIComponent(key)}`;
      await avJson(url);
      return { status: 'healthy', latency: Date.now() - start };
    } catch {
      return { status: 'degraded', latency: Date.now() - start };
    }
  },
  isAvailable() {
    return typeof window !== 'undefined' && !!getAlphaVantageKey();
  },
  getLastUpdate() {
    return new Date();
  },
  async getQuote(symbol: string) {
    return this.getKpis(symbol);
  },
  async getHistoricalPrices(symbol: string, range?: PriceRange) {
    return this.getPrices(symbol, range);
  },
  exportData: undefined,
  supportsExport: undefined,
};
