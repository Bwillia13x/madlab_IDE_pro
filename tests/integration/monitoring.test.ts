import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the monitoring modules
vi.mock('@/lib/monitoring/integration', () => ({
  getMonitoringStatus: vi.fn(() => ({
    openTelemetry: {
      enabled: true,
      status: 'initialized',
    },
    prometheus: {
      enabled: true,
      status: 'initialized',
      endpoint: 'http://localhost:9464/metrics',
    },
    healthHistory: {
      enabled: true,
      status: 'active',
    },
    overall: 'healthy',
  })),
}));

vi.mock('@/lib/monitoring/prometheus', () => ({
  prometheusMetricsExporter: {
    getMetricsUrl: vi.fn(() => 'http://localhost:9464/metrics'),
  },
}));

vi.mock('@/lib/tracing/opentelemetry', () => ({
  withTracing: vi.fn((handler) => handler),
}));

// Import the handlers
import { GET as getMonitoringStatus } from '@/app/api/monitoring/status/route';
import { GET as getMetrics } from '@/app/api/monitoring/metrics/route';

describe('Monitoring API Endpoints Integration Tests', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    // Create a mock request
    mockRequest = new NextRequest('http://localhost:3000/api/monitoring/status');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('/api/monitoring/status', () => {
    it('should return monitoring status on GET request', async () => {
      const response = await getMonitoringStatus(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        status: 'success',
        data: {
          openTelemetry: {
            enabled: true,
            status: 'initialized',
          },
          prometheus: {
            enabled: true,
            status: 'initialized',
            endpoint: 'http://localhost:9464/metrics',
          },
          healthHistory: {
            enabled: true,
            status: 'active',
          },
          overall: 'healthy',
        },
        timestamp: expect.any(String),
      });
    });

    it('should return 405 for non-GET requests', async () => {
      const postRequest = new NextRequest('http://localhost:3000/api/monitoring/status', {
        method: 'POST',
      });

      const response = await getMonitoringStatus(postRequest);
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toBe('Method not allowed');
    });

    it('should handle errors gracefully', async () => {
      // Mock the function to throw an error
      const { getMonitoringStatus: mockGetStatus } = await import('@/lib/monitoring/integration');
      vi.mocked(mockGetStatus).mockImplementationOnce(() => {
        throw new Error('Monitoring service unavailable');
      });

      const response = await getMonitoringStatus(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to get monitoring status');
      expect(data.message).toBe('Monitoring service unavailable');
    });
  });

  describe('/api/monitoring/metrics', () => {
    it('should redirect to Prometheus metrics endpoint', async () => {
      const response = await getMetrics(mockRequest);

      expect(response.status).toBe(307); // Redirect status
      expect(response.headers.get('location')).toBe('http://localhost:9464/metrics');
    });

    it('should return 405 for non-GET requests', async () => {
      const postRequest = new NextRequest('http://localhost:3000/api/monitoring/metrics', {
        method: 'POST',
      });

      const response = await getMetrics(postRequest);
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toBe('Method not allowed');
    });

    it('should handle errors gracefully', async () => {
      // Mock the function to throw an error
      const { prometheusMetricsExporter: mockExporter } = await import('@/lib/monitoring/prometheus');
      vi.mocked(mockExporter.getMetricsUrl).mockImplementationOnce(() => {
        throw new Error('Metrics exporter unavailable');
      });

      const response = await getMetrics(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to serve metrics');
      expect(data.message).toBe('Metrics exporter unavailable');
    });
  });

  describe('Monitoring Integration', () => {
    it('should provide consistent monitoring status across all components', async () => {
      const statusResponse = await getMonitoringStatus(mockRequest);
      const statusData = await statusResponse.json();

      // Verify all monitoring components are present
      expect(statusData.data).toHaveProperty('openTelemetry');
      expect(statusData.data).toHaveProperty('prometheus');
      expect(statusData.data).toHaveProperty('healthHistory');
      expect(statusData.data).toHaveProperty('overall');

      // Verify status values are valid
      expect(['healthy', 'degraded', 'unhealthy']).toContain(statusData.data.overall);
      expect(['initialized', 'error', 'disabled']).toContain(statusData.data.openTelemetry.status);
      expect(['initialized', 'error', 'disabled']).toContain(statusData.data.prometheus.status);
      expect(['active', 'error', 'disabled']).toContain(statusData.data.healthHistory.status);
    });

    it('should provide valid endpoint URLs', async () => {
      const statusResponse = await getMonitoringStatus(mockRequest);
      const statusData = await statusResponse.json();

      // Verify Prometheus endpoint is a valid URL
      const prometheusUrl = statusData.data.prometheus.endpoint;
      expect(prometheusUrl).toMatch(/^https?:\/\/.+/);
      expect(prometheusUrl).toContain('/metrics');
    });

    it('should include timestamp in all responses', async () => {
      const statusResponse = await getMonitoringStatus(mockRequest);
      const statusData = await statusResponse.json();

      // Verify timestamp is present and valid
      expect(statusData.timestamp).toBeDefined();
      expect(new Date(statusData.timestamp).getTime()).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle monitoring service initialization errors', async () => {
      // Mock the function to simulate initialization error
      const { getMonitoringStatus: mockGetStatus } = await import('@/lib/monitoring/integration');
      vi.mocked(mockGetStatus).mockImplementationOnce(() => {
        throw new Error('Failed to initialize monitoring service');
      });

      const response = await getMonitoringStatus(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to get monitoring status');
      expect(data.message).toBe('Failed to initialize monitoring service');
    });

    it('should handle Prometheus exporter errors', async () => {
      // Mock the function to simulate exporter error
      const { prometheusMetricsExporter: mockExporter } = await import('@/lib/monitoring/prometheus');
      vi.mocked(mockExporter.getMetricsUrl).mockImplementationOnce(() => {
        throw new Error('Prometheus exporter not available');
      });

      const response = await getMetrics(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to serve metrics');
      expect(data.message).toBe('Prometheus exporter not available');
    });
  });

  describe('Response Format', () => {
    it('should return proper JSON structure for monitoring status', async () => {
      const response = await getMonitoringStatus(mockRequest);
      const data = await response.json();

      // Verify response structure
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('timestamp');

      // Verify data structure
      expect(data.data).toHaveProperty('openTelemetry');
      expect(data.data).toHaveProperty('prometheus');
      expect(data.data).toHaveProperty('healthHistory');
      expect(data.data).toHaveProperty('overall');

      // Verify nested structures
      expect(data.data.openTelemetry).toHaveProperty('enabled');
      expect(data.data.openTelemetry).toHaveProperty('status');
      expect(data.data.prometheus).toHaveProperty('enabled');
      expect(data.data.prometheus).toHaveProperty('status');
      expect(data.data.prometheus).toHaveProperty('endpoint');
      expect(data.data.healthHistory).toHaveProperty('enabled');
      expect(data.data.healthHistory).toHaveProperty('status');
    });

    it('should return proper error structure for failures', async () => {
      // Mock the function to throw an error
      const { getMonitoringStatus: mockGetStatus } = await import('@/lib/monitoring/integration');
      vi.mocked(mockGetStatus).mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      const response = await getMonitoringStatus(mockRequest);
      const data = await response.json();

      // Verify error response structure
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
      expect(data.error).toBe('Failed to get monitoring status');
      expect(data.message).toBe('Test error');
    });
  });
});

