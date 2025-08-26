import { NextRequest } from 'next/server';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled: boolean;
}

export interface Span {
  id: string;
  traceId: string;
  parentId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  attributes: Record<string, unknown>;
  events: TraceEvent[];
  status: 'ok' | 'error' | 'unset';
  error?: Error;
}

export interface TraceEvent {
  name: string;
  timestamp: number;
  attributes: Record<string, unknown>;
}

export interface TraceExporter {
  export(spans: Span[]): Promise<void>;
}

export interface TraceSampler {
  shouldSample(context: TraceContext): boolean;
}

// Simple in-memory trace storage (in production, use proper OpenTelemetry exporters)
class InMemoryTraceStorage {
  private traces: Map<string, Span[]> = new Map();
  private maxTraces = 1000; // Limit memory usage
  
  addSpan(span: Span): void {
    if (!this.traces.has(span.traceId)) {
      this.traces.set(span.traceId, []);
    }
    
    const trace = this.traces.get(span.traceId)!;
    trace.push(span);
    
    // Clean up old traces if we exceed the limit
    if (this.traces.size > this.maxTraces) {
      const oldestTraceId = this.traces.keys().next().value;
      this.traces.delete(oldestTraceId);
    }
  }
  
  getTrace(traceId: string): Span[] | undefined {
    return this.traces.get(traceId);
  }
  
  getAllTraces(): Span[][] {
    return Array.from(this.traces.values());
  }
  
  clear(): void {
    this.traces.clear();
  }
}

// Simple trace sampler (always sample in development, configurable in production)
class SimpleTraceSampler implements TraceSampler {
  constructor(private sampleRate: number = 1.0) {}
  
  shouldSample(context: TraceContext): boolean {
    return Math.random() < this.sampleRate;
  }
}

// Console trace exporter for development
class ConsoleTraceExporter implements TraceExporter {
  async export(spans: Span[]): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.group('🔍 Trace Export');
      spans.forEach(span => {
        console.log(`Span: ${span.name} (${span.duration}ms)`);
        if (span.attributes) {
          console.log('Attributes:', span.attributes);
        }
        if (span.error) {
          console.error('Error:', span.error);
        }
      });
      console.groupEnd();
    }
  }
}

// Main tracer class
export class Tracer {
  private storage: InMemoryTraceStorage;
  private sampler: TraceSampler;
  private exporter: TraceExporter;
  private activeSpans: Map<string, Span> = new Map();
  
  constructor(
    sampler: TraceSampler = new SimpleTraceSampler(),
    exporter: TraceExporter = new ConsoleTraceExporter()
  ) {
    this.storage = new InMemoryTraceStorage();
    this.sampler = sampler;
    this.exporter = exporter;
  }
  
  // Start a new span
  startSpan(name: string, attributes: Record<string, unknown> = {}): Span {
    const traceId = this.generateId();
    const spanId = this.generateId();
    const startTime = Date.now();
    
    const span: Span = {
      id: spanId,
      traceId,
      name,
      startTime,
      attributes,
      events: [],
      status: 'unset'
    };
    
    this.activeSpans.set(spanId, span);
    this.storage.addSpan(span);
    
    return span;
  }
  
  // Start a child span
  startChildSpan(parentSpan: Span, name: string, attributes: Record<string, unknown> = {}): Span {
    const spanId = this.generateId();
    const startTime = Date.now();
    
    const span: Span = {
      id: spanId,
      traceId: parentSpan.traceId,
      parentId: parentSpan.id,
      name,
      startTime,
      attributes,
      events: [],
      status: 'unset'
    };
    
    this.activeSpans.set(spanId, span);
    this.storage.addSpan(span);
    
    return span;
  }
  
  // End a span
  endSpan(span: Span, status: 'ok' | 'error' = 'ok', error?: Error): void {
    const endTime = Date.now();
    span.endTime = endTime;
    span.duration = endTime - span.startTime;
    span.status = status;
    
    if (error) {
      span.error = error;
    }
    
    this.activeSpans.delete(span.id);
    
    // Export the completed span
    this.exporter.export([span]);
  }
  
  // Add an event to a span
  addEvent(span: Span, name: string, attributes: Record<string, unknown> = {}): void {
    const event: TraceEvent = {
      name,
      timestamp: Date.now(),
      attributes
    };
    
    span.events.push(event);
  }
  
  // Add attributes to a span
  addAttributes(span: Span, attributes: Record<string, unknown>): void {
    Object.assign(span.attributes, attributes);
  }
  
  // Get current active span
  getActiveSpan(spanId: string): Span | undefined {
    return this.activeSpans.get(spanId);
  }
  
  // Get all spans for a trace
  getTrace(traceId: string): Span[] | undefined {
    return this.storage.getTrace(traceId);
  }
  
  // Get all traces
  getAllTraces(): Span[][] {
    return this.storage.getAllTraces();
  }
  
  // Clear all traces
  clearTraces(): void {
    this.storage.clear();
  }
  
  // Generate unique ID
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

// Global tracer instance
export const globalTracer = new Tracer();

// Utility functions for common tracing patterns
export function traceFunction<T>(
  name: string,
  fn: () => T | Promise<T>,
  attributes: Record<string, unknown> = {}
): T | Promise<T> {
  const span = globalTracer.startSpan(name, attributes);
  
  try {
    const result = fn();
    
    if (result instanceof Promise) {
      return result
        .then(value => {
          globalTracer.endSpan(span, 'ok');
          return value;
        })
        .catch(error => {
          globalTracer.endSpan(span, 'error', error);
          throw error;
        });
    } else {
      globalTracer.endSpan(span, 'ok');
      return result;
    }
  } catch (error) {
    globalTracer.endSpan(span, 'error', error as Error);
    throw error;
  }
}

export function traceAsyncFunction<T>(
  name: string,
  fn: () => Promise<T>,
  attributes: Record<string, unknown> = {}
): Promise<T> {
  const span = globalTracer.startSpan(name, attributes);
  
  return fn()
    .then(value => {
      globalTracer.endSpan(span, 'ok');
      return value;
    })
    .catch(error => {
      globalTracer.endSpan(span, 'error', error);
      throw error;
    });
}

// Middleware for tracing HTTP requests
export function withTracing(handler: Function) {
  return async function(request: NextRequest, ...args: unknown[]) {
    const startTime = Date.now();
    const span = globalTracer.startSpan('http_request', {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.ip
    });
    
    try {
      const result = await handler(request, ...args);
      
      globalTracer.addAttributes(span, {
        statusCode: result?.status || 200,
        responseTime: Date.now() - startTime
      });
      
      globalTracer.endSpan(span, 'ok');
      return result;
    } catch (error) {
      globalTracer.addAttributes(span, {
        statusCode: 500,
        responseTime: Date.now() - startTime
      });
      
      globalTracer.endSpan(span, 'error', error as Error);
      throw error;
    }
  };
}

// Database query tracing
export function traceDatabaseQuery(
  query: string,
  parameters: unknown[] = [],
  attributes: Record<string, unknown> = {}
): Span {
  const span = globalTracer.startSpan('database_query', {
    query,
    parameters: parameters.length,
    ...attributes
  });
  
  return span;
}

// External API call tracing
export function traceExternalAPI(
  method: string,
  url: string,
  attributes: Record<string, unknown> = {}
): Span {
  const span = globalTracer.startSpan('external_api_call', {
    method,
    url,
    ...attributes
  });
  
  return span;
}

// Cache operation tracing
export function traceCacheOperation(
  operation: 'get' | 'set' | 'delete' | 'clear',
  key: string,
  attributes: Record<string, unknown> = {}
): Span {
  const span = globalTracer.startSpan('cache_operation', {
    operation,
    key,
    ...attributes
  });
  
  return span;
}

