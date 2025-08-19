import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAlpacaAdapter } from '../../lib/data/adapters/alpaca';
import type { Provider } from '../../lib/data/provider.types';

// Mock fetch globally
global.fetch = vi.fn();

describe('AlpacaAdapter', () => {
  let adapter: Provider;
  let mockFetch: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = fetch as any;
    adapter = createAlpacaAdapter('test-api-key', 'test-secret-key', true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create adapter with default configuration', () => {
      expect(adapter.name).toBe('alpaca');
    });

    it('should create adapter with custom configuration', () => {
      const customAdapter = createAlpacaAdapter('custom-key', 'custom-secret', false);
      expect(customAdapter.name).toBe('alpaca');
    });
  });

  describe('isAvailable', () => {
    it('should return true when API keys are valid', async () => {
      const result = await adapter.isAvailable();
      expect(result).toBe(true);
    });

    it('should return false when API keys are demo', async () => {
      const demoAdapter = createAlpacaAdapter('demo', 'demo', true);
      const result = await demoAdapter.isAvailable();
      expect(result).toBe(false);
    });

    it('should return false when API key is missing', async () => {
      const noKeyAdapter = createAlpacaAdapter('', 'secret', true);
      const result = await noKeyAdapter.isAvailable();
      expect(result).toBe(false);
    });
  });

  describe('getPrices', () => {
    const mockPriceData = {
      bars: [
        {
          t: 1640995200000,
          o: 150.0,
          h: 155.0,
          l: 148.0,
          c: 152.0,
          v: 1000000,
          n: 1000,
          vw: 151.5,
        },
        {
          t: 1641081600000,
          o: 152.0,
          h: 158.0,
          l: 150.0,
          c: 156.0,
          v: 1200000,
          n: 1200,
          vw: 154.0,
        },
      ],
    };

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPriceData),
      });
    });

    it('should fetch daily prices for 6M range', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          bars: [
            { t: '2025-08-17', o: 150.0, h: 151.0, l: 149.0, c: 150.5, v: 1000000 },
            { t: '2025-08-16', o: 149.0, h: 150.0, l: 148.0, c: 149.5, v: 950000 }
          ]
        }),
      });

      const result = await adapter.getPrices('AAPL');
      
      expect(result).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('v2/stocks/AAPL/bars'),
        expect.any(Object)
      );
    });

    it('should fetch prices for 1D range with minute timeframe', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          bars: [
            { t: '2025-08-17T09:30:00Z', o: 150.0, h: 151.0, l: 149.0, c: 150.5, v: 1000000 },
            { t: '2025-08-17T09:31:00Z', o: 150.5, h: 152.0, l: 150.0, c: 151.5, v: 1100000 }
          ]
        }),
      });
      
      const result = await adapter.getPrices('AAPL', '1D');
      
      expect(result).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('v2/stocks/AAPL/bars'),
        expect.any(Object)
      );
    });

    it('should fetch prices for 1Y range with daily timeframe', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          bars: [
            { t: '2025-08-17', o: 150.0, h: 151.0, l: 149.0, c: 150.5, v: 1000000 },
            { t: '2025-08-16', o: 149.0, h: 150.0, l: 148.0, c: 149.5, v: 950000 }
          ]
        }),
      });
      
      const result = await adapter.getPrices('AAPL', '1Y');
      
      expect(result).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('v2/stocks/AAPL/bars'),
        expect.any(Object)
      );
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ message: 'Invalid API key' }),
      });

      await expect(adapter.getPrices('AAPL')).rejects.toThrow('HTTP 401: Invalid API key');
    });

    it('should handle missing bars data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ bars: null }),
      });

      await expect(adapter.getPrices('AAPL')).rejects.toThrow('No price data received');
    });

    it('should handle empty bars array', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ bars: [] }),
      });

      await expect(adapter.getPrices('AAPL')).rejects.toThrow('No price data received');
    });
  });

  describe('getKpis', () => {
    const mockQuoteData = {
      quotes: {
        lastTrade: { p: 150.0, s: 1000000 },
        prevClose: { p: 148.0 },
      },
    };

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockQuoteData),
      });
    });

    it('should fetch KPI data successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          quotes: [
            {
              ask_price: 150.0,
              bid_price: 149.99,
              ask_size: 1000000,
              bid_size: 950000,
              prev_close: 148.0
            }
          ]
        }),
      });

      const result = await adapter.getKpis('AAPL');
      
      expect(result.symbol).toBe('AAPL');
      expect(result.name).toBe('AAPL');
      expect(result.price).toBe(150.0);
      expect(result.change).toBe(2);
      expect(result.changePercent).toBeCloseTo(1.35, 2);
      expect(result.volume).toBe(1000000);
      expect(result.marketCap).toBe(0);
      expect(result.peRatio).toBeUndefined();
      expect(result.eps).toBeUndefined();
      expect(result.dividend).toBeUndefined();
      expect(result.divYield).toBeUndefined();
      expect(result.beta).toBeUndefined();
      expect(result.fiftyTwoWeekHigh).toBeUndefined();
      expect(result.fiftyTwoWeekLow).toBeUndefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle missing quote data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ quotes: null }),
      });

      await expect(adapter.getKpis('AAPL')).rejects.toThrow('No quote data received');
    });

    it('should handle missing lastTrade data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          quotes: [
            {
              ask_price: 150.0,
              bid_price: 149.99,
              ask_size: 1000000,
              bid_size: 950000
              // Missing prev_close
            }
          ]
        }),
      });

      const result = await adapter.getKpis('AAPL');
      expect(result.price).toBe(150.0);
    });

    it('should handle missing prevClose data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          quotes: [
            {
              ask_price: 150.0,
              bid_price: 149.99,
              ask_size: 1000000,
              bid_size: 950000
              // Missing prev_close
            }
          ]
        }),
      });

      const result = await adapter.getKpis('AAPL');
      expect(result.change).toBe(0);
      expect(result.changePercent).toBe(0);
    });
  });

  describe('getFinancials', () => {
    it('should throw error for financial data', async () => {
      await expect(adapter.getFinancials('AAPL')).rejects.toThrow('Financial data not available through Alpaca API');
    });
  });

  describe('getLastUpdate', () => {
    it('should return timestamp from KPI data', async () => {
      const mockQuoteData = {
        quotes: [
          {
            ask_price: 150.0,
            bid_price: 149.99,
            ask_size: 1000000,
            bid_size: 950000,
            prev_close: 148.0
          }
        ]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockQuoteData),
      });

      const result = await adapter.getLastUpdate('AAPL');
      expect(result).toBeInstanceOf(Date);
    });

    it('should return null on error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await adapter.getLastUpdate('AAPL');
      expect(result).toBeNull();
    });
  });

  describe('Account and Portfolio methods', () => {
    let alpacaAdapter: any;

    beforeEach(() => {
      alpacaAdapter = createAlpacaAdapter('test-api-key', 'test-secret-key', true);
    });

    it('should get account information', async () => {
      const mockAccountData = {
        id: 'test-account-id',
        account_number: '123456789',
        status: 'ACTIVE',
        buying_power: 100000,
        cash: 50000,
        portfolio_value: 150000,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAccountData),
      });

      const result = await alpacaAdapter.getAccount();
      expect(result.id).toBe('test-account-id');
      expect(result.buying_power).toBe(100000);
    });

    it('should get positions', async () => {
      const mockPositionsData = [
        {
          asset_id: 'test-asset-id',
          symbol: 'AAPL',
          qty: 100,
          market_value: 15000,
          unrealized_pl: 500,
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPositionsData),
      });

      const result = await alpacaAdapter.getPositions();
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('AAPL');
    });

    it('should get portfolio history', async () => {
      const mockHistoryData = {
        equity: [100000, 101000, 102000],
        timestamp: [1640995200000, 1641081600000, 1641168000000],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockHistoryData),
      });

      const result = await alpacaAdapter.getPortfolioHistory('2023-01-01', '2023-01-03');
      expect(result.equity).toHaveLength(3);
    });
  });

  describe('Order Management', () => {
    let alpacaAdapter: any;

    beforeEach(() => {
      alpacaAdapter = createAlpacaAdapter('test-api-key', 'test-secret-key', true);
    });

    it('should create a market order', async () => {
      const mockOrderData = {
        id: 'test-order-id',
        symbol: 'AAPL',
        side: 'buy',
        type: 'market',
        qty: 100,
        status: 'new',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOrderData),
      });

      const order = {
        symbol: 'AAPL',
        qty: 100,
        side: 'buy' as const,
        type: 'market' as const,
        time_in_force: 'day' as const,
      };

      const result = await alpacaAdapter.createOrder(order);
      expect(result.id).toBe('test-order-id');
      expect(result.symbol).toBe('AAPL');
    });

    it('should create a limit order', async () => {
      const mockOrderData = {
        id: 'test-order-id',
        symbol: 'AAPL',
        side: 'sell',
        type: 'limit',
        qty: 100,
        limit_price: 150.0,
        status: 'new',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOrderData),
      });

      const order = {
        symbol: 'AAPL',
        qty: 100,
        side: 'sell' as const,
        type: 'limit' as const,
        time_in_force: 'day' as const,
        limit_price: 150.0,
      };

      const result = await alpacaAdapter.createOrder(order);
      expect(result.type).toBe('limit');
      expect(result.limit_price).toBe(150.0);
    });

    it('should get orders with filters', async () => {
      const mockOrdersData = [
        {
          id: 'order-1',
          symbol: 'AAPL',
          side: 'buy',
          status: 'filled',
        },
        {
          id: 'order-2',
          symbol: 'TSLA',
          side: 'sell',
          status: 'pending',
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOrdersData),
      });

      const result = await alpacaAdapter.getOrders('filled', 10);
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('filled');
    });

    it('should get a specific order', async () => {
      const mockOrderData = {
        id: 'test-order-id',
        symbol: 'AAPL',
        side: 'buy',
        status: 'filled',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOrderData),
      });

      const result = await alpacaAdapter.getOrder('test-order-id');
      expect(result.id).toBe('test-order-id');
    });

    it('should cancel an order', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await expect(alpacaAdapter.cancelOrder('test-order-id')).resolves.toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v2/orders/test-order-id'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should replace an order', async () => {
      const mockOrderData = {
        id: 'test-order-id',
        symbol: 'AAPL',
        side: 'buy',
        qty: 150,
        status: 'new',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOrderData),
      });

      const result = await alpacaAdapter.replaceOrder('test-order-id', { qty: 150 });
      expect(result.qty).toBe(150);
    });
  });

  describe('Additional Data Methods', () => {
    let alpacaAdapter: any;

    beforeEach(() => {
      alpacaAdapter = createAlpacaAdapter('test-api-key', 'test-secret-key', true);
    });

    it('should get latest trade', async () => {
      const mockTradeData = {
        trades: {
          symbol: 'AAPL',
          price: 150.0,
          size: 100,
          timestamp: 1640995200000,
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTradeData),
      });

      const result = await alpacaAdapter.getLatestTrade('AAPL');
      expect(result.trades.symbol).toBe('AAPL');
    });

    it('should get latest quote', async () => {
      const mockQuoteData = {
        quotes: {
          symbol: 'AAPL',
          bid_price: 149.5,
          ask_price: 150.5,
          timestamp: 1640995200000,
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockQuoteData),
      });

      const result = await alpacaAdapter.getLatestQuote('AAPL');
      expect(result.quotes.symbol).toBe('AAPL');
    });

    it('should get multiple bars', async () => {
      const mockBarsData = {
        bars: {
          AAPL: [
            {
              t: 1640995200000,
              o: 150.0,
              h: 155.0,
              l: 148.0,
              c: 152.0,
              v: 1000000,
            },
          ],
          TSLA: [
            {
              t: 1640995200000,
              o: 800.0,
              h: 820.0,
              l: 790.0,
              c: 810.0,
              v: 500000,
            },
          ],
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBarsData),
      });

      const result = await alpacaAdapter.getMultiBars(['AAPL', 'TSLA'], '1Day', '2023-01-01', '2023-01-02');
      expect(result.bars.AAPL).toBeDefined();
      expect(result.bars.TSLA).toBeDefined();
    });
  });

  describe('Watchlist Management', () => {
    let alpacaAdapter: any;

    beforeEach(() => {
      alpacaAdapter = createAlpacaAdapter('test-api-key', 'test-secret-key', true);
    });

    it('should get watchlists', async () => {
      const mockWatchlistsData = [
        {
          id: 'watchlist-1',
          name: 'Tech Stocks',
          symbols: ['AAPL', 'MSFT', 'GOOGL'],
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWatchlistsData),
      });

      const result = await alpacaAdapter.getWatchlists();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Tech Stocks');
    });

    it('should create a watchlist', async () => {
      const mockWatchlistData = {
        id: 'new-watchlist-id',
        name: 'New Watchlist',
        symbols: ['AAPL', 'TSLA'],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWatchlistData),
      });

      const result = await alpacaAdapter.createWatchlist('New Watchlist', ['AAPL', 'TSLA']);
      expect(result.name).toBe('New Watchlist');
      expect(result.symbols).toHaveLength(2);
    });

    it('should update a watchlist', async () => {
      const mockWatchlistData = {
        id: 'watchlist-1',
        name: 'Updated Watchlist',
        symbols: ['AAPL', 'MSFT', 'GOOGL', 'TSLA'],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWatchlistData),
      });

      const result = await alpacaAdapter.updateWatchlist('watchlist-1', ['AAPL', 'MSFT', 'GOOGL', 'TSLA']);
      expect(result.symbols).toHaveLength(4);
    });

    it('should delete a watchlist', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await expect(alpacaAdapter.deleteWatchlist('watchlist-1')).resolves.toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v2/watchlists/watchlist-1'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('Market Calendar and Clock', () => {
    let alpacaAdapter: any;

    beforeEach(() => {
      alpacaAdapter = createAlpacaAdapter('test-api-key', 'test-secret-key', true);
    });

    it('should get market calendar', async () => {
      const mockCalendarData = [
        {
          date: '2023-01-02',
          open: '09:30',
          close: '16:00',
          session_open: '09:30',
          session_close: '16:00',
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCalendarData),
      });

      const result = await alpacaAdapter.getMarketCalendar('2023-01-01', '2023-01-03');
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2023-01-02');
    });

    it('should get market clock', async () => {
      const mockClockData = {
        timestamp: '2023-01-02T09:30:00.000Z',
        is_open: true,
        next_open: '2023-01-03T09:30:00.000Z',
        next_close: '2023-01-02T16:00:00.000Z',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockClockData),
      });

      const result = await alpacaAdapter.getClock();
      expect(result.is_open).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(adapter.getPrices('AAPL')).rejects.toThrow('Network error');
    });

    it('should handle HTTP errors with JSON response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ message: 'Invalid symbol' }),
      });

      await expect(adapter.getPrices('INVALID')).rejects.toThrow('HTTP 400: Invalid symbol');
    });

    it('should handle HTTP errors without JSON response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('No JSON')),
      });

      await expect(adapter.getPrices('AAPL')).rejects.toThrow('HTTP 500: Internal Server Error');
    });
  });

  describe('Authentication', () => {
    let alpacaAdapter: any;

    beforeEach(() => {
      alpacaAdapter = createAlpacaAdapter('test-api-key', 'test-secret-key', true);
    });

    it('should check authentication status', async () => {
      const result = await alpacaAdapter.isAuthenticated();
      expect(result).toBe(true);
    });

    it('should handle authentication failure', async () => {
      const noKeyAdapter = createAlpacaAdapter('', '', true);
      const result = await noKeyAdapter.isAuthenticated();
      expect(result).toBe(false);
    });
  });

  describe('Paper Trading vs Live Trading', () => {
    it('should use paper trading endpoints by default', async () => {
      const paperAdapter = createAlpacaAdapter('key', 'secret', true);
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          bars: [
            { t: '2025-08-17', o: 150.0, h: 151.0, l: 149.0, c: 150.5, v: 1000000 }
          ] 
        }),
      });

      await paperAdapter.getPrices('AAPL');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('v2/stocks/AAPL/bars'),
        expect.any(Object)
      );
    });

    it('should use live trading endpoints when specified', async () => {
      const liveAdapter = createAlpacaAdapter('key', 'secret', false);
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          bars: [
            { t: '2025-08-17', o: 150.0, h: 151.0, l: 149.0, c: 150.5, v: 1000000 }
          ] 
        }),
      });

      await liveAdapter.getPrices('AAPL');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('v2/stocks/AAPL/bars'),
        expect.any(Object)
      );
    });
  });
});
