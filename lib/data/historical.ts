import { toast } from 'sonner';
import type { PricePoint } from './provider.types';

/**
 * Lightweight historical data helper for Alpha Vantage DAILY_ADJUSTED.
 * Caches results for 2 minutes to respect rate limits.
 */

type CacheValue = { data: PricePoint[]; at: number };
const cache = new Map<string, CacheValue>();
const TWO_MINUTES = 2 * 60 * 1000;

export async function fetchAlphaVantageDailyAdjusted(symbol: string, apiKey?: string): Promise<PricePoint[]> {
  const sym = symbol.toUpperCase();
  const key = `AV_DA:${sym}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && now - cached.at < TWO_MINUTES) return cached.data;

  // Prefer server route (no client keys)
  let resp: Response;
  try {
    resp = await fetch(`/api/historical?symbol=${encodeURIComponent(sym)}`);
  } catch {
    // Fallback to direct AV call only if key provided or stored locally
    const resolvedKey = apiKey || getAlphaVantageKeyFromStorage();
    if (!resolvedKey) throw new Error('Alpha Vantage API key not set');
    const url = new URL('https://www.alphavantage.co/query');
    url.searchParams.set('function', 'TIME_SERIES_DAILY_ADJUSTED');
    url.searchParams.set('symbol', sym);
    url.searchParams.set('outputsize', 'full');
    url.searchParams.set('apikey', resolvedKey);
    resp = await fetch(url.toString());
  }
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
  }
  const data = await resp.json();

  if (data['Note']) {
    toast.warning('Alpha Vantage rate limit reached. Please wait a moment.');
    throw new Error(`Rate limit exceeded: ${String(data['Note'])}`);
  }
  if (data['Error Message']) {
    throw new Error(String(data['Error Message']));
  }

  const series = data['Time Series (Daily)'] as Record<string, Record<string, string>> | undefined;
  if (!series) throw new Error('No daily adjusted data returned');

  const dates = Object.keys(series).sort();
  const points: PricePoint[] = dates.map((d) => {
    const row = series[d]!;
    return {
      date: new Date(d),
      open: parseFloat(row['1. open'] || row['1. open'.toString()]) || 0,
      high: parseFloat(row['2. high']) || 0,
      low: parseFloat(row['3. low']) || 0,
      close: parseFloat(row['5. adjusted close'] || row['4. close']) || 0,
      volume: parseInt(row['6. volume'] || row['5. volume']) || 0,
    };
  });

  cache.set(key, { data: points, at: now });
  return points;
}

export interface BacktestParams {
  shortWindow: number;
  longWindow: number;
}

export interface BacktestMetrics {
  equity: number[];
  drawdown: number[];
  dates: string[];
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
}

export function runMovingAverageCrossover(prices: PricePoint[], params: BacktestParams): BacktestMetrics {
  const { shortWindow, longWindow } = params;
  if (prices.length < Math.max(shortWindow, longWindow) + 2) {
    throw new Error('Insufficient history for backtest');
  }
  // Use close prices in chronological order
  const closes = prices.map((p) => p.close);
  const dates = prices.map((p) => p.date.toISOString().slice(0, 10));

  const ma = (arr: number[], idx: number, win: number) => {
    const start = idx - win + 1;
    if (start < 0) return NaN;
    let sum = 0;
    for (let i = start; i <= idx; i++) sum += arr[i];
    return sum / win;
  };

  const equity: number[] = [];
  const drawdown: number[] = [];
  const rets: number[] = [];
  let runningEquity = 100;
  let position = 0; // 0 or 1 for long-only

  for (let i = 1; i < closes.length; i++) {
    const s = ma(closes, i - 1, shortWindow);
    const l = ma(closes, i - 1, longWindow);
    if (!Number.isNaN(s) && !Number.isNaN(l)) {
      // Enter long when short crosses above long, exit when below
      const prevS = ma(closes, i - 2, shortWindow);
      const prevL = ma(closes, i - 2, longWindow);
      if (!Number.isNaN(prevS) && !Number.isNaN(prevL)) {
        if (prevS <= prevL && s > l) position = 1;
        else if (prevS >= prevL && s < l) position = 0;
      }
    }
    const dailyRet = (closes[i] - closes[i - 1]) / (closes[i - 1] || closes[i]);
    const stratRet = position * dailyRet;
    runningEquity *= 1 + stratRet;
    rets.push(stratRet);
    equity.push(runningEquity);
  }

  // Align dates by dropping the first element used for return calc
  const alignedDates = dates.slice(1);

  // Drawdown
  let peak = equity[0];
  for (let i = 0; i < equity.length; i++) {
    peak = Math.max(peak, equity[i]);
    drawdown[i] = equity[i] / peak - 1;
  }

  const totalReturn = equity[equity.length - 1] / equity[0] - 1;
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, r) => a + Math.pow(r - mean, 2), 0) / (rets.length || 1);
  const stdev = Math.sqrt(variance);
  const sharpeRatio = stdev > 0 ? (Math.sqrt(252) * mean) / stdev : 0;
  const maxDrawdown = Math.min(...drawdown);
  const annualizedReturn = Math.pow(1 + totalReturn, 252 / rets.length) - 1;
  const volatility = stdev * Math.sqrt(252) * 100;

  return { equity, drawdown, dates: alignedDates, totalReturn: totalReturn * 100, annualizedReturn: annualizedReturn * 100, sharpeRatio, maxDrawdown: maxDrawdown * 100, volatility };
}

function getAlphaVantageKeyFromStorage(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('madlab_alpha-vantage_apikey');
  } catch {
    return null;
  }
}


