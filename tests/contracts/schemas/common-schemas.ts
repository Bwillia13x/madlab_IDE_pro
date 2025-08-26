/**
 * Common JSON Schema definitions for API contract testing
 * Reusable schemas for data structures across the MAD LAB Platform
 */

export const commonSchemas = {
  // Base response wrapper
  baseResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      timestamp: { type: 'string', format: 'date-time' },
      requestId: { type: 'string', pattern: '^req-[a-zA-Z0-9-]+$' },
    },
    required: ['success'],
  },

  // Error response
  errorResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', enum: [false] },
      error: { type: 'string' },
      code: { type: 'string', pattern: '^[A-Z_]+$' },
      timestamp: { type: 'string', format: 'date-time' },
      requestId: { type: 'string', pattern: '^req-[a-zA-Z0-9-]+$' },
      details: { type: 'object' },
    },
    required: ['success', 'error', 'code', 'timestamp'],
  },

  // Pagination
  pagination: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 1000 },
      total: { type: 'integer', minimum: 0 },
      totalPages: { type: 'integer', minimum: 0 },
      hasNext: { type: 'boolean' },
      hasPrev: { type: 'boolean' },
    },
    required: ['page', 'limit', 'total', 'totalPages', 'hasNext', 'hasPrev'],
  },

  // Metadata
  metadata: {
    type: 'object',
    properties: {
      requestId: { type: 'string', pattern: '^req-[a-zA-Z0-9-]+$' },
      timestamp: { type: 'string', format: 'date-time' },
      version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
      environment: { type: 'string', enum: ['development', 'staging', 'production'] },
      cache: {
        type: 'object',
        properties: {
          hit: { type: 'boolean' },
          ttl: { type: 'integer', minimum: 0 },
        },
      },
    },
    required: ['requestId', 'timestamp'],
  },

  // User object
  user: {
    type: 'object',
    properties: {
      id: { type: 'string', pattern: '^[a-zA-Z0-9-]+$' },
      email: { type: 'string', format: 'email' },
      role: { type: 'string', enum: ['user', 'admin', 'moderator'] },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
      preferences: { type: 'object' },
    },
    required: ['id', 'email', 'role', 'createdAt'],
  },

  // Token object
  token: {
    type: 'object',
    properties: {
      accessToken: { type: 'string' },
      refreshToken: { type: 'string' },
      expiresAt: { type: 'integer' },
      tokenType: { type: 'string', enum: ['Bearer'] },
    },
    required: ['accessToken', 'refreshToken', 'expiresAt'],
  },

  // Market data
  marketData: {
    type: 'object',
    properties: {
      symbol: { type: 'string', pattern: '^[A-Z]{1,5}$' },
      price: { type: 'number', minimum: 0 },
      change: { type: 'number' },
      changePercent: { type: 'number' },
      volume: { type: 'integer', minimum: 0 },
      marketCap: { type: 'number', minimum: 0 },
      lastUpdated: { type: 'string', format: 'date-time' },
      source: { type: 'string' },
      currency: { type: 'string', pattern: '^[A-Z]{3}$' },
    },
    required: ['symbol', 'price', 'lastUpdated'],
  },

  // Historical data point
  historicalDataPoint: {
    type: 'object',
    properties: {
      timestamp: { type: 'string', format: 'date-time' },
      open: { type: 'number', minimum: 0 },
      high: { type: 'number', minimum: 0 },
      low: { type: 'number', minimum: 0 },
      close: { type: 'number', minimum: 0 },
      volume: { type: 'integer', minimum: 0 },
    },
    required: ['timestamp', 'open', 'high', 'low', 'close', 'volume'],
  },

  // Health status
  healthStatus: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
      timestamp: { type: 'string', format: 'date-time' },
      uptime: { type: 'number', minimum: 0 },
      responseTime: { type: 'number', minimum: 0 },
      checks: {
        type: 'object',
        patternProperties: {
          '^[a-zA-Z_]+$': {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['pass', 'fail', 'warn'] },
              message: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
            required: ['status'],
          },
        },
      },
    },
    required: ['status', 'timestamp'],
  },

  // Monitoring metrics
  monitoringMetrics: {
    type: 'object',
    properties: {
      cpu: { type: 'number', minimum: 0, maximum: 100 },
      memory: {
        type: 'object',
        properties: {
          used: { type: 'number', minimum: 0 },
          total: { type: 'number', minimum: 0 },
          percentage: { type: 'number', minimum: 0, maximum: 100 },
        },
        required: ['used', 'total', 'percentage'],
      },
      disk: {
        type: 'object',
        properties: {
          used: { type: 'number', minimum: 0 },
          total: { type: 'number', minimum: 0 },
          percentage: { type: 'number', minimum: 0, maximum: 100 },
        },
        required: ['used', 'total', 'percentage'],
      },
      network: {
        type: 'object',
        properties: {
          requestsPerSecond: { type: 'number', minimum: 0 },
          errorRate: { type: 'number', minimum: 0, maximum: 100 },
          latency: { type: 'number', minimum: 0 },
        },
      },
      timestamp: { type: 'string', format: 'date-time' },
    },
    required: ['cpu', 'memory', 'timestamp'],
  },

  // Trace span
  traceSpan: {
    type: 'object',
    properties: {
      spanId: { type: 'string' },
      traceId: { type: 'string' },
      parentSpanId: { type: 'string' },
      name: { type: 'string' },
      kind: { type: 'string', enum: ['client', 'server', 'internal', 'producer', 'consumer'] },
      startTime: { type: 'string', format: 'date-time' },
      endTime: { type: 'string', format: 'date-time' },
      duration: { type: 'number', minimum: 0 },
      attributes: { type: 'object' },
      status: {
        type: 'object',
        properties: {
          code: { type: 'string', enum: ['ok', 'error', 'unset'] },
          message: { type: 'string' },
        },
      },
    },
    required: ['spanId', 'traceId', 'name', 'startTime'],
  },

  // News article
  newsArticle: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      title: { type: 'string' },
      content: { type: 'string' },
      summary: { type: 'string' },
      author: { type: 'string' },
      publishedAt: { type: 'string', format: 'date-time' },
      source: { type: 'string' },
      url: { type: 'string', format: 'uri' },
      symbols: {
        type: 'array',
        items: { type: 'string', pattern: '^[A-Z]{1,5}$' },
      },
      sentiment: { type: 'number', minimum: -1, maximum: 1 },
      tags: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    required: ['id', 'title', 'publishedAt', 'source'],
  },

  // AI agent message
  aiMessage: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      role: { type: 'string', enum: ['user', 'assistant', 'system'] },
      content: { type: 'string' },
      timestamp: { type: 'string', format: 'date-time' },
      metadata: { type: 'object' },
    },
    required: ['id', 'role', 'content', 'timestamp'],
  },
};