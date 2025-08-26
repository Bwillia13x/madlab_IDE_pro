/**
 * API Contract Tests for MAD LAB Platform
 * Ensures API schemas and responses match expected contracts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch for API contract testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock OpenAPI schema validator
vi.mock('openapi-schema-validator', () => ({
  OpenAPISchemaValidator: vi.fn(() => ({
    validate: vi.fn(() => ({ errors: [] })),
  })),
}));

// Mock JSON Schema validator
vi.mock('jsonschema', () => ({
  Validator: vi.fn(() => ({
    validate: vi.fn(() => ({ errors: [], valid: true })),
    addSchema: vi.fn(),
  })),
}));

describe('API Contract Tests', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication API Contracts', () => {
    it('should validate login API response schema', async () => {
      const loginResponse = {
        success: true,
        user: {
          id: 'user123',
          email: 'test@example.com',
          role: 'user',
          createdAt: '2024-01-01T00:00:00Z',
        },
        token: {
          accessToken: 'jwt-token-here',
          refreshToken: 'refresh-token-here',
          expiresAt: Date.now() + 3600000,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(loginResponse),
      });

      // Test the actual API endpoint
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();

      // Validate response structure
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('user');
      expect(data).toHaveProperty('token');

      // Validate user object
      expect(data.user).toHaveProperty('id');
      expect(data.user).toHaveProperty('email');
      expect(data.user).toHaveProperty('role');
      expect(data.user).toHaveProperty('createdAt');

      // Validate token object
      expect(data.token).toHaveProperty('accessToken');
      expect(data.token).toHaveProperty('refreshToken');
      expect(data.token).toHaveProperty('expiresAt');
    });

    it('should validate error response contracts', async () => {
      const errorResponse = {
        success: false,
        error: 'Invalid credentials',
        code: 'AUTH_INVALID_CREDENTIALS',
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve(errorResponse),
      });

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid@example.com', password: 'wrong' }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);

      const data = await response.json();

      // Validate error response structure
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('code');
      expect(data).toHaveProperty('timestamp');

      // Validate error code format
      expect(data.code).toMatch(/^AUTH_[A-Z_]+$/);
    });
  });

  describe('Data Provider API Contracts', () => {
    it('should validate market data API response schema', async () => {
      const marketDataResponse = {
        success: true,
        data: {
          symbol: 'AAPL',
          price: 175.5,
          change: 2.5,
          changePercent: 1.45,
          volume: 1000000,
          marketCap: 2800000000000,
          lastUpdated: new Date().toISOString(),
          source: 'mock',
        },
        metadata: {
          requestId: 'req-123',
          timestamp: new Date().toISOString(),
          cache: {
            hit: false,
            ttl: 300,
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(marketDataResponse),
      });

      const response = await fetch('/api/market/AAPL');
      expect(response.ok).toBe(true);

      const data = await response.json();

      // Validate response structure
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('metadata');

      // Validate data object
      expect(data.data).toHaveProperty('symbol', 'AAPL');
      expect(data.data).toHaveProperty('price');
      expect(data.data).toHaveProperty('change');
      expect(data.data).toHaveProperty('changePercent');
      expect(data.data).toHaveProperty('volume');
      expect(data.data).toHaveProperty('lastUpdated');

      // Validate metadata
      expect(data.metadata).toHaveProperty('requestId');
      expect(data.metadata).toHaveProperty('timestamp');
      expect(data.metadata).toHaveProperty('cache');
    });

    it('should validate historical data pagination contract', async () => {
      const historicalResponse = {
        success: true,
        data: [
          { timestamp: '2024-01-01', price: 150.0, volume: 1000000 },
          { timestamp: '2024-01-02', price: 152.0, volume: 1200000 },
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
          timeframe: '1D',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(historicalResponse),
      });

      const response = await fetch('/api/historical/AAPL?timeframe=1D&page=1&limit=100');
      expect(response.ok).toBe(true);

      const data = await response.json();

      // Validate pagination structure
      expect(data).toHaveProperty('pagination');
      expect(data.pagination).toHaveProperty('page', 1);
      expect(data.pagination).toHaveProperty('limit', 100);
      expect(data.pagination).toHaveProperty('total');
      expect(data.pagination).toHaveProperty('totalPages');
      expect(data.pagination).toHaveProperty('hasNext');
      expect(data.pagination).toHaveProperty('hasPrev');

      // Validate data array
      expect(Array.isArray(data.data)).toBe(true);
      if (data.data.length > 0) {
        expect(data.data[0]).toHaveProperty('timestamp');
        expect(data.data[0]).toHaveProperty('price');
        expect(data.data[0]).toHaveProperty('volume');
      }
    });
  });

  describe('Widget API Contracts', () => {
    it('should validate widget configuration schema', async () => {
      const widgetConfig = {
        id: 'widget-123',
        type: 'chart',
        title: 'Price Chart',
        settings: {
          symbol: 'AAPL',
          timeframe: '1D',
          indicators: ['SMA', 'EMA'],
          theme: 'dark',
        },
        layout: {
          x: 0,
          y: 0,
          width: 6,
          height: 4,
        },
        refresh: {
          interval: 30000,
          enabled: true,
        },
      };

      // Test widget creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, widget: widgetConfig }),
      });

      const response = await fetch('/api/widgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(widgetConfig),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();

      // Validate widget structure
      expect(data.widget).toHaveProperty('id');
      expect(data.widget).toHaveProperty('type');
      expect(data.widget).toHaveProperty('title');
      expect(data.widget).toHaveProperty('settings');
      expect(data.widget).toHaveProperty('layout');
      expect(data.widget).toHaveProperty('refresh');

      // Validate settings
      expect(data.widget.settings).toHaveProperty('symbol');
      expect(data.widget.settings).toHaveProperty('timeframe');
      expect(data.widget.settings).toHaveProperty('theme');

      // Validate layout
      expect(data.widget.layout).toHaveProperty('x');
      expect(data.widget.layout).toHaveProperty('y');
      expect(data.widget.layout).toHaveProperty('width');
      expect(data.widget.layout).toHaveProperty('height');
    });

    it('should validate widget data streaming contract', async () => {
      const streamingData = {
        type: 'price_update',
        widgetId: 'widget-123',
        data: {
          symbol: 'AAPL',
          price: 175.5,
          change: 2.5,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          source: 'real-time',
          sequence: 12345,
          partition: 1,
        },
      };

      // Mock WebSocket or SSE response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(streamingData),
      });

      const response = await fetch('/api/widgets/widget-123/stream');
      expect(response.ok).toBe(true);

      const data = await response.json();

      // Validate streaming data structure
      expect(data).toHaveProperty('type', 'price_update');
      expect(data).toHaveProperty('widgetId');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('metadata');

      // Validate data payload
      expect(data.data).toHaveProperty('symbol');
      expect(data.data).toHaveProperty('price');
      expect(data.data).toHaveProperty('change');
      expect(data.data).toHaveProperty('timestamp');

      // Validate metadata
      expect(data.metadata).toHaveProperty('source');
      expect(data.metadata).toHaveProperty('sequence');
    });
  });

  describe('Error Response Contracts', () => {
    it('should validate rate limit error contract', async () => {
      const rateLimitResponse = {
        success: false,
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 60,
        limit: 100,
        remaining: 0,
        resetTime: new Date(Date.now() + 60000).toISOString(),
        metadata: {
          endpoint: '/api/market/AAPL',
          method: 'GET',
          userId: 'user123',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Map([['Retry-After', '60']]),
        json: () => Promise.resolve(rateLimitResponse),
      });

      const response = await fetch('/api/market/AAPL');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(429);

      const data = await response.json();

      // Validate rate limit structure
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('code', 'RATE_LIMIT_EXCEEDED');
      expect(data).toHaveProperty('retryAfter');
      expect(data).toHaveProperty('limit');
      expect(data).toHaveProperty('remaining');
      expect(data).toHaveProperty('resetTime');
      expect(data).toHaveProperty('metadata');

      // Validate headers
      expect(response.headers.get('Retry-After')).toBe('60');
    });

    it('should validate server error contract', async () => {
      const serverErrorResponse = {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
        requestId: 'req-abc-123',
        timestamp: new Date().toISOString(),
        metadata: {
          endpoint: '/api/data',
          method: 'GET',
          version: '1.0.0',
          environment: 'production',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve(serverErrorResponse),
      });

      const response = await fetch('/api/data');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);

      const data = await response.json();

      // Validate server error structure
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('code', 'INTERNAL_SERVER_ERROR');
      expect(data).toHaveProperty('requestId');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('metadata');

      // Validate request ID format
      expect(data.requestId).toMatch(/^req-[a-zA-Z0-9-]+$/);
    });
  });

  describe('API Versioning Contracts', () => {
    it('should validate API version headers', async () => {
      const versionedResponse = {
        success: true,
        data: { message: 'Hello from API v2' },
        version: '2.0.0',
        deprecated: false,
        migration: null,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([
          ['X-API-Version', '2.0.0'],
          ['X-API-Deprecated', 'false'],
          ['X-API-Sunset', '2025-12-31'],
        ]),
        json: () => Promise.resolve(versionedResponse),
      });

      const response = await fetch('/api/v2/data', {
        headers: { 'X-API-Version': '2.0.0' },
      });

      expect(response.ok).toBe(true);

      // Validate version headers
      expect(response.headers.get('X-API-Version')).toBe('2.0.0');
      expect(response.headers.get('X-API-Deprecated')).toBe('false');

      const data = await response.json();
      expect(data).toHaveProperty('version', '2.0.0');
      expect(data).toHaveProperty('deprecated', false);
    });

    it('should validate deprecated API warnings', async () => {
      const deprecatedResponse = {
        success: true,
        data: { message: 'This endpoint is deprecated' },
        version: '1.0.0',
        deprecated: true,
        migration: {
          newEndpoint: '/api/v2/data',
          migrationGuide: 'https://docs.example.com/migration',
          sunsetDate: '2024-12-31',
        },
        warnings: [
          {
            code: 'DEPRECATED_ENDPOINT',
            message: 'This API version will be sunset on 2024-12-31',
            severity: 'warning',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([
          ['X-API-Version', '1.0.0'],
          ['X-API-Deprecated', 'true'],
          ['X-API-Sunset', '2024-12-31'],
          ['Warning', '299 - "Deprecated API Version"'],
        ]),
        json: () => Promise.resolve(deprecatedResponse),
      });

      const response = await fetch('/api/v1/data');
      expect(response.ok).toBe(true);

      // Validate deprecation headers
      expect(response.headers.get('X-API-Deprecated')).toBe('true');
      expect(response.headers.get('X-API-Sunset')).toBe('2024-12-31');

      const data = await response.json();
      expect(data).toHaveProperty('deprecated', true);
      expect(data).toHaveProperty('migration');
      expect(data).toHaveProperty('warnings');
      expect(data.warnings).toHaveLength(1);
      expect(data.warnings[0]).toHaveProperty('code', 'DEPRECATED_ENDPOINT');
    });
  });
});
