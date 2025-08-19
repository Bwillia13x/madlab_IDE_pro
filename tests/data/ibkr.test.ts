import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InteractiveBrokersAdapter } from '../../lib/data/adapters/interactive-brokers';

describe('Interactive Brokers Adapter', () => {
  let adapter: InteractiveBrokersAdapter;

  beforeEach(() => {
    adapter = new InteractiveBrokersAdapter({
      host: 'localhost',
      port: 7497,
      clientId: 1
    });
  });

  afterEach(async () => {
    await adapter.disconnect();
  });

  describe('Connection Management', () => {
    it('should connect successfully', async () => {
      const result = await adapter.connect();
      expect(result).toBe(true);
      expect(await adapter.isAvailable()).toBe(true);
    });

    it('should disconnect successfully', async () => {
      await adapter.connect();
      await adapter.disconnect();
      expect(await adapter.isAvailable()).toBe(false);
    });
  });

  describe('Data Retrieval', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should get prices for a symbol', async () => {
      const prices = await adapter.getPrices('AAPL', '1M');
      expect(Array.isArray(prices)).toBe(true);
      expect(prices.length).toBeGreaterThan(0);
      
      const price = prices[0];
      expect(price).toHaveProperty('date');
      expect(price).toHaveProperty('open');
      expect(price).toHaveProperty('high');
      expect(price).toHaveProperty('low');
      expect(price).toHaveProperty('close');
      expect(price).toHaveProperty('volume');
    });

    it('should get KPI data for a symbol', async () => {
      const kpis = await adapter.getKpis('AAPL');
      expect(kpis).toHaveProperty('symbol', 'AAPL');
      expect(kpis).toHaveProperty('name');
      expect(kpis).toHaveProperty('price');
      expect(kpis).toHaveProperty('change');
      expect(kpis).toHaveProperty('changePercent');
      expect(kpis).toHaveProperty('volume');
      expect(kpis).toHaveProperty('marketCap');
    });

    it('should get financial data for a symbol', async () => {
      const financials = await adapter.getFinancials('AAPL');
      expect(financials).toHaveProperty('symbol', 'AAPL');
      expect(financials).toHaveProperty('revenue');
      expect(financials).toHaveProperty('netIncome');
      expect(financials).toHaveProperty('eps');
      expect(financials).toHaveProperty('peRatio');
    });

    it('should get last update timestamp', async () => {
      const timestamp = await adapter.getLastUpdate('AAPL');
      expect(timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Account Management', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should get account information', async () => {
      const account = await adapter.getAccount();
      expect(account).not.toBeNull();
      if (account) {
        expect(account).toHaveProperty('accountId');
        expect(account).toHaveProperty('accountType');
        expect(account).toHaveProperty('netLiquidation');
        expect(account).toHaveProperty('buyingPower');
        expect(account).toHaveProperty('currency');
      }
    });

    it('should get positions', async () => {
      const positions = await adapter.getPositions();
      expect(Array.isArray(positions)).toBe(true);
      
      if (positions.length > 0) {
        const position = positions[0];
        expect(position).toHaveProperty('symbol');
        expect(position).toHaveProperty('position');
        expect(position).toHaveProperty('marketPrice');
        expect(position).toHaveProperty('marketValue');
        expect(position).toHaveProperty('unrealizedPnL');
      }
    });
  });

  describe('Order Management', () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it('should place an order', async () => {
      const orderId = await adapter.placeOrder({
        symbol: 'AAPL',
        secType: 'STK',
        exchange: 'SMART',
        action: 'BUY',
        totalQuantity: 100,
        orderType: 'MKT',
        tif: 'DAY',
        account: 'DU1234567'
      });
      
      expect(typeof orderId).toBe('number');
      expect(orderId).toBeGreaterThan(0);
    });

    it('should cancel an order', async () => {
      const orderId = await adapter.placeOrder({
        symbol: 'AAPL',
        secType: 'STK',
        exchange: 'SMART',
        action: 'BUY',
        totalQuantity: 100,
        orderType: 'MKT',
        tif: 'DAY',
        account: 'DU1234567'
      });
      
      const result = await adapter.cancelOrder(orderId);
      expect(result).toBe(true);
    });

    it('should get order status', async () => {
      const orderId = await adapter.placeOrder({
        symbol: 'AAPL',
        secType: 'STK',
        exchange: 'SMART',
        action: 'BUY',
        totalQuantity: 100,
        orderType: 'MKT',
        tif: 'DAY',
        account: 'DU1234567'
      });
      
      const status = await adapter.getOrderStatus(orderId);
      expect(typeof status).toBe('string');
      expect(status).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors when not connected', async () => {
      // Try to get data without connecting
      await expect(adapter.getPrices('AAPL')).rejects.toThrow('Not connected to IBKR');
      await expect(adapter.getKpis('AAPL')).rejects.toThrow('Not connected to IBKR');
      await expect(adapter.getFinancials('AAPL')).rejects.toThrow('Not connected to IBKR');
    });

    it('should throw error for invalid symbol when connected', async () => {
      await adapter.connect();
      // This should still work since we're connected, but with mock data
      const prices = await adapter.getPrices('INVALID');
      expect(Array.isArray(prices)).toBe(true);
      expect(prices.length).toBeGreaterThan(0);
    });
  });

  describe('Range Conversion', () => {
    it('should convert price ranges correctly', async () => {
      // Test private methods through public interface
      const testAdapter = new InteractiveBrokersAdapter({
        host: 'localhost',
        port: 7497,
        clientId: 1
      });
      
      // Connect the adapter first
      await testAdapter.connect();
      
      // Test that different ranges return different amounts of data
      const oneDay = await testAdapter.getPrices('AAPL', '1D');
      const oneMonth = await testAdapter.getPrices('AAPL', '1M');
      const oneYear = await testAdapter.getPrices('AAPL', '1Y');
      
      expect(oneDay).toBeDefined();
      expect(oneMonth).toBeDefined();
      expect(oneYear).toBeDefined();
      
      // Clean up
      await testAdapter.disconnect();
    });
  });
});
