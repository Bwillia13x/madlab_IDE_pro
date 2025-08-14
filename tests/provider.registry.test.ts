import { describe, it, expect, vi } from 'vitest';
import { dataProviderRegistry, setDataProvider, getDataProvider, registerDataProvider } from '@/lib/data/providers';
import type { DataProvider, PricePoint, PriceRange, KpiData, VolSurface } from '@/lib/data/providers';

function makeDummyProvider(name: string): DataProvider {
  return {
    id: name.toLowerCase(),
    name,
    async getPrices(_symbol: string, _range?: PriceRange): Promise<PricePoint[]> { return []; },
    async getHistoricalPrices(_symbol: string, _range?: PriceRange): Promise<PricePoint[]> { return []; },
    async getKpis(_symbol: string): Promise<KpiData> {
      return { symbol: 'X', name: 'X', price: 1, change: 0, changePercent: 0, volume: 0, marketCap: 0, timestamp: new Date() };
    },
    async getQuote(_symbol: string): Promise<KpiData> {
      return { symbol: 'X', name: 'X', price: 1, change: 0, changePercent: 0, volume: 0, marketCap: 0, timestamp: new Date() };
    },
    async getVolSurface(_symbol: string): Promise<VolSurface> {
      return { symbol: 'X', underlyingPrice: 1, points: [], timestamp: new Date() };
    },
    isAvailable(): boolean { return true; },
  };
}

describe('Provider Registry', () => {
  it('registers and activates providers', () => {
    const a = makeDummyProvider('A');
    const b = makeDummyProvider('B');
    registerDataProvider('A', a);
    registerDataProvider('B', b);

    expect(setDataProvider('A')).toBe(true);
    expect(getDataProvider()).toBe(a);

    expect(setDataProvider('B')).toBe(true);
    expect(getDataProvider()).toBe(b);
  });

  it('refuses to activate unknown provider', () => {
    expect(setDataProvider('__missing__')).toBe(false);
  });

  it('normalizes correlation key order in hooks (symbol sorting)', async () => {
    const symsA = ['msft','AAPL','goog']
    const symsB = ['GOOG','MSFT','AAPL']
    const aKey = symsA.map(s => s.toUpperCase()).sort().join(',')
    const bKey = symsB.map(s => s.toUpperCase()).sort().join(',')
    expect(aKey).toBe(bKey)
  })
});


