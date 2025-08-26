/**
 * Combined API Contract Tests
 * Tests contracts for documentation, tracing, and news endpoints
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { ContractTestHelper, HTTP_STATUS, ERROR_CODES } from './utils/contract-test-utils';
import { commonSchemas } from './schemas/common-schemas';

describe('Combined API Contracts', () => {
  let contractHelper: ContractTestHelper;
  let mockFetch: any;

  beforeAll(async () => {
    contractHelper = new ContractTestHelper({
      consumer: 'MAD LAB Workbench',
      provider: 'MAD LAB Combined Services',
    });
    await contractHelper.setup();
  });

  afterAll(async () => {
    await contractHelper.finalize();
  });

  beforeEach(() => {
    mockFetch = contractHelper.mockFetch();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Documentation API Contracts (/api/docs)', () => {
    describe('GET /api/docs/swagger', () => {
      it('should validate OpenAPI specification response', async () => {
        const swaggerResponse = {
          success: true,
          data: {
            openapi: '3.0.3',
            info: {
              title: 'MAD LAB Platform API',
              version: '1.0.0',
              description: 'API documentation for MAD LAB trading platform',
              contact: {
                name: 'API Support',
                email: 'api@madlab.com',
              },
            },
            servers: [
              {
                url: 'https://api.madlab.com/v1',
                description: 'Production server',
              },
            ],
            paths: {
              '/api/auth/login': {
                post: {
                  summary: 'User login',
                  operationId: 'loginUser',
                  tags: ['Authentication'],
                  requestBody: {
                    required: true,
                    content: {
                      'application/json': {
                        schema: {
                          $ref: '#/components/schemas/LoginRequest',
                        },
                      },
                    },
                  },
                  responses: {
                    '200': {
                      description: 'Successful login',
                      content: {
                        'application/json': {
                          schema: {
                            $ref: '#/components/schemas/LoginResponse',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            components: {
              schemas: {
                LoginRequest: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 },
                  },
                },
                LoginResponse: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    user: { $ref: '#/components/schemas/User' },
                    token: { $ref: '#/components/schemas/Token' },
                  },
                },
              },
            },
          },
          metadata: {
            requestId: 'req-swagger-123',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          },
        };

        // Create Pact interaction
        contractHelper.createInteraction({
          description: 'get OpenAPI specification',
          providerState: 'API documentation is available',
          request: {
            method: 'GET',
            path: '/api/docs/swagger',
            headers: {
              'X-Request-ID': 'req-swagger-123',
            },
          },
          response: {
            status: HTTP_STATUS.OK,
            headers: {
              'Content-Type': 'application/json',
              'X-API-Version': '1.0.0',
            },
            body: swaggerResponse,
          },
        });

        const response = await fetch('/api/docs/swagger', {
          headers: {
            'X-Request-ID': 'req-swagger-123',
          },
        });

        expect(response.status).toBe(HTTP_STATUS.OK);
        const data = await response.json();

        const commonValidation = contractHelper.validateCommonResponse(data, true);
        expect(commonValidation.isValid).toBe(true);

        // Validate OpenAPI structure
        expect(data.data.openapi).toMatch(/^3\.\d+\.\d+$/);
        expect(data.data.info).toBeDefined();
        expect(data.data.info.title).toBe('MAD LAB Platform API');
        expect(data.data.info.version).toMatch(/^\d+\.\d+\.\d+$/);
        expect(data.data.servers).toBeDefined();
        expect(Array.isArray(data.data.servers)).toBe(true);
        expect(data.data.paths).toBeDefined();
        expect(data.data.components).toBeDefined();
        expect(data.data.components.schemas).toBeDefined();
      });
    });

    describe('POST /api/docs/generate', () => {
      it('should validate documentation generation response', async () => {
        const generateRequest = {
          format: 'html',
          version: '1.0.0',
          includeExamples: true,
          includeChangelog: true,
        };

        const generateResponse = {
          success: true,
          data: {
            taskId: 'doc-gen-123',
            status: 'generating',
            format: 'html',
            estimatedCompletion: '2024-01-01T12:10:00Z',
            downloadUrl: null,
          },
          metadata: {
            requestId: 'req-doc-gen-123',
            timestamp: new Date().toISOString(),
          },
        };

        // Create Pact interaction
        contractHelper.createInteraction({
          description: 'generate API documentation',
          providerState: 'documentation generation is available',
          request: {
            method: 'POST',
            path: '/api/docs/generate',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              'X-Request-ID': 'req-doc-gen-123',
            },
            body: generateRequest,
          },
          response: {
            status: HTTP_STATUS.ACCEPTED,
            headers: {
              'Content-Type': 'application/json',
              'X-API-Version': '1.0.0',
              'Location': '/api/docs/generate/doc-gen-123',
            },
            body: generateResponse,
          },
        });

        const response = await fetch('/api/docs/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            'X-Request-ID': 'req-doc-gen-123',
          },
          body: JSON.stringify(generateRequest),
        });

        expect(response.status).toBe(HTTP_STATUS.ACCEPTED);
        expect(response.headers.get('Location')).toBe('/api/docs/generate/doc-gen-123');

        const data = await response.json();

        const commonValidation = contractHelper.validateCommonResponse(data, true);
        expect(commonValidation.isValid).toBe(true);

        expect(data.data.taskId).toMatch(/^doc-gen-[a-zA-Z0-9-]+$/);
        expect(data.data.status).toBe('generating');
        expect(data.data.format).toBe(generateRequest.format);
        expect(data.data.downloadUrl).toBeNull();
        expect(Date.parse(data.data.estimatedCompletion)).toBeTruthy();
      });
    });
  });

  describe('Tracing API Contracts (/api/traces)', () => {
    describe('GET /api/traces', () => {
      it('should validate distributed traces response', async () => {
        const tracesResponse = {
          success: true,
          data: [
            {
              traceId: 'trace-123',
              spanId: 'span-456',
              parentSpanId: null,
              name: 'GET /api/market/AAPL',
              kind: 'server',
              startTime: '2024-01-01T12:00:00Z',
              endTime: '2024-01-01T12:00:05Z',
              duration: 5000,
              attributes: {
                'http.method': 'GET',
                'http.url': '/api/market/AAPL',
                'http.status_code': 200,
                'service.name': 'data-service',
                'service.version': '1.2.3',
              },
              status: {
                code: 'ok',
              },
              children: [
                {
                  traceId: 'trace-123',
                  spanId: 'span-457',
                  parentSpanId: 'span-456',
                  name: 'database.query',
                  kind: 'internal',
                  startTime: '2024-01-01T12:00:01Z',
                  endTime: '2024-01-01T12:00:04Z',
                  duration: 3000,
                  attributes: {
                    'db.statement': 'SELECT * FROM market_data WHERE symbol = ?',
                    'db.system': 'postgresql',
                  },
                  status: {
                    code: 'ok',
                  },
                },
              ],
            },
          ],
          pagination: {
            page: 1,
            limit: 50,
            total: 1250,
            totalPages: 25,
            hasNext: true,
            hasPrev: false,
          },
          metadata: {
            requestId: 'req-traces-123',
            timestamp: new Date().toISOString(),
            service: 'data-service',
          },
        };

        // Create Pact interaction
        contractHelper.createInteraction({
          description: 'get distributed traces',
          providerState: 'tracing data is available',
          request: {
            method: 'GET',
            path: '/api/traces',
            headers: {
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              'X-Request-ID': 'req-traces-123',
            },
            query: {
              service: 'data-service',
              page: '1',
              limit: '50',
            },
          },
          response: {
            status: HTTP_STATUS.OK,
            headers: {
              'Content-Type': 'application/json',
              'X-API-Version': '1.0.0',
            },
            body: tracesResponse,
          },
        });

        const response = await fetch('/api/traces?service=data-service&page=1&limit=50', {
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            'X-Request-ID': 'req-traces-123',
          },
        });

        expect(response.status).toBe(HTTP_STATUS.OK);
        const data = await response.json();

        const commonValidation = contractHelper.validateCommonResponse(data, true);
        expect(commonValidation.isValid).toBe(true);

        // Validate traces structure
        expect(Array.isArray(data.data)).toBe(true);
        expect(data.data.length).toBeGreaterThan(0);

        const trace = data.data[0];
        expect(trace.traceId).toBeDefined();
        expect(trace.spanId).toBeDefined();
        expect(trace.name).toBeDefined();
        expect(trace.kind).toBeOneOf(['client', 'server', 'internal', 'producer', 'consumer']);
        expect(Date.parse(trace.startTime)).toBeTruthy();
        expect(Date.parse(trace.endTime)).toBeTruthy();
        expect(trace.duration).toBeGreaterThanOrEqual(0);
        expect(trace.attributes).toBeDefined();
        expect(trace.status).toBeDefined();
        expect(trace.status.code).toBeOneOf(['ok', 'error', 'unset']);

        // Validate child spans
        if (trace.children) {
          expect(Array.isArray(trace.children)).toBe(true);
          if (trace.children.length > 0) {
            const childSpan = trace.children[0];
            expect(childSpan.parentSpanId).toBe(trace.spanId);
            expect(childSpan.traceId).toBe(trace.traceId);
          }
        }
      });
    });

    describe('GET /api/traces/:traceId', () => {
      it('should validate single trace details response', async () => {
        const singleTraceResponse = {
          success: true,
          data: {
            traceId: 'trace-123',
            rootSpan: {
              spanId: 'span-456',
              name: 'GET /api/market/AAPL',
              kind: 'server',
              startTime: '2024-01-01T12:00:00Z',
              endTime: '2024-01-01T12:00:05Z',
              duration: 5000,
              attributes: {
                'http.method': 'GET',
                'http.url': '/api/market/AAPL',
                'http.status_code': 200,
              },
              status: { code: 'ok' },
            },
            spans: [
              {
                spanId: 'span-456',
                parentSpanId: null,
                name: 'GET /api/market/AAPL',
                kind: 'server',
                startTime: '2024-01-01T12:00:00Z',
                endTime: '2024-01-01T12:00:05Z',
                duration: 5000,
                attributes: {},
                status: { code: 'ok' },
              },
              {
                spanId: 'span-457',
                parentSpanId: 'span-456',
                name: 'database.query',
                kind: 'internal',
                startTime: '2024-01-01T12:00:01Z',
                endTime: '2024-01-01T12:00:04Z',
                duration: 3000,
                attributes: {
                  'db.statement': 'SELECT * FROM market_data WHERE symbol = ?',
                },
                status: { code: 'ok' },
              },
            ],
            services: ['api-gateway', 'data-service', 'database'],
            duration: 5000,
            status: 'completed',
          },
          metadata: {
            requestId: 'req-trace-detail-123',
            timestamp: new Date().toISOString(),
          },
        };

        // Create Pact interaction
        contractHelper.createInteraction({
          description: 'get single trace details',
          providerState: 'trace exists',
          request: {
            method: 'GET',
            path: '/api/traces/trace-123',
            headers: {
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              'X-Request-ID': 'req-trace-detail-123',
            },
          },
          response: {
            status: HTTP_STATUS.OK,
            headers: {
              'Content-Type': 'application/json',
              'X-API-Version': '1.0.0',
            },
            body: singleTraceResponse,
          },
        });

        const response = await fetch('/api/traces/trace-123', {
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            'X-Request-ID': 'req-trace-detail-123',
          },
        });

        expect(response.status).toBe(HTTP_STATUS.OK);
        const data = await response.json();

        const commonValidation = contractHelper.validateCommonResponse(data, true);
        expect(commonValidation.isValid).toBe(true);

        expect(data.data.traceId).toBe('trace-123');
        expect(data.data.rootSpan).toBeDefined();
        expect(data.data.spans).toBeDefined();
        expect(Array.isArray(data.data.spans)).toBe(true);
        expect(data.data.services).toBeDefined();
        expect(Array.isArray(data.data.services)).toBe(true);
        expect(data.data.duration).toBeGreaterThanOrEqual(0);
        expect(data.data.status).toBeOneOf(['completed', 'running', 'failed']);
      });
    });
  });

  describe('News API Contracts (/api/news)', () => {
    describe('GET /api/news', () => {
      it('should validate news articles response with pagination', async () => {
        const newsResponse = {
          success: true,
          data: [
            {
              id: 'news-123',
              title: 'Apple Inc. Reports Strong Q4 Earnings',
              content: 'Apple Inc. has reported better-than-expected earnings for Q4...',
              summary: 'Apple exceeds earnings expectations with strong iPhone sales.',
              author: 'Jane Doe',
              publishedAt: '2024-01-01T10:00:00Z',
              source: 'Financial Times',
              url: 'https://ft.com/apple-earnings',
              symbols: ['AAPL'],
              sentiment: 0.8,
              tags: ['earnings', 'technology', 'stocks'],
              relatedSymbols: ['MSFT', 'GOOGL'],
            },
            {
              id: 'news-456',
              title: 'Market Analysis: Tech Sector Momentum Continues',
              content: 'Technology stocks continue to show strong momentum...',
              summary: 'Tech sector maintains upward trend despite market volatility.',
              author: 'John Smith',
              publishedAt: '2024-01-01T09:30:00Z',
              source: 'Bloomberg',
              url: 'https://bloomberg.com/tech-momentum',
              symbols: ['AAPL', 'MSFT', 'GOOGL'],
              sentiment: 0.6,
              tags: ['market-analysis', 'technology', 'momentum'],
              relatedSymbols: ['TSLA', 'NVDA'],
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 450,
            totalPages: 23,
            hasNext: true,
            hasPrev: false,
          },
          metadata: {
            requestId: 'req-news-123',
            timestamp: new Date().toISOString(),
            filters: {
              symbols: ['AAPL'],
              sentiment: 'positive',
            },
          },
        };

        // Create Pact interaction
        contractHelper.createInteraction({
          description: 'get news articles with filters',
          providerState: 'news articles exist',
          request: {
            method: 'GET',
            path: '/api/news',
            headers: {
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              'X-Request-ID': 'req-news-123',
            },
            query: {
              symbols: 'AAPL',
              sentiment: 'positive',
              page: '1',
              limit: '20',
            },
          },
          response: {
            status: HTTP_STATUS.OK,
            headers: {
              'Content-Type': 'application/json',
              'X-API-Version': '1.0.0',
            },
            body: newsResponse,
          },
        });

        const response = await fetch('/api/news?symbols=AAPL&sentiment=positive&page=1&limit=20', {
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            'X-Request-ID': 'req-news-123',
          },
        });

        expect(response.status).toBe(HTTP_STATUS.OK);
        const data = await response.json();

        const commonValidation = contractHelper.validateCommonResponse(data, true);
        expect(commonValidation.isValid).toBe(true);

        // Validate news articles structure
        expect(Array.isArray(data.data)).toBe(true);
        expect(data.data.length).toBe(2);

        data.data.forEach((article: any) => {
          expect(article.id).toBeDefined();
          expect(article.title).toBeDefined();
          expect(article.content).toBeDefined();
          expect(article.author).toBeDefined();
          expect(Date.parse(article.publishedAt)).toBeTruthy();
          expect(article.source).toBeDefined();
          expect(article.url).toMatch(/^https?:\/\/.+/);
          expect(Array.isArray(article.symbols)).toBe(true);
          expect(article.sentiment).toBeGreaterThanOrEqual(-1);
          expect(article.sentiment).toBeLessThanOrEqual(1);
          expect(Array.isArray(article.tags)).toBe(true);
          expect(Array.isArray(article.relatedSymbols)).toBe(true);
        });

        // Validate pagination
        expect(data.pagination.total).toBe(450);
        expect(data.pagination.hasNext).toBe(true);

        // Validate filters in metadata
        expect(data.metadata.filters.symbols).toEqual(['AAPL']);
        expect(data.metadata.filters.sentiment).toBe('positive');
      });
    });

    describe('GET /api/news/:id', () => {
      it('should validate single news article response', async () => {
        const singleNewsResponse = {
          success: true,
          data: {
            id: 'news-123',
            title: 'Apple Inc. Reports Strong Q4 Earnings',
            content: 'Apple Inc. has reported better-than-expected earnings for Q4 with iPhone sales exceeding expectations. The company reported revenue of $119.4 billion, up 15% year-over-year. EPS came in at $2.18, beating analyst estimates by $0.12.',
            summary: 'Apple exceeds earnings expectations with strong iPhone sales and 15% revenue growth.',
            author: 'Jane Doe',
            publishedAt: '2024-01-01T10:00:00Z',
            source: 'Financial Times',
            url: 'https://ft.com/apple-earnings',
            symbols: ['AAPL'],
            sentiment: 0.8,
            tags: ['earnings', 'technology', 'stocks', 'apple'],
            relatedSymbols: ['MSFT', 'GOOGL', 'TSLA'],
            images: [
              {
                url: 'https://ft.com/images/apple-logo.jpg',
                caption: 'Apple logo',
                alt: 'Apple Inc. company logo',
              },
            ],
            relatedArticles: [
              {
                id: 'news-456',
                title: 'Apple Stock Surges on Earnings Beat',
                url: 'https://ft.com/apple-stock-surge',
                publishedAt: '2024-01-01T10:30:00Z',
              },
            ],
          },
          metadata: {
            requestId: 'req-news-single-123',
            timestamp: new Date().toISOString(),
          },
        };

        // Create Pact interaction
        contractHelper.createInteraction({
          description: 'get single news article',
          providerState: 'news article exists',
          request: {
            method: 'GET',
            path: '/api/news/news-123',
            headers: {
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              'X-Request-ID': 'req-news-single-123',
            },
          },
          response: {
            status: HTTP_STATUS.OK,
            headers: {
              'Content-Type': 'application/json',
              'X-API-Version': '1.0.0',
            },
            body: singleNewsResponse,
          },
        });

        const response = await fetch('/api/news/news-123', {
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            'X-Request-ID': 'req-news-single-123',
          },
        });

        expect(response.status).toBe(HTTP_STATUS.OK);
        const data = await response.json();

        const commonValidation = contractHelper.validateCommonResponse(data, true);
        expect(commonValidation.isValid).toBe(true);

        expect(data.data.id).toBe('news-123');
        expect(data.data.title).toBe('Apple Inc. Reports Strong Q4 Earnings');
        expect(data.data.content).toBeDefined();
        expect(data.data.summary).toBeDefined();
        expect(data.data.author).toBe('Jane Doe');
        expect(data.data.source).toBe('Financial Times');
        expect(data.data.sentiment).toBe(0.8);
        expect(data.data.symbols).toEqual(['AAPL']);

        // Validate related content
        expect(Array.isArray(data.data.relatedArticles)).toBe(true);
        expect(Array.isArray(data.data.images)).toBe(true);

        if (data.data.relatedArticles.length > 0) {
          const related = data.data.relatedArticles[0];
          expect(related.id).toBeDefined();
          expect(related.title).toBeDefined();
          expect(related.url).toBeDefined();
        }
      });
    });
  });
});