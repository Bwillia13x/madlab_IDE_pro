/**
 * Health Check API Contract Tests
 * Tests contracts for health check endpoints (/api/health, /api/health/history)
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { ContractTestHelper, HTTP_STATUS, ERROR_CODES } from './utils/contract-test-utils';
import { commonSchemas } from './schemas/common-schemas';

describe('Health Check API Contracts', () => {
  let contractHelper: ContractTestHelper;
  let mockFetch: any;

  beforeAll(async () => {
    contractHelper = new ContractTestHelper({
      consumer: 'MAD LAB Workbench',
      provider: 'MAD LAB Health Service',
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

  describe('GET /api/health', () => {
    it('should validate basic health check response', async () => {
      const healthResponse = {
        success: true,
        status: 'healthy',
        timestamp: '2024-01-01T12:00:00Z',
        uptime: 86400,
        version: '1.2.3',
        environment: 'production',
        requestId: 'req-health-123',
      };

      // Create Pact interaction
      contractHelper.createInteraction({
        description: 'get basic health check',
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

      // Validate basic health structure
      expect(data.success).toBe(true);
      expect(data.status).toBe('healthy');
      expect(data.uptime).toBeGreaterThanOrEqual(0);
      expect(data.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(data.environment).toBeOneOf(['development', 'staging', 'production']);
      expect(Date.parse(data.timestamp)).toBeTruthy();
      expect(data.requestId).toMatch(/^req-[a-zA-Z0-9-]+$/);
    });

    it('should validate detailed health check with checks', async () => {
      const detailedHealthResponse = {
        success: true,
        status: 'healthy',
        timestamp: '2024-01-01T12:00:00Z',
        uptime: 86400,
        responseTime: 25,
        checks: {
          database: {
            status: 'pass',
            responseTime: 5,
            message: 'Database connection successful',
          },
          cache: {
            status: 'pass',
            responseTime: 2,
            message: 'Redis cache operational',
          },
          external_service: {
            status: 'pass',
            responseTime: 150,
            message: 'External API responding',
          },
        },
        version: '1.2.3',
        environment: 'production',
        requestId: 'req-health-detailed-123',
      };

      // Create Pact interaction for detailed health
      contractHelper.createInteraction({
        description: 'get detailed health check',
        providerState: 'system is healthy with detailed checks',
        request: {
          method: 'GET',
          path: '/api/health',
          headers: {
            'X-Request-ID': 'req-health-detailed-123',
          },
          query: {
            detailed: 'true',
          },
        },
        response: {
          status: HTTP_STATUS.OK,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
          },
          body: detailedHealthResponse,
        },
      });

      const response = await fetch('/api/health?detailed=true', {
        headers: {
          'X-Request-ID': 'req-health-detailed-123',
        },
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.checks).toBeDefined();

      // Validate each health check
      Object.values(data.checks).forEach((check: any) => {
        expect(check.status).toBeOneOf(['pass', 'fail', 'warn']);
        expect(check.responseTime).toBeGreaterThanOrEqual(0);
        expect(check.message).toBeDefined();
      });

      // Validate against schema
      const healthSchema = {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
          timestamp: { type: 'string', format: 'date-time' },
          uptime: { type: 'number', minimum: 0 },
          responseTime: { type: 'number', minimum: 0 },
          checks: {
            type: 'object',
            patternProperties: {
              '^[a-zA-Z_]+$': {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['pass', 'fail', 'warn'] },
                  responseTime: { type: 'number', minimum: 0 },
                  message: { type: 'string' },
                },
                required: ['status'],
              },
            },
          },
          version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
          environment: { type: 'string', enum: ['development', 'staging', 'production'] },
          requestId: { type: 'string', pattern: '^req-[a-zA-Z0-9-]+$' },
        },
        required: ['success', 'status', 'timestamp', 'version', 'environment', 'requestId'],
      };

      const schemaValidation = contractHelper.validateSchema(data, healthSchema);
      expect(schemaValidation.isValid).toBe(true);
    });

    it('should validate degraded health status', async () => {
      const degradedHealthResponse = {
        success: true,
        status: 'degraded',
        timestamp: '2024-01-01T12:00:00Z',
        uptime: 86000,
        responseTime: 150,
        checks: {
          database: {
            status: 'pass',
            responseTime: 5,
            message: 'Database connection successful',
          },
          cache: {
            status: 'fail',
            responseTime: null,
            message: 'Redis connection timeout',
          },
        },
        issues: [
          {
            severity: 'high',
            component: 'cache',
            message: 'Redis cache is unavailable',
            since: '2024-01-01T11:30:00Z',
          },
        ],
        version: '1.2.3',
        environment: 'production',
        requestId: 'req-health-degraded-123',
      };

      // Create Pact interaction for degraded health
      contractHelper.createInteraction({
        description: 'get degraded health status',
        providerState: 'system is in degraded state',
        request: {
          method: 'GET',
          path: '/api/health',
          headers: {
            'X-Request-ID': 'req-health-degraded-123',
          },
        },
        response: {
          status: HTTP_STATUS.OK,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
          },
          body: degradedHealthResponse,
        },
      });

      const response = await fetch('/api/health', {
        headers: {
          'X-Request-ID': 'req-health-degraded-123',
        },
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.status).toBe('degraded');
      expect(data.issues).toBeDefined();
      expect(Array.isArray(data.issues)).toBe(true);
      expect(data.issues.length).toBeGreaterThan(0);

      // Check that there's at least one failed check
      const failedChecks = Object.values(data.checks).filter((check: any) => check.status === 'fail');
      expect(failedChecks.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/health/history', () => {
    it('should validate health history response', async () => {
      const healthHistoryResponse = {
        success: true,
        data: [
          {
            timestamp: '2024-01-01T10:00:00Z',
            status: 'healthy',
            responseTime: 25,
            uptime: 36000,
            checks: {
              database: { status: 'pass', responseTime: 5 },
              cache: { status: 'pass', responseTime: 2 },
            },
          },
          {
            timestamp: '2024-01-01T11:00:00Z',
            status: 'healthy',
            responseTime: 30,
            uptime: 39600,
            checks: {
              database: { status: 'pass', responseTime: 5 },
              cache: { status: 'pass', responseTime: 2 },
            },
          },
          {
            timestamp: '2024-01-01T12:00:00Z',
            status: 'degraded',
            responseTime: 150,
            uptime: 43200,
            checks: {
              database: { status: 'pass', responseTime: 5 },
              cache: { status: 'fail', responseTime: null },
            },
          },
        ],
        pagination: {
          page: 1,
          limit: 50,
          total: 144,
          totalPages: 3,
          hasNext: true,
          hasPrev: false,
        },
        metadata: {
          requestId: 'req-health-history-123',
          timestamp: new Date().toISOString(),
          period: {
            start: '2024-01-01T00:00:00Z',
            end: '2024-01-01T23:59:59Z',
            interval: 600, // 10 minutes
          },
        },
      };

      // Create Pact interaction
      contractHelper.createInteraction({
        description: 'get health history',
        providerState: 'health history data available',
        request: {
          method: 'GET',
          path: '/api/health/history',
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            'X-Request-ID': 'req-health-history-123',
          },
          query: {
            start: '2024-01-01T00:00:00Z',
            end: '2024-01-01T23:59:59Z',
            interval: '600',
            page: '1',
            limit: '50',
          },
        },
        response: {
          status: HTTP_STATUS.OK,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
          },
          body: healthHistoryResponse,
        },
      });

      const response = await fetch('/api/health/history?start=2024-01-01T00:00:00Z&end=2024-01-01T23:59:59Z&interval=600&page=1&limit=50', {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          'X-Request-ID': 'req-health-history-123',
        },
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      const data = await response.json();

      const commonValidation = contractHelper.validateCommonResponse(data, true);
      expect(commonValidation.isValid).toBe(true);

      // Validate data array
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(3);

      // Validate each health entry
      data.data.forEach((entry: any) => {
        expect(Date.parse(entry.timestamp)).toBeTruthy();
        expect(entry.status).toBeOneOf(['healthy', 'degraded', 'unhealthy']);
        expect(entry.responseTime).toBeGreaterThanOrEqual(0);
        expect(entry.uptime).toBeGreaterThanOrEqual(0);
        expect(entry.checks).toBeDefined();
      });

      // Validate pagination
      expect(data.pagination.total).toBe(144);
      expect(data.pagination.hasNext).toBe(true);

      // Validate metadata period
      expect(data.metadata.period.interval).toBe(600);
    });

    it('should validate health history with specific status filter', async () => {
      const filteredHistoryResponse = {
        success: true,
        data: [
          {
            timestamp: '2024-01-01T11:30:00Z',
            status: 'degraded',
            responseTime: 200,
            uptime: 41400,
            checks: {
              database: { status: 'pass', responseTime: 5 },
              cache: { status: 'fail', responseTime: null },
            },
            issues: [
              {
                severity: 'high',
                component: 'cache',
                message: 'Redis cache unavailable',
              },
            ],
          },
        ],
        pagination: {
          page: 1,
          limit: 100,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
        metadata: {
          requestId: 'req-health-history-456',
          timestamp: new Date().toISOString(),
          filters: {
            status: 'degraded',
          },
        },
      };

      // Create Pact interaction for filtered history
      contractHelper.createInteraction({
        description: 'get health history filtered by status',
        providerState: 'health history with degraded status available',
        request: {
          method: 'GET',
          path: '/api/health/history',
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            'X-Request-ID': 'req-health-history-456',
          },
          query: {
            status: 'degraded',
          },
        },
        response: {
          status: HTTP_STATUS.OK,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
          },
          body: filteredHistoryResponse,
        },
      });

      const response = await fetch('/api/health/history?status=degraded', {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          'X-Request-ID': 'req-health-history-456',
        },
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.length).toBe(1);
      expect(data.data[0].status).toBe('degraded');
      expect(data.data[0].issues).toBeDefined();

      // Validate filters in metadata
      expect(data.metadata.filters.status).toBe('degraded');
    });
  });

  describe('HEAD /api/health', () => {
    it('should validate health check via HEAD request', async () => {
      // Create Pact interaction for HEAD request
      contractHelper.createInteraction({
        description: 'health check via HEAD request',
        providerState: 'system is healthy',
        request: {
          method: 'HEAD',
          path: '/api/health',
          headers: {
            'X-Request-ID': 'req-health-head-123',
          },
        },
        response: {
          status: HTTP_STATUS.OK,
          headers: {
            'X-API-Version': '1.0.0',
            'Cache-Control': 'no-cache',
            'X-Health-Status': 'healthy',
            'X-Uptime': '86400',
          },
        },
      });

      const response = await fetch('/api/health', {
        method: 'HEAD',
        headers: {
          'X-Request-ID': 'req-health-head-123',
        },
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.headers.get('X-Health-Status')).toBe('healthy');
      expect(response.headers.get('X-Uptime')).toBe('86400');

      // HEAD requests should not have a body
      const text = await response.text();
      expect(text).toBe('');
    });
  });
});