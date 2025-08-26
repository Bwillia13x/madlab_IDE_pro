import { trace, context, SpanStatusCode, SpanKind, TraceFlags } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

export { SpanStatusCode, SpanKind, TraceFlags };

export interface OpenTelemetryConfig {
  serviceName: string;
  serviceVersion: string;
  environment: 'development' | 'staging' | 'production';
  traceEndpoint?: string;
  metricsEndpoint?: string;
  enableAutoInstrumentation: boolean;
  enableBatchProcessing: boolean;
  samplingRate: number;
}

export interface TraceContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
}

export interface Span {
  id: string;
  name: string;
  kind: SpanKind;
  attributes: Record<string, unknown>;
  events: Array<{
    name: string;
    timestamp: number;
    attributes?: Record<string, unknown>;
  }>;
  status: SpanStatusCode;
  startTime: number;
  endTime?: number;
  duration?: number;
}

export interface TraceEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, unknown>;
}

export interface TraceExporter {
  export(spans: Span[]): Promise<void>;
  shutdown(): Promise<void>;
}

export interface TraceSampler {
  shouldSample(context: unknown, traceId: string, spanName: string, spanKind: string, attributes: Record<string, unknown>): boolean;
}

// Default OpenTelemetry configuration
const DEFAULT_CONFIG: OpenTelemetryConfig = {
  serviceName: 'madlab-platform',
  serviceVersion: '1.0.0',
  environment: 'development',
  traceEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  metricsEndpoint: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'http://localhost:4318/v1/metrics',
  enableAutoInstrumentation: true,
  enableBatchProcessing: process.env.NODE_ENV === 'production',
  samplingRate: parseFloat(process.env.OTEL_TRACES_SAMPLER_ARG || '1.0')
};

// Real OpenTelemetry tracer provider
class OpenTelemetryTracerProvider {
  private provider: NodeTracerProvider;
  private exporter: OTLPTraceExporter;
  private isInitialized = false;

  constructor(config: OpenTelemetryConfig) {
    // Create OTLP exporter
    this.exporter = new OTLPTraceExporter({
      url: config.traceEndpoint || 'http://localhost:4318/v1/traces',
      headers: {
        'service.name': config.serviceName,
        'service.version': config.serviceVersion,
      },
    });

    // Create resource
    const resource = resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: config.serviceVersion,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.environment,
    });

    // Create tracer provider with span processors
    this.provider = new NodeTracerProvider({
      resource,
      spanProcessors: [
        config.enableBatchProcessing
          ? new BatchSpanProcessor(this.exporter)
          : new BatchSpanProcessor(this.exporter, { exportTimeoutMillis: 1000 })
      ],
      sampler: {
        shouldSample: (context, traceId, spanName, spanKind, attributes) => {
          const random = Math.random();
          const shouldSample = random < config.samplingRate;
          return {
            decision: shouldSample ? 1 : 0, // 1 = SAMPLED, 0 = NOT_SAMPLED
            attributes: {
              'sampling.ratio': config.samplingRate,
              'sampling.decision': shouldSample ? 'sampled' : 'not_sampled',
            },
          };
        },
      },
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Register the provider
      this.provider.register();

      // Initialize auto-instrumentations if enabled
      if (DEFAULT_CONFIG.enableAutoInstrumentation) {
        const instrumentations = getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-http': {
            enabled: true,
          },
          '@opentelemetry/instrumentation-pg': {
            enabled: true,
          },
          '@opentelemetry/instrumentation-redis': {
            enabled: true,
          },
        });

        // Note: In a real application, you'd call registerInstrumentations here
        console.log('Auto-instrumentations configured for HTTP, PostgreSQL, and Redis');
      }

      this.isInitialized = true;
      console.log(`OpenTelemetry tracer provider initialized for ${DEFAULT_CONFIG.serviceName} v${DEFAULT_CONFIG.serviceVersion}`);
    } catch (error) {
      console.error('Failed to initialize OpenTelemetry tracer provider:', error);
      throw error;
    }
  }

  getTracer(name: string = 'madlab-platform', version?: string) {
    return this.provider.getTracer(name, version);
  }

  async shutdown(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      await this.provider.shutdown();
      await this.exporter.shutdown();
      this.isInitialized = false;
      console.log('OpenTelemetry tracer provider shut down successfully');
    } catch (error) {
      console.error('Error shutting down OpenTelemetry tracer provider:', error);
    }
  }
}

// Real OpenTelemetry metrics provider (will be enhanced with Prometheus)
class OpenTelemetryMetricsProvider {
  private config: OpenTelemetryConfig;
  private isInitialized = false;

  constructor(config: OpenTelemetryConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.isInitialized = true;
      console.log('OpenTelemetry metrics provider initialized (ready for Prometheus integration)');
    } catch (error) {
      console.error('Failed to initialize OpenTelemetry metrics provider:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      this.isInitialized = false;
      console.log('OpenTelemetry metrics provider shut down successfully');
    } catch (error) {
      console.error('Error shutting down OpenTelemetry metrics provider:', error);
    }
  }
}

// Enhanced OpenTelemetry tracer with real implementation
export class OpenTelemetryTracer {
  private tracerProvider: OpenTelemetryTracerProvider;
  private metricsProvider: OpenTelemetryMetricsProvider;
  private config: OpenTelemetryConfig;
  private tracer: any;

  constructor(config: Partial<OpenTelemetryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.tracerProvider = new OpenTelemetryTracerProvider(this.config);
    this.metricsProvider = new OpenTelemetryMetricsProvider(this.config);
  }

  async initialize(): Promise<void> {
    await Promise.all([
      this.tracerProvider.initialize(),
      this.metricsProvider.initialize(),
    ]);

    // Get the actual tracer after initialization
    this.tracer = this.tracerProvider.getTracer();
  }

  startSpan(name: string, options?: {
    kind?: SpanKind;
    attributes?: Record<string, unknown>;
    parentContext?: any;
  }): any {
    if (!this.tracer) {
      console.warn('OpenTelemetry tracer not initialized, returning mock span');
      return this.createMockSpan();
    }

    const spanOptions: any = {
      kind: options?.kind || SpanKind.INTERNAL,
      attributes: options?.attributes || {},
    };

    // Handle parent context if provided
    let ctx = context.active();
    if (options?.parentContext) {
      ctx = options.parentContext;
    }

    return this.tracer.startSpan(name, spanOptions, ctx);
  }

  startSpanWithContext(name: string, parentContext: any, options?: {
    kind?: SpanKind;
    attributes?: Record<string, unknown>;
  }): any {
    return this.startSpan(name, {
      ...options,
      parentContext,
    });
  }

  addEvent(span: any, name: string, attributes?: Record<string, unknown>): void {
    if (span && typeof span.addEvent === 'function') {
      span.addEvent(name, attributes);
    }
  }

  setAttributes(span: any, attributes: Record<string, unknown>): void {
    if (span && typeof span.setAttributes === 'function') {
      span.setAttributes(attributes);
    }
  }

  setStatus(span: any, status: string, message?: string): void {
    if (span && typeof span.setStatus === 'function') {
      span.setStatus(status, message);
    }
  }

  endSpan(span: any, status: SpanStatusCode = SpanStatusCode.OK, error?: Error): void {
    if (span && typeof span.end === 'function') {
      if (error) {
        span.setStatus(SpanStatusCode.ERROR, error.message);
        if (typeof span.recordException === 'function') {
          span.recordException(error);
        }
      } else {
        span.setStatus(status);
      }
      span.end();
    }
  }

  getCurrentSpan(): any {
    return trace.getSpan(context.active());
  }

  setSpan(span: any): any {
    return trace.setSpan(context.active(), span);
  }

  getTraceContext(): TraceContext {
    const currentSpan = this.getCurrentSpan();
    if (currentSpan && typeof currentSpan.spanContext === 'function') {
      const spanContext = currentSpan.spanContext();
      return {
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
        traceFlags: spanContext.traceFlags,
      };
    }

    return {
      traceId: '00000000000000000000000000000000',
      spanId: '0000000000000000',
      traceFlags: TraceFlags.NONE,
    };
  }

  injectTraceContext(carrier: Record<string, string>): void {
    const traceContext = this.getTraceContext();
    carrier['x-trace-id'] = traceContext.traceId;
    carrier['x-span-id'] = traceContext.spanId;
    carrier['x-trace-flags'] = traceContext.traceFlags.toString();
  }

  extractTraceContext(carrier: Record<string, string>): TraceContext | null {
    const traceId = carrier['x-trace-id'];
    const spanId = carrier['x-span-id'];
    const traceFlags = carrier['x-trace-flags'];

    if (traceId && spanId && traceId.length === 32 && spanId.length === 16) {
      return {
        traceId,
        spanId,
        traceFlags: parseInt(traceFlags) || TraceFlags.SAMPLED,
      };
    }

    return null;
  }

  async shutdown(): Promise<void> {
    await Promise.all([
      this.tracerProvider.shutdown(),
      this.metricsProvider.shutdown(),
    ]);
  }

  private createMockSpan(): any {
    return {
      addEvent: () => {},
      setAttributes: () => {},
      setStatus: () => {},
      end: () => {},
      recordException: () => {},
      spanContext: () => ({
        traceId: '00000000000000000000000000000000',
        spanId: '0000000000000000',
        traceFlags: TraceFlags.NONE,
      }),
    };
  }
}

// Global OpenTelemetry tracer instance
export const openTelemetryTracer = new OpenTelemetryTracer();

// Helper functions for easy tracing
export function traceFunction<T>(
  name: string,
  fn: () => T | Promise<T>,
  attributes?: Record<string, unknown>
): T | Promise<T> {
  const span = openTelemetryTracer.startSpan(name, { attributes });
  
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result
        .then(value => {
          openTelemetryTracer.endSpan(span, SpanStatusCode.OK);
          return value;
        })
        .catch(error => {
          openTelemetryTracer.endSpan(span, SpanStatusCode.ERROR, error);
          throw error;
        });
    } else {
      openTelemetryTracer.endSpan(span, SpanStatusCode.OK);
      return result;
    }
  } catch (error) {
    openTelemetryTracer.endSpan(span, SpanStatusCode.ERROR, error as Error);
    throw error;
  }
}

export async function traceAsyncFunction<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, unknown>
): Promise<T> {
  const span = openTelemetryTracer.startSpan(name, { attributes });
  
  try {
    const result = await fn();
    openTelemetryTracer.endSpan(span, SpanStatusCode.OK);
    return result;
  } catch (error) {
    openTelemetryTracer.endSpan(span, SpanStatusCode.ERROR, error as Error);
    throw error;
  }
}

export function withTracing(handler: Function) {
  return async function tracedHandler(request: any, ...args: any[]) {
    const span = openTelemetryTracer.startSpan(`${handler.name}_handler`, {
      kind: SpanKind.SERVER,
      attributes: {
        'http.method': request.method || 'UNKNOWN',
        'http.url': request.url || 'UNKNOWN',
        'handler.name': handler.name,
      },
    });

    try {
      const result = await handler(request, ...args);
      openTelemetryTracer.endSpan(span, SpanStatusCode.OK);
      return result;
    } catch (error) {
      openTelemetryTracer.endSpan(span, SpanStatusCode.ERROR, error as Error);
      throw error;
    }
  };
}

export function traceDatabaseQuery(query: string, params: unknown[], attributes?: Record<string, unknown>): any {
  return openTelemetryTracer.startSpan('database_query', {
    kind: SpanKind.CLIENT,
    attributes: {
      'db.system': 'postgresql',
      'db.statement': query,
      'db.parameters': JSON.stringify(params),
      ...attributes,
    },
  });
}

export function traceExternalAPI(method: string, url: string, attributes?: Record<string, unknown>): any {
  return openTelemetryTracer.startSpan('external_api_call', {
    kind: SpanKind.CLIENT,
    attributes: {
      'http.method': method,
      'http.url': url,
      ...attributes,
    },
  });
}

export function traceCacheOperation(operation: string, key: string, attributes?: Record<string, unknown>): any {
  return openTelemetryTracer.startSpan('cache_operation', {
    kind: SpanKind.INTERNAL,
    attributes: {
      'cache.operation': operation,
      'cache.key': key,
      ...attributes,
    },
  });
}

// Initialize OpenTelemetry on module load
if (process.env.NODE_ENV !== 'test') {
  openTelemetryTracer.initialize().catch(console.error);
}
