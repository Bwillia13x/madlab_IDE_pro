import { NextRequest, NextResponse } from 'next/server';
import { performComprehensiveHealthCheck } from '@/lib/health/orchestrator';
import { productionMonitor } from '@/lib/performance/monitor';
import { globalDataCache, priceCache, financialCache, kpiCache } from '@/lib/data/cache';

export async function GET(_request: NextRequest) {
  try {
    // Perform comprehensive health check
    const comprehensiveHealth = await performComprehensiveHealthCheck();
    
    // Get legacy cache statistics for backward compatibility
    const cacheStats = {
      globalData: globalDataCache.getStats(),
      price: priceCache.getStats(),
      financial: financialCache.getStats(),
      kpi: kpiCache.getStats(),
    };

    // Get production monitor statistics
    const monitorStats = productionMonitor.getStats();

    // Enhanced health response with comprehensive checks
    const healthData = {
      status: comprehensiveHealth.status,
      timestamp: comprehensiveHealth.timestamp,
      uptime: comprehensiveHealth.uptime,
      healthScore: comprehensiveHealth.healthScore,
      
      // Comprehensive health checks
      checks: comprehensiveHealth.checks,
      summary: comprehensiveHealth.summary,
      
      // Legacy cache information (for backward compatibility)
      caches: {
        globalData: {
          hitRate: cacheStats.globalData.hitRate,
          size: cacheStats.globalData.size,
          memoryUsage: cacheStats.globalData.memoryUsage,
        },
        price: {
          hitRate: cacheStats.price.hitRate,
          size: cacheStats.price.size,
          memoryUsage: cacheStats.price.memoryUsage,
        },
        financial: {
          hitRate: cacheStats.financial.hitRate,
          size: cacheStats.financial.size,
          memoryUsage: cacheStats.financial.memoryUsage,
        },
        kpi: {
          hitRate: cacheStats.kpi.hitRate,
          size: cacheStats.kpi.size,
          memoryUsage: cacheStats.kpi.memoryUsage,
        },
      },
      
      // Legacy monitoring information (for backward compatibility)
      monitoring: {
        totalAlerts: monitorStats.totalAlerts,
        activeAlerts: monitorStats.activeAlerts,
        resolvedAlerts: monitorStats.resolvedAlerts,
        metricsCache: monitorStats.metricsCache,
        alertsCache: monitorStats.alertsCache,
        healthCache: monitorStats.healthCache,
      },
    };

    return NextResponse.json(healthData);
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        checks: null,
        summary: null,
      },
      { status: 500 }
    );
  }
}

interface CacheStat {
  size: number;
  maxSize: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  averageTTL: number;
  memoryUsage: number;
  maxMemoryUsage: number;
  compressionRatio: number;
  averageEntrySize: number;
  priorityDistribution: Record<string, number>;
  performanceMetrics?: {
    totalRequests: number;
    averageResponseTime: number;
    evictionCount: number;
    compressionCount: number;
    uptime: number;
    requestsPerSecond: number;
  };
}

interface CacheStats {
  globalData: CacheStat;
  price: CacheStat;
  financial: CacheStat;
  kpi: CacheStat;
}

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: number;
  error?: string;
  details?: Record<string, unknown>;
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  category: 'cpu' | 'memory' | 'network' | 'disk' | 'application';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
  resolved: boolean;
  severity: 'low' | 'medium' | 'high';
}

interface SystemStatus {
  alerts: PerformanceAlert[];
  health: HealthCheck[];
}

function calculateHealthScore(
  systemStatus: SystemStatus,
  cacheStats: CacheStats,
): number {
  let score = 100;

  // Deduct points for alerts
  score -= systemStatus.alerts.length * 10;

  // Deduct points for unhealthy health checks
  const unhealthyChecks = systemStatus.health.filter((h: HealthCheck) => h.status === 'unhealthy').length;
  score -= unhealthyChecks * 15;

  // Deduct points for low cache hit rates
  Object.values(cacheStats).forEach((cache: CacheStat) => {
    if (cache.hitRate < 0.5) {
      score -= 10;
    }
  });

  // Deduct points for high memory usage
  Object.values(cacheStats).forEach((cache: CacheStat) => {
    const memoryUsagePercent = (cache.memoryUsage / cache.maxMemoryUsage) * 100;
    if (memoryUsagePercent > 90) {
      score -= 10;
    }
  });

  return Math.max(0, score);
}

// Head method for health check
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
