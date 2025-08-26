import { getAllDatabaseHealthChecks, checkDatabaseHealth } from './database';
import { checkAllProvidersHealth } from './providers';
import { productionMonitor } from '@/lib/performance/monitor';
import { globalDataCache, priceCache, financialCache, kpiCache } from '@/lib/data/cache';
import { getAIServiceHealth } from '@/lib/ai/service';
import { recordHealthStatus } from './history';
import { updateMonitoringHealthMetrics, updateMonitoringAIMetrics, updateMonitoringDatabaseMetrics, updateMonitoringCacheMetrics } from '@/lib/monitoring/integration';

export interface ComprehensiveHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  healthScore: number;
  checks: {
    system: SystemHealthCheck;
    database: DatabaseHealthCheck;
    providers: ProviderHealthCheck;
    caches: CacheHealthCheck;
    monitoring: MonitoringHealthCheck;
    aiService: AIServiceHealthCheck;
  };
  summary: HealthSummary;
}

export interface SystemHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  metrics: Record<string, unknown>;
  alerts: number;
  healthChecks: number;
  responseTime: number;
}

export interface DatabaseHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  postgres: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    error?: string;
  };
  redis: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    error?: string;
  };
  responseTime: number;
}

export interface ProviderHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  total: number;
  healthy: number;
  degraded: number;
  unhealthy: number;
  current: string;
  responseTime: number;
}

export interface CacheHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  globalData: CacheStats;
  price: CacheStats;
  financial: CacheStats;
  kpi: CacheStats;
  responseTime: number;
}

export interface MonitoringHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  totalAlerts: number;
  activeAlerts: number;
  resolvedAlerts: number;
  responseTime: number;
}

export interface AIServiceHealthCheck {
   status: 'healthy' | 'degraded' | 'unhealthy';
   models: Record<string, {
     available: boolean;
     responseTime: number;
     errorRate: number;
     queueLength: number;
     rateLimitStatus: {
       remaining: number;
       resetTime: number;
       exceeded: boolean;
     };
   }>;
   queue: {
     pending: number;
     processing: number;
     completed: number;
     failed: number;
   };
   performance: {
     averageResponseTime: number;
     requestsPerSecond: number;
     successRate: number;
     uptime: number;
   };
   responseTime: number;
 }

export interface CacheStats {
  hitRate: number;
  size: number;
  memoryUsage: number;
  maxSize: number;
  maxMemoryUsage: number;
}

export interface HealthSummary {
  totalChecks: number;
  healthyChecks: number;
  degradedChecks: number;
  unhealthyChecks: number;
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
}

// Main health check orchestrator
export async function performComprehensiveHealthCheck(): Promise<ComprehensiveHealthStatus> {
  const startTime = Date.now();
  
  try {
    // Perform all health checks in parallel
    const [
      systemHealth,
      databaseHealth,
      providerHealth,
      cacheHealth,
      monitoringHealth,
      aiServiceHealth
    ] = await Promise.all([
      checkSystemHealth(),
      checkDatabaseHealthInternal(),
      checkProviderHealth(),
      checkCacheHealth(),
      checkMonitoringHealth(),
      checkAIServiceHealth()
    ]);
    
    // Calculate overall health score
    const healthScore = calculateOverallHealthScore({
      system: systemHealth,
      database: databaseHealth,
      providers: providerHealth,
      caches: cacheHealth,
      monitoring: monitoringHealth,
      aiService: aiServiceHealth
    });
    
    // Determine overall status
    const overallStatus = determineOverallStatus({
      system: systemHealth,
      database: databaseHealth,
      providers: providerHealth,
      caches: cacheHealth,
      monitoring: monitoringHealth,
      aiService: aiServiceHealth
    });
    
    // Generate summary
    const summary = generateHealthSummary({
      system: systemHealth,
      database: databaseHealth,
      providers: providerHealth,
      caches: cacheHealth,
      monitoring: monitoringHealth,
      aiService: aiServiceHealth
    });
    
    const healthStatus: ComprehensiveHealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: systemHealth.uptime,
      healthScore,
      checks: {
        system: systemHealth,
        database: databaseHealth,
        providers: providerHealth,
        caches: cacheHealth,
        monitoring: monitoringHealth,
        aiService: aiServiceHealth
      },
      summary
    };
    
    // Record health status in history
    recordHealthStatus(healthStatus);
    
    // Update monitoring metrics
    updateMonitoringHealthMetrics(healthStatus);
    updateMonitoringAIMetrics(healthStatus.checks.aiService);
    updateMonitoringDatabaseMetrics(healthStatus.checks.database);
    updateMonitoringCacheMetrics(healthStatus.checks.caches);
    
    return healthStatus;
  } catch (error) {
    console.error('Comprehensive health check failed:', error);
    
    // Return unhealthy status if health check fails
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: 0,
      healthScore: 0,
      checks: {
        system: { status: 'unhealthy', uptime: 0, metrics: {}, alerts: 0, healthChecks: 0, responseTime: 0 },
        database: { status: 'unhealthy', postgres: { status: 'unhealthy', responseTime: 0 }, redis: { status: 'unhealthy', responseTime: 0 }, responseTime: 0 },
        providers: { status: 'unhealthy', total: 0, healthy: 0, degraded: 0, unhealthy: 0, current: 'unknown', responseTime: 0 },
        caches: { status: 'unhealthy', globalData: { hitRate: 0, size: 0, memoryUsage: 0, maxSize: 0, maxMemoryUsage: 0 }, price: { hitRate: 0, size: 0, memoryUsage: 0, maxSize: 0, maxMemoryUsage: 0 }, financial: { hitRate: 0, size: 0, memoryUsage: 0, maxSize: 0, maxMemoryUsage: 0 }, kpi: { hitRate: 0, size: 0, memoryUsage: 0, maxSize: 0, maxMemoryUsage: 0 }, responseTime: 0 },
        monitoring: { status: 'unhealthy', totalAlerts: 0, activeAlerts: 0, resolvedAlerts: 0, responseTime: 0 },
        aiService: { status: 'unhealthy', models: {}, queue: { pending: 0, processing: 0, completed: 0, failed: 0 }, performance: { averageResponseTime: 0, requestsPerSecond: 0, successRate: 0, uptime: 0 }, responseTime: 0 }
      },
      summary: {
        totalChecks: 0,
        healthyChecks: 0,
        degradedChecks: 0,
        unhealthyChecks: 0,
        overallStatus: 'unhealthy'
      }
    };
  }
}

// Individual health check functions
async function checkSystemHealth(): Promise<SystemHealthCheck> {
  const startTime = Date.now();
  
  try {
    const systemStatus = productionMonitor.getSystemStatus();
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (systemStatus.alerts.length > 0) {
      status = systemStatus.alerts.some(alert => alert.severity === 'high') ? 'unhealthy' : 'degraded';
    }
    
    return {
      status,
      uptime: systemStatus.uptime,
      metrics: (systemStatus.metrics || {}) as Record<string, unknown>,
      alerts: systemStatus.alerts.length,
      healthChecks: systemStatus.health.length,
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      uptime: 0,
      metrics: {},
      alerts: 0,
      healthChecks: 0,
      responseTime: Date.now() - startTime
    };
  }
}

async function checkDatabaseHealthInternal(): Promise<DatabaseHealthCheck> {
  const startTime = Date.now();

  try {
    const dbHealth = await checkDatabaseHealth();

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (dbHealth.postgres.status === 'unhealthy' || dbHealth.redis.status === 'unhealthy') {
      status = 'unhealthy';
    } else if (dbHealth.postgres.status === 'degraded' || dbHealth.redis.status === 'degraded') {
      status = 'degraded';
    }

    return {
      status,
      postgres: {
        status: dbHealth.postgres.status,
        responseTime: dbHealth.postgres.responseTime,
        error: dbHealth.postgres.error
      },
      redis: {
        status: dbHealth.redis.status,
        responseTime: dbHealth.redis.responseTime,
        error: dbHealth.redis.error
      },
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      postgres: { status: 'unhealthy', responseTime: 0, error: 'Check failed' },
      redis: { status: 'unhealthy', responseTime: 0, error: 'Check failed' },
      responseTime: Date.now() - startTime
    };
  }
}

async function checkProviderHealth(): Promise<ProviderHealthCheck> {
  const startTime = Date.now();
  
  try {
    const providerHealth = await checkAllProvidersHealth();
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (providerHealth.unhealthy > 0) {
      status = 'unhealthy';
    } else if (providerHealth.degraded > 0) {
      status = 'degraded';
    }
    
    return {
      status,
      total: providerHealth.total,
      healthy: providerHealth.healthy,
      degraded: providerHealth.degraded,
      unhealthy: providerHealth.unhealthy,
      current: providerHealth.current,
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      total: 0,
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      current: 'unknown',
      responseTime: Date.now() - startTime
    };
  }
}

async function checkCacheHealth(): Promise<CacheHealthCheck> {
  const startTime = Date.now();
  
  try {
    const globalDataStats = globalDataCache.getStats();
    const priceStats = priceCache.getStats();
    const financialStats = financialCache.getStats();
    const kpiStats = kpiCache.getStats();
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    // Check for critical cache issues
    const caches = [globalDataStats, priceStats, financialStats, kpiStats];
    const lowHitRates = caches.filter(cache => cache.hitRate < 0.3).length;
    const highMemoryUsage = caches.filter(cache => (cache.memoryUsage / cache.maxMemoryUsage) > 0.9).length;
    
    if (lowHitRates > 2 || highMemoryUsage > 2) {
      status = 'unhealthy';
    } else if (lowHitRates > 0 || highMemoryUsage > 0) {
      status = 'degraded';
    }
    
    return {
      status,
      globalData: {
        hitRate: globalDataStats.hitRate,
        size: globalDataStats.size,
        memoryUsage: globalDataStats.memoryUsage,
        maxSize: globalDataStats.maxSize,
        maxMemoryUsage: globalDataStats.maxMemoryUsage
      },
      price: {
        hitRate: priceStats.hitRate,
        size: priceStats.size,
        memoryUsage: priceStats.memoryUsage,
        maxSize: priceStats.maxSize,
        maxMemoryUsage: priceStats.maxMemoryUsage
      },
      financial: {
        hitRate: financialStats.hitRate,
        size: financialStats.size,
        memoryUsage: financialStats.memoryUsage,
        maxSize: financialStats.maxSize,
        maxMemoryUsage: financialStats.maxMemoryUsage
      },
      kpi: {
        hitRate: kpiStats.hitRate,
        size: kpiStats.size,
        memoryUsage: kpiStats.memoryUsage,
        maxSize: kpiStats.maxSize,
        maxMemoryUsage: kpiStats.maxMemoryUsage
      },
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      globalData: { hitRate: 0, size: 0, memoryUsage: 0, maxSize: 0, maxMemoryUsage: 0 },
      price: { hitRate: 0, size: 0, memoryUsage: 0, maxSize: 0, maxMemoryUsage: 0 },
      financial: { hitRate: 0, size: 0, memoryUsage: 0, maxSize: 0, maxMemoryUsage: 0 },
      kpi: { hitRate: 0, size: 0, memoryUsage: 0, maxSize: 0, maxMemoryUsage: 0 },
      responseTime: Date.now() - startTime
    };
  }
}

async function checkMonitoringHealth(): Promise<MonitoringHealthCheck> {
  const startTime = Date.now();
  
  try {
    const monitorStats = productionMonitor.getStats();
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (monitorStats.activeAlerts > 5) {
      status = 'unhealthy';
    } else if (monitorStats.activeAlerts > 2) {
      status = 'degraded';
    }
    
    return {
      status,
      totalAlerts: monitorStats.totalAlerts,
      activeAlerts: monitorStats.activeAlerts,
      resolvedAlerts: monitorStats.resolvedAlerts,
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      totalAlerts: 0,
      activeAlerts: 0,
      resolvedAlerts: 0,
      responseTime: Date.now() - startTime
    };
  }
}

async function checkAIServiceHealth(): Promise<AIServiceHealthCheck> {
   const startTime = Date.now();

   try {
     const aiHealth = await getAIServiceHealth();

     const status: 'healthy' | 'degraded' | 'unhealthy' = aiHealth.status;

     return {
       status,
       models: aiHealth.models,
       queue: aiHealth.queue,
       performance: aiHealth.performance,
       responseTime: Date.now() - startTime
     };
   } catch (error) {
     return {
       status: 'unhealthy',
       models: {},
       queue: { pending: 0, processing: 0, completed: 0, failed: 0 },
       performance: { averageResponseTime: 0, requestsPerSecond: 0, successRate: 0, uptime: 0 },
       responseTime: Date.now() - startTime
     };
   }
 }

// Helper functions
function calculateOverallHealthScore(checks: {
  system: SystemHealthCheck;
  database: DatabaseHealthCheck;
  providers: ProviderHealthCheck;
  caches: CacheHealthCheck;
  monitoring: MonitoringHealthCheck;
  aiService: AIServiceHealthCheck;
}): number {
  let score = 100;
  
  // Deduct points for unhealthy checks
  if (checks.system.status === 'unhealthy') score -= 20;
  if (checks.database.status === 'unhealthy') score -= 20;
  if (checks.providers.status === 'unhealthy') score -= 15;
  if (checks.caches.status === 'unhealthy') score -= 15;
  if (checks.monitoring.status === 'unhealthy') score -= 15;
  if (checks.aiService.status === 'unhealthy') score -= 15;
  
  // Deduct points for degraded checks
  if (checks.system.status === 'degraded') score -= 8;
  if (checks.database.status === 'degraded') score -= 8;
  if (checks.providers.status === 'degraded') score -= 6;
  if (checks.caches.status === 'degraded') score -= 5;
  if (checks.monitoring.status === 'degraded') score -= 5;
  if (checks.aiService.status === 'degraded') score -= 6;
  
  return Math.max(0, score);
}

function determineOverallStatus(checks: {
  system: SystemHealthCheck;
  database: DatabaseHealthCheck;
  providers: ProviderHealthCheck;
  caches: CacheHealthCheck;
  monitoring: MonitoringHealthCheck;
  aiService: AIServiceHealthCheck;
}): 'healthy' | 'degraded' | 'unhealthy' {
  const unhealthyCount = [
    checks.system.status,
    checks.database.status,
    checks.providers.status,
    checks.caches.status,
    checks.monitoring.status,
    checks.aiService.status
  ].filter(status => status === 'unhealthy').length;
  
  const degradedCount = [
    checks.system.status,
    checks.database.status,
    checks.providers.status,
    checks.caches.status,
    checks.monitoring.status,
    checks.aiService.status
  ].filter(status => status === 'degraded').length;
  
  if (unhealthyCount > 0) return 'unhealthy';
  if (degradedCount > 0) return 'degraded';
  return 'healthy';
}

function generateHealthSummary(checks: {
  system: SystemHealthCheck;
  database: DatabaseHealthCheck;
  providers: ProviderHealthCheck;
  caches: CacheHealthCheck;
  monitoring: MonitoringHealthCheck;
  aiService: AIServiceHealthCheck;
}): HealthSummary {
  const allChecks = [
    checks.system.status,
    checks.database.status,
    checks.providers.status,
    checks.caches.status,
    checks.monitoring.status,
    checks.aiService.status
  ];
  
  const healthyChecks = allChecks.filter(status => status === 'healthy').length;
  const degradedChecks = allChecks.filter(status => status === 'degraded').length;
  const unhealthyChecks = allChecks.filter(status => status === 'unhealthy').length;
  
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (unhealthyChecks > 0) overallStatus = 'unhealthy';
  else if (degradedChecks > 0) overallStatus = 'degraded';
  
  return {
    totalChecks: allChecks.length,
    healthyChecks,
    degradedChecks,
    unhealthyChecks,
    overallStatus
  };
}
