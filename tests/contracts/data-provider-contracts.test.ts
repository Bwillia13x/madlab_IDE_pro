/**
 * Data Provider API Contract Tests
 * Tests contracts for market data, historical data, and realtime data endpoints
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { ContractTestHelper, HTTP_STATUS, ERROR_CODES } from './utils/contract-test-utils';
import { commonSchemas } from './schemas/common-schemas';

describe('Data Provider API Contracts', () => {
  let contractHelper: ContractTestHelper;
  let mockFetch: any;

  beforeAll(async () => {
    contractHelper = new ContractTestHelper({
      consumer: 'MAD LAB Workbench',
      provider: 'MAD LAB Data Service',
    });
    await contractHelper.setup();
  });

  afterAll(async () => {
    await contractHelper.finalize();
  });

  beforeEach(() => {
    mockFetch = contractHelper.mockFetch();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/market/:symbol', () => {
    it('should validate market data response schema', async () => {
      const symbol = 'AAPL';
      const marketDataResponse = {
        success: true,
        data: {
          symbol: 'AAPL',
          price: 175.5,
          change: 2.5,
          changePercent: 1.45,
          volume: 1000000,
          marketCap: 2800000000000,
          lastUpdated: '2024-01-01T12:00:00Z',
          source: 'real-time',
          currency: 'USD',
          dayHigh: 176.2,
          dayLow: 174.8,
          open: 175.0,
          previousClose: 173.0,
        },
        metadata: {
          requestId: 'req-market-123',
          timestamp: new Date().toISOString(),
          cache: {
            hit: false,
            ttl: 300,
          },
        },
      };

      // Create Pact interaction
      contractHelper.createInteraction({
        description: 'get market data for AAPL',
        providerState: 'market data exists for symbol',
        request: {
          method: 'GET',
          path: '/api/market/AAPL',
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            'X-Request-ID': 'req-market-123',
          },
        },
        response: {
          status: HTTP_STATUS.OK,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
            'Cache-Control': 'max-age=300',
          },
          body: marketDataResponse,
        },
      });

      const response = await fetch('/api/market/AAPL', {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          'X-Request-ID': 'req-market-123',
        },
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.headers.get('Cache-Control')).toBe('max-age=300');

      const data = await response.json();

      // Validate common response structure
      const commonValidation = contractHelper.validateCommonResponse(data, true);
      expect(commonValidation.isValid).toBe(true);

      // Validate market data structure
      expect(data.data).toBeDefined();
      expect(data.data.symbol).toBe(symbol);
      expect(data.data.price).toBeGreaterThan(0);
      expect(data.data.change).toBeDefined();
      expect(data.data.changePercent).toBeDefined();
      expect(data.data.volume).toBeGreaterThanOrEqual(0);
      expect(data.data.marketCap).toBeGreaterThanOrEqual(0);
      expect(Date.parse(data.data.lastUpdated)).toBeTruthy();

      // Validate metadata
      expect(data.metadata).toBeDefined();
      expect(data.metadata.cache).toBeDefined();
      expect(data.metadata.cache.ttl).toBe(300);

      // Validate against schema
      const marketDataSchema = {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: { $ref: '#/components/schemas/marketData' },
          metadata: { $ref: '#/components/schemas/metadata' },
        },
        required: ['success', 'data', 'metadata'],
      };

      const schemaValidation = contractHelper.validateSchema(data, marketDataSchema);
      expect(schemaValidation.isValid).toBe(true);
    });

    it('should validate market data for invalid symbol', async () => {
      const invalidSymbol = 'INVALID';
      const errorResponse = {
        success: false,
        error: 'Symbol not found',
        code: ERROR_CODES.RESOURCE_NOT_FOUND,
        timestamp: new Date().toISOString(),
        requestId: 'req-market-456',
        details: {
          symbol: 'INVALID',
          availableSymbols: ['AAPL', 'GOOGL', 'MSFT'],
        },
      };

      // Create Pact interaction for invalid symbol
      contractHelper.createInteraction({
        description: 'get market data for invalid symbol',
        providerState: 'symbol does not exist',
        request: {
          method: 'GET',
          path: '/api/market/INVALID',
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            'X-Request-ID': 'req-market-456',
          },
        },
        response: {
          status: HTTP_STATUS.NOT_FOUND,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
          },
          body: errorResponse,
        },
      });

      const response = await fetch('/api/market/INVALID', {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          'X-Request-ID': 'req-market-456',
        },
      });

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      const data = await response.json();

      const errorValidation = contractHelper.validateErrorResponse(data);
      expect(errorValidation.isValid).toBe(true);

      expect(data.code).toBe(ERROR_CODES.RESOURCE_NOT_FOUND);
      expect(data.details.symbol).toBe(invalidSymbol);
      expect(data.details.availableSymbols).toBeDefined();
    });
  });

  describe('GET /api/historical/:symbol', () => {
    it('should validate historical data response with pagination', async () => {
      const historicalResponse = {
        success: true,
        data: [
          {
            timestamp: '2024-01-01T10:00:00Z',
            open: 150.0,
            high: 152.0,
            low: 149.5,
            close: 151.5,
            volume: 1000000,
          },
          {
            timestamp: '2024-01-01T11:00:00Z',
            open: 151.5,
            high: 153.2,
            low: 151.0,
            close: 152.8,
            volume: 1200000,
          },
        ],
        pagination: {
          page: 1,
          limit: 100,
          total: 250,
          totalPages: 3,
          hasNext: true,
          hasPrev: false,
        },
        metadata: {
          symbol: 'AAPL',
          timeframe: '1H',
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
          requestId: 'req-historical-123',
          timestamp: new Date().toISOString(),
          cache: {
            hit: true,
            ttl: 1800,
          },
        },
      };

      // Create Pact interaction
      contractHelper.createInteraction({
        description: 'get historical data with pagination',
        providerState: 'historical data exists for symbol and timeframe',
        request: {
          method: 'GET',
          path: '/api/historical/AAPL',
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            'X-Request-ID': 'req-historical-123',
          },
          query: {
            timeframe: '1H',
            page: '1',
            limit: '100',
            startDate: '2024-01-01T00:00:00Z',
            endDate: '2024-01-31T23:59:59Z',
          },
        },
        response: {
          status: HTTP_STATUS.OK,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
          },
          body: historicalResponse,
        },
      });

      const response = await fetch('/api/historical/AAPL?timeframe=1H&page=1&limit=100&startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z', {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          'X-Request-ID': 'req-historical-123',
        },
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      const data = await response.json();

      const commonValidation = contractHelper.validateCommonResponse(data, true);
      expect(commonValidation.isValid).toBe(true);

      // Validate data array
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(2);

      // Validate data points
      data.data.forEach((point: any) => {
        expect(point.timestamp).toBeDefined();
        expect(Date.parse(point.timestamp)).toBeTruthy();
        expect(point.open).toBeGreaterThan(0);
        expect(point.high).toBeGreaterThanOrEqual(point.open);
        expect(point.low).toBeLessThanOrEqual(point.open);
        expect(point.close).toBeGreaterThan(0);
        expect(point.volume).toBeGreaterThan(0);
      });

      // Validate pagination
      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(100);
      expect(data.pagination.total).toBe(250);
      expect(data.pagination.totalPages).toBe(3);
      expect(data.pagination.hasNext).toBe(true);
      expect(data.pagination.hasPrev).toBe(false);

      // Validate metadata
      expect(data.metadata.symbol).toBe('AAPL');
      expect(data.metadata.timeframe).toBe('1H');
      expect(data.metadata.cache.hit).toBe(true);
    });

    it('should validate historical data with no data found', async () => {
      const emptyResponse = {
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 100,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
        metadata: {
          symbol: 'NEWCO',
          timeframe: '1D',
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
          requestId: 'req-historical-456',
          timestamp: new Date().toISOString(),
          cache: {
            hit: false,
            ttl: 1800,
          },
        },
      };

      // Create Pact interaction for no data
      contractHelper.createInteraction({
        description: 'get historical data with no results',
        providerState: 'no historical data exists for symbol',
        request: {
          method: 'GET',
          path: '/api/historical/NEWCO',
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            'X-Request-ID': 'req-historical-456',
          },
          query: {
            timeframe: '1D',
            page: '1',
            limit: '100',
          },
        },
        response: {
          status: HTTP_STATUS.OK,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
          },
          body: emptyResponse,
        },
      });

      const response = await fetch('/api/historical/NEWCO?timeframe=1D&page=1&limit=100', {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          'X-Request-ID': 'req-historical-456',
        },
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
      expect(data.pagination.total).toBe(0);
      expect(data.pagination.hasNext).toBe(false);
      expect(data.pagination.hasPrev).toBe(false);
    });
  });

  describe('WebSocket /api/realtime/:symbol', () => {
    it('should validate realtime data streaming contract', async () => {
      const realtimeDataMessage = {
        type: 'price_update',
        symbol: 'AAPL',
        data: {
          price: 175.5,
          change: 2.5,
          changePercent: 1.45,
          volume: 1000000,
          timestamp: '2024-01-01T12:00:00Z',
        },
        metadata: {
          source: 'real-time',
          sequence: 12345,
          partition: 1,
        },
      };

      // Create Pact interaction for WebSocket message
      contractHelper.createInteraction({
        description: 'realtime price update message',
        providerState: 'realtime connection established',
        request: {
          method: 'GET',
          path: '/api/realtime/AAPL',
          headers: {
            'Upgrade': 'websocket',
            'Connection': 'Upgrade',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            'X-Request-ID': 'req-realtime-123',
          },
        },
        response: {
          status: 101,
          headers: {
            'Upgrade': 'websocket',
            'Connection': 'Upgrade',
          },
          body: realtimeDataMessage,
        },
      });

      // Test WebSocket connection handshake
      const response = await fetch('/api/realtime/AAPL', {
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          'X-Request-ID': 'req-realtime-123',
        },
      });

      expect(response.status).toBe(101);
      expect(response.headers.get('Upgrade')).toBe('websocket');

      // In a real test, we would establish WebSocket connection
      // For contract testing, we validate the message format
      const data = await response.json();

      expect(data.type).toBe('price_update');
      expect(data.symbol).toBe('AAPL');
      expect(data.data).toBeDefined();
      expect(data.data.price).toBeGreaterThan(0);
      expect(data.metadata).toBeDefined();
      expect(data.metadata.sequence).toBeDefined();
    });

    it('should validate realtime error message contract', async () => {
      const errorMessage = {
        type: 'error',
        error: 'Subscription limit exceeded',
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        timestamp: new Date().toISOString(),
        metadata: {
          requestId: 'req-realtime-456',
          connectionId: 'conn-123',
        },
      };

      // Create Pact interaction for error message
      contractHelper.createInteraction({
        description: 'realtime subscription error',
        providerState: 'subscription limit reached',
        request: {
          method: 'GET',
          path: '/api/realtime/AAPL',
          headers: {
            'Upgrade': 'websocket',
            'Connection': 'Upgrade',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            'X-Request-ID': 'req-realtime-456',
          },
        },
        response: {
          status: 101,
          headers: {
            'Upgrade': 'websocket',
            'Connection': 'Upgrade',
          },
          body: errorMessage,
        },
      });

      const response = await fetch('/api/realtime/AAPL', {
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          'X-Request-ID': 'req-realtime-456',
        },
      });

      expect(response.status).toBe(101);

      const data = await response.json();

      expect(data.type).toBe('error');
      expect(data.error).toBeDefined();
      expect(data.code).toBe(ERROR_CODES.RATE_LIMIT_EXCEEDED);
      expect(data.timestamp).toBeDefined();
      expect(data.metadata.requestId).toBe('req-realtime-456');
    });
  });

  describe('GET /api/market/quotes', () => {
    it('should validate multiple symbol quotes', async () => {
      const quotesResponse = {
        success: true,
        data: {
          AAPL: {
            symbol: 'AAPL',
            price: 175.5,
            change: 2.5,
            changePercent: 1.45,
            volume: 1000000,
            lastUpdated: '2024-01-01T12:00:00Z',
          },
          GOOGL: {
            symbol: 'GOOGL',
            price: 2800.0,
            change: -15.5,
            changePercent: -0.55,
            volume: 500000,
            lastUpdated: '2024-01-01T12:00:00Z',
          },
        },
        metadata: {
          requestId: 'req-quotes-123',
          timestamp: new Date().toISOString(),
          symbols: ['AAPL', 'GOOGL'],
          cache: {
            hit: false,
            ttl: 60,
          },
        },
      };

      // Create Pact interaction for multiple quotes
      contractHelper.createInteraction({
        description: 'get quotes for multiple symbols',
        providerState: 'multiple symbols exist',
        request: {
          method: 'GET',
          path: '/api/market/quotes',
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            'X-Request-ID': 'req-quotes-123',
          },
          query: {
            symbols: 'AAPL,GOOGL',
          },
        },
        response: {
          status: HTTP_STATUS.OK,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
          },
          body: quotesResponse,
        },
      });

      const response = await fetch('/api/market/quotes?symbols=AAPL,GOOGL', {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          'X-Request-ID': 'req-quotes-123',
        },
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      const data = await response.json();

      const commonValidation = contractHelper.validateCommonResponse(data, true);
      expect(commonValidation.isValid).toBe(true);

      expect(data.data).toBeDefined();
      expect(data.data.AAPL).toBeDefined();
      expect(data.data.GOOGL).toBeDefined();

      // Validate each quote
      Object.values(data.data).forEach((quote: any) => {
        expect(quote.symbol).toBeDefined();
        expect(quote.price).toBeGreaterThan(0);
        expect(quote.change).toBeDefined();
        expect(quote.changePercent).toBeDefined();
        expect(quote.volume).toBeGreaterThanOrEqual(0);
        expect(Date.parse(quote.lastUpdated)).toBeTruthy();
      });
    });
  });
});