/**
 * Enhanced Error Handling System
 * User-friendly error messages with recovery suggestions for financial workbench
 */

import { analytics } from '../analytics';

// Error categories for financial software
export type ErrorCategory = 
  | 'data_provider'
  | 'network'
  | 'validation'
  | 'calculation'
  | 'permission'
  | 'widget_rendering'
  | 'export'
  | 'authentication'
  | 'system';

// Error severity levels
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// Enhanced error interface
export interface EnhancedError extends Error {
  category: ErrorCategory;
  severity: ErrorSeverity;
  userMessage: string;
  technicalMessage: string;
  recoveryActions: RecoveryAction[];
  context?: Record<string, any>;
  code?: string;
}

// Recovery action interface
export interface RecoveryAction {
  label: string;
  action: () => void | Promise<void>;
  type: 'primary' | 'secondary' | 'destructive';
  icon?: string;
}

// Error handler class
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorHistory: EnhancedError[] = [];
  private maxHistorySize = 100;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle an error with enhanced context and recovery
   */
  handle(error: Error | EnhancedError, context?: Record<string, any>): EnhancedError {
    const enhancedError = this.enhanceError(error, context);
    
    // Track error in analytics
    analytics.track('error_occurred', {
      category: enhancedError.category,
      severity: enhancedError.severity,
      code: enhancedError.code,
      user_message: enhancedError.userMessage,
      technical_message: enhancedError.technicalMessage,
      context: enhancedError.context,
      stack: enhancedError.stack,
    }, 'error');

    // Add to history
    this.addToHistory(enhancedError);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorHandler]', enhancedError);
    }

    return enhancedError;
  }

  /**
   * Create user-friendly error from raw error
   */
  private enhanceError(error: Error | EnhancedError, context?: Record<string, any>): EnhancedError {
    // If already enhanced, return as-is
    if ('category' in error && 'userMessage' in error) {
      return { ...error, context: { ...error.context, ...context } };
    }

    const message = error.message.toLowerCase();
    
    // Data provider errors
    if (message.includes('provider not found') || message.includes('fetch')) {
      return {
        ...error,
        category: 'data_provider',
        severity: 'high',
        code: 'DATA_PROVIDER_ERROR',
        userMessage: 'Unable to connect to data provider',
        technicalMessage: error.message,
        recoveryActions: [
          {
            label: 'Retry Connection',
            action: () => window.location.reload(),
            type: 'primary',
            icon: 'refresh'
          },
          {
            label: 'Switch Provider',
            action: async () => {
              // Implementation would switch to fallback provider
              console.log('Switching to fallback provider');
            },
            type: 'secondary',
            icon: 'switch'
          }
        ],
        context
      } as EnhancedError;
    }

    // Network errors
    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
      return {
        ...error,
        category: 'network',
        severity: 'medium',
        code: 'NETWORK_ERROR',
        userMessage: 'Connection issue detected',
        technicalMessage: error.message,
        recoveryActions: [
          {
            label: 'Retry Request',
            action: () => window.location.reload(),
            type: 'primary',
            icon: 'refresh'
          },
          {
            label: 'Check Connection',
            action: () => {
              analytics.track('network_check_requested', {}, 'feature_usage');
              alert('Please check your internet connection and try again.');
            },
            type: 'secondary',
            icon: 'wifi'
          }
        ],
        context
      } as EnhancedError;
    }

    // Validation errors
    if (message.includes('invalid') || message.includes('required') || message.includes('format')) {
      return {
        ...error,
        category: 'validation',
        severity: 'low',
        code: 'VALIDATION_ERROR',
        userMessage: 'Please check your input',
        technicalMessage: error.message,
        recoveryActions: [
          {
            label: 'Review Input',
            action: () => {
              // Focus on first invalid field
              const invalidField = document.querySelector('[data-invalid]') as HTMLElement;
              invalidField?.focus();
            },
            type: 'primary',
            icon: 'edit'
          }
        ],
        context
      } as EnhancedError;
    }

    // Calculation errors
    if (message.includes('calculation') || message.includes('math') || message.includes('NaN')) {
      return {
        ...error,
        category: 'calculation',
        severity: 'medium',
        code: 'CALCULATION_ERROR',
        userMessage: 'Unable to complete calculation',
        technicalMessage: error.message,
        recoveryActions: [
          {
            label: 'Reset Values',
            action: () => {
              // Implementation would reset calculation inputs
              analytics.track('calculation_reset_requested', {}, 'feature_usage');
            },
            type: 'secondary',
            icon: 'reset'
          },
          {
            label: 'Use Default',
            action: () => {
              // Implementation would use default values
              analytics.track('calculation_default_used', {}, 'feature_usage');
            },
            type: 'primary',
            icon: 'settings'
          }
        ],
        context
      } as EnhancedError;
    }

    // Widget rendering errors
    if (message.includes('render') || message.includes('component') || message.includes('widget')) {
      return {
        ...error,
        category: 'widget_rendering',
        severity: 'medium',
        code: 'WIDGET_ERROR',
        userMessage: 'Widget failed to load',
        technicalMessage: error.message,
        recoveryActions: [
          {
            label: 'Refresh Widget',
            action: () => {
              // Implementation would refresh specific widget
              analytics.track('widget_refresh_requested', {}, 'feature_usage');
            },
            type: 'primary',
            icon: 'refresh'
          },
          {
            label: 'Remove Widget',
            action: () => {
              // Implementation would remove problematic widget
              analytics.track('widget_removal_requested', {}, 'feature_usage');
            },
            type: 'destructive',
            icon: 'trash'
          }
        ],
        context
      } as EnhancedError;
    }

    // Export errors
    if (message.includes('export') || message.includes('download') || message.includes('file')) {
      return {
        ...error,
        category: 'export',
        severity: 'low',
        code: 'EXPORT_ERROR',
        userMessage: 'Export failed',
        technicalMessage: error.message,
        recoveryActions: [
          {
            label: 'Try Again',
            action: () => {
              analytics.track('export_retry_requested', {}, 'feature_usage');
            },
            type: 'primary',
            icon: 'download'
          },
          {
            label: 'Different Format',
            action: () => {
              // Implementation would suggest alternative format
              analytics.track('export_format_change_suggested', {}, 'feature_usage');
            },
            type: 'secondary',
            icon: 'file-type'
          }
        ],
        context
      } as EnhancedError;
    }

    // Generic system error
    return {
      ...error,
      category: 'system',
      severity: 'medium',
      code: 'SYSTEM_ERROR',
      userMessage: 'An unexpected error occurred',
      technicalMessage: error.message,
      recoveryActions: [
        {
          label: 'Refresh Page',
          action: () => window.location.reload(),
          type: 'primary',
          icon: 'refresh'
        },
        {
          label: 'Report Issue',
          action: () => {
            analytics.track('error_report_requested', {
              error_message: error.message,
              error_stack: error.stack,
            }, 'feature_usage');
            
            // Open issue reporting
            window.open('https://github.com/madlab/issues/new', '_blank');
          },
          type: 'secondary',
          icon: 'bug'
        }
      ],
      context
    } as EnhancedError;
  }

  /**
   * Add error to history
   */
  private addToHistory(error: EnhancedError): void {
    this.errorHistory.unshift(error);
    
    // Keep only recent errors
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Get error history
   */
  getHistory(): EnhancedError[] {
    return [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Get error statistics
   */
  getStats(): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recentErrors: number;
  } {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    const errorsByCategory = this.errorHistory.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1;
      return acc;
    }, {} as Record<ErrorCategory, number>);

    const errorsBySeverity = this.errorHistory.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    const recentErrors = this.errorHistory.filter(error => 
      (now - new Date(error.message).getTime()) < oneHour
    ).length;

    return {
      totalErrors: this.errorHistory.length,
      errorsByCategory,
      errorsBySeverity,
      recentErrors,
    };
  }
}

// Create and export singleton
export const errorHandler = ErrorHandler.getInstance();

// Convenience functions
export const handleError = (error: Error, context?: Record<string, any>): EnhancedError => {
  return errorHandler.handle(error, context);
};

export const createError = (
  category: ErrorCategory,
  userMessage: string,
  technicalMessage: string,
  severity: ErrorSeverity = 'medium',
  recoveryActions: RecoveryAction[] = []
): EnhancedError => {
  const error = new Error(technicalMessage) as EnhancedError;
  error.category = category;
  error.severity = severity;
  error.userMessage = userMessage;
  error.technicalMessage = technicalMessage;
  error.recoveryActions = recoveryActions;
  return error;
};

export default errorHandler;