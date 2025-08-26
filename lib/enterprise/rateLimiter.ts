import { EventEmitter } from 'events';

export interface RateLimitConfig {
  maxRequests: number;
  timeWindow: number; // milliseconds
  burstLimit: number;
  enableBackoff: boolean;
  backoffMultiplier: number;
  maxBackoffDelay: number;
  enableQueue: boolean;
  maxQueueSize: number;
  priorityLevels: boolean;
}

export interface RateLimitInfo {
  remaining: number;
  resetTime: number;
  limit: number;
  used: number;
  resetIn: number; // seconds until reset
}

export interface RateLimitStats {
  totalRequests: number;
  successfulRequests: number;
  rateLimitedRequests: number;
  averageResponseTime: number;
  currentQueueSize: number;
  backoffCount: number;
  lastResetTime: number;
}

export interface QueuedRequest {
  id: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  timestamp: number;
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

export class IntelligentRateLimiter extends EventEmitter {
  private config: RateLimitConfig;
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private backoffDelays: Map<string, number> = new Map();
  private requestQueue: QueuedRequest[] = [];
  private isProcessingQueue = false;
  private stats: {
    totalRequests: number;
    successfulRequests: number;
    rateLimitedRequests: number;
    responseTimes: number[];
    backoffCount: number;
    lastResetTime: number;
  };
  
  constructor(config: Partial<RateLimitConfig> = {}) {
    super();
    
    this.config = {
      maxRequests: 100,
      timeWindow: 60 * 1000, // 1 minute
      burstLimit: 10,
      enableBackoff: true,
      backoffMultiplier: 2,
      maxBackoffDelay: 30000, // 30 seconds
      enableQueue: true,
      maxQueueSize: 1000,
      priorityLevels: true,
      ...config
    };
    
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      rateLimitedRequests: 0,
      responseTimes: [],
      backoffCount: 0,
      lastResetTime: Date.now()
    };
    
    // Start queue processing
    if (this.config.enableQueue) {
      this.startQueueProcessing();
    }
  }

  // Check if a request can be made
  canMakeRequest(provider: string): boolean {
    const now = Date.now();
    const info = this.requestCounts.get(provider);
    
    if (!info) {
      return true;
    }
    
    // Check if window has reset
    if (now >= info.resetTime) {
      this.requestCounts.delete(provider);
      return true;
    }
    
    // Check if under limit
    return info.count < this.config.maxRequests;
  }

  // Get rate limit information for a provider
  getRateLimitInfo(provider: string): RateLimitInfo {
    const now = Date.now();
    const info = this.requestCounts.get(provider);
    
    if (!info) {
      return {
        remaining: this.config.maxRequests,
        resetTime: now + this.config.timeWindow,
        limit: this.config.maxRequests,
        used: 0,
        resetIn: Math.ceil(this.config.timeWindow / 1000)
      };
    }
    
    const resetIn = Math.max(0, Math.ceil((info.resetTime - now) / 1000));
    
    return {
      remaining: Math.max(0, this.config.maxRequests - info.count),
      resetTime: info.resetTime,
      limit: this.config.maxRequests,
      used: info.count,
      resetIn
    };
  }

  // Record a request and check if rate limited
  recordRequest(provider: string): boolean {
    const now = Date.now();
    const info = this.requestCounts.get(provider);
    
    if (!info || now >= info.resetTime) {
      // Start new time window
      this.requestCounts.set(provider, {
        count: 1,
        resetTime: now + this.config.timeWindow
      });
      return false;
    }
    
    // Increment request count
    info.count++;
    
    // Check if rate limited
    if (info.count > this.config.maxRequests) {
      this.stats.rateLimitedRequests++;
      this.emit('rate-limited', { provider, count: info.count, limit: this.config.maxRequests });
      return true;
    }
    
    return false;
  }

  // Execute a request with rate limiting
  async executeRequest<T>(
    provider: string,
    requestFn: () => Promise<T>,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal'
  ): Promise<T> {
    this.stats.totalRequests++;
    
    // Check if we can make the request immediately
    if (this.canMakeRequest(provider)) {
      return this.executeImmediate(provider, requestFn);
    }
    
    // If queue is enabled, add to queue
    if (this.config.enableQueue) {
      return this.queueRequest(provider, requestFn, priority);
    }
    
    // Otherwise, throw rate limit error
    throw new Error(`Rate limit exceeded for ${provider}. Try again later.`);
  }

  // Execute request immediately
  private async executeImmediate<T>(provider: string, requestFn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    
    try {
      // Record the request
      this.recordRequest(provider);
      
      // Execute the request
      const result = await requestFn();
      
      // Record success
      this.stats.successfulRequests++;
      const responseTime = Date.now() - startTime;
      this.stats.responseTimes.push(responseTime);
      
      // Keep only last 100 response times for average calculation
      if (this.stats.responseTimes.length > 100) {
        this.stats.responseTimes.shift();
      }
      
      // Reset backoff on success
      this.backoffDelays.delete(provider);
      
      this.emit('request-success', { provider, responseTime });
      
      return result;
      
    } catch (error) {
      // Handle rate limit errors
      if (this.isRateLimitError(error)) {
        this.stats.rateLimitedRequests++;
        
        if (this.config.enableBackoff) {
          this.applyBackoff(provider);
        }
        
        this.emit('request-rate-limited', { provider, error });
        throw error;
      }
      
      // Handle other errors
      this.emit('request-error', { provider, error });
      throw error;
    }
  }

  // Queue a request for later execution
  private async queueRequest<T>(
    provider: string,
    requestFn: () => Promise<T>,
    priority: 'low' | 'normal' | 'high' | 'critical'
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Check queue size limit
      if (this.requestQueue.length >= this.config.maxQueueSize) {
        reject(new Error('Request queue is full. Try again later.'));
        return;
      }
      
      const queuedRequest: QueuedRequest = {
        id: `${provider}-${Date.now()}-${Math.random()}`,
        priority,
        timestamp: Date.now(),
        execute: () => requestFn(),
        resolve,
        reject
      };
      
      // Add to queue with priority sorting
      this.requestQueue.push(queuedRequest);
      this.sortQueue();
      
      this.emit('request-queued', { provider, priority, queueSize: this.requestQueue.length });
    });
  }

  // Sort queue by priority and timestamp
  private sortQueue(): void {
    if (!this.config.priorityLevels) return;
    
    const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
    
    this.requestQueue.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Same priority: FIFO
      return a.timestamp - b.timestamp;
    });
  }

  // Start processing the request queue
  private startQueueProcessing(): void {
    setInterval(() => {
      if (!this.isProcessingQueue && this.requestQueue.length > 0) {
        this.processQueue();
      }
    }, 100); // Check every 100ms
  }

  // Process queued requests
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    
    try {
      // Process up to 5 requests per cycle
      const requestsToProcess = this.requestQueue.splice(0, 5);
      
      for (const request of requestsToProcess) {
        try {
          // Check if we can make the request now
          const provider = this.extractProviderFromId(request.id);
          
          if (this.canMakeRequest(provider)) {
            const result = await request.execute();
            request.resolve(result);
          } else {
            // Put it back in the queue
            this.requestQueue.unshift(request);
            break; // Stop processing if we hit rate limit
          }
        } catch (error) {
          request.reject(error);
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  // Extract provider from request ID
  private extractProviderFromId(id: string): string {
    return id.split('-')[0];
  }

  // Apply exponential backoff
  private applyBackoff(provider: string): void {
    const currentDelay = this.backoffDelays.get(provider) || 1000; // Start with 1 second
    const newDelay = Math.min(
      currentDelay * this.config.backoffMultiplier,
      this.config.maxBackoffDelay
    );
    
    this.backoffDelays.set(provider, newDelay);
    this.stats.backoffCount++;
    
    this.emit('backoff-applied', { provider, delay: newDelay });
    
    // Schedule reset of backoff delay
    setTimeout(() => {
      this.backoffDelays.delete(provider);
      this.emit('backoff-reset', { provider });
    }, newDelay);
  }

  // Check if error is a rate limit error
  private isRateLimitError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message || error.toString();
    const rateLimitKeywords = [
      'rate limit',
      'rate limit exceeded',
      'too many requests',
      'quota exceeded',
      '429',
      'throttled'
    ];
    
    return rateLimitKeywords.some(keyword => 
      errorMessage.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  // Get current statistics
  getStats(): RateLimitStats {
    const averageResponseTime = this.stats.responseTimes.length > 0
      ? this.stats.responseTimes.reduce((sum, time) => sum + time, 0) / this.stats.responseTimes.length
      : 0;
    
    return {
      totalRequests: this.stats.totalRequests,
      successfulRequests: this.stats.successfulRequests,
      rateLimitedRequests: this.stats.rateLimitedRequests,
      averageResponseTime,
      currentQueueSize: this.requestQueue.length,
      backoffCount: this.stats.backoffCount,
      lastResetTime: this.stats.lastResetTime
    };
  }

  // Get backoff information for a provider
  getBackoffInfo(provider: string): { isBackingOff: boolean; delay: number } {
    const delay = this.backoffDelays.get(provider);
    return {
      isBackingOff: !!delay,
      delay: delay || 0
    };
  }

  // Clear rate limit counters for a provider
  clearRateLimit(provider: string): void {
    this.requestCounts.delete(provider);
    this.backoffDelays.delete(provider);
    this.emit('rate-limit-cleared', { provider });
  }

  // Clear all rate limit counters
  clearAllRateLimits(): void {
    this.requestCounts.clear();
    this.backoffDelays.clear();
    this.emit('all-rate-limits-cleared');
  }

  // Update configuration
  updateConfig(newConfig: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config-updated', { config: this.config });
  }

  // Get current configuration
  getConfig(): RateLimitConfig {
    return { ...this.config };
  }

  // Reset statistics
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      rateLimitedRequests: 0,
      responseTimes: [],
      backoffCount: 0,
      lastResetTime: Date.now()
    };
    this.emit('stats-reset');
  }

  // Clean up resources
  destroy(): void {
    this.requestQueue.length = 0;
    this.requestCounts.clear();
    this.backoffDelays.clear();
    this.removeAllListeners();
    console.log('🚫 Rate limiter destroyed');
  }
}

// Export singleton instance
export const rateLimiter = new IntelligentRateLimiter();

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    rateLimiter.destroy();
  });
}

// Types are already exported as interfaces above
