/**
 * Tests for Health API Endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the dependencies
vi.mock('@/lib/health/orchestrator', () => ({
  performComprehensiveHealthCheck: vi.fn(),
}));

vi.mock('@/lib/performance/monitor', () => ({
  productionMonitor: {
    getStats: vi.fn(),
  },
}));

vi.mock('@/lib/data/cache', () => ({
  globalDataCache: {
    getStats: vi.fn(),
  },
  priceCache: {
    getStats: vi.fn(),
  },
  financialCache: {
    getStats: vi.fn(),
  },
  kpiCache: {
    getStats: vi.fn(),
  },
}));

// Import after mocks are set up
import { GET, HEAD } from '@/app/api/health/route';
import { performComprehensiveHealthCheck } from '@/lib/health/orchestrator';
import { productionMonitor } from '@/lib/performance/monitor';
import { globalDataCache, priceCache, financialCache, kpiCache } from '@/lib/data/cache';

const mockPerformComprehensiveHealthCheck = vi.mocked(performComprehensiveHealthCheck);
const mockProductionMonitor = vi.mocked(productionMonitor);
const mockGlobalDataCache = vi.mocked(globalDataCache);
const mockPriceCache = vi.mocked(priceCache);
const mockFinancialCache = vi.mocked(financialCache);
const mockKpiCache = vi.mocked(kpiCache);

describe('Health API - GET /api/health', () => {
  const mockHealthData = {
    status: 'healthy',
    timestamp: '2025-01-20T10:00:00Z',
    uptime: 86400000, // 24 hours in ms
    healthScore: 95,
    checks: [
      {
        name: 'database',
        status: 'healthy',
        responseTime: 45,
        lastCheck: Date.now(),
      },
      {
        name: 'cache',
        status: 'healthy',
        responseTime: 12,
        lastCheck: Date.now(),
      },
    ],
    summary: {
      totalChecks: 2,
      healthy: 2,
      degraded: 0,
      unhealthy: 0,
    },
  };

  const mockCacheStats = {
    hitRate: 0.95,
    size: 100,
    memoryUsage: 1024 * 1024, // 1MB
  };

  const mockMonitorStats = {
    totalAlerts: 5,
    activeAlerts: 1,
    resolvedAlerts: 4,
    metricsCache: { size: 50 },
    alertsCache: { size: 25 },
    healthCache: { size: 10 },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default mocks
    mockPerformComprehensiveHealthCheck.mockResolvedValue(mockHealthData);
    mockGlobalDataCache.getStats.mockReturnValue(mockCacheStats);
    mockPriceCache.getStats.mockReturnValue(mockCacheStats);
    mockFinancialCache.getStats.mockReturnValue(mockCacheStats);
    mockKpiCache.getStats.mockReturnValue(mockCacheStats);
    mockProductionMonitor.getStats.mockReturnValue(mockMonitorStats);
  });

  it('should return comprehensive health data on successful check', async () => {
    const request = new NextRequest('http://localhost:3000/api/health');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      status: 'healthy',
      timestamp: '2025-01-20T10:00:00Z',
      uptime: 86400000,
      healthScore: 95,
      checks: mockHealthData.checks,
      summary: mockHealthData.summary,
      caches: {
        globalData: {
          hitRate: 0.95,
          size: 100,
          memoryUsage: 1024 * 1024,
        },
        price: {
          hitRate: 0.95,
          size: 100,
          memoryUsage: 1024 * 1024,
        },
        financial: {
          hitRate: 0.95,
          size: 100,
          memoryUsage: 1024 * 1024,
        },
        kpi: {
          hitRate: 0.95,
          size: 100,
          memoryUsage: 1024 * 1024,
        },
      },
      monitoring: mockMonitorStats,
    });
  });

  it('should handle health check failures gracefully', async () => {
    const error = new Error('Database connection failed');
    mockPerformComprehensiveHealthCheck.mockRejectedValue(error);

    const request = new NextRequest('http://localhost:3000/api/health');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      status: 'unhealthy',
      timestamp: expect.any(String),
      error: 'Database connection failed',
      checks: null,
      summary: null,
    });
  });

  it('should handle unknown errors', async () => {
    mockPerformComprehensiveHealthCheck.mockRejectedValue('Unknown error');

    const request = new NextRequest('http://localhost:3000/api/health');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Unknown error');
  });

  it('should call all required services', async () => {
    const request = new NextRequest('http://localhost:3000/api/health');
    await GET(request);

    expect(mockPerformComprehensiveHealthCheck).toHaveBeenCalledTimes(1);
    expect(mockGlobalDataCache.getStats).toHaveBeenCalledTimes(1);
    expect(mockPriceCache.getStats).toHaveBeenCalledTimes(1);
    expect(mockFinancialCache.getStats).toHaveBeenCalledTimes(1);
    expect(mockKpiCache.getStats).toHaveBeenCalledTimes(1);
    expect(mockProductionMonitor.getStats).toHaveBeenCalledTimes(1);
  });

  it('should return degraded status when health score is low', async () => {
    const degradedHealthData = {
      ...mockHealthData,
      status: 'degraded',
      healthScore: 45,
    };

    mockPerformComprehensiveHealthCheck.mockResolvedValue(degradedHealthData);

    const request = new NextRequest('http://localhost:3000/api/health');
    const response = await GET(request);
    const data = await response.json();

    expect(data.status).toBe('degraded');
    expect(data.healthScore).toBe(45);
  });
});

describe('Health API - HEAD /api/health', () => {
  it('should return 200 OK for HEAD request', async () => {
    const response = await HEAD();

    expect(response.status).toBe(200);
    expect(response.body).toBeNull();
  });
});
