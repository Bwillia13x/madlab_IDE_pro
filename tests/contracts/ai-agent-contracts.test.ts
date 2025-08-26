/**
 * AI Agent API Contract Tests
 * Tests contracts for AI agent endpoints (/api/agent, /api/ai/process)
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { ContractTestHelper, HTTP_STATUS, ERROR_CODES } from './utils/contract-test-utils';
import { commonSchemas } from './schemas/common-schemas';

describe('AI Agent API Contracts', () => {
  let contractHelper: ContractTestHelper;
  let mockFetch: any;

  beforeAll(async () => {
    contractHelper = new ContractTestHelper({
      consumer: 'MAD LAB Workbench',
      provider: 'MAD LAB AI Service',
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

  describe('GET /api/agent', () => {
    it('should validate agent status response', async () => {
      const agentStatusResponse = {
        success: true,
        data: {
          id: 'agent-123',
          name: 'Market Analysis Agent',
          status: 'active',
          version: '2.1.0',
          capabilities: [
            'market_analysis',
            'pattern_recognition',
            'sentiment_analysis',
            'risk_assessment',
          ],
          lastActive: '2024-01-01T12:00:00Z',
          uptime: 86400,
          memory: {
            used: 512,
            total: 2048,
            percentage: 25.0,
          },
          currentTasks: [
            {
              id: 'task-456',
              type: 'market_analysis',
              status: 'running',
              progress: 75,
              startedAt: '2024-01-01T11:30:00Z',
            },
          ],
        },
        metadata: {
          requestId: 'req-agent-123',
          timestamp: new Date().toISOString(),
        },
      };

      // Create Pact interaction
      contractHelper.createInteraction({
        description: 'get agent status',
        providerState: 'agent is active and available',
        request: {
          method: 'GET',
          path: '/api/agent',
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            'X-Request-ID': 'req-agent-123',
          },
        },
        response: {
          status: HTTP_STATUS.OK,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
          },
          body: agentStatusResponse,
        },
      });

      const response = await fetch('/api/agent', {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          'X-Request-ID': 'req-agent-123',
        },
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      const data = await response.json();

      const commonValidation = contractHelper.validateCommonResponse(data, true);
      expect(commonValidation.isValid).toBe(true);

      // Validate agent data structure
      expect(data.data).toBeDefined();
      expect(data.data.id).toMatch(/^agent-[a-zA-Z0-9-]+$/);
      expect(data.data.name).toBeDefined();
      expect(data.data.status).toBeOneOf(['active', 'inactive', 'maintenance', 'error']);
      expect(data.data.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(Array.isArray(data.data.capabilities)).toBe(true);
      expect(Date.parse(data.data.lastActive)).toBeTruthy();
      expect(data.data.uptime).toBeGreaterThanOrEqual(0);

      // Validate memory metrics
      expect(data.data.memory.percentage).toBeGreaterThanOrEqual(0);
      expect(data.data.memory.percentage).toBeLessThanOrEqual(100);

      // Validate current tasks
      expect(Array.isArray(data.data.currentTasks)).toBe(true);
      if (data.data.currentTasks.length > 0) {
        const task = data.data.currentTasks[0];
        expect(task.id).toMatch(/^task-[a-zA-Z0-9-]+$/);
        expect(task.status).toBeOneOf(['pending', 'running', 'completed', 'failed']);
        expect(task.progress).toBeGreaterThanOrEqual(0);
        expect(task.progress).toBeLessThanOrEqual(100);
      }
    });

    it('should validate agent status when inactive', async () => {
      const inactiveAgentResponse = {
        success: true,
        data: {
          id: 'agent-456',
          name: 'Sentiment Analysis Agent',
          status: 'inactive',
          version: '1.5.2',
          capabilities: ['sentiment_analysis'],
          lastActive: '2024-01-01T10:00:00Z',
          uptime: 0,
          memory: {
            used: 0,
            total: 1024,
            percentage: 0,
          },
          currentTasks: [],
        },
        metadata: {
          requestId: 'req-agent-456',
          timestamp: new Date().toISOString(),
        },
      };

      // Create Pact interaction for inactive agent
      contractHelper.createInteraction({
        description: 'get inactive agent status',
        providerState: 'agent is inactive',
        request: {
          method: 'GET',
          path: '/api/agent',
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            'X-Request-ID': 'req-agent-456',
          },
          query: {
            id: 'agent-456',
          },
        },
        response: {
          status: HTTP_STATUS.OK,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
          },
          body: inactiveAgentResponse,
        },
      });

      const response = await fetch('/api/agent?id=agent-456', {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          'X-Request-ID': 'req-agent-456',
        },
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.status).toBe('inactive');
      expect(data.data.uptime).toBe(0);
      expect(data.data.memory.used).toBe(0);
      expect(data.data.currentTasks).toEqual([]);
    });
  });

  describe('POST /api/agent', () => {
    it('should validate agent creation response', async () => {
      const createAgentRequest = {
        name: 'Custom Analysis Agent',
        capabilities: ['market_analysis', 'pattern_recognition'],
        configuration: {
          model: 'gpt-4',
          maxTokens: 4096,
          temperature: 0.7,
        },
      };

      const createAgentResponse = {
        success: true,
        data: {
          id: 'agent-789',
          name: 'Custom Analysis Agent',
          status: 'initializing',
          version: '2.1.0',
          capabilities: ['market_analysis', 'pattern_recognition'],
          configuration: {
            model: 'gpt-4',
            maxTokens: 4096,
            temperature: 0.7,
          },
          createdAt: '2024-01-01T12:00:00Z',
        },
        metadata: {
          requestId: 'req-create-agent-123',
          timestamp: new Date().toISOString(),
        },
      };

      // Create Pact interaction
      contractHelper.createInteraction({
        description: 'create new agent',
        providerState: 'agent creation is allowed',
        request: {
          method: 'POST',
          path: '/api/agent',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            'X-Request-ID': 'req-create-agent-123',
          },
          body: createAgentRequest,
        },
        response: {
          status: HTTP_STATUS.CREATED,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
            'Location': '/api/agent/agent-789',
          },
          body: createAgentResponse,
        },
      });

      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          'X-Request-ID': 'req-create-agent-123',
        },
        body: JSON.stringify(createAgentRequest),
      });

      expect(response.status).toBe(HTTP_STATUS.CREATED);
      expect(response.headers.get('Location')).toBe('/api/agent/agent-789');

      const data = await response.json();

      const commonValidation = contractHelper.validateCommonResponse(data, true);
      expect(commonValidation.isValid).toBe(true);

      expect(data.data.id).toMatch(/^agent-[a-zA-Z0-9-]+$/);
      expect(data.data.name).toBe(createAgentRequest.name);
      expect(data.data.status).toBe('initializing');
      expect(data.data.capabilities).toEqual(createAgentRequest.capabilities);
      expect(data.data.configuration).toEqual(createAgentRequest.configuration);
      expect(Date.parse(data.data.createdAt)).toBeTruthy();
    });

    it('should validate agent creation validation error', async () => {
      const invalidCreateRequest = {
        name: '', // Invalid: empty name
        capabilities: [],
        configuration: {
          model: 'invalid-model',
        },
      };

      const validationErrorResponse = {
        success: false,
        error: 'Validation failed',
        code: ERROR_CODES.VALIDATION_ERROR,
        timestamp: new Date().toISOString(),
        requestId: 'req-create-agent-456',
        details: {
          fields: [
            {
              field: 'name',
              message: 'Name is required',
            },
            {
              field: 'capabilities',
              message: 'At least one capability must be specified',
            },
            {
              field: 'configuration.model',
              message: 'Invalid model specified',
            },
          ],
        },
      };

      // Create Pact interaction for validation error
      contractHelper.createInteraction({
        description: 'create agent with validation errors',
        providerState: 'invalid agent creation data',
        request: {
          method: 'POST',
          path: '/api/agent',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            'X-Request-ID': 'req-create-agent-456',
          },
          body: invalidCreateRequest,
        },
        response: {
          status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
          },
          body: validationErrorResponse,
        },
      });

      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          'X-Request-ID': 'req-create-agent-456',
        },
        body: JSON.stringify(invalidCreateRequest),
      });

      expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
      const data = await response.json();

      const errorValidation = contractHelper.validateErrorResponse(data);
      expect(errorValidation.isValid).toBe(true);

      expect(data.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(data.details.fields).toBeDefined();
      expect(Array.isArray(data.details.fields)).toBe(true);
      expect(data.details.fields.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/ai/process', () => {
    it('should validate AI processing request response', async () => {
      const processRequest = {
        task: 'analyze_market_data',
        data: {
          symbol: 'AAPL',
          timeframe: '1D',
          indicators: ['RSI', 'MACD', 'MovingAverage'],
        },
        agentId: 'agent-123',
        priority: 'normal',
      };

      const processResponse = {
        success: true,
        data: {
          taskId: 'task-789',
          status: 'processing',
          agentId: 'agent-123',
          estimatedCompletion: '2024-01-01T12:05:00Z',
          progress: 0,
          result: null,
        },
        metadata: {
          requestId: 'req-process-123',
          timestamp: new Date().toISOString(),
        },
      };

      // Create Pact interaction
      contractHelper.createInteraction({
        description: 'submit AI processing task',
        providerState: 'AI service is available and agent is active',
        request: {
          method: 'POST',
          path: '/api/ai/process',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            'X-Request-ID': 'req-process-123',
          },
          body: processRequest,
        },
        response: {
          status: HTTP_STATUS.ACCEPTED,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
            'Location': '/api/ai/process/task-789',
          },
          body: processResponse,
        },
      });

      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          'X-Request-ID': 'req-process-123',
        },
        body: JSON.stringify(processRequest),
      });

      expect(response.status).toBe(HTTP_STATUS.ACCEPTED);
      expect(response.headers.get('Location')).toBe('/api/ai/process/task-789');

      const data = await response.json();

      const commonValidation = contractHelper.validateCommonResponse(data, true);
      expect(commonValidation.isValid).toBe(true);

      expect(data.data.taskId).toMatch(/^task-[a-zA-Z0-9-]+$/);
      expect(data.data.status).toBe('processing');
      expect(data.data.agentId).toBe(processRequest.agentId);
      expect(data.data.progress).toBe(0);
      expect(data.data.result).toBeNull();
      expect(Date.parse(data.data.estimatedCompletion)).toBeTruthy();
    });

    it('should validate AI processing completion response', async () => {
      const completionResponse = {
        success: true,
        data: {
          taskId: 'task-789',
          status: 'completed',
          agentId: 'agent-123',
          completedAt: '2024-01-01T12:02:30Z',
          progress: 100,
          result: {
            analysis: {
              trend: 'bullish',
              confidence: 0.85,
              indicators: {
                RSI: 65,
                MACD: {
                  signal: 'buy',
                  histogram: 0.5,
                },
                MovingAverage: {
                  short: 175.5,
                  long: 172.3,
                  crossover: 'bullish',
                },
              },
              recommendations: [
                'Consider buying on dip',
                'Set stop loss at 170',
                'Target price: 185',
              ],
            },
            metadata: {
              processingTime: 150000, // milliseconds
              modelUsed: 'gpt-4',
              confidence: 0.85,
            },
          },
        },
        metadata: {
          requestId: 'req-process-456',
          timestamp: new Date().toISOString(),
        },
      };

      // Create Pact interaction for completed task
      contractHelper.createInteraction({
        description: 'get completed AI processing result',
        providerState: 'AI processing task is completed',
        request: {
          method: 'GET',
          path: '/api/ai/process/task-789',
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            'X-Request-ID': 'req-process-456',
          },
        },
        response: {
          status: HTTP_STATUS.OK,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
          },
          body: completionResponse,
        },
      });

      const response = await fetch('/api/ai/process/task-789', {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          'X-Request-ID': 'req-process-456',
        },
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      const data = await response.json();

      const commonValidation = contractHelper.validateCommonResponse(data, true);
      expect(commonValidation.isValid).toBe(true);

      expect(data.data.taskId).toBe('task-789');
      expect(data.data.status).toBe('completed');
      expect(data.data.progress).toBe(100);
      expect(data.data.result).toBeDefined();
      expect(data.data.result.analysis).toBeDefined();
      expect(data.data.result.analysis.trend).toBeOneOf(['bullish', 'bearish', 'neutral']);
      expect(data.data.result.analysis.confidence).toBeGreaterThanOrEqual(0);
      expect(data.data.result.analysis.confidence).toBeLessThanOrEqual(1);
      expect(Date.parse(data.data.completedAt)).toBeTruthy();
    });

    it('should validate AI processing error response', async () => {
      const errorProcessResponse = {
        success: false,
        error: 'AI processing failed',
        code: 'AI_PROCESSING_ERROR',
        timestamp: new Date().toISOString(),
        requestId: 'req-process-789',
        details: {
          taskId: 'task-999',
          agentId: 'agent-123',
          error: {
            type: 'model_error',
            message: 'Model token limit exceeded',
            retryable: true,
            retryAfter: 300, // seconds
          },
        },
      };

      // Create Pact interaction for processing error
      contractHelper.createInteraction({
        description: 'get AI processing error',
        providerState: 'AI processing task failed',
        request: {
          method: 'GET',
          path: '/api/ai/process/task-999',
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            'X-Request-ID': 'req-process-789',
          },
        },
        response: {
          status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0.0',
          },
          body: errorProcessResponse,
        },
      });

      const response = await fetch('/api/ai/process/task-999', {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          'X-Request-ID': 'req-process-789',
        },
      });

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      const data = await response.json();

      const errorValidation = contractHelper.validateErrorResponse(data);
      expect(errorValidation.isValid).toBe(true);

      expect(data.details.taskId).toBe('task-999');
      expect(data.details.error).toBeDefined();
      expect(data.details.error.retryable).toBe(true);
      expect(data.details.error.retryAfter).toBeGreaterThan(0);
    });
  });
});