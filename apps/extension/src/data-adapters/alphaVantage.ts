import * as vscode from 'vscode';
import { getSecret, getCached, setCached } from '../storage';
import { httpsJson } from '../http';

export async function fetchAlphaVantagePrices(
  context: vscode.ExtensionContext,
  symbol: string,
  range: string
) {
  const key = await getSecret(context, 'alphaVantageApiKey');
  if (!key) throw new Error('Alpha Vantage API key missing');
  const func = range === '1D' || range === '5D' ? 'TIME_SERIES_INTRADAY' : 'TIME_SERIES_DAILY_ADJUSTED';
  const interval = '60min';
  const url = func === 'TIME_SERIES_INTRADAY'
    ? `https://www.alphavantage.co/query?function=${func}&symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=compact&apikey=${encodeURIComponent(key)}`
    : `https://www.alphavantage.co/query?function=${func}&symbol=${encodeURIComponent(symbol)}&outputsize=compact&apikey=${encodeURIComponent(key)}`;
  const raw = await httpsJson(url);
  const seriesKey = Object.keys(raw).find((k) => k.includes('Time Series'));
  if (!seriesKey) throw new Error('Unexpected AV response');
  const points = raw[seriesKey];
  const data = Object.entries(points).map(([ts, v]: any) => ({
    date: new Date(ts).toISOString(),
    open: Number((v as any)['1. open'] || (v as any).open),
    high: Number((v as any)['2. high'] || (v as any).high),
    low: Number((v as any)['3. low'] || (v as any).low),
    close: Number((v as any)['4. close'] || (v as any).close),
    volume: Number((v as any)['6. volume'] || (v as any).volume || (v as any)['5. volume'] || 0),
  }));
  data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  setCached(`prices:${symbol}:${range}`, data, 2 * 60 * 1000);
  return data;
}

export async function fetchAlphaVantageKpis(context: vscode.ExtensionContext, symbol: string) {
  const key = await getSecret(context, 'alphaVantageApiKey');
  if (!key) throw new Error('Alpha Vantage API key missing');
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`;
  const raw = await httpsJson(url);
  const q = (raw as any)['Global Quote'] || {};
  const data = {
    symbol,
    name: symbol,
    price: Number(q['05. price'] || 0),
    change: Number(q['09. change'] || 0),
    changePercent: Number(String(q['10. change percent'] || '0').replace('%', '')),
    volume: Number(q['06. volume'] || 0),
    marketCap: 0,
    timestamp: new Date().toISOString(),
  };
  setCached(`kpi:${symbol}`, data, 60 * 1000);
  return data;
}

export async function fetchAlphaVantageFinancials(context: vscode.ExtensionContext, symbol: string) {
  const key = await getSecret(context, 'alphaVantageApiKey');
  if (!key) throw new Error('Alpha Vantage API key missing');
  const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`;
  const raw = await httpsJson(url);
  const data = {
    symbol,
    revenue: Number((raw as any).RevenueTTM || 0),
    netIncome: Number((raw as any).QuarterlyNetIncomeTTM || 0),
    cashFlow: Number((raw as any).OperatingCashflowTTM || 0),
    fcf: Number((raw as any).FreeCashFlowTTM || 0),
    timestamp: new Date().toISOString(),
  };
  setCached(`fin:${symbol}`, data, 5 * 60 * 1000);
  return data;
}


