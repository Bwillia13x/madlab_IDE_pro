import { describe, it, expect } from 'vitest';
import { mockProvider } from '@/lib/data/mock';
import type { PriceRange } from '@/lib/data/providers';

function approxEqual(a: number, b: number, tol = 1e-9) {
  return Math.abs(a - b) <= tol;
}

describe('Mock Data Provider', () => {
  describe('Legacy sync methods', () => {
    it('returns identical KPIs for same symbol across calls', () => {
      const a = mockProvider.getKpis_sync?.('ACME');
      const b = mockProvider.getKpis_sync?.('ACME');
      expect(a).toEqual(b);
      expect(a?.revenue).toBeGreaterThan(0);
      expect(Number.isFinite(a?.netIncome || 0)).toBe(true);
    });

    it('returns different KPIs for different symbols', () => {
      const a = mockProvider.getKpis_sync?.('ACME');
      const b = mockProvider.getKpis_sync?.('OMEGA');
      const allEqual = [
        'revenue',
        'netIncome',
        'cashFlow',
        'fcf',
        'revChange',
        'niChange',
        'cfChange',
        'fcfChange',
      ].every((k) => approxEqual((a as any)?.[k] || 0, (b as any)?.[k] || 0));
      expect(allEqual).toBe(false);
    });

    it('prices: length respects range and is deterministic', () => {
      const ranges: PriceRange[] = ['1M', '3M', '6M', '1Y'];
      const expectedLens: Record<PriceRange, number> = {
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

      for (const r of ranges) {
        const p1 = mockProvider.getPrices_sync?.('ACME', r);
        const p2 = mockProvider.getPrices_sync?.('ACME', r);
        expect(p1?.length).toBe(expectedLens[r]);
        expect(p2?.length).toBe(expectedLens[r]);
        expect(p1).toEqual(p2);
      }
    });

    it('vol surface: fixed shape and deterministic', () => {
      const v1 = mockProvider.getVolSurface_sync?.('ACME');
      const v2 = mockProvider.getVolSurface_sync?.('ACME');
      expect(v1?.length).toBe(5);
      expect(v2?.length).toBe(5);
      expect(v1).toEqual(v2);
    });

    it('risk summary: deterministic', () => {
      const r1 = mockProvider.getRisk?.('ACME');
      const r2 = mockProvider.getRisk?.('ACME');
      expect(r1).toBeTruthy();
      expect(r2).toBeTruthy();
      expect(r1).toEqual(r2);
    });
  });

  describe('Enhanced async methods', () => {
    it('generates deterministic KPIs for same symbol', async () => {
      const kpis1 = await mockProvider.getKpis('AAPL');
      const kpis2 = await mockProvider.getKpis('AAPL');

      expect(kpis1.symbol).toBe(kpis2.symbol);
      expect(kpis1.price).toBe(kpis2.price);
      expect(kpis1.volume).toBe(kpis2.volume);
      expect(kpis1.marketCap).toBe(kpis2.marketCap);
    });

    it('generates different data for different symbols', async () => {
      const appleKpis = await mockProvider.getKpis('AAPL');
      const googleKpis = await mockProvider.getKpis('GOOGL');

      expect(appleKpis.symbol).toBe('AAPL');
      expect(googleKpis.symbol).toBe('GOOGL');
      expect(appleKpis.price).not.toBe(googleKpis.price);
    });

    it('generates price series with correct length and OHLC structure', async () => {
      const prices = await mockProvider.getPrices('AAPL', '3M');
      expect(prices).toHaveLength(66);

      const prices1Y = await mockProvider.getPrices('AAPL', '1Y');
      expect(prices1Y).toHaveLength(252);

      // Check OHLC structure
      prices.forEach((price) => {
        expect(price.date).toBeInstanceOf(Date);
        expect(price.open).toBeGreaterThan(0);
        expect(price.high).toBeGreaterThanOrEqual(Math.max(price.open, price.close));
        expect(price.low).toBeLessThanOrEqual(Math.min(price.open, price.close));
        expect(price.close).toBeGreaterThan(0);
        expect(price.volume).toBeGreaterThan(0);
      });
    });

    it('generates vol surface with expected structure', async () => {
      const volSurface = await mockProvider.getVolSurface('AAPL');

      expect(volSurface.symbol).toBe('AAPL');
      expect(volSurface.underlyingPrice).toBeGreaterThan(0);
      expect(volSurface.points.length).toBeGreaterThan(0);
      expect(volSurface.timestamp).toBeInstanceOf(Date);

      volSurface.points.forEach((point) => {
        expect(point.strike).toBeGreaterThan(0);
        expect(point.expiry).toBeInstanceOf(Date);
        expect(point.impliedVol).toBeGreaterThan(0);
        expect(point.impliedVol).toBeLessThan(1);
        expect(point.delta).toBeDefined();
        expect(point.gamma).toBeDefined();
        expect(point.theta).toBeDefined();
        expect(point.vega).toBeDefined();
      });
    });

    it('generates correlation matrix with correct structure', async () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT'];
      const correlation = await mockProvider.getCorrelation?.(symbols, '1Y');

      if (correlation) {
        expect(correlation.symbols).toEqual(symbols);
        expect(correlation.matrix.length).toBe(3);
        expect(correlation.matrix[0].length).toBe(3);
        expect(correlation.period).toBe('1Y');
        expect(correlation.timestamp).toBeInstanceOf(Date);

        // Check diagonal is 1 (self-correlation)
        for (let i = 0; i < 3; i++) {
          expect(correlation.matrix[i][i]).toBe(1);
        }

        // Check symmetry
        expect(correlation.matrix[0][1]).toBe(correlation.matrix[1][0]);
        expect(correlation.matrix[0][2]).toBe(correlation.matrix[2][0]);
        expect(correlation.matrix[1][2]).toBe(correlation.matrix[2][1]);
      } else {
        expect(mockProvider.getCorrelation).toBeUndefined();
      }
    });

    it('maintains determinism across async calls', async () => {
      const symbol = 'TEST';

      // Multiple calls should return identical data
      const [kpis1, kpis2] = await Promise.all([
        mockProvider.getKpis(symbol),
        mockProvider.getKpis(symbol),
      ]);

      const [prices1, prices2] = await Promise.all([
        mockProvider.getPrices(symbol, '1M'),
        mockProvider.getPrices(symbol, '1M'),
      ]);

      expect(kpis1.price).toBe(kpis2.price);
      expect(prices1.length).toBe(prices2.length);
      expect(prices1[0].close).toBe(prices2[0].close);
    });
  });

  describe('Provider utilities', () => {
    it('provider is available', () => {
      expect(mockProvider.isAvailable()).toBe(true);
    });

    it('returns last update timestamp', () => {
      const lastUpdate = mockProvider.getLastUpdate?.('AAPL');
      expect(lastUpdate).toBeInstanceOf(Date);
      expect(lastUpdate?.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('has correct provider name', () => {
      expect(mockProvider.name).toBe('mock');
    });
    
    it('REST provider inflight dedup keying smoke', async () => {
      const { FetchRESTProvider } = await import('@/lib/data/providers/FetchRESTProvider')
      const provider: any = new FetchRESTProvider({ id: 't', name: 'test', options: { baseUrl: 'https://example.com', endpoint: '/api' } } as any)
      // We cannot hit network in unit tests; just ensure inflight map exists and is used
      expect(typeof provider.inflight).toBe('object')
    })
  });
});
