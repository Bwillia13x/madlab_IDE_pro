/* eslint-disable @typescript-eslint/no-explicit-any */
import type { DataProvider, PricePoint, PriceRange, KpiData, VolSurface } from '../providers';
import { zPriceSeries, zKpiData, zFinancials, zVolSurface } from '../schemas';

declare global {
  interface Window {
    madlabBridge?: {
      request?: <T>(method: string, params?: unknown) => Promise<T>;
    };
  }
}

function isBridgeAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.madlabBridge &&
    typeof window.madlabBridge.request === 'function'
  );
}

export const extensionProvider: DataProvider = {
  id: 'extension-bridge',
  name: 'extension',

  async getPrices(symbol: string, range: PriceRange = '6M'): Promise<PricePoint[]> {
    if (!isBridgeAvailable()) throw new Error('Extension bridge unavailable');
    const req = window.madlabBridge!.request! as <T>(m: string, p?: unknown) => Promise<T>;
    const res = await req<unknown>('data:prices', { symbol, range });
    const arr = Array.isArray(res) ? (res as unknown[]) : [];
    const mapped = arr.map((p) => ({
      date: new Date(
        ((p as Record<string, unknown>)?.date as string | number | Date) ?? Date.now()
      ),
      open: Number((p as Record<string, unknown>)?.open ?? 0),
      high: Number((p as Record<string, unknown>)?.high ?? 0),
      low: Number((p as Record<string, unknown>)?.low ?? 0),
      close: Number((p as Record<string, unknown>)?.close ?? 0),
      volume: Number((p as Record<string, unknown>)?.volume ?? 0),
    }));
    const parsed = zPriceSeries.safeParse(mapped);
    if (!parsed.success) {
      throw new Error('Invalid price series from extension');
    }
    return parsed.data;
  },

  async getKpis(symbol: string): Promise<KpiData> {
    if (!isBridgeAvailable()) throw new Error('Extension bridge unavailable');
    const req = window.madlabBridge!.request! as <T>(m: string, p?: unknown) => Promise<T>;
    const k = await req<unknown>('data:kpis', { symbol });
    const parsed = zKpiData.safeParse({
      ...(k as Record<string, unknown>),
      timestamp: new Date(
        ((k as Record<string, unknown>)?.timestamp as string | number | Date) ?? Date.now()
      ),
    });
    if (!parsed.success) {
      throw new Error('Invalid KPI payload from extension');
    }
    return parsed.data;
  },

  async getVolSurface(symbol: string): Promise<VolSurface> {
    if (!isBridgeAvailable()) throw new Error('Extension bridge unavailable');
    const req = window.madlabBridge!.request! as <T>(m: string, p?: unknown) => Promise<T>;
    const v = await req<unknown>('data:vol', { symbol });
    const mapped = {
      symbol: String((v as Record<string, unknown>)?.symbol ?? symbol),
      underlyingPrice: Number((v as Record<string, unknown>)?.underlyingPrice ?? 0),
      points: (Array.isArray((v as Record<string, unknown>)?.points)
        ? ((v as Record<string, unknown>).points as unknown[])
        : []
      ).map((pt: unknown) => ({
        strike: Number((pt as Record<string, unknown>)?.strike ?? 0),
        expiry: new Date(
          ((pt as Record<string, unknown>)?.expiry as string | number | Date) ?? Date.now()
        ),
        impliedVol: Number((pt as Record<string, unknown>)?.impliedVol ?? 0),
      })),
      timestamp: new Date(
        ((v as Record<string, unknown>)?.timestamp as string | number | Date) ?? Date.now()
      ),
    };
    const parsed = zVolSurface.safeParse(mapped);
    if (!parsed.success) {
      throw new Error('Invalid vol surface from extension');
    }
    return parsed.data as VolSurface;
  },

  async getFinancials(symbol: string): Promise<any> {
    if (!isBridgeAvailable()) throw new Error('Extension bridge unavailable');
    const req = window.madlabBridge!.request! as <T>(m: string, p?: unknown) => Promise<T>;
    const f = await req<unknown>('data:financials', { symbol });
    const mapped = {
      ...(f as Record<string, unknown>),
      timestamp: new Date(
        ((f as Record<string, unknown>)?.timestamp as string | number | Date) ?? Date.now()
      ),
    };
    const parsed = zFinancials.safeParse(mapped);
    if (!parsed.success) {
      throw new Error('Invalid financials payload from extension');
    }
    return parsed.data;
  },

  async getQuote(symbol: string): Promise<KpiData> {
    return this.getKpis(symbol);
  },

  async getHistoricalPrices(symbol: string, range: PriceRange = '6M'): Promise<PricePoint[]> {
    return this.getPrices(symbol, range);
  },

  isAvailable(): boolean {
    return isBridgeAvailable();
  },
};
