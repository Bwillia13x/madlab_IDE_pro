import { NextRequest } from 'next/server';
import { traceAsyncFunction, globalTracer } from '@/lib/tracing/tracer';
import OpenAI from 'openai';

export interface AIServiceConfig {
  maxConcurrentRequests: number;
  requestTimeout: number;
  retryAttempts: number;
  modelConfigs: Record<string, ModelConfig>;
}

export interface ModelConfig {
  provider: 'openai' | 'anthropic' | 'local';
  model: string;
  maxTokens: number;
  temperature: number;
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  fallback?: string;
}

export interface AIRequest {
  model: string;
  prompt: string;
  context?: Record<string, unknown>;
  stream?: boolean;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  id: string;
  model: string;
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'error';
  metadata: Record<string, unknown>;
}

export interface AIServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  models: Record<string, ModelHealth>;
  queue: QueueStatus;
  performance: PerformanceMetrics;
}

export interface ModelHealth {
  available: boolean;
  responseTime: number;
  errorRate: number;
  queueLength: number;
  rateLimitStatus: RateLimitStatus;
}

export interface QueueStatus {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  requestsPerSecond: number;
  successRate: number;
  uptime: number;
}

export interface RateLimitStatus {
  remaining: number;
  resetTime: number;
  exceeded: boolean;
}

// Default AI service configuration
const DEFAULT_CONFIG: AIServiceConfig = {
  maxConcurrentRequests: 10,
  requestTimeout: 30000,
  retryAttempts: 3,
  modelConfigs: {
    'gpt-4': {
      provider: 'openai',
      model: 'gpt-4',
      maxTokens: 4096,
      temperature: 0.7,
      rateLimit: {
        requestsPerMinute: 60,
        tokensPerMinute: 150000
      },
      fallback: 'gpt-3.5-turbo'
    },
    'gpt-3.5-turbo': {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      maxTokens: 4096,
      temperature: 0.7,
      rateLimit: {
        requestsPerMinute: 120,
        tokensPerMinute: 300000
      }
    },
    'claude-3': {
      provider: 'anthropic',
      model: 'claude-3-sonnet-20240229',
      maxTokens: 4096,
      temperature: 0.7,
      rateLimit: {
        requestsPerMinute: 60,
        tokensPerMinute: 100000
      },
      fallback: 'gpt-3.5-turbo'
    }
  }
};

// Request queue for managing concurrent AI requests
class AIRequestQueue {
  private queue: Array<{
    id: string;
    request: AIRequest;
    resolve: (response: AIResponse) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  
  private processing = new Set<string>();
  private completed = 0;
  private failed = 0;
  
  constructor(private maxConcurrent: number) {}
  
  async enqueue(request: AIRequest): Promise<AIResponse> {
    const id = this.generateId();
    
    return new Promise((resolve, reject) => {
      this.queue.push({
        id,
        request,
        resolve,
        reject,
        timestamp: Date.now()
      });
      
      this.processQueue();
    });
  }
  
  private async processQueue(): Promise<void> {
    if (this.processing.size >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }
    
    const item = this.queue.shift();
    if (!item) return;
    
    this.processing.add(item.id);
    
    try {
      const response = await this.processRequest(item.request);
      this.completed++;
      item.resolve(response);
    } catch (error) {
      this.failed++;
      item.reject(error as Error);
    } finally {
      this.processing.delete(item.id);
      this.processQueue(); // Process next item
    }
  }
  
  private async processRequest(request: AIRequest): Promise<AIResponse> {
    return traceAsyncFunction(
      'ai_request_processing',
      async () => {
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY || 'demo-key',
        });

        try {
          const completion = await openai.chat.completions.create({
            model: this.mapModelName(request.model),
            messages: [
              {
                role: 'user',
                content: request.prompt
              }
            ],
            max_tokens: request.maxTokens || this.getModelConfig(request.model).maxTokens,
            temperature: request.temperature || this.getModelConfig(request.model).temperature,
            stream: false,
          });

          const choice = completion.choices[0];
          if (!choice) {
            throw new Error('No response from OpenAI API');
          }

          return {
            id: completion.id || this.generateId(),
            model: request.model,
            content: choice.message?.content || '',
            usage: {
              promptTokens: completion.usage?.prompt_tokens || Math.floor(request.prompt.length / 4),
              completionTokens: completion.usage?.completion_tokens || 0,
              totalTokens: completion.usage?.total_tokens || Math.floor(request.prompt.length / 4)
            },
            finishReason: (choice.finish_reason as 'stop' | 'length' | 'error') || 'stop',
            metadata: {
              processingTime: Date.now(),
              model: request.model,
              finishReason: choice.finish_reason,
              systemFingerprint: completion.system_fingerprint
            }
          };
        } catch (error) {
          // If OpenAI fails and we have a demo key, return a fallback response
          if (process.env.OPENAI_API_KEY === 'demo-key' || !process.env.OPENAI_API_KEY) {
            console.warn('Using demo mode - returning fallback response');
            return this.generateFallbackResponse(request);
          }

          // Re-throw the error for proper handling by the caller
          throw error;
        }
      },
      { model: request.model, prompt_length: request.prompt.length }
    );
  }
  
  getStatus(): QueueStatus {
    return {
      pending: this.queue.length,
      processing: this.processing.size,
      completed: this.completed,
      failed: this.failed
    };
  }
  
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private mapModelName(model: string): string {
    // Map internal model names to OpenAI model names
    const modelMap: Record<string, string> = {
      'gpt-4': 'gpt-4',
      'gpt-3.5-turbo': 'gpt-3.5-turbo',
      'claude-3': 'gpt-4', // Fallback to GPT-4 for Claude requests
    };
    return modelMap[model] || 'gpt-3.5-turbo'; // Default fallback
  }

  private getModelConfig(model: string): ModelConfig {
    return DEFAULT_CONFIG.modelConfigs[model] || DEFAULT_CONFIG.modelConfigs['gpt-3.5-turbo'];
  }

  private generateFallbackResponse(request: AIRequest): AIResponse {
    // Generate a fallback response when OpenAI is not available
    return {
      id: this.generateId(),
      model: request.model,
      content: `Demo mode: AI response for "${request.prompt.substring(0, 100)}${request.prompt.length > 100 ? '...' : ''}"`,
      usage: {
        promptTokens: Math.floor(request.prompt.length / 4),
        completionTokens: 50,
        totalTokens: Math.floor(request.prompt.length / 4) + 50
      },
      finishReason: 'stop',
      metadata: {
        processingTime: Date.now(),
        model: request.model,
        isFallback: true
      }
    };
  }
}

// Rate limiter for AI requests
class RateLimiter {
  private requestCounts = new Map<string, number[]>();
  private tokenCounts = new Map<string, number[]>();
  
  canMakeRequest(model: string, tokens: number): boolean {
    const config = DEFAULT_CONFIG.modelConfigs[model];
    if (!config) return false;
    
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    
    // Clean old requests
    this.cleanOldRequests(model, windowStart);
    
    const requestCount = this.requestCounts.get(model)?.length || 0;
    const tokenCount = this.tokenCounts.get(model)?.reduce((sum, count) => sum + count, 0) || 0;
    
    return (
      requestCount < config.rateLimit.requestsPerMinute &&
      tokenCount + tokens < config.rateLimit.tokensPerMinute
    );
  }
  
  recordRequest(model: string, tokens: number): void {
    const now = Date.now();
    
    if (!this.requestCounts.has(model)) {
      this.requestCounts.set(model, []);
    }
    if (!this.tokenCounts.has(model)) {
      this.tokenCounts.set(model, []);
    }
    
    this.requestCounts.get(model)!.push(now);
    this.tokenCounts.get(model)!.push(tokens);
  }
  
  getRateLimitStatus(model: string): RateLimitStatus {
    const config = DEFAULT_CONFIG.modelConfigs[model];
    if (!config) {
      return { remaining: 0, resetTime: Date.now() + 60000, exceeded: true };
    }
    
    const now = Date.now();
    const windowStart = now - 60000;
    
    this.cleanOldRequests(model, windowStart);
    
    const requestCount = this.requestCounts.get(model)?.length || 0;
    const tokenCount = this.tokenCounts.get(model)?.reduce((sum, count) => sum + count, 0) || 0;
    
    const requestsRemaining = Math.max(0, config.rateLimit.requestsPerMinute - requestCount);
    const tokensRemaining = Math.max(0, config.rateLimit.tokensPerMinute - tokenCount);
    
    return {
      remaining: Math.min(requestsRemaining, tokensRemaining),
      resetTime: now + 60000,
      exceeded: requestsRemaining === 0 || tokensRemaining === 0
    };
  }
  
  private cleanOldRequests(model: string, windowStart: number): void {
    const requests = this.requestCounts.get(model) || [];
    const tokens = this.tokenCounts.get(model) || [];
    
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    const validTokens = tokens.slice(tokens.length - validRequests.length);
    
    this.requestCounts.set(model, validRequests);
    this.tokenCounts.set(model, validTokens);
  }
}

// Main AI Service class
export class AIService {
  private config: AIServiceConfig;
  private queue: AIRequestQueue;
  private rateLimiter: RateLimiter;
  private startTime: number;
  private metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalResponseTime: number;
  };
  
  constructor(config: Partial<AIServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.queue = new AIRequestQueue(this.config.maxConcurrentRequests);
    this.rateLimiter = new RateLimiter();
    this.startTime = Date.now();
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0
    };
  }
  
  async processRequest(request: AIRequest): Promise<AIResponse> {
    const span = globalTracer.startSpan('ai_service_request', {
      model: request.model,
      prompt_length: request.prompt.length,
      stream: request.stream || false
    });
    
    try {
      // Validate model
      if (!this.config.modelConfigs[request.model]) {
        throw new Error(`Unknown model: ${request.model}`);
      }
      
      // Estimate tokens for rate limiting
      const estimatedTokens = Math.floor(request.prompt.length / 4);
      
      // Check rate limits
      if (!this.rateLimiter.canMakeRequest(request.model, estimatedTokens)) {
        throw new Error(`Rate limit exceeded for model: ${request.model}`);
      }
      
      // Record request
      this.metrics.totalRequests++;
      this.rateLimiter.recordRequest(request.model, estimatedTokens);
      
      const startTime = Date.now();
      
      // Process request through queue
      const response = await this.queue.enqueue(request);
      
      const responseTime = Date.now() - startTime;
      this.metrics.successfulRequests++;
      this.metrics.totalResponseTime += responseTime;
      
      globalTracer.addAttributes(span, {
        success: true,
        response_time: responseTime,
        tokens_used: response.usage.totalTokens
      });
      
      globalTracer.endSpan(span, 'ok');
      return response;
      
    } catch (error) {
      this.metrics.failedRequests++;
      
      globalTracer.addAttributes(span, {
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
      
      globalTracer.endSpan(span, 'error', error as Error);
      throw error;
    }
  }
  
  async getHealth(): Promise<AIServiceHealth> {
    const models: Record<string, ModelHealth> = {};
    
    // Check health of each model
    for (const [modelName, config] of Object.entries(this.config.modelConfigs)) {
      const rateLimitStatus = this.rateLimiter.getRateLimitStatus(modelName);
      
      models[modelName] = {
        available: true, // In production, test actual model availability
        responseTime: this.getAverageResponseTime(),
        errorRate: this.getErrorRate(),
        queueLength: 0, // Would track per-model queue length
        rateLimitStatus
      };
    }
    
    const queueStatus = this.queue.getStatus();
    const performance = this.getPerformanceMetrics();
    
    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (this.getErrorRate() > 0.1) {
      status = 'unhealthy';
    } else if (this.getErrorRate() > 0.05 || queueStatus.pending > 10) {
      status = 'degraded';
    }
    
    return {
      status,
      models,
      queue: queueStatus,
      performance
    };
  }
  
  private getAverageResponseTime(): number {
    return this.metrics.successfulRequests > 0 
      ? this.metrics.totalResponseTime / this.metrics.successfulRequests 
      : 0;
  }
  
  private getErrorRate(): number {
    return this.metrics.totalRequests > 0 
      ? this.metrics.failedRequests / this.metrics.totalRequests 
      : 0;
  }
  
  private getPerformanceMetrics(): PerformanceMetrics {
    const uptime = Date.now() - this.startTime;
    const uptimeSeconds = uptime / 1000;
    
    return {
      averageResponseTime: this.getAverageResponseTime(),
      requestsPerSecond: uptimeSeconds > 0 ? this.metrics.totalRequests / uptimeSeconds : 0,
      successRate: this.metrics.totalRequests > 0 
        ? this.metrics.successfulRequests / this.metrics.totalRequests 
        : 1,
      uptime
    };
  }
  
  // Get available models
  getAvailableModels(): string[] {
    return Object.keys(this.config.modelConfigs);
  }
  
  // Update configuration
  updateConfig(newConfig: Partial<AIServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Global AI service instance
export const aiService = new AIService();

// Helper functions for AI service integration
export async function processAIRequest(request: AIRequest): Promise<AIResponse> {
  return aiService.processRequest(request);
}

export async function getAIServiceHealth(): Promise<AIServiceHealth> {
  return aiService.getHealth();
}

export function getAvailableAIModels(): string[] {
  return aiService.getAvailableModels();
}

