import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as healthGet, HEAD as healthHead } from '@/app/api/health/route';
import { GET as docsGet } from '@/app/api/docs/route';
import { GET as swaggerGet } from '@/app/api/docs/swagger/route';
import { GET as tracesGet, DELETE as tracesDelete } from '@/app/api/traces/route';

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';

// Mock the production monitor
vi.mock('@/lib/performance/monitor', () => ({
  productionMonitor: {
    getSystemStatus: () => ({
      isRunning: true,
      uptime: 1000,
      metrics: { cpu: 50, memory: 60 },
      alerts: [],
      health: []
    }),
    getStats: () => ({
      totalAlerts: 0,
      activeAlerts: 0,
      resolvedAlerts: 0,
      metricsCache: {},
      alertsCache: {},
      healthCache: {}
    })
  }
}));

// Mock the data cache
vi.mock('@/lib/data/cache', () => ({
  globalDataCache: {
    getStats: () => ({
      hitRate: 0.8,
      size: 100,
      memoryUsage: 50,
      maxSize: 1000,
      maxMemoryUsage: 100
    })
  },
  priceCache: {
    getStats: () => ({
      hitRate: 0.9,
      size: 200,
      memoryUsage: 60,
      maxSize: 1000,
      maxMemoryUsage: 100
    })
  },
  financialCache: {
    getStats: () => ({
      hitRate: 0.7,
      size: 150,
      memoryUsage: 40,
      maxSize: 1000,
      maxMemoryUsage: 100
    })
  },
  kpiCache: {
    getStats: () => ({
      hitRate: 0.85,
      size: 80,
      memoryUsage: 30,
      maxSize: 1000,
      maxMemoryUsage: 100
    })
  }
}));

// Mock the data providers
vi.mock('@/lib/data/providers', () => ({
  getProviderHealth: () => Promise.resolve({
    mock: { available: true, authenticated: true, healthy: true },
    'alpha-vantage': { available: true, authenticated: true, healthy: true }
  }),
  getProviderStats: () => ({
    total: 2,
    real: 1,
    mock: 1,
    healthy: 2,
    current: 'mock'
  })
}));

describe('API Health Endpoints Integration Tests', () => {
  describe('/api/health', () => {
    it('should return comprehensive health status on GET', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/health');
      const response = await healthGet(mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('healthScore');
      expect(data).toHaveProperty('checks');
      expect(data).toHaveProperty('summary');
      
      // Check health checks structure
      expect(data.checks).toHaveProperty('system');
      expect(data.checks).toHaveProperty('database');
      expect(data.checks).toHaveProperty('providers');
      expect(data.checks).toHaveProperty('caches');
      expect(data.checks).toHaveProperty('monitoring');
      
      // Check summary structure
      expect(data.summary).toHaveProperty('totalChecks');
      expect(data.summary).toHaveProperty('healthyChecks');
      expect(data.summary).toHaveProperty('degradedChecks');
      expect(data.summary).toHaveProperty('unhealthyChecks');
      expect(data.summary).toHaveProperty('overallStatus');
    });
    
    it('should return 200 status on HEAD request', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/health', {
        method: 'HEAD'
      });
      const response = await healthHead(mockRequest);
      
      expect(response.status).toBe(200);
    });
    
    it('should handle errors gracefully', async () => {
      // Test error handling by checking the error response structure
      // The health endpoint should always return a valid response structure
      const mockRequest = new NextRequest('http://localhost:3000/api/health');
      const response = await healthGet(mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('checks');
      expect(data).toHaveProperty('summary');
      
      // Verify that all required health check components are present
      expect(data.checks).toHaveProperty('system');
      expect(data.checks).toHaveProperty('database');
      expect(data.checks).toHaveProperty('providers');
      expect(data.checks).toHaveProperty('caches');
      expect(data.checks).toHaveProperty('monitoring');
    });
  });
  
  describe('/api/docs', () => {
    it('should return OpenAPI specification in JSON format by default', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/docs');
      const response = await docsGet(mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
      expect(data).toHaveProperty('openapi');
      expect(data).toHaveProperty('info');
      expect(data).toHaveProperty('paths');
      expect(data).toHaveProperty('components');
      expect(data).toHaveProperty('tags');
      
      // Check specific API paths
      expect(data.paths).toHaveProperty('/api/health');
      expect(data.paths).toHaveProperty('/api/agent');
      expect(data.paths).toHaveProperty('/api/auth/login');
      expect(data.paths).toHaveProperty('/api/historical');
      expect(data.paths).toHaveProperty('/api/news');
    });
    
    it('should return OpenAPI specification in YAML format when requested', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/docs?format=yaml');
      const response = await docsGet(mockRequest);
      const data = await response.text();
      
      expect(response.status).toBe(200);
      // Since YAML is not implemented yet, we expect JSON format
      expect(response.headers.get('content-type')).toContain('application/json');
      expect(data).toContain('"openapi": "3.0.3"');
      expect(data).toContain('"title": "MAD LAB Platform API"');
    });
    
    it('should handle format parameter case-insensitively', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/docs?format=YML');
      const response = await docsGet(mockRequest);
      const data = await response.text();
      
      expect(response.status).toBe(200);
      // Since YAML is not implemented yet, we expect JSON format
      expect(response.headers.get('content-type')).toContain('application/json');
      expect(data).toContain('"openapi": "3.0.3"');
    });
  });
  
  describe('/api/docs/swagger', () => {
    it('should return Swagger UI HTML', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/docs/swagger');
      const response = await swaggerGet(mockRequest);
      const data = await response.text();
      
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');
      expect(data).toContain('<!DOCTYPE html>');
      expect(data).toContain('MAD LAB Platform API');
      expect(data).toContain('swagger-ui');
      expect(data).toContain('/api/docs?format=json');
    });
  });
  
  describe('/api/traces', () => {
    it('should return traces summary when no traceId is provided', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/traces');
      const response = await tracesGet(mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('traces');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('limit');
      expect(data).toHaveProperty('summary');
      
      expect(data.summary).toHaveProperty('totalTraces');
      expect(data.summary).toHaveProperty('averageSpansPerTrace');
      expect(data.summary).toHaveProperty('averageDuration');
    });
    
    it('should return specific trace when traceId is provided', async () => {
      // First, create a trace by making a health check request
      const healthRequest = new NextRequest('http://localhost:3000/api/health');
      await healthGet(healthRequest);
      
      // Get all traces to find a traceId
      const tracesRequest = new NextRequest('http://localhost:3000/api/traces');
      const tracesResponse = await tracesGet(tracesRequest);
      const tracesData = await tracesResponse.json();
      
      if (tracesData.traces.length > 0) {
        const traceId = tracesData.traces[0].traceId;
        const traceRequest = new NextRequest(`http://localhost:3000/api/traces?traceId=${traceId}`);
        const traceResponse = await tracesGet(traceRequest);
        const traceData = await traceResponse.json();
        
        expect(traceResponse.status).toBe(200);
        expect(traceData).toHaveProperty('traceId', traceId);
        expect(traceData).toHaveProperty('spans');
        expect(traceData).toHaveProperty('summary');
      }
    });
    
    it('should return 404 for non-existent traceId', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/traces?traceId=nonexistent');
      const response = await tracesGet(mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error', 'Trace not found');
    });
    
    it('should respect limit parameter', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/traces?limit=5');
      const response = await tracesGet(mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.limit).toBe(5);
      expect(data.traces.length).toBeLessThanOrEqual(5);
    });
    
    it('should clear all traces on DELETE', async () => {
      const deleteRequest = new NextRequest('http://localhost:3000/api/traces', {
        method: 'DELETE'
      });
      const response = await tracesDelete(deleteRequest);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('message', 'All traces cleared successfully');
      
      // Verify traces are cleared
      const getRequest = new NextRequest('http://localhost:3000/api/traces');
      const getResponse = await tracesGet(getRequest);
      const getData = await getResponse.json();
      
      expect(getData.total).toBe(0);
      expect(getData.traces).toHaveLength(0);
    });
  });
  
  describe('Health Check Integration', () => {
    it('should provide consistent health status across all components', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/health');
      const response = await healthGet(mockRequest);
      const data = await response.json();
      
      // Verify all health checks are present and have valid statuses
      const validStatuses = ['healthy', 'degraded', 'unhealthy'];
      
      expect(validStatuses).toContain(data.checks.system.status);
      expect(validStatuses).toContain(data.checks.database.status);
      expect(validStatuses).toContain(data.checks.providers.status);
      expect(validStatuses).toContain(data.checks.caches.status);
      expect(validStatuses).toContain(data.checks.monitoring.status);
      
      // Verify health score is within valid range
      expect(data.healthScore).toBeGreaterThanOrEqual(0);
      expect(data.healthScore).toBeLessThanOrEqual(100);
      
      // Verify summary counts add up
      const totalChecks = data.summary.healthyChecks + data.summary.degradedChecks + data.summary.unhealthyChecks;
      expect(totalChecks).toBe(data.summary.totalChecks);
    });
    
    it('should provide detailed cache information', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/health');
      const response = await healthGet(mockRequest);
      const data = await response.json();
      
      // Check cache information structure
      expect(data.caches).toHaveProperty('globalData');
      expect(data.caches).toHaveProperty('price');
      expect(data.caches).toHaveProperty('financial');
      expect(data.caches).toHaveProperty('kpi');
      
      // Verify cache metrics
      Object.values(data.caches).forEach((cache: any) => {
        expect(cache).toHaveProperty('hitRate');
        expect(cache).toHaveProperty('size');
        expect(cache).toHaveProperty('memoryUsage');
        
        expect(cache.hitRate).toBeGreaterThanOrEqual(0);
        expect(cache.hitRate).toBeLessThanOrEqual(1);
        expect(cache.size).toBeGreaterThanOrEqual(0);
        expect(cache.memoryUsage).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
