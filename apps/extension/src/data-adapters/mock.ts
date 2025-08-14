import { getCached, setCached } from '../storage';

export async function fetchPrices(symbol: string, range: string) {
  const key = `prices:${symbol}:${range}`;
  const cached = getCached<any>(key);
  if (cached) return cached;
  const now = Date.now();
  const n = 132;
  const data = Array.from({ length: n }, (_, i) => ({
    date: new Date(now - (n - i - 1) * 86400000).toISOString(),
    open: 100 + Math.sin(i / 10) * 2,
    high: 101 + Math.sin(i / 10) * 2,
    low: 99 + Math.sin(i / 10) * 2,
    close: 100 + Math.sin(i / 10) * 2,
    volume: 1_000_000 + i * 10,
  }));
  setCached(key, data);
  return data;
}

export async function fetchQuote(symbol: string) {
  const key = `quote:${symbol}`;
  const cached = getCached<any>(key);
  if (cached) return cached;
  const data = {
    symbol,
    price: 100 + Math.random() * 5,
    change: (Math.random() - 0.5) * 2,
    changePercent: (Math.random() - 0.5) * 2,
    timestamp: new Date().toISOString(),
  };
  setCached(key, data, 30_000);
  return data;
}

export async function fetchKpis(symbol: string) {
  const key = `kpis:${symbol}`;
  const cached = getCached<any>(key);
  if (cached) return cached;
  const data = {
    symbol,
    name: `${symbol} Corp`,
    price: 123.45,
    change: 1.23,
    changePercent: 1.0,
    volume: 1234567,
    marketCap: 5_000_000_000,
    timestamp: new Date().toISOString(),
  };
  setCached(key, data, 60_000);
  return data;
}

export async function fetchFinancials(symbol: string) {
  const key = `fin:${symbol}`;
  const cached = getCached<any>(key);
  if (cached) return cached;
  const data = {
    symbol,
    revenue: 1_000_000_000,
    netIncome: 100_000_000,
    cashFlow: 200_000_000,
    fcf: 150_000_000,
    timestamp: new Date().toISOString(),
  };
  setCached(key, data, 5 * 60_000);
  return data;
}

export async function fetchVol(symbol: string) {
  const key = `vol:${symbol}`;
  const cached = getCached<any>(key);
  if (cached) return cached;
  const points = [7, 14, 30, 60, 90]
    .flatMap((d) =>
      [90, 95, 100, 105, 110].map((strike) => ({
        strike,
        expiry: new Date(Date.now() + d * 86400000).toISOString(),
        impliedVol: 0.2 + (Math.random() - 0.5) * 0.05,
      }))
    )
    .flat();
  const data = { symbol, underlyingPrice: 100, points, timestamp: new Date().toISOString() };
  setCached(key, data, 5 * 60_000);
  return data;
}


