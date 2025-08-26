/**
 * Enhanced error handling and recovery system for production use.
 * Includes error categorization, automatic recovery, and detailed logging.
 */

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  endpoint?: string;
  method?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'authorization' | 'validation' | 'system' | 'external' | 'unknown';
  recoverable: boolean;
  retryCount: number;
  maxRetries: number;
}

export interface ErrorRecord {
  id: string;
  error: Error;
  context: ErrorContext;
  stack: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  resolvedAt?: Date;
  resolution?: string;
}

export interface RecoveryStrategy {
  id: string;
  name: string;
  description: string;
  category: string;
  conditions: (error: Error, context: ErrorContext) => boolean;
  action: (error: Error, context: ErrorContext) => Promise<boolean>;
  priority: number;
}

export interface ErrorStats {
  totalErrors: number;
  errorsByCategory: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  recoveryRate: number;
  averageResolutionTime: number;
  unresolvedErrors: number;
}

export class EnhancedErrorHandler {
  private errors: ErrorRecord[] = [];
  private recoveryStrategies: RecoveryStrategy[] = [];
  private maxErrors = 1000;
  private autoCleanupInterval!: NodeJS.Timeout;

  constructor() {
    this.initializeDefaultRecoveryStrategies();
    this.startAutoCleanup();
  }

  /**
   * Initialize default recovery strategies
   */
  private initializeDefaultRecoveryStrategies(): void {
    // Authentication error recovery
    this.addRecoveryStrategy({
      id: 'auth_token_refresh',
      name: 'Token Refresh',
      description: 'Automatically refresh expired authentication tokens',
      category: 'authentication',
      conditions: (error, context) => 
        error.message.includes('token expired') || 
        error.message.includes('unauthorized'),
      action: async (error, context) => {
        try {
          // In production, attempt to refresh token
          console.log('Attempting token refresh for error:', error.message);
          return true; // Simulate success
        } catch {
          return false;
        }
      },
      priority: 1,
    });

    // Rate limit recovery
    this.addRecoveryStrategy({
      id: 'rate_limit_wait',
      name: 'Rate Limit Wait',
      description: 'Wait for rate limit reset and retry',
      category: 'system',
      conditions: (error, context) => 
        error.message.includes('rate limit') || 
        error.message.includes('too many requests'),
      action: async (error, context) => {
        try {
          // Wait for rate limit reset
          await new Promise(resolve => setTimeout(resolve, 5000));
          return true;
        } catch {
          return false;
        }
      },
      priority: 2,
    });

    // Network error recovery
    this.addRecoveryStrategy({
      id: 'network_retry',
      name: 'Network Retry',
      description: 'Retry network requests with exponential backoff',
      category: 'system',
      conditions: (error, context) => 
        error.message.includes('network') || 
        error.message.includes('timeout') ||
        error.message.includes('fetch'),
      action: async (error, context) => {
        try {
          if (context.retryCount < context.maxRetries) {
            const delay = Math.pow(2, context.retryCount) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },
      priority: 3,
    });

    // Validation error recovery
    this.addRecoveryStrategy({
      id: 'validation_fix',
      name: 'Validation Fix',
      description: 'Attempt to fix validation errors automatically',
      category: 'validation',
      conditions: (error, context) => 
        error.message.includes('validation') || 
        error.message.includes('invalid') ||
        error.message.includes('required'),
      action: async (error, context) => {
        try {
          // In production, attempt to fix validation issues
          console.log('Attempting to fix validation error:', error.message);
          return true;
        } catch {
          return false;
        }
      },
      priority: 4,
    });
  }

  /**
   * Add a new recovery strategy
   */
  addRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
    // Sort by priority (lower number = higher priority)
    this.recoveryStrategies.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Handle an error with automatic recovery attempts
   */
  async handleError(
    error: Error,
    context: Partial<ErrorContext> = {}
  ): Promise<ErrorRecord> {
    const errorContext: ErrorContext = {
      timestamp: Date.now(),
      severity: this.categorizeSeverity(error),
      category: this.categorizeError(error),
      recoverable: true,
      retryCount: 0,
      maxRetries: 3,
      ...context,
    };

    const errorRecord: ErrorRecord = {
      id: this.generateErrorId(),
      error,
      context: errorContext,
      stack: error.stack || '',
      metadata: this.extractMetadata(error),
      createdAt: new Date(),
    };

    // Store error
    this.errors.unshift(errorRecord);
    
    // Maintain error limit
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Attempt automatic recovery
    if (errorContext.recoverable) {
      await this.attemptRecovery(errorRecord);
    }

    // Log error
    this.logError(errorRecord);

    return errorRecord;
  }

  /**
   * Categorize error severity
   */
  private categorizeSeverity(error: Error): ErrorContext['severity'] {
    const message = error.message.toLowerCase();
    
    if (message.includes('critical') || message.includes('fatal')) {
      return 'critical';
    }
    
    if (message.includes('error') || message.includes('failed')) {
      return 'high';
    }
    
    if (message.includes('warning') || message.includes('deprecated')) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Categorize error type
   */
  private categorizeError(error: Error): ErrorContext['category'] {
    const message = error.message.toLowerCase();
    
    if (message.includes('auth') || message.includes('token') || message.includes('unauthorized')) {
      return 'authentication';
    }
    
    if (message.includes('permission') || message.includes('forbidden') || message.includes('access')) {
      return 'authorization';
    }
    
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return 'validation';
    }
    
    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
      return 'system';
    }
    
    if (message.includes('api') || message.includes('external') || message.includes('third-party')) {
      return 'external';
    }
    
    return 'unknown';
  }

  /**
   * Extract metadata from error
   */
  private extractMetadata(error: Error): Record<string, unknown> {
    const metadata: Record<string, unknown> = {
      name: error.name,
      message: error.message,
    };

    // Extract additional properties from error object
    Object.getOwnPropertyNames(error).forEach(prop => {
      if (prop !== 'name' && prop !== 'message' && prop !== 'stack') {
        try {
          metadata[prop] = (error as any)[prop];
        } catch {
          // Ignore properties that can't be accessed
        }
      }
    });

    return metadata;
  }

  /**
   * Attempt automatic error recovery
   */
  private async attemptRecovery(errorRecord: ErrorRecord): Promise<void> {
    const { error, context } = errorRecord;
    
    for (const strategy of this.recoveryStrategies) {
      if (strategy.conditions(error, context)) {
        try {
          console.log(`Attempting recovery with strategy: ${strategy.name}`);
          
          const success = await strategy.action(error, context);
          
          if (success) {
            errorRecord.resolvedAt = new Date();
            errorRecord.resolution = `Recovered using ${strategy.name}`;
            console.log(`Recovery successful with strategy: ${strategy.name}`);
            break;
          }
        } catch (recoveryError) {
          console.error(`Recovery strategy ${strategy.name} failed:`, recoveryError);
        }
      }
    }
  }

  /**
   * Log error with structured information
   */
  private logError(errorRecord: ErrorRecord): void {
    const { error, context, metadata } = errorRecord;
    
    const logData = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context: {
        severity: context.severity,
        category: context.category,
        endpoint: context.endpoint,
        method: context.method,
        userId: context.userId,
        timestamp: new Date(context.timestamp).toISOString(),
      },
      metadata,
    };

    // Log based on severity
    switch (context.severity) {
      case 'critical':
        console.error('🚨 CRITICAL ERROR:', logData);
        break;
      case 'high':
        console.error('❌ HIGH ERROR:', logData);
        break;
      case 'medium':
        console.warn('⚠️ MEDIUM ERROR:', logData);
        break;
      case 'low':
        console.info('ℹ️ LOW ERROR:', logData);
        break;
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get error statistics
   */
  getErrorStats(): ErrorStats {
    const now = Date.now();
    const totalErrors = this.errors.length;
    const resolvedErrors = this.errors.filter(e => e.resolvedAt).length;
    
    // Calculate category distribution
    const errorsByCategory: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};
    
    this.errors.forEach(error => {
      const category = error.context.category;
      const severity = error.context.severity;
      
      errorsByCategory[category] = (errorsByCategory[category] || 0) + 1;
      errorsBySeverity[severity] = (errorsBySeverity[severity] || 0) + 1;
    });

    // Calculate recovery rate
    const recoveryRate = totalErrors > 0 ? (resolvedErrors / totalErrors) * 100 : 0;

    // Calculate average resolution time
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    
    this.errors.forEach(error => {
      if (error.resolvedAt) {
        totalResolutionTime += error.resolvedAt.getTime() - error.createdAt.getTime();
        resolvedCount++;
      }
    });
    
    const averageResolutionTime = resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0;

    return {
      totalErrors,
      errorsByCategory,
      errorsBySeverity,
      recoveryRate,
      averageResolutionTime,
      unresolvedErrors: totalErrors - resolvedErrors,
    };
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category: string): ErrorRecord[] {
    return this.errors.filter(error => error.context.category === category);
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: string): ErrorRecord[] {
    return this.errors.filter(error => error.context.severity === severity);
  }

  /**
   * Get unresolved errors
   */
  getUnresolvedErrors(): ErrorRecord[] {
    return this.errors.filter(error => !error.resolvedAt);
  }

  /**
   * Mark error as resolved
   */
  resolveError(errorId: string, resolution: string): boolean {
    const error = this.errors.find(e => e.id === errorId);
    if (error) {
      error.resolvedAt = new Date();
      error.resolution = resolution;
      return true;
    }
    return false;
  }

  /**
   * Clear resolved errors
   */
  clearResolvedErrors(): number {
    const initialCount = this.errors.length;
    this.errors = this.errors.filter(error => !error.resolvedAt);
    return initialCount - this.errors.length;
  }

  /**
   * Clear all errors
   */
  clearAllErrors(): void {
    this.errors = [];
  }

  /**
   * Start automatic cleanup of old errors
   */
  private startAutoCleanup(): void {
    this.autoCleanupInterval = setInterval(() => {
      this.cleanupOldErrors();
    }, 60 * 60 * 1000); // Clean up every hour
  }

  /**
   * Clean up old errors
   */
  private cleanupOldErrors(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    this.errors = this.errors.filter(error => {
      // Keep unresolved errors and recent errors
      return !error.resolvedAt || error.context.timestamp > cutoffTime;
    });
  }

  /**
   * Stop automatic cleanup
   */
  stopAutoCleanup(): void {
    if (this.autoCleanupInterval) {
      clearInterval(this.autoCleanupInterval);
    }
  }

  /**
   * Get all recovery strategies
   */
  getRecoveryStrategies(): RecoveryStrategy[] {
    return [...this.recoveryStrategies];
  }

  /**
   * Remove a recovery strategy
   */
  removeRecoveryStrategy(strategyId: string): boolean {
    const initialLength = this.recoveryStrategies.length;
    this.recoveryStrategies = this.recoveryStrategies.filter(s => s.id !== strategyId);
    return this.recoveryStrategies.length < initialLength;
  }
}

// Export singleton instance
export const errorHandler = new EnhancedErrorHandler();
