import { NextRequest, NextResponse } from 'next/server';
import { productionMonitor } from '@/lib/performance/monitor';
import { globalDataCache, priceCache, financialCache, kpiCache } from '@/lib/data/cache';

export async function GET(_request: NextRequest) {
  try {
    // Get system status from production monitor
    const systemStatus = productionMonitor.getSystemStatus();
    
    // Get cache statistics
    const cacheStats = {
      globalData: globalDataCache.getStats(),
      price: priceCache.getStats(),
      financial: financialCache.getStats(),
      kpi: kpiCache.getStats(),
    };

    // Get production monitor statistics
    const monitorStats = productionMonitor.getStats();

    // Calculate overall health score
    const healthScore = calculateHealthScore(systemStatus, cacheStats, monitorStats);

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: systemStatus.uptime,
      healthScore,
      system: {
        status: systemStatus.isRunning ? 'monitoring' : 'stopped',
        metrics: systemStatus.metrics,
        alerts: systemStatus.alerts.length,
        healthChecks: systemStatus.health.length,
      },
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
      },
      { status: 500 }
    );
  }
}

function calculateHealthScore(
  systemStatus: any,
  cacheStats: any,
  monitorStats: any
): number {
  let score = 100;

  // Deduct points for alerts
  score -= systemStatus.alerts.length * 10;

  // Deduct points for unhealthy health checks
  const unhealthyChecks = systemStatus.health.filter((h: any) => h.status === 'unhealthy').length;
  score -= unhealthyChecks * 15;

  // Deduct points for low cache hit rates
  Object.values(cacheStats).forEach((cache: any) => {
    if (cache.hitRate < 0.5) {
      score -= 10;
    }
  });

  // Deduct points for high memory usage
  Object.values(cacheStats).forEach((cache: any) => {
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
