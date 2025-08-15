import { describe, it, expect } from 'vitest';
import { mockAdapter } from '@/lib/data/adapters/mock';
import type { PriceRange } from '@/lib/data/providers';

function approxEqual(a: number, b: number, tol = 1e-9) {
  return Math.abs(a - b) <= tol;
}

describe('Mock Data Provider', () => {
  describe('Enhanced async methods', () => {
    it('generates deterministic KPIs for same symbol', async () => {
      const kpis1 = await mockAdapter.getKpis('AAPL');
      const kpis2 = await mockAdapter.getKpis('AAPL');

      expect(kpis1.symbol).toBe(kpis2.symbol);
      expect(kpis1.price).toBe(kpis2.price);
      expect(kpis1.volume).toBe(kpis2.volume);
      expect(kpis1.marketCap).toBe(kpis2.marketCap);
    });

    it('generates different data for different symbols', async () => {
      const appleKpis = await mockAdapter.getKpis('AAPL');
      const googleKpis = await mockAdapter.getKpis('GOOGL');

      expect(appleKpis.symbol).toBe('AAPL');
      expect(googleKpis.symbol).toBe('GOOGL');
      expect(appleKpis.price).not.toBe(googleKpis.price);
    });

    it('generates price series with correct length and OHLC structure', async () => {
      const prices = await mockAdapter.getPrices('AAPL', '3M');
      expect(prices).toHaveLength(66);

      const prices1Y = await mockAdapter.getPrices('AAPL', '1Y');
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

    it('generates financials with expected structure', async () => {
      const financials = await mockAdapter.getFinancials('AAPL');

      expect(financials.symbol).toBe('AAPL');
      expect(financials.revenue).toBeGreaterThan(0);
      expect(financials.netIncome).toBeGreaterThan(0);
      expect(financials.cashFlow).toBeGreaterThan(0);
      expect(financials.fcf).toBeGreaterThan(0);
      expect(financials.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Enhanced async methods', () => {
    it('generates deterministic KPIs for same symbol', async () => {
      const kpis1 = await mockAdapter.getKpis('AAPL');
      const kpis2 = await mockAdapter.getKpis('AAPL');

      expect(kpis1.symbol).toBe(kpis2.symbol);
      expect(kpis1.price).toBe(kpis2.price);
      expect(kpis1.volume).toBe(kpis2.volume);
      expect(kpis1.marketCap).toBe(kpis2.marketCap);
    });

    it('generates different data for different symbols', async () => {
      const appleKpis = await mockAdapter.getKpis('AAPL');
      const googleKpis = await mockAdapter.getKpis('GOOGL');

      expect(appleKpis.symbol).toBe('AAPL');
      expect(googleKpis.symbol).toBe('GOOGL');
      expect(appleKpis.price).not.toBe(googleKpis.price);
    });

    it('generates price series with correct length and OHLC structure', async () => {
      const prices = await mockAdapter.getPrices('AAPL', '3M');
      expect(prices).toHaveLength(66);

      const prices1Y = await mockAdapter.getPrices('AAPL', '1Y');
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

    it('maintains determinism across async calls', async () => {
      const symbol = 'TEST';

      // Multiple calls should return identical data
      const [kpis1, kpis2] = await Promise.all([
        mockAdapter.getKpis(symbol),
        mockAdapter.getKpis(symbol),
      ]);

      const [prices1, prices2] = await Promise.all([
        mockAdapter.getPrices(symbol, '1M'),
        mockAdapter.getPrices(symbol, '1M'),
      ]);

      expect(kpis1.price).toBe(kpis2.price);
      expect(prices1.length).toBe(prices2.length);
      expect(prices1[0].close).toBe(prices2[0].close);
    });
  });

  describe('Provider utilities', () => {
    it('provider is available', async () => {
      expect(await mockAdapter.isAvailable()).toBe(true);
    });

    it('returns last update timestamp', async () => {
      const lastUpdate = await mockAdapter.getLastUpdate('AAPL');
      expect(lastUpdate).toBeInstanceOf(Date);
      expect(lastUpdate?.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('has correct provider name', () => {
      expect(mockAdapter.name).toBe('mock');
    });
  });
});
