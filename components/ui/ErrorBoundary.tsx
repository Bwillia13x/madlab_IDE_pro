'use client';

import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from './button';
import { handleError } from '@/lib/errors';
import { showErrorToast } from '@/lib/errors/toast';

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorComponent?: string; // Component name for better error messages
};

type ErrorBoundaryState = { 
  hasError: boolean; 
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Use enhanced error handling system
    const enhancedError = handleError(error, {
      component: this.props.errorComponent || 'Unknown Component',
      component_stack: errorInfo.componentStack,
      error_boundary: true,
    });
    
    // Update state with error details
    this.setState({
      error: enhancedError,
      errorInfo
    });
    
    // Show user-friendly error toast
    showErrorToast(enhancedError, { 
      duration: 8000,
      showRecovery: false // Recovery actions handled in the UI
    });
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDevelopment = process.env.NODE_ENV === 'development';
      
      return (
        <div 
          className="w-full h-full flex flex-col items-center justify-center p-4 text-sm border border-destructive/40 bg-card/50"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="font-medium text-destructive">
              {this.props.errorComponent ? `${this.props.errorComponent} Error` : 'Application Error'}
            </span>
          </div>
          
          <div className="text-center text-muted-foreground mb-4 max-w-md">
            {this.props.errorComponent === 'Financial Calculation' 
              ? 'A calculation error occurred. This may affect financial accuracy. Please refresh and try again.'
              : 'An unexpected error occurred. Your data is safe, but this component needs to be reloaded.'
            }
          </div>

          {isDevelopment && this.state.error && (
            <details className="mb-4 w-full max-w-lg">
              <summary className="cursor-pointer text-xs text-muted-foreground mb-2">
                Technical Details (Development Only)
              </summary>
              <div className="text-xs font-mono bg-muted p-2 rounded border overflow-auto max-h-32">
                <div className="text-destructive font-semibold">{this.state.error.name}: {this.state.error.message}</div>
                {this.state.error.stack && (
                  <pre className="mt-2 whitespace-pre-wrap text-muted-foreground">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            </details>
          )}

          <Button 
            variant="outline" 
            size="sm" 
            onClick={this.handleReload}
            className="flex items-center gap-2"
          >
            <RefreshCcw className="h-3 w-3" />
            Try Again
          </Button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

export default ErrorBoundary;


