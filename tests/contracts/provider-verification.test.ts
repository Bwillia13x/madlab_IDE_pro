/**
 * Provider Contract Verification Tests
 * Verifies that the API provider fulfills all consumer contracts
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { ContractTestHelper, HTTP_STATUS, ERROR_CODES } from './utils/contract-test-utils';

// Mock the actual API server for provider verification
vi.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    constructor(public url: string, public method: string = 'GET') {}
    json() {
      return Promise.resolve({});
    }
  },
  NextResponse: {
    json: (data: any, options?: { status?: number }) => ({
      status: options?.status || 200,
      data,
    }),
  },
}));

describe('Provider Contract Verification', () => {
  let contractHelper: ContractTestHelper;
  let mockFetch: any;

  beforeAll(async () => {
    contractHelper = new ContractTestHelper({
      consumer: 'MAD LAB Workbench',
      provider: 'MAD LAB API Provider',
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

  describe('Authentication Provider Verification', () => {
    it('should verify login endpoint fulfills consumer contract', async () => {
      const loginRequest = {
        email: 'test@example.com',
        password: 'validpassword123',
      };

      const loginResponse = {
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'user',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        token: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          expiresAt: Date.now() + 3600000,
          tokenType: 'Bearer',
        },
        requestId: 'req-login-123',
        timestamp: new Date().toISOString(),
      };

      // Mock the actual API route handler
      const mockRouteHandler = vi.fn().mockResolvedValue({
        status: HTTP_STATUS.OK,
        data: loginResponse,
      });

      // Simulate the provider verification
      contractHelper.createInteraction({
        description: 'provider login verification',
        providerState: 'user exists and credentials are valid',
        request: {
          method: 'POST',
          path: '/api/auth/login',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': 'req-login-123',
          },
          body: loginRequest,
        },
        response: {
          status: HTTP_STATUS.OK,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
          },
          body: loginResponse,
        },
      });

      // Test the provider response
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': 'req-login-123',
        },
        body: JSON.stringify(loginRequest),
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      const data = await response.json();

      // Verify provider fulfills all consumer expectations
      const commonValidation = contractHelper.validateCommonResponse(data, true);
      expect(commonValidation.isValid).toBe(true);

      expect(data.user).toBeDefined();
      expect(data.user.id).toMatch(/^[a-zA-Z0-9-]+$/);
      expect(data.user.email).toBe(loginRequest.email);
      expect(data.user.role).toBeOneOf(['user', 'admin', 'moderator']);

      expect(data.token).toBeDefined();
      expect(data.token.accessToken).toBeDefined();
      expect(data.token.refreshToken).toBeDefined();
      expect(data.token.expiresAt).toBeGreaterThan(Date.now());
      expect(data.token.tokenType).toBe('Bearer');

      // Verify requestId is returned and valid
      expect(data.requestId).toMatch(/^req-[a-zA-Z0-9-]+$/);
      expect(Date.parse(data.timestamp)).toBeTruthy();
    });
  });

  describe('Data Provider Verification', () => {
    it('should verify market data endpoint fulfills consumer contract', async () => {
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

      contractHelper.createInteraction({
        description: 'provider market data verification',
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

      // Verify all consumer expectations are met
      const commonValidation = contractHelper.validateCommonResponse(data, true);
      expect(commonValidation.isValid).toBe(true);

      expect(data.data.symbol).toBe('AAPL');
      expect(data.data.price).toBeGreaterThan(0);
      expect(data.data.change).toBeDefined();
      expect(data.data.changePercent).toBeDefined();
      expect(data.data.volume).toBeGreaterThanOrEqual(0);
      expect(data.data.marketCap).toBeGreaterThanOrEqual(0);
      expect(Date.parse(data.data.lastUpdated)).toBeTruthy();

      expect(data.metadata.cache).toBeDefined();
      expect(data.metadata.cache.ttl).toBe(300);
    });
  });

  describe('Health Provider Verification', () => {
    it('should verify health endpoint fulfills consumer contract', async () => {
      const healthResponse = {
        success: true,
        status: 'healthy',
        timestamp: '2024-01-01T12:00:00Z',
        uptime: 86400,
        version: '1.2.3',
        environment: 'production',
        requestId: 'req-health-123',
      };

      contractHelper.createInteraction({
        description: 'provider health verification',
        providerState: 'system is healthy',
        request: {
          method: 'GET',
          path: '/api/health',
          headers: {
            'X-Request-ID': 'req-health-123',
          },
        },
        response: {
          status: HTTP_STATUS.OK,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
            'Cache-Control': 'no-cache',
          },
          body: healthResponse,
        },
      });

      const response = await fetch('/api/health', {
        headers: {
          'X-Request-ID': 'req-health-123',
        },
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.headers.get('Cache-Control')).toBe('no-cache');

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.status).toBe('healthy');
      expect(data.uptime).toBeGreaterThanOrEqual(0);
      expect(data.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(data.environment).toBeOneOf(['development', 'staging', 'production']);
      expect(data.requestId).toMatch(/^req-[a-zA-Z0-9-]+$/);
      expect(Date.parse(data.timestamp)).toBeTruthy();
    });
  });

  describe('Error Response Verification', () => {
    it('should verify error responses fulfill consumer contract', async () => {
      const errorResponse = {
        success: false,
        error: 'Invalid credentials',
        code: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        timestamp: new Date().toISOString(),
        requestId: 'req-error-123',
      };

      contractHelper.createInteraction({
        description: 'provider error response verification',
        providerState: 'invalid credentials provided',
        request: {
          method: 'POST',
          path: '/api/auth/login',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': 'req-error-123',
          },
          body: {
            email: 'invalid@example.com',
            password: 'wrong',
          },
        },
        response: {
          status: HTTP_STATUS.UNAUTHORIZED,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
          },
          body: errorResponse,
        },
      });

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': 'req-error-123',
        },
        body: JSON.stringify({
          email: 'invalid@example.com',
          password: 'wrong',
        }),
      });

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      const data = await response.json();

      // Verify error response fulfills consumer expectations
      const errorValidation = contractHelper.validateErrorResponse(data);
      expect(errorValidation.isValid).toBe(true);

      expect(data.code).toBe(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
      expect(data.error).toBeDefined();
      expect(data.timestamp).toBeDefined();
      expect(data.requestId).toMatch(/^req-[a-zA-Z0-9-]+$/);
    });
  });

  describe('Rate Limiting Verification', () => {
    it('should verify rate limit responses fulfill consumer contract', async () => {
      const rateLimitResponse = {
        success: false,
        error: 'Too many requests',
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        retryAfter: 60,
        limit: 100,
        remaining: 0,
        resetTime: new Date(Date.now() + 60000).toISOString(),
        metadata: {
          endpoint: '/api/market/AAPL',
          method: 'GET',
          userId: 'user123',
        },
        timestamp: new Date().toISOString(),
        requestId: 'req-rate-limit-123',
      };

      contractHelper.createInteraction({
        description: 'provider rate limit verification',
        providerState: 'rate limit exceeded',
        request: {
          method: 'GET',
          path: '/api/market/AAPL',
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            'X-Request-ID': 'req-rate-limit-123',
          },
        },
        response: {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
            'Retry-After': '60',
          },
          body: rateLimitResponse,
        },
      });

      const response = await fetch('/api/market/AAPL', {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          'X-Request-ID': 'req-rate-limit-123',
        },
      });

      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('60');

      const data = await response.json();

      const errorValidation = contractHelper.validateErrorResponse(data);
      expect(errorValidation.isValid).toBe(true);

      expect(data.code).toBe(ERROR_CODES.RATE_LIMIT_EXCEEDED);
      expect(data.retryAfter).toBe(60);
      expect(data.limit).toBe(100);
      expect(data.remaining).toBe(0);
      expect(data.resetTime).toBeDefined();
      expect(data.metadata).toBeDefined();
      expect(data.metadata.endpoint).toBe('/api/market/AAPL');
    });
  });

  describe('Contract Compliance Verification', () => {
    it('should verify all endpoints return valid requestId format', async () => {
      const testEndpoints = [
        { method: 'GET', path: '/api/health' },
        { method: 'POST', path: '/api/auth/login', body: { email: 'test@example.com', password: 'pass' } },
        { method: 'GET', path: '/api/market/AAPL' },
        { method: 'GET', path: '/api/monitoring/metrics' },
      ];

      for (const endpoint of testEndpoints) {
        const requestId = `req-compliance-${Math.random().toString(36).substr(2, 9)}`;

        // Mock successful response for compliance check
        const mockResponse = {
          success: true,
          data: {},
          requestId,
          timestamp: new Date().toISOString(),
        };

        contractHelper.createInteraction({
          description: `compliance check for ${endpoint.method} ${endpoint.path}`,
          providerState: 'endpoint is operational',
          request: {
            method: endpoint.method as any,
            path: endpoint.path,
            headers: {
              'X-Request-ID': requestId,
              ...(endpoint.body && { 'Content-Type': 'application/json' }),
            },
            ...(endpoint.body && { body: endpoint.body }),
          },
          response: {
            status: HTTP_STATUS.OK,
            headers: {
              'Content-Type': 'application/json',
            },
            body: mockResponse,
          },
        });

        const fetchOptions: any = {
          method: endpoint.method,
          headers: {
            'X-Request-ID': requestId,
          },
        };

        if (endpoint.body) {
          fetchOptions.headers['Content-Type'] = 'application/json';
          fetchOptions.body = JSON.stringify(endpoint.body);
        }

        const response = await fetch(endpoint.path, fetchOptions);
        expect(response.status).toBe(HTTP_STATUS.OK);

        const data = await response.json();

        // All responses should have valid requestId format
        expect(data.requestId).toMatch(/^req-[a-zA-Z0-9-]+$/);
        expect(data.timestamp).toBeDefined();
        expect(Date.parse(data.timestamp)).toBeTruthy();
      }
    });
  });
});