import { NextRequest } from 'next/server';

export interface OpenAPISpec {
  openapi: string;
  info: OpenAPIInfo;
  servers: OpenAPIServer[];
  paths: Record<string, OpenAPIPathItem>;
  components: OpenAPIComponents;
  tags: OpenAPITag[];
}

export interface OpenAPIInfo {
  title: string;
  description: string;
  version: string;
  contact: OpenAPIContact;
  license: OpenAPILicense;
}

export interface OpenAPIContact {
  name: string;
  url: string;
  email: string;
}

export interface OpenAPILicense {
  name: string;
  url: string;
}

export interface OpenAPIServer {
  url: string;
  description: string;
}

export interface OpenAPIPathItem {
  get?: OpenAPIOperation;
  post?: OpenAPIOperation;
  put?: OpenAPIOperation;
  delete?: OpenAPIOperation;
  head?: OpenAPIOperation;
}

export interface OpenAPIOperation {
  summary: string;
  description: string;
  tags: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses: Record<string, OpenAPIResponse>;
  security?: OpenAPISecurityRequirement[];
}

export interface OpenAPIParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description: string;
  required: boolean;
  schema: OpenAPISchema;
}

export interface OpenAPIRequestBody {
  description: string;
  required: boolean;
  content: Record<string, OpenAPIContent>;
}

export interface OpenAPIContent {
  schema: OpenAPISchema;
  example?: unknown;
}

export interface OpenAPIResponse {
  description: string;
  content?: Record<string, OpenAPIContent>;
  headers?: Record<string, OpenAPIHeader>;
}

export interface OpenAPIHeader {
  description: string;
  schema: OpenAPISchema;
}

export interface OpenAPISchema {
  // Basic type information
  type?: string;
  format?: string;

  // Array support
  items?: OpenAPISchema;

  // Object support
  properties?: Record<string, OpenAPISchema>;
  required?: string[];
  additionalProperties?: boolean | OpenAPISchema;

  // String constraints
  minLength?: number;
  maxLength?: number;
  pattern?: string;

  // Number constraints
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean | number;
  exclusiveMaximum?: boolean | number;
  multipleOf?: number;

  // Enum support
  enum?: unknown[];

  // Reference support
  $ref?: string;
  allOf?: OpenAPISchema[];
  oneOf?: OpenAPISchema[];
  anyOf?: OpenAPISchema[];
  not?: OpenAPISchema;

  // Documentation
  title?: string;
  description?: string;
  default?: unknown;
  example?: unknown;
  examples?: Record<string, unknown>;

  // Conditional logic
  if?: OpenAPISchema;
  then?: OpenAPISchema;
  else?: OpenAPISchema;

  // Discriminator
  discriminator?: {
    propertyName: string;
    mapping?: Record<string, string>;
  };

  // External documentation
  externalDocs?: {
    description?: string;
    url: string;
  };

  // Deprecated
  deprecated?: boolean;

  // XML serialization
  xml?: {
    name?: string;
    namespace?: string;
    prefix?: string;
    attribute?: boolean;
    wrapped?: boolean;
  };

  // Extensions (OpenAPI allows x- prefixed properties)
  [key: `x-${string}`]: unknown;
}

export interface OpenAPISecurityRequirement {
  [key: string]: string[];
}

export interface OpenAPITag {
  name: string;
  description: string;
}

export interface OpenAPIComponents {
  schemas: Record<string, OpenAPISchema>;
  securitySchemes: Record<string, OpenAPISecurityScheme>;
}

export interface OpenAPISecurityScheme {
  type: string;
  scheme?: string;
  bearerFormat?: string;
  description?: string;
}

// Generate OpenAPI specification for MAD LAB platform
export function generateOpenAPISpec(): OpenAPISpec {
  return {
    openapi: '3.0.3',
    info: {
      title: 'MAD LAB Platform API',
      description: 'Comprehensive API for the MAD LAB financial analysis and trading platform. Provides access to market data, AI-powered insights, portfolio management, and real-time trading capabilities.',
      version: '1.0.0',
      contact: {
        name: 'MAD LAB Development Team',
        url: 'https://github.com/madlab-platform',
        email: 'dev@madlab-platform.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.madlab-platform.com',
        description: 'Production server'
      }
    ],
    paths: {
      '/api/health': {
        get: {
          summary: 'Get system health status',
          description: 'Comprehensive health check endpoint that monitors system status, database connectivity, data providers, caches, and monitoring systems.',
          tags: ['Health'],
          responses: {
            '200': {
              description: 'System health information',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/HealthResponse'
                  } as any
                }
              }
            },
            '500': {
              description: 'Health check failed',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse'
                  } as any
                }
              }
            }
          }
        },
        head: {
          summary: 'Health check endpoint',
          description: 'Simple HEAD request to check if the service is running',
          tags: ['Health'],
          responses: {
            '200': {
              description: 'Service is running'
            }
          }
        }
      },
      '/api/agent': {
        post: {
          summary: 'AI Agent Chat',
          description: 'Streaming endpoint for AI-powered financial analysis and insights. Supports real-time conversation with the AI agent.',
          tags: ['AI Agent'],
          requestBody: {
            description: 'Chat message and context',
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AgentRequest'
                } as any
              }
            }
          },
          responses: {
            '200': {
              description: 'Streaming AI response',
              content: {
                'text/plain': {
                  schema: {
                    type: 'string',
                    description: 'Streaming text response'
                  }
                }
              }
            },
            '400': {
              description: 'Invalid request',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse'
                  } as any
                }
              }
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse'
                  } as any
                }
              }
            }
          },
          security: [
            {
              'bearerAuth': []
            }
          ]
        }
      },
      '/api/auth/login': {
        post: {
          summary: 'User authentication',
          description: 'Authenticate user and receive access token',
          tags: ['Authentication'],
          requestBody: {
            description: 'Login credentials',
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/LoginRequest'
                } as any
              }
            }
          },
          responses: {
            '200': {
              description: 'Authentication successful',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/LoginResponse'
                  } as any
                }
              }
            },
            '401': {
              description: 'Invalid credentials',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse'
                  } as any
                }
              }
            }
          }
        }
      },
      '/api/auth/logout': {
        post: {
          summary: 'User logout',
          description: 'Logout user and invalidate session',
          tags: ['Authentication'],
          responses: {
            '200': {
              description: 'Logout successful',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/LogoutResponse'
                  } as any
                }
              }
            }
          },
          security: [
            {
              'bearerAuth': []
            }
          ]
        }
      },
      '/api/auth/me': {
        get: {
          summary: 'Get current user',
          description: 'Retrieve current authenticated user information',
          tags: ['Authentication'],
          responses: {
            '200': {
              description: 'User information',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/UserResponse'
                  } as any
                }
              }
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse'
                  } as any
                }
              }
            }
          },
          security: [
            {
              'bearerAuth': []
            }
          ]
        }
      },
      '/api/historical': {
        get: {
          summary: 'Get historical market data',
          description: 'Retrieve historical price and volume data for financial instruments',
          tags: ['Market Data'],
          parameters: [
            {
              name: 'symbol',
              in: 'query',
              description: 'Financial instrument symbol (e.g., AAPL, TSLA)',
              required: true,
              schema: {
                type: 'string',
                example: 'AAPL'
              }
            },
            {
              name: 'interval',
              in: 'query',
              description: 'Data interval (1m, 5m, 15m, 1h, 1d)',
              required: false,
              schema: {
                type: 'string',
                enum: ['1m', '5m', '15m', '1h', '1d'] as any,
                default: '1d'
              } as any
            },
            {
              name: 'start',
              in: 'query',
              description: 'Start date (ISO 8601 format)',
              required: false,
              schema: {
                type: 'string',
                format: 'date-time',
                example: '2024-01-01T00:00:00Z'
              }
            },
            {
              name: 'end',
              in: 'query',
              description: 'End date (ISO 8601 format)',
              required: false,
              schema: {
                type: 'string',
                format: 'date-time',
                example: '2024-12-31T23:59:59Z'
              }
            }
          ],
          responses: {
            '200': {
              description: 'Historical market data',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/HistoricalDataResponse'
                  } as any
                }
              }
            },
            '400': {
              description: 'Invalid parameters',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse'
                  } as any
                }
              }
            }
          }
        }
      },
      '/api/news': {
        get: {
          summary: 'Get financial news',
          description: 'Retrieve latest financial news and market updates',
          tags: ['News'],
          parameters: [
            {
              name: 'category',
              in: 'query',
              description: 'News category filter',
              required: false,
              schema: {
                type: 'string',
                enum: ['general', 'earnings', 'ipo', 'mergers', 'regulation'] as any,
                default: 'general'
              } as any
            },
            {
              name: 'limit',
              in: 'query',
              description: 'Maximum number of news items to return',
              required: false,
              schema: {
                type: 'integer',
                minimum: 1,
                maximum: 100,
                default: 20
              }
            }
          ],
          responses: {
            '200': {
              description: 'Financial news',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/NewsResponse'
                  } as any
                }
              }
            }
          }
        }
      }
    },
    components: {
      schemas: {
        HealthResponse: {
          type: 'object',
          description: 'Comprehensive system health status',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'degraded', 'unhealthy'] as any,
              description: 'Overall system health status'
            } as any,
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Health check timestamp'
            },
            uptime: {
              type: 'number',
              description: 'System uptime in milliseconds'
            },
            healthScore: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              description: 'Overall health score (0-100)'
            } as any,
            checks: {
              $ref: '#/components/schemas/HealthChecks'
            } as any,
            summary: {
              $ref: '#/components/schemas/HealthSummary'
            } as any
          },
          required: ['status', 'timestamp', 'uptime', 'healthScore', 'checks', 'summary']
        },
        HealthChecks: {
          type: 'object',
          description: 'Detailed health check results',
          properties: {
            system: {
              $ref: '#/components/schemas/SystemHealthCheck'
            } as any,
            database: {
              $ref: '#/components/schemas/DatabaseHealthCheck'
            } as any,
            providers: {
              $ref: '#/components/schemas/ProviderHealthCheck'
            } as any,
            caches: {
              $ref: '#/components/schemas/CacheHealthCheck'
            } as any,
            monitoring: {
              $ref: '#/components/schemas/MonitoringHealthCheck'
            } as any
          }
        },
        SystemHealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'degraded', 'unhealthy'] as any
            },
            uptime: {
              type: 'number'
            },
            alerts: {
              type: 'number'
            },
            healthChecks: {
              type: 'number'
            },
            responseTime: {
              type: 'number'
            }
          }
        },
        DatabaseHealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'degraded', 'unhealthy'] as any
            },
            postgres: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['healthy', 'degraded', 'unhealthy'] as any
                },
                responseTime: {
                  type: 'number'
                },
                error: {
                  type: 'string'
                }
              }
            },
            redis: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['healthy', 'degraded', 'unhealthy'] as any
                },
                responseTime: {
                  type: 'number'
                },
                error: {
                  type: 'string'
                }
              }
            }
          }
        },
        ProviderHealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'degraded', 'unhealthy'] as any
            },
            total: {
              type: 'number'
            },
            healthy: {
              type: 'number'
            },
            degraded: {
              type: 'number'
            },
            unhealthy: {
              type: 'number'
            },
            current: {
              type: 'string'
            }
          }
        },
        CacheHealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'degraded', 'unhealthy'] as any
            },
            globalData: {
              $ref: '#/components/schemas/CacheStats'
            },
            price: {
              $ref: '#/components/schemas/CacheStats'
            },
            financial: {
              $ref: '#/components/schemas/CacheStats'
            },
            kpi: {
              $ref: '#/components/schemas/CacheStats'
            }
          }
        },
        CacheStats: {
          type: 'object',
          properties: {
            hitRate: {
              type: 'number',
              minimum: 0,
              maximum: 1
            },
            size: {
              type: 'number'
            },
            memoryUsage: {
              type: 'number'
            }
          }
        },
        MonitoringHealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'degraded', 'unhealthy'] as any
            },
            totalAlerts: {
              type: 'number'
            },
            activeAlerts: {
              type: 'number'
            },
            resolvedAlerts: {
              type: 'number'
            }
          }
        },
        HealthSummary: {
          type: 'object',
          properties: {
            totalChecks: {
              type: 'number'
            },
            healthyChecks: {
              type: 'number'
            },
            degradedChecks: {
              type: 'number'
            },
            unhealthyChecks: {
              type: 'number'
            },
            overallStatus: {
              type: 'string',
              enum: ['healthy', 'degraded', 'unhealthy'] as any
            }
          }
        },
        AgentRequest: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'User message to the AI agent'
            },
            context: {
              type: 'object',
              description: 'Additional context for the AI agent'
            },
            model: {
              type: 'string',
              enum: ['gpt-4', 'claude-3', 'auto'] as any,
              description: 'AI model to use for response generation'
            }
          },
          required: ['message']
        },
        LoginRequest: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email'
            },
            password: {
              type: 'string',
              minLength: 8
            }
          },
          required: ['email', 'password']
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean'
            },
            message: {
              type: 'string'
            },
            user: {
              $ref: '#/components/schemas/User'
            }
          }
        },
        LogoutResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean'
            },
            message: {
              type: 'string'
            }
          }
        },
        UserResponse: {
          type: 'object',
          properties: {
            user: {
              $ref: '#/components/schemas/User'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string'
            },
            email: {
              type: 'string',
              format: 'email'
            },
            name: {
              type: 'string'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin', 'premium'] as any
            }
          }
        },
        HistoricalDataResponse: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string'
            },
            interval: {
              type: 'string'
            },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  timestamp: {
                    type: 'string',
                    format: 'date-time'
                  },
                  open: {
                    type: 'number'
                  },
                  high: {
                    type: 'number'
                  },
                  low: {
                    type: 'number'
                  },
                  close: {
                    type: 'number'
                  },
                  volume: {
                    type: 'number'
                  }
                }
              }
            }
          }
        },
        NewsResponse: {
          type: 'object',
          properties: {
            news: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string'
                  },
                  title: {
                    type: 'string'
                  },
                  summary: {
                    type: 'string'
                  },
                  url: {
                    type: 'string',
                    format: 'uri'
                  },
                  publishedAt: {
                    type: 'string',
                    format: 'date-time'
                  },
                  category: {
                    type: 'string'
                  }
                }
              }
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            status: {
              type: 'number',
              description: 'HTTP status code'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication'
        }
      }
    },
    tags: [
      {
        name: 'Health',
        description: 'System health monitoring endpoints'
      },
      {
        name: 'AI Agent',
        description: 'AI-powered financial analysis and insights'
      },
      {
        name: 'Authentication',
        description: 'User authentication and session management'
      },
      {
        name: 'Market Data',
        description: 'Financial market data and historical information'
      },
      {
        name: 'News',
        description: 'Financial news and market updates'
      }
    ]
  };
}

// Generate OpenAPI specification as JSON string
export function generateOpenAPISpecJSON(): string {
  return JSON.stringify(generateOpenAPISpec(), null, 2);
}

// Generate OpenAPI specification as YAML string (if yaml package is available)
export async function generateOpenAPISpecYAML(): Promise<string> {
  // For now, always return JSON since YAML package is not available
  // In production, you can install the 'yaml' package and uncomment the code below
  console.warn('YAML package not available, returning JSON format');
  return generateOpenAPISpecJSON();
  
  // Uncomment when yaml package is available:
  // try {
  //   const yaml = await import('yaml');
  //   return yaml.stringify(generateOpenAPISpec());
  // } catch (error) {
  //   console.warn('YAML package not available, falling back to JSON');
  //   return generateOpenAPISpecJSON();
  // }
}
