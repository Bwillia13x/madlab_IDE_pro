/**
 * Monitoring API Contract Tests
 * Tests contracts for monitoring endpoints (/api/monitoring/metrics, /api/monitoring/status)
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { ContractTestHelper, HTTP_STATUS, ERROR_CODES } from './utils/contract-test-utils';
import { commonSchemas } from './schemas/common-schemas';

describe('Monitoring API Contracts', () => {
  let contractHelper: ContractTestHelper;
  let mockFetch: any;

  beforeAll(async () => {
    contractHelper = new ContractTestHelper({
      consumer: 'MAD LAB Workbench',
      provider: 'MAD LAB Monitoring Service',
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

  describe('GET /api/monitoring/metrics', () => {
    it('should validate system metrics response schema', async () => {
      const metricsResponse = {
        success: true,
        data: {
          cpu: 45.2,
          memory: {
            used: 2048,
            total: 8192,
            percentage: 25.0,
          },
          disk: {
            used: 150,
            total: 500,
            percentage: 30.0,
          },
          network: {
            requestsPerSecond: 1250,
            errorRate: 0.5,
            latency: 45,
            bytesIn: 1024000,
            bytesOut: 2048000,
          },
          services: {
            'api-gateway': {
              status: 'healthy',
              uptime: 86400,
              responseTime: 25,
            },
            'data-service': {
              status: 'healthy',
              uptime: 86400,
              responseTime: 45,
            },
            'auth-service': {
              status: 'degraded',
              uptime: 86000,
              responseTime: 150,
            },
          },
          timestamp: '2024-01-01T12:00:00Z',
        },
        metadata: {
          requestId: 'req-metrics-123',
          timestamp: new Date().toISOString(),
          collection: {
            interval: 60,
            duration: 3600,
          },
        },
      };

      // Create Pact interaction
      contractHelper.createInteraction({
        description: 'get system metrics',
        providerState: 'monitoring data available',
        request: {
          method: 'GET',
          path: '/api/monitoring/metrics',
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            'X-Request-ID': 'req-metrics-123',
          },
        },
        response: {
          status: HTTP_STATUS.OK,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
            'Cache-Control': 'no-cache',
          },
          body: metricsResponse,
        },
      });

      const response = await fetch('/api/monitoring/metrics', {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          'X-Request-ID': 'req-metrics-123',
        },
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.headers.get('Cache-Control')).toBe('no-cache');

      const data = await response.json();

      // Validate common response structure
      const commonValidation = contractHelper.validateCommonResponse(data, true);
      expect(commonValidation.isValid).toBe(true);

      // Validate metrics data structure
      expect(data.data).toBeDefined();
      expect(data.data.cpu).toBeGreaterThanOrEqual(0);
      expect(data.data.cpu).toBeLessThanOrEqual(100);

      // Validate memory metrics
      expect(data.data.memory).toBeDefined();
      expect(data.data.memory.used).toBeGreaterThanOrEqual(0);
      expect(data.data.memory.total).toBeGreaterThan(data.data.memory.used);
      expect(data.data.memory.percentage).toBeGreaterThanOrEqual(0);
      expect(data.data.memory.percentage).toBeLessThanOrEqual(100);

      // Validate disk metrics
      expect(data.data.disk).toBeDefined();
      expect(data.data.disk.percentage).toBeGreaterThanOrEqual(0);
      expect(data.data.disk.percentage).toBeLessThanOrEqual(100);

      // Validate network metrics
      expect(data.data.network).toBeDefined();
      expect(data.data.network.requestsPerSecond).toBeGreaterThanOrEqual(0);
      expect(data.data.network.errorRate).toBeGreaterThanOrEqual(0);
      expect(data.data.network.latency).toBeGreaterThanOrEqual(0);

      // Validate services
      expect(data.data.services).toBeDefined();
      expect(data.data.services['api-gateway']).toBeDefined();
      expect(data.data.services['api-gateway'].status).toBeOneOf(['healthy', 'degraded', 'unhealthy']);

      // Validate against schema
      const metricsSchema = {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: { $ref: '#/components/schemas/monitoringMetrics' },
          metadata: { $ref: '#/components/schemas/metadata' },
        },
        required: ['success', 'data', 'metadata'],
      };

      const schemaValidation = contractHelper.validateSchema(data, metricsSchema);
      expect(schemaValidation.isValid).toBe(true);
    });

    it('should validate filtered metrics by service', async () => {
      const filteredMetricsResponse = {
        success: true,
        data: {
          services: {
            'data-service': {
              status: 'healthy',
              uptime: 86400,
              responseTime: 45,
              cpu: 35.5,
              memory: 1024,
              connections: 150,
            },
          },
          timestamp: '2024-01-01T12:00:00Z',
        },
        metadata: {
          requestId: 'req-metrics-456',
          timestamp: new Date().toISOString(),
          filters: {
            service: 'data-service',
          },
        },
      };

      // Create Pact interaction for filtered metrics
      contractHelper.createInteraction({
        description: 'get filtered metrics by service',
        providerState: 'monitoring data available for specific service',
        request: {
          method: 'GET',
          path: '/api/monitoring/metrics',
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            'X-Request-ID': 'req-metrics-456',
          },
          query: {
            service: 'data-service',
          },
        },
        response: {
          status: HTTP_STATUS.OK,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
          },
          body: filteredMetricsResponse,
        },
      });

      const response = await fetch('/api/monitoring/metrics?service=data-service', {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          'X-Request-ID': 'req-metrics-456',
        },
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.services['data-service']).toBeDefined();
      expect(data.data.services['data-service'].status).toBe('healthy');
      expect(data.metadata.filters.service).toBe('data-service');
    });
  });

  describe('GET /api/monitoring/status', () => {
    it('should validate system health status response', async () => {
      const healthResponse = {
        success: true,
        data: {
          status: 'healthy',
          timestamp: '2024-01-01T12:00:00Z',
          uptime: 86400,
          responseTime: 25,
          checks: {
            database: {
              status: 'pass',
              message: 'Database connection successful',
              timestamp: '2024-01-01T12:00:00Z',
            },
            redis: {
              status: 'pass',
              message: 'Redis cache operational',
              timestamp: '2024-01-01T12:00:00Z',
            },
            external_api: {
              status: 'warn',
              message: 'External API response time elevated',
              timestamp: '2024-01-01T12:00:00Z',
            },
          },
          version: '1.2.3',
          environment: 'production',
        },
        metadata: {
          requestId: 'req-status-123',
          timestamp: new Date().toISOString(),
        },
      };

      // Create Pact interaction
      contractHelper.createInteraction({
        description: 'get system health status',
        providerState: 'system health can be determined',
        request: {
          method: 'GET',
          path: '/api/monitoring/status',
          headers: {
            'X-Request-ID': 'req-status-123',
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

      const response = await fetch('/api/monitoring/status', {
        headers: {
          'X-Request-ID': 'req-status-123',
        },
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      const data = await response.json();

      const commonValidation = contractHelper.validateCommonResponse(data, true);
      expect(commonValidation.isValid).toBe(true);

      // Validate health data structure
      expect(data.data).toBeDefined();
      expect(data.data.status).toBeOneOf(['healthy', 'degraded', 'unhealthy']);
      expect(data.data.uptime).toBeGreaterThanOrEqual(0);
      expect(data.data.responseTime).toBeGreaterThanOrEqual(0);

      // Validate health checks
      expect(data.data.checks).toBeDefined();
      Object.values(data.data.checks).forEach((check: any) => {
        expect(check.status).toBeOneOf(['pass', 'fail', 'warn']);
        expect(check.message).toBeDefined();
        expect(Date.parse(check.timestamp)).toBeTruthy();
      });

      // Validate version and environment
      expect(data.data.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(data.data.environment).toBeOneOf(['development', 'staging', 'production']);
    });

    it('should validate degraded system status', async () => {
      const degradedResponse = {
        success: true,
        data: {
          status: 'degraded',
          timestamp: '2024-01-01T12:00:00Z',
          uptime: 86000,
          responseTime: 150,
          checks: {
            database: {
              status: 'pass',
              message: 'Database connection successful',
              timestamp: '2024-01-01T12:00:00Z',
            },
            redis: {
              status: 'fail',
              message: 'Redis connection timeout',
              timestamp: '2024-01-01T12:00:00Z',
            },
            external_api: {
              status: 'warn',
              message: 'External API slow response',
              timestamp: '2024-01-01T12:00:00Z',
            },
          },
          version: '1.2.3',
          environment: 'production',
          issues: [
            {
              severity: 'high',
              component: 'redis',
              message: 'Cache service unavailable',
              since: '2024-01-01T11:30:00Z',
            },
          ],
        },
        metadata: {
          requestId: 'req-status-456',
          timestamp: new Date().toISOString(),
        },
      };

      // Create Pact interaction for degraded status
      contractHelper.createInteraction({
        description: 'get degraded system health status',
        providerState: 'system is in degraded state',
        request: {
          method: 'GET',
          path: '/api/monitoring/status',
          headers: {
            'X-Request-ID': 'req-status-456',
          },
        },
        response: {
          status: HTTP_STATUS.OK,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
          },
          body: degradedResponse,
        },
      });

      const response = await fetch('/api/monitoring/status', {
        headers: {
          'X-Request-ID': 'req-status-456',
        },
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.status).toBe('degraded');
      expect(data.data.issues).toBeDefined();
      expect(Array.isArray(data.data.issues)).toBe(true);
      expect(data.data.issues.length).toBeGreaterThan(0);

      // Check that there's at least one failed check
      const failedChecks = Object.values(data.data.checks).filter((check: any) => check.status === 'fail');
      expect(failedChecks.length).toBeGreaterThan(0);
    });

    it('should validate unhealthy system status', async () => {
      const unhealthyResponse = {
        success: true,
        data: {
          status: 'unhealthy',
          timestamp: '2024-01-01T12:00:00Z',
          uptime: 85000,
          responseTime: 5000,
          checks: {
            database: {
              status: 'fail',
              message: 'Database connection failed',
              timestamp: '2024-01-01T12:00:00Z',
            },
            redis: {
              status: 'fail',
              message: 'Redis connection timeout',
              timestamp: '2024-01-01T12:00:00Z',
            },
          },
          version: '1.2.3',
          environment: 'production',
          issues: [
            {
              severity: 'critical',
              component: 'database',
              message: 'Primary database down',
              since: '2024-01-01T11:45:00Z',
            },
            {
              severity: 'high',
              component: 'redis',
              message: 'Cache service unavailable',
              since: '2024-01-01T11:30:00Z',
            },
          ],
        },
        metadata: {
          requestId: 'req-status-789',
          timestamp: new Date().toISOString(),
        },
      };

      // Create Pact interaction for unhealthy status
      contractHelper.createInteraction({
        description: 'get unhealthy system health status',
        providerState: 'system is in unhealthy state',
        request: {
          method: 'GET',
          path: '/api/monitoring/status',
          headers: {
            'X-Request-ID': 'req-status-789',
          },
        },
        response: {
          status: HTTP_STATUS.SERVICE_UNAVAILABLE,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
          },
          body: unhealthyResponse,
        },
      });

      const response = await fetch('/api/monitoring/status', {
        headers: {
          'X-Request-ID': 'req-status-789',
        },
      });

      expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.status).toBe('unhealthy');
      expect(data.data.issues).toBeDefined();

      // Check that all critical issues are present
      const criticalIssues = data.data.issues.filter((issue: any) => issue.severity === 'critical');
      expect(criticalIssues.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/monitoring/metrics/history', () => {
    it('should validate metrics history response', async () => {
      const historyResponse = {
        success: true,
        data: [
          {
            timestamp: '2024-01-01T11:00:00Z',
            cpu: 45.2,
            memory: { used: 2048, total: 8192, percentage: 25.0 },
            network: { requestsPerSecond: 1250, errorRate: 0.5 },
          },
          {
            timestamp: '2024-01-01T12:00:00Z',
            cpu: 52.1,
            memory: { used: 2304, total: 8192, percentage: 28.1 },
            network: { requestsPerSecond: 1420, errorRate: 0.3 },
          },
        ],
        pagination: {
          page: 1,
          limit: 24,
          total: 168,
          totalPages: 7,
          hasNext: true,
          hasPrev: false,
        },
        metadata: {
          requestId: 'req-metrics-history-123',
          timestamp: new Date().toISOString(),
          period: {
            start: '2024-01-01T00:00:00Z',
            end: '2024-01-01T23:59:59Z',
            interval: '1H',
          },
        },
      };

      // Create Pact interaction
      contractHelper.createInteraction({
        description: 'get metrics history',
        providerState: 'historical metrics data available',
        request: {
          method: 'GET',
          path: '/api/monitoring/metrics/history',
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            'X-Request-ID': 'req-metrics-history-123',
          },
          query: {
            start: '2024-01-01T00:00:00Z',
            end: '2024-01-01T23:59:59Z',
            interval: '1H',
            page: '1',
            limit: '24',
          },
        },
        response: {
          status: HTTP_STATUS.OK,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
          },
          body: historyResponse,
        },
      });

      const response = await fetch('/api/monitoring/metrics/history?start=2024-01-01T00:00:00Z&end=2024-01-01T23:59:59Z&interval=1H&page=1&limit=24', {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          'X-Request-ID': 'req-metrics-history-123',
        },
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      const data = await response.json();

      const commonValidation = contractHelper.validateCommonResponse(data, true);
      expect(commonValidation.isValid).toBe(true);

      // Validate data array
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(2);

      // Validate each metric entry
      data.data.forEach((entry: any) => {
        expect(Date.parse(entry.timestamp)).toBeTruthy();
        expect(entry.cpu).toBeGreaterThanOrEqual(0);
        expect(entry.memory.percentage).toBeGreaterThanOrEqual(0);
        expect(entry.network.requestsPerSecond).toBeGreaterThanOrEqual(0);
      });

      // Validate pagination
      expect(data.pagination.total).toBe(168);
      expect(data.pagination.hasNext).toBe(true);

      // Validate metadata period
      expect(data.metadata.period).toBeDefined();
      expect(data.metadata.period.interval).toBe('1H');
    });
  });
});