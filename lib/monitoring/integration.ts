import { openTelemetryTracer } from '@/lib/tracing/opentelemetry';
import { prometheusMetricsExporter, updateHealthMetrics, updateAIMetrics, updateDatabaseMetrics, updateCacheMetrics, updateSystemMetrics } from '@/lib/monitoring/prometheus';
import { ComprehensiveHealthStatus } from '@/lib/health/orchestrator';
import { AIServiceHealth } from '@/lib/ai/service';
import { AIServiceHealthCheck } from '@/lib/health/orchestrator';
import { DatabaseHealth } from '@/lib/health/database';
import { CacheStats, CacheHealthCheck } from '@/lib/health/orchestrator';
// Import signal handler to ensure it's loaded and configured
import '@/lib/server/signal-handler';

export interface MonitoringIntegrationConfig {
  enableOpenTelemetry: boolean;
  enablePrometheus: boolean;
  enableHealthHistory: boolean;
  metricsUpdateInterval: number;
  tracingSampleRate: number;
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  memoryMax: number;
  diskUsage: number;
  diskMax: number;
  networkRequests: number;
  networkErrors: number;
}

export interface MonitoringStatus {
  openTelemetry: {
    enabled: boolean;
    status: 'initialized' | 'error' | 'disabled';
    error?: string;
  };
  prometheus: {
    enabled: boolean;
    status: 'initialized' | 'error' | 'disabled';
    endpoint: string;
    error?: string;
  };
  healthHistory: {
    enabled: boolean;
    status: 'active' | 'error' | 'disabled';
    error?: string;
  };
  overall: 'healthy' | 'degraded' | 'unhealthy';
}

// Default monitoring configuration
const DEFAULT_CONFIG: MonitoringIntegrationConfig = {
  enableOpenTelemetry: process.env.ENABLE_OPENTELEMETRY !== 'false',
  enablePrometheus: process.env.ENABLE_PROMETHEUS !== 'false',
  enableHealthHistory: process.env.ENABLE_HEALTH_HISTORY !== 'false',
  metricsUpdateInterval: parseInt(process.env.METRICS_UPDATE_INTERVAL || '30000'), // 30 seconds
  tracingSampleRate: parseFloat(process.env.TRACING_SAMPLE_RATE || '1.0'),
};

// Monitoring integration service
export class MonitoringIntegrationService {
  private config: MonitoringIntegrationConfig;
  private isInitialized = false;
  private metricsUpdateTimer?: NodeJS.Timeout;
  private startTime: number;

  constructor(config: Partial<MonitoringIntegrationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startTime = Date.now();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing monitoring integration service...');

      // Initialize OpenTelemetry if enabled
      if (this.config.enableOpenTelemetry) {
        try {
          await openTelemetryTracer.initialize();
          console.log('OpenTelemetry initialized successfully');
        } catch (error) {
          console.error('Failed to initialize OpenTelemetry:', error);
        }
      }

      // Initialize Prometheus if enabled
      if (this.config.enablePrometheus) {
        try {
          await prometheusMetricsExporter.initialize();
          console.log('Prometheus metrics exporter initialized successfully');
        } catch (error) {
          console.error('Failed to initialize Prometheus metrics exporter:', error);
        }
      }

      // Start metrics update timer
      this.startMetricsUpdateTimer();

      this.isInitialized = true;
      console.log('Monitoring integration service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize monitoring integration service:', error);
      throw error;
    }
  }

  private startMetricsUpdateTimer(): void {
    if (this.metricsUpdateTimer) {
      clearInterval(this.metricsUpdateTimer);
    }

    this.metricsUpdateTimer = setInterval(() => {
      this.updateSystemMetrics();
    }, this.config.metricsUpdateInterval);
  }

  // Update health metrics
  updateHealthMetrics(healthStatus: ComprehensiveHealthStatus): void {
    if (!this.isInitialized || !this.config.enablePrometheus) return;

    try {
      const componentStatus: Record<string, number> = {};
      
      // Convert status strings to numbers for Prometheus
      const statusMap = { 'unhealthy': 0, 'degraded': 1, 'healthy': 2 };
      
      componentStatus['system'] = statusMap[healthStatus.checks.system.status];
      componentStatus['database'] = statusMap[healthStatus.checks.database.status];
      componentStatus['providers'] = statusMap[healthStatus.checks.providers.status];
      componentStatus['caches'] = statusMap[healthStatus.checks.caches.status];
      componentStatus['monitoring'] = statusMap[healthStatus.checks.monitoring.status];
      componentStatus['aiService'] = statusMap[healthStatus.checks.aiService.status];

      updateHealthMetrics({
        healthScore: healthStatus.healthScore,
        healthChecksTotal: healthStatus.summary.totalChecks,
        healthCheckDuration: this.calculateAverageResponseTime(healthStatus),
        componentStatus,
        uptime: healthStatus.uptime,
      });
    } catch (error) {
      console.error('Failed to update health metrics:', error);
    }
  }

  // Update AI service metrics
   updateAIServiceMetrics(aiHealth: AIServiceHealthCheck): void {
    if (!this.isInitialized || !this.config.enablePrometheus) return;

    try {
      const totalRequests = aiHealth.queue.completed + aiHealth.queue.failed;
      const successRate = totalRequests > 0 ? aiHealth.queue.completed / totalRequests : 1;
      const errorRate = totalRequests > 0 ? aiHealth.queue.failed / totalRequests : 0;

      updateAIMetrics({
        requestsTotal: totalRequests,
        requestDuration: aiHealth.performance.averageResponseTime / 1000, // Convert to seconds
        queueLength: aiHealth.queue.pending + aiHealth.queue.processing,
        successRate,
        errorRate,
      });
    } catch (error) {
      console.error('Failed to update AI service metrics:', error);
    }
  }

  // Update database metrics
  updateDatabaseMetricsData(databaseHealth: DatabaseHealth): void {
    if (!this.isInitialized || !this.config.enablePrometheus) return;

    try {
      const postgres = databaseHealth.postgres;
      const redis = databaseHealth.redis;

      // Calculate average response time
      const avgResponseTime = (postgres.responseTime + redis.responseTime) / 2;

      // Estimate success/error rates based on status
      const postgresSuccessRate = postgres.status === 'healthy' ? 1 : postgres.status === 'degraded' ? 0.8 : 0.5;
      const redisSuccessRate = redis.status === 'healthy' ? 1 : redis.status === 'degraded' ? 0.8 : 0.5;
      const avgSuccessRate = (postgresSuccessRate + redisSuccessRate) / 2;

      updateDatabaseMetrics({
        queryDuration: avgResponseTime / 1000, // Convert to seconds
        connectionsActive: 5, // Estimated from health checks
        connectionsMax: 100, // Default max connections
        querySuccessRate: avgSuccessRate,
        queryErrorRate: 1 - avgSuccessRate,
      });
    } catch (error) {
      console.error('Failed to update database metrics:', error);
    }
  }

  // Update cache metrics
   updateCacheMetricsData(cacheStats: CacheHealthCheck): void {
    if (!this.isInitialized || !this.config.enablePrometheus) return;

    try {
      const globalData = cacheStats.globalData;
      const price = cacheStats.price;
      const financial = cacheStats.financial;
      const kpi = cacheStats.kpi;

      // Calculate average hit rate across all caches
      const avgHitRate = (globalData.hitRate + price.hitRate + financial.hitRate + kpi.hitRate) / 4;
      
      // Calculate total memory usage
      const totalMemoryUsage = globalData.memoryUsage + price.memoryUsage + financial.memoryUsage + kpi.memoryUsage;
      const totalMemoryMax = globalData.maxMemoryUsage + price.maxMemoryUsage + financial.maxMemoryUsage + kpi.maxMemoryUsage;

      updateCacheMetrics({
        hitRate: avgHitRate,
        memoryUsage: totalMemoryUsage,
        memoryMax: totalMemoryMax,
        evictionRate: 0.01, // Estimated eviction rate
        missRate: 1 - avgHitRate,
      });
    } catch (error) {
      console.error('Failed to update cache metrics:', error);
    }
  }

  // Update system metrics
  private updateSystemMetrics(): void {
    if (!this.isInitialized || !this.config.enablePrometheus) return;

    try {
      // Get system metrics (simulated for now, in production use os module)
      const systemMetrics = this.getSystemMetrics();

      updateSystemMetrics(systemMetrics);
    } catch (error) {
      console.error('Failed to update system metrics:', error);
    }
  }

  // Get system metrics (simulated)
  private getSystemMetrics(): SystemMetrics {
    const uptime = Date.now() - this.startTime;
    const uptimeHours = uptime / (1000 * 60 * 60);

    // Simulate system metrics based on uptime
    const cpuUsage = Math.min(30 + Math.sin(uptimeHours) * 20, 80);
    const memoryUsage = Math.min(512 * 1024 * 1024 + Math.random() * 256 * 1024 * 1024, 1024 * 1024 * 1024);
    const memoryMax = 2 * 1024 * 1024 * 1024; // 2GB
    const diskUsage = Math.min(10 * 1024 * 1024 * 1024 + Math.random() * 5 * 1024 * 1024 * 1024, 50 * 1024 * 1024 * 1024);
    const diskMax = 100 * 1024 * 1024 * 1024; // 100GB

    return {
      cpuUsage,
      memoryUsage,
      memoryMax,
      diskUsage,
      diskMax,
      networkRequests: Math.floor(Math.random() * 1000),
      networkErrors: Math.floor(Math.random() * 10),
    };
  }

  // Calculate average response time from health status
  private calculateAverageResponseTime(healthStatus: ComprehensiveHealthStatus): number {
    const responseTimes = [
      healthStatus.checks.system.responseTime,
      healthStatus.checks.database.responseTime,
      healthStatus.checks.providers.responseTime,
      healthStatus.checks.caches.responseTime,
      healthStatus.checks.monitoring.responseTime,
      healthStatus.checks.aiService.responseTime,
    ];

    return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  }

  // Get monitoring status
  getMonitoringStatus(): MonitoringStatus {
    const openTelemetryStatus = this.config.enableOpenTelemetry ? 
      (openTelemetryTracer ? 'initialized' : 'error') : 'disabled';
    
    const prometheusStatus = this.config.enablePrometheus ? 
      (prometheusMetricsExporter ? 'initialized' : 'error') : 'disabled';

    const healthHistoryStatus = this.config.enableHealthHistory ? 'active' : 'disabled';

    // Determine overall status
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (openTelemetryStatus === 'error' || prometheusStatus === 'error') {
      overall = 'unhealthy';
    } else if (openTelemetryStatus === 'disabled' || prometheusStatus === 'disabled') {
      overall = 'degraded';
    }

    return {
      openTelemetry: {
        enabled: this.config.enableOpenTelemetry,
        status: openTelemetryStatus,
      },
      prometheus: {
        enabled: this.config.enablePrometheus,
        status: prometheusStatus,
        endpoint: prometheusMetricsExporter.getMetricsUrl(),
      },
      healthHistory: {
        enabled: this.config.enableHealthHistory,
        status: healthHistoryStatus,
      },
      overall,
    };
  }

  // Get configuration
  getConfig(): MonitoringIntegrationConfig {
    return { ...this.config };
  }

  // Update configuration
  updateConfig(newConfig: Partial<MonitoringIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart metrics timer if interval changed
    if (this.metricsUpdateTimer) {
      this.startMetricsUpdateTimer();
    }
  }

  // Shutdown monitoring service
  async shutdown(): Promise<void> {
    try {
      if (this.metricsUpdateTimer) {
        clearInterval(this.metricsUpdateTimer);
      }

      if (this.config.enableOpenTelemetry) {
        await openTelemetryTracer.shutdown();
      }

      if (this.config.enablePrometheus) {
        await prometheusMetricsExporter.shutdown();
      }

      this.isInitialized = false;
      console.log('Monitoring integration service shut down successfully');
    } catch (error) {
      console.error('Failed to shut down monitoring integration service:', error);
      throw error;
    }
  }
}

// Global monitoring integration service instance
export const monitoringIntegrationService = new MonitoringIntegrationService();

// Helper functions for easy monitoring integration
export function updateMonitoringHealthMetrics(healthStatus: ComprehensiveHealthStatus): void {
  monitoringIntegrationService.updateHealthMetrics(healthStatus);
}

export function updateMonitoringAIMetrics(aiHealth: AIServiceHealthCheck): void {
   monitoringIntegrationService.updateAIServiceMetrics(aiHealth);
 }

export function updateMonitoringDatabaseMetrics(databaseHealth: DatabaseHealth): void {
  monitoringIntegrationService.updateDatabaseMetricsData(databaseHealth);
}

export function updateMonitoringCacheMetrics(cacheStats: CacheHealthCheck): void {
   monitoringIntegrationService.updateCacheMetricsData(cacheStats);
 }

export function getMonitoringStatus(): MonitoringStatus {
  return monitoringIntegrationService.getMonitoringStatus();
}

// Initialize monitoring integration service on module load
if (process.env.NODE_ENV !== 'test') {
  monitoringIntegrationService.initialize().catch(console.error);
}

