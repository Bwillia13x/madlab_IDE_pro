import { metrics, Meter } from '@opentelemetry/api';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

export interface PrometheusConfig {
  port: number;
  endpoint: string;
  serviceName: string;
  serviceVersion: string;
  environment: string;
}

export interface HealthMetrics {
  healthScore: number;
  healthChecksTotal: number;
  healthCheckDuration: number;
  componentStatus: Record<string, number>; // 0 = unhealthy, 1 = degraded, 2 = healthy
  uptime: number;
}

export interface AIMetrics {
  requestsTotal: number;
  requestDuration: number;
  queueLength: number;
  successRate: number;
  errorRate: number;
}

export interface DatabaseMetrics {
  queryDuration: number;
  connectionsActive: number;
  connectionsMax: number;
  querySuccessRate: number;
  queryErrorRate: number;
}

export interface CacheMetrics {
  hitRate: number;
  memoryUsage: number;
  memoryMax: number;
  evictionRate: number;
  missRate: number;
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

// Default Prometheus configuration
const DEFAULT_CONFIG: PrometheusConfig = {
  port: parseInt(process.env.PROMETHEUS_PORT || '9464'),
  endpoint: process.env.PROMETHEUS_ENDPOINT || '/metrics',
  serviceName: process.env.OTEL_SERVICE_NAME || 'madlab-platform',
  serviceVersion: process.env.OTEL_SERVICE_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
};

// Real Prometheus metrics exporter with OpenTelemetry
export class PrometheusMetricsExporter {
  private config: PrometheusConfig;
  private meterProvider: MeterProvider | null = null;
  private meter: Meter | null = null;
  private exporter: PrometheusExporter | null = null;
  private isInitialized = false;

  // Metric instruments
  private healthScoreGauge: any = null;
  private healthCheckDurationHistogram: any = null;
  private aiRequestDurationHistogram: any = null;
  private databaseQueryDurationHistogram: any = null;
  private cacheHitRateGauge: any = null;
  private systemCpuGauge: any = null;
  private systemMemoryGauge: any = null;

  constructor(config: Partial<PrometheusConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create resource
      const resource = resourceFromAttributes({
        [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
      });

      // Create Prometheus exporter
      this.exporter = new PrometheusExporter({
        port: this.config.port,
        endpoint: this.config.endpoint,
        preventServerStart: false,
      });

      // Create meter provider
      this.meterProvider = new MeterProvider({
        resource,
        readers: [this.exporter],
      });

      // Set as global meter provider
      metrics.setGlobalMeterProvider(this.meterProvider);

      // Create meter
      this.meter = this.meterProvider.getMeter('madlab-platform', this.config.serviceVersion);

      // Initialize metric instruments
      this.initializeMetrics();

      this.isInitialized = true;
      console.log(`Prometheus metrics exporter initialized on port ${this.config.port}${this.config.endpoint}`);
    } catch (error) {
      console.error('Failed to initialize Prometheus metrics exporter:', error);
      throw error;
    }
  }

  private initializeMetrics(): void {
    if (!this.meter) return;

    // Health metrics
    this.healthScoreGauge = this.meter.createGauge('madlab_health_score', {
      description: 'Overall system health score (0-100)',
      unit: '1',
    });

    this.healthCheckDurationHistogram = this.meter.createHistogram('madlab_health_check_duration', {
      description: 'Health check duration in milliseconds',
      unit: 'ms',
    });

    // AI metrics
    this.aiRequestDurationHistogram = this.meter.createHistogram('madlab_ai_request_duration', {
      description: 'AI request processing duration in milliseconds',
      unit: 'ms',
    });

    // Database metrics
    this.databaseQueryDurationHistogram = this.meter.createHistogram('madlab_db_query_duration', {
      description: 'Database query duration in milliseconds',
      unit: 'ms',
    });

    // Cache metrics
    this.cacheHitRateGauge = this.meter.createGauge('madlab_cache_hit_rate', {
      description: 'Cache hit rate percentage',
      unit: '%',
    });

    // System metrics
    this.systemCpuGauge = this.meter.createGauge('madlab_system_cpu_usage', {
      description: 'System CPU usage percentage',
      unit: '%',
    });

    this.systemMemoryGauge = this.meter.createGauge('madlab_system_memory_usage', {
      description: 'System memory usage in bytes',
      unit: 'By',
    });
  }

  // Update health metrics
  updateHealthMetrics(metrics: HealthMetrics): void {
    if (!this.isInitialized || !this.healthScoreGauge || !this.healthCheckDurationHistogram) return;

    this.healthScoreGauge.record(metrics.healthScore, {
      component: 'overall',
    });

    this.healthCheckDurationHistogram.record(metrics.healthCheckDuration, {
      component: 'overall',
    });

    // Record component status
    Object.entries(metrics.componentStatus).forEach(([component, status]) => {
      this.healthScoreGauge.record(status, { component });
    });
  }

  // Update AI metrics
  updateAIMetrics(metrics: AIMetrics): void {
    if (!this.isInitialized || !this.aiRequestDurationHistogram) return;

    this.aiRequestDurationHistogram.record(metrics.requestDuration, {
      model: 'overall',
      status: metrics.successRate > 0.8 ? 'success' : 'error',
    });
  }

  // Update database metrics
  updateDatabaseMetrics(metrics: DatabaseMetrics): void {
    if (!this.isInitialized || !this.databaseQueryDurationHistogram) return;

    this.databaseQueryDurationHistogram.record(metrics.queryDuration, {
      database: 'overall',
      type: 'query',
    });
  }

  // Update cache metrics
  updateCacheMetrics(metrics: CacheMetrics): void {
    if (!this.isInitialized || !this.cacheHitRateGauge) return;

    this.cacheHitRateGauge.record(metrics.hitRate, {
      cache: 'overall',
      type: 'hit_rate',
    });
  }

  // Update system metrics
  updateSystemMetrics(metrics: SystemMetrics): void {
    if (!this.isInitialized || !this.systemCpuGauge || !this.systemMemoryGauge) return;

    this.systemCpuGauge.record(metrics.cpuUsage, {
      type: 'cpu',
    });

    this.systemMemoryGauge.record(metrics.memoryUsage, {
      type: 'memory',
    });
  }

  // Get metrics endpoint URL
  getMetricsUrl(): string {
    return `http://localhost:${this.config.port}${this.config.endpoint}`;
  }

  // Get configuration
  getConfig(): PrometheusConfig {
    return { ...this.config };
  }

  // Shutdown the exporter
  async shutdown(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      if (this.meterProvider) {
        await this.meterProvider.shutdown();
      }
      if (this.exporter) {
        await this.exporter.shutdown();
      }
      this.isInitialized = false;
      console.log('Prometheus metrics exporter shut down successfully');
    } catch (error) {
      console.error('Error shutting down Prometheus metrics exporter:', error);
    }
  }
}

// Global Prometheus metrics exporter instance
export const prometheusMetricsExporter = new PrometheusMetricsExporter();

// Helper functions for easy metric updates
export function updateHealthMetrics(metrics: HealthMetrics): void {
  prometheusMetricsExporter.updateHealthMetrics(metrics);
}

export function updateAIMetrics(metrics: AIMetrics): void {
  prometheusMetricsExporter.updateAIMetrics(metrics);
}

export function updateDatabaseMetrics(metrics: DatabaseMetrics): void {
  prometheusMetricsExporter.updateDatabaseMetrics(metrics);
}

export function updateCacheMetrics(metrics: CacheMetrics): void {
  prometheusMetricsExporter.updateCacheMetrics(metrics);
}

export function updateSystemMetrics(metrics: SystemMetrics): void {
  prometheusMetricsExporter.updateSystemMetrics(metrics);
}

// Initialize Prometheus exporter on module load
if (process.env.NODE_ENV !== 'test') {
  prometheusMetricsExporter.initialize().catch(console.error);
}
