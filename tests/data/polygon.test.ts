import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPolygonAdapter } from '../../lib/data/adapters/polygon';
import type { Provider } from '../../lib/data/provider.types';

// Mock fetch globally
global.fetch = vi.fn();
const MockWebSocket = vi.fn().mockImplementation(() => ({
  readyState: 1, // OPEN
  onopen: null,
  onmessage: null,
  onclose: null,
  onerror: null,
  send: vi.fn(),
  close: vi.fn(),
}));

// Add static constants to mock
(MockWebSocket as any).CONNECTING = 0;
(MockWebSocket as any).OPEN = 1;
(MockWebSocket as any).CLOSING = 2;
(MockWebSocket as any).CLOSED = 3;

global.WebSocket = MockWebSocket as any;

describe('PolygonAdapter', () => {
  let adapter: Provider;
  let mockFetch: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = fetch as any;
    adapter = createPolygonAdapter('test-api-key');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create adapter with default configuration', () => {
      expect(adapter.name).toBe('polygon');
    });

    it('should create adapter with custom configuration', () => {
      const customAdapter = createPolygonAdapter('custom-key');
      expect(customAdapter.name).toBe('polygon');
    });
  });

  describe('isAvailable', () => {
    it('should return true when API key is valid', async () => {
      const result = await adapter.isAvailable();
      expect(result).toBe(true);
    });

    it('should return false when API key is demo', async () => {
      const demoAdapter = createPolygonAdapter('demo');
      const result = await demoAdapter.isAvailable();
      expect(result).toBe(false);
    });
  });

  describe('getPrices', () => {
    const mockPriceData = {
      results: [
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

    it('should fetch daily prices for 6M range', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: [
            { t: 1640995200000, o: 150.0, h: 155.0, l: 148.0, c: 152.0, v: 1000000 },
            { t: 1640908800000, o: 149.0, h: 151.0, l: 147.0, c: 150.0, v: 950000 }
          ]
        }),
      });

      const result = await adapter.getPrices('AAPL');
      
      expect(result).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v2/aggs/ticker/AAPL/range/1/month/')
      );
    });

    it('should fetch prices for 1Y range', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: [
            { t: 1640995200000, o: 150.0, h: 155.0, l: 148.0, c: 152.0, v: 1000000 },
            { t: 1640908800000, o: 149.0, h: 151.0, l: 147.0, c: 150.0, v: 950000 }
          ]
        }),
      });
      
      const result = await adapter.getPrices('AAPL', '1Y');
      
      expect(result).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v2/aggs/ticker/AAPL/range/1/year/')
      );
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      await expect(adapter.getPrices('AAPL')).rejects.toThrow('HTTP 429: Too Many Requests');
    });

    it('should handle API error messages', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 'Error Message': 'Invalid API key' }),
      });

      await expect(adapter.getPrices('AAPL')).rejects.toThrow('Invalid API key');
    });

    it('should handle rate limit messages', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 'Note': 'Rate limit exceeded' }),
      });

      await expect(adapter.getPrices('AAPL')).rejects.toThrow('Rate limit exceeded: Rate limit exceeded');
    });

    it('should handle missing time series data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });

      await expect(adapter.getPrices('AAPL')).rejects.toThrow('No time series data received');
    });
  });

  describe('getKpis', () => {
    const mockQuoteData = {
      results: {
        lastTrade: { p: 150.0, s: 1000000 },
        prevClose: { p: 148.0 },
      },
    };

    const mockCompanyData = {
      results: {
        name: 'Apple Inc.',
        market_cap: 2500000000000,
        pe_ratio: 25.5,
        eps: 5.89,
        dividend_yield: 0.5,
        beta: 1.2,
        high_52_weeks: 180.0,
        low_52_weeks: 120.0,
      },
    };

    // Remove beforeEach block - each test will set up its own mocks

    it('should fetch KPI data successfully', async () => {
      // Mock the makeRequest method directly to avoid rate limiting issues
      const mockMakeRequest = vi.spyOn(adapter as any, 'makeRequest');
      
      // Mock first call (quote data)
      mockMakeRequest.mockResolvedValueOnce(mockQuoteData);
      
      // Mock second call (company overview data)
      mockMakeRequest.mockResolvedValueOnce(mockCompanyData);

      const result = await adapter.getKpis('AAPL');
      
      expect(result).toEqual({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 150,
        change: 2,
        changePercent: expect.closeTo(1.35, 2), // Allow for floating point precision
        volume: 1000000,
        marketCap: 2500000000000,
        peRatio: 25.5,
        eps: 5.89,
        dividend: 0.5,
        divYield: 0.5,
        beta: 1.2,
        fiftyTwoWeekHigh: 180,
        fiftyTwoWeekLow: 120,
        timestamp: expect.any(Date),
      });
      
      // Verify makeRequest was called twice
      expect(mockMakeRequest).toHaveBeenCalledTimes(2);
      
      // Restore the original method
      mockMakeRequest.mockRestore();
    });

    it('should handle missing quote data', async () => {
      // Clear previous mocks and reset to default behavior
      mockFetch.mockReset();
      
      // Mock the quote endpoint to return no data
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: {
            // Missing both lastTrade and lastQuote
          }
        }),
      });

      await expect(adapter.getKpis('AAPL')).rejects.toThrow('No quote data received');
    });

    it('should handle missing company overview gracefully', async () => {
      // Mock the makeRequest method directly to avoid rate limiting issues
      const mockMakeRequest = vi.spyOn(adapter as any, 'makeRequest');
      
      // Mock first call (quote data) - successful
      mockMakeRequest.mockResolvedValueOnce({
        results: {
          lastTrade: {
            p: 150.0,
            s: 1000000,
            t: 1640995200000
          },
          prevClose: {
            p: 148.0,
            t: 1640908800000
          }
        }
      });

      // Mock second call (company overview data) - empty results
      mockMakeRequest.mockResolvedValueOnce({ results: null });

      const result = await adapter.getKpis('AAPL');
      
      expect(result.name).toBe('AAPL'); // Fallback to symbol
      expect(result.marketCap).toBe(0);
      
      // Verify makeRequest was called twice
      expect(mockMakeRequest).toHaveBeenCalledTimes(2);
      
      // Restore the original method
      mockMakeRequest.mockRestore();
    });
  });

  describe('getFinancials', () => {
    const mockFinancialData = {
      results: [
        {
          period: 'annual',
          calendarDate: '2023-12-31',
          reportPeriod: '2023',
          revenue: 394328000000,
          netIncome: 96995000000,
          operatingCashFlow: 110543000000,
          freeCashFlow: 95000000000,
        },
      ],
    };

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockFinancialData),
      });
    });

    it('should fetch financial data successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: [
            {
              ticker: 'AAPL',
              company_name: 'Apple Inc.',
              revenue: 394328000000,
              net_income_loss: 96995000000,
              assets: 352755000000,
              liabilities: 287912000000,
              cash_and_cash_equivalents: 48000000000,
              debt: 95000000000,
              equity: 64843000000,
              earnings_per_share: 5.89,
              price_earnings_ratio: 25.5,
              price_book_ratio: 5.4,
              return_on_equity: 0.15,
              return_on_assets: 0.27,
              debt_to_equity_ratio: 1.47,
              current_ratio: 1.35,
              quick_ratio: 1.25,
              gross_margin: 0.42,
              operating_margin: 0.29,
              net_margin: 0.25
            }
          ]
        }),
      });

      const result = await adapter.getFinancials('AAPL');
      
      expect(result).toEqual({
        symbol: 'AAPL',
        revenue: 394328000000,
        netIncome: 96995000000,
        totalAssets: 352755000000,
        totalLiabilities: 287912000000,
        cash: 48000000000,
        debt: 95000000000,
        equity: 64843000000,
        eps: 5.89,
        peRatio: 25.5,
        pbRatio: 5.4,
        roe: 0.15,
        roa: 0.27,
        debtToEquity: 1.47,
        currentRatio: 1.35,
        quickRatio: 1.25,
        grossMargin: 0.42,
        operatingMargin: 0.29,
        netMargin: 0.25,
        cashFlow: 0,
        fcf: 0,
        timestamp: expect.any(Date),
      });
    });

    it('should handle missing financial data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });

      await expect(adapter.getFinancials('AAPL')).rejects.toThrow('No financial data received');
    });
  });

  describe('getLastUpdate', () => {
    it('should return timestamp from KPI data', async () => {
      const mockQuoteData = {
        results: {
          lastTrade: { p: 150.0, s: 1000000 },
          prevClose: { p: 148.0 },
        },
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

  describe('WebSocket functionality', () => {
    let mockWs: any;
    let mockHandler: any;

    beforeEach(() => {
      mockWs = {
        readyState: WebSocket.CONNECTING,
        send: vi.fn(),
        close: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as any;
      mockHandler = vi.fn();
      
      // Mock WebSocket constructor
      const MockWebSocketConstructor = vi.fn().mockImplementation(() => mockWs);
      (MockWebSocketConstructor as any).CONNECTING = 0;
      (MockWebSocketConstructor as any).OPEN = 1;
      (MockWebSocketConstructor as any).CLOSING = 2;
      (MockWebSocketConstructor as any).CLOSED = 3;
      global.WebSocket = MockWebSocketConstructor as any;
    });

    it('should connect to WebSocket', () => {
      const polygonAdapter = createPolygonAdapter('test-key') as any;
      polygonAdapter.connectWebSocket();
      
      expect(global.WebSocket).toHaveBeenCalledWith('wss://delayed.polygon.io/stocks');
      expect(mockWs.addEventListener).toHaveBeenCalledWith('open', expect.any(Function));
      expect(mockWs.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWs.addEventListener).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockWs.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should subscribe to symbol', () => {
      const polygonAdapter = createPolygonAdapter('test-key') as any;
      // Use the mockWs from beforeEach and set readyState to OPEN
      mockWs.readyState = WebSocket.OPEN;
      polygonAdapter.ws = mockWs;
      polygonAdapter.subscribeToSymbol('AAPL');
      
      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
        action: 'subscribe',
        params: 'T.AAPL'
      }));
    });

    it('should unsubscribe from symbol', () => {
      const polygonAdapter = createPolygonAdapter('test-key') as any;
      // Use the mockWs from beforeEach and set readyState to OPEN
      mockWs.readyState = WebSocket.OPEN;
      polygonAdapter.ws = mockWs;
      polygonAdapter.unsubscribeFromSymbol('AAPL');
      
      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
        action: 'unsubscribe',
        params: 'T.AAPL'
      }));
    });

    it('should handle trade messages', () => {
      const polygonAdapter = createPolygonAdapter('test-key') as any;
      polygonAdapter.onTrade(mockHandler);
      
      const tradeMessage = {
        ev: 'T',
        sym: 'AAPL',
        p: 150.0,
        s: 100,
        t: Date.now(),
        x: 1
      };
      
      polygonAdapter.handleWebSocketMessage(tradeMessage);
      expect(mockHandler).toHaveBeenCalledWith(tradeMessage);
    });

    it('should handle quote messages', () => {
      const polygonAdapter = createPolygonAdapter('test-key') as any;
      polygonAdapter.onQuote(mockHandler);
      
      const quoteMessage = {
        ev: 'Q',
        sym: 'AAPL',
        bp: 149.99,
        bs: 10,
        ap: 150.01,
        as: 5,
        t: Date.now(),
        x: 1
      };
      
      polygonAdapter.handleWebSocketMessage(quoteMessage);
      expect(mockHandler).toHaveBeenCalledWith(quoteMessage);
    });

    it('should handle aggregate messages', () => {
      const polygonAdapter = createPolygonAdapter('test-key') as any;
      polygonAdapter.onAggregate(mockHandler);
      
      const aggregateMessage = {
        ev: 'AM',
        sym: 'AAPL',
        o: 150.0,
        h: 151.0,
        l: 149.0,
        c: 150.5,
        v: 1000,
        t: Date.now()
      };
      
      polygonAdapter.handleWebSocketMessage(aggregateMessage);
      expect(mockHandler).toHaveBeenCalledWith(aggregateMessage);
    });

    it('should handle reconnection on close', () => {
      const polygonAdapter = createPolygonAdapter('test-key') as any;
      polygonAdapter.ws = mockWs;
      
      // Mock setTimeout properly
      const mockSetTimeout = vi.fn();
      const originalSetTimeout = global.setTimeout;
      vi.spyOn(global, 'setTimeout').mockImplementation(mockSetTimeout);
      
      // Capture the close event handler
      let closeHandler: Function | undefined;
      mockWs.addEventListener.mockImplementation((event: string, handler: Function) => {
        if (event === 'close') {
          closeHandler = handler;
        }
      });
      
      polygonAdapter.connectWebSocket();
      
      // Simulate WebSocket close
      if (closeHandler) {
        closeHandler();
        expect(mockSetTimeout).toHaveBeenCalled();
      }
      
      // Restore original setTimeout
      vi.restoreAllMocks();
    });

    it('should disconnect WebSocket', () => {
      const polygonAdapter = createPolygonAdapter('test-key') as any;
      polygonAdapter.ws = mockWs;
      polygonAdapter.disconnectWebSocket();
      
      expect(mockWs.close).toHaveBeenCalled();
    });
  });

  describe('Additional data methods', () => {
    let polygonAdapter: any;

    beforeEach(() => {
      polygonAdapter = createPolygonAdapter('test-api-key');
    });

    it('should fetch minute data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: [
            { t: 1640995200000, o: 150.0, h: 151.0, l: 149.0, c: 150.5, v: 1000000 }
          ]
        }),
      });

      const result = await polygonAdapter.getMinuteData('AAPL', 1, 'minute', '2025-01-01', '2025-01-02');
      
      expect(result).toHaveLength(1);
      expect(result[0].close).toBe(150.5);
    });

    it('should fetch trade data', async () => {
      const mockData = {
        results: [
          {
            symbol: 'AAPL',
            price: 150.0,
            size: 100,
            timestamp: 1640995200000,
            exchange: 1,
            conditions: [1, 2],
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await polygonAdapter.getTrades('AAPL', '2023-01-01', '2023-01-02');
      
      expect(result).toHaveLength(1);
      expect(result[0].price).toBe(150.0);
    });
  });

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(adapter.getPrices('AAPL')).rejects.toThrow('Network error');
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(adapter.getPrices('AAPL')).rejects.toThrow('Invalid JSON');
    });

    it('should handle empty responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await expect(adapter.getPrices('AAPL')).rejects.toThrow('No time series data received');
    });
  });

  describe('Rate limiting', () => {
    let originalDateNow: () => number;
    let originalSetTimeout: typeof setTimeout;
    let mockDateNow: () => number;
    let mockSetTimeout: any;

    beforeEach(() => {
      // Mock Date.now() to return predictable values
      originalDateNow = Date.now;
      mockDateNow = vi.fn()
        .mockReturnValueOnce(1000)  // First call
        .mockReturnValueOnce(1001)  // Second call (1ms later)
        .mockReturnValueOnce(2000); // Third call (999ms later)
      Date.now = mockDateNow;

      // Mock setTimeout to prevent actual delays
      originalSetTimeout = setTimeout;
      mockSetTimeout = vi.fn((callback: Function, delay: number) => {
        // Execute callback immediately instead of waiting
        callback();
        return 1; // Return a mock timer ID
      });
      global.setTimeout = mockSetTimeout;
    });

    afterEach(() => {
      // Restore original functions
      Date.now = originalDateNow;
      global.setTimeout = originalSetTimeout;
    });

    it('should respect rate limiting', async () => {
      // Mock successful responses
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: [
            { t: 1640995200000, o: 150.0, h: 151.0, l: 149.0, c: 150.5, v: 1000000 }
          ]
        }),
      });

      // Make first request
      await adapter.getPrices('AAPL');
      
      // Make second request immediately - this should trigger rate limiting
      await adapter.getPrices('AAPL');
      
      // Verify that makeRequest was called twice (indicating rate limiting was handled)
      expect(mockFetch).toHaveBeenCalledTimes(2);
      
      // Verify that setTimeout was called for rate limiting
      expect(mockSetTimeout).toHaveBeenCalled();
    });
  });

  describe('Data validation', () => {
    it('should validate price data structure', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: [
            { t: 1640995200000, o: '150.0', h: '151.0', l: '149.0', c: '150.5', v: '1000000' }
          ]
        }),
      });

      const result = await adapter.getPrices('AAPL');
      
      expect(result[0].open).toBe(150.0); // Should be converted to number
      expect(result[0].volume).toBe(1000000); // Should be converted to number
    });

    it('should handle missing price fields gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: [
            { t: 1640995200000, o: 150.0, h: 151.0, l: 149.0, c: 150.5 }
            // Missing volume field
          ]
        }),
      });

      const result = await adapter.getPrices('AAPL');
      
      expect(result[0].volume).toBeNaN(); // Should handle missing volume
    });
  });
});
