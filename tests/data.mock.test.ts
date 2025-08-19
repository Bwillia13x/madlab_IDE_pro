import { describe, it, expect } from 'vitest';
import { mockDataProvider, mockData } from './mocks';

function approxEqual(a: number, b: number, tol = 1e-9) {
  return Math.abs(a - b) <= tol;
}

describe('Mock Data Provider', () => {
  describe('Enhanced async methods', () => {
    it('generates deterministic KPIs for same symbol', async () => {
      const kpis1 = await mockDataProvider.getKpis('AAPL');
      const kpis2 = await mockDataProvider.getKpis('AAPL');

      expect(kpis1.symbol).toBe(kpis2.symbol);
      expect(kpis1.price).toBe(kpis2.price);
      expect(kpis1.volume).toBe(kpis2.volume);
      expect(kpis1.marketCap).toBe(kpis2.marketCap);
    });

    it('generates different data for different symbols', async () => {
      const appleKpis = await mockDataProvider.getKpis('AAPL');
      const googleKpis = await mockDataProvider.getKpis('GOOGL');

      expect(appleKpis.symbol).toBe('AAPL');
      expect(googleKpis.symbol).toBe('GOOGL');
      expect(appleKpis.price).not.toBe(googleKpis.price);
    });

    it('generates price series with correct length and OHLC structure', async () => {
      const prices = await mockDataProvider.getPrices('AAPL', '3M');
      expect(prices).toHaveLength(66);

      const prices1Y = await mockDataProvider.getPrices('AAPL', '1Y');
      expect(prices1Y).toHaveLength(252);

      // Check OHLC structure
      prices.forEach((price: { date: Date; open: number; high: number; low: number; close: number; volume: number }) => {
        expect(price.date).toBeInstanceOf(Date);
        expect(price.open).toBeGreaterThan(0);
        expect(price.high).toBeGreaterThanOrEqual(Math.max(price.open, price.close));
        expect(price.low).toBeLessThanOrEqual(Math.min(price.open, price.close));
        expect(price.close).toBeGreaterThan(0);
        expect(price.volume).toBeGreaterThan(0);
      });
    });

    it('generates financials with expected structure', async () => {
      const financials = await mockDataProvider.getFinancials('AAPL');

      expect(financials.symbol).toBe('AAPL');
      expect(financials.revenue).toBeGreaterThan(0);
      expect(financials.netIncome).toBeGreaterThan(0);
      expect(financials.cashFlow).toBeGreaterThan(0);
      expect(financials.fcf).toBeGreaterThan(0);
      expect(financials.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Provider utilities', () => {
    it('maintains determinism across async calls', async () => {
      const symbol = 'TEST';

      // Multiple calls should return identical data
      const [kpis1, kpis2] = await Promise.all([
        mockDataProvider.getKpis(symbol),
        mockDataProvider.getKpis(symbol),
      ]);

      const [prices1, prices2] = await Promise.all([
        mockDataProvider.getPrices(symbol, '1M'),
        mockDataProvider.getPrices(symbol, '1M'),
      ]);

      expect(kpis1).toEqual(kpis2);
      expect(prices1).toEqual(prices2);
    });

    it('provides consistent provider information', async () => {
      expect(await mockDataProvider.isAvailable()).toBe(true);
      expect(mockDataProvider.name).toBe('mock');
      
      const lastUpdate = await mockDataProvider.getLastUpdate('AAPL');
      expect(lastUpdate).toBeInstanceOf(Date);
      expect(lastUpdate.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });
});
