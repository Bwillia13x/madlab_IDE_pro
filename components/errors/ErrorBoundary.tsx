'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { errorHandler, type EnhancedError } from '@/lib/errors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: EnhancedError, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error: EnhancedError | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  private errorId: string | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error: null, // Will be set in componentDidCatch
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Enhance the error with context
    const enhancedError = errorHandler.handle(error, {
      component_stack: errorInfo.componentStack,
      error_boundary: true,
      error_id: this.state.errorId,
    });

    this.setState({ error: enhancedError });

    // Call optional onError prop
    if (this.props.onError) {
      this.props.onError(enhancedError, errorInfo);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // If custom fallback provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
    });
  };
}

interface ErrorFallbackProps {
  error: EnhancedError;
  onReset: () => void;
}

function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 border-red-200 bg-red-50';
      case 'high': return 'text-orange-600 border-orange-200 bg-orange-50';
      case 'medium': return 'text-yellow-600 border-yellow-200 bg-yellow-50';
      case 'low': return 'text-blue-600 border-blue-200 bg-blue-50';
      default: return 'text-gray-600 border-gray-200 bg-gray-50';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-[200px] w-full flex items-center justify-center p-4">
      <Card className={`max-w-md w-full p-6 ${getSeverityColor(error.severity)}`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {getSeverityIcon(error.severity)}
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">
              {error.userMessage}
            </h3>
            
            <p className="text-sm text-muted-foreground mb-4">
              {error.category.replace('_', ' ')} • {error.severity} severity
            </p>

            {process.env.NODE_ENV === 'development' && (
              <details className="mb-4">
                <summary className="text-xs cursor-pointer text-muted-foreground">
                  Technical Details
                </summary>
                <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto">
                  {error.technicalMessage}
                </pre>
              </details>
            )}

            <div className="space-y-2">
              {error.recoveryActions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.type === 'primary' ? 'default' : 
                           action.type === 'destructive' ? 'destructive' : 'secondary'}
                  size="sm"
                  className="w-full"
                  onClick={action.action}
                >
                  {action.icon && (
                    <span className="mr-2">
                      {action.icon === 'refresh' && <RefreshCw className="h-4 w-4" />}
                      {action.icon === 'bug' && <Bug className="h-4 w-4" />}
                      {action.icon === 'settings' && <Settings className="h-4 w-4" />}
                    </span>
                  )}
                  {action.label}
                </Button>
              ))}
              
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={onReset}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Hook for using error boundary in functional components
export function useErrorHandler() {
  const handleError = (error: Error, context?: Record<string, any>) => {
    return errorHandler.handle(error, context);
  };

  const reportError = (error: Error | EnhancedError, context?: Record<string, any>) => {
    const enhancedError = 'category' in error ? error : errorHandler.handle(error, context);
    
    // Could integrate with error reporting service here
    console.error('[User Reported Error]', enhancedError);
    
    return enhancedError;
  };

  return {
    handleError,
    reportError,
    errorHistory: errorHandler.getHistory(),
    errorStats: errorHandler.getStats(),
  };
}

export default ErrorBoundary;