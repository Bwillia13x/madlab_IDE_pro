'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Info } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { cn } from '@/lib/utils';

interface Props {
  children: ReactNode;
  widgetType?: string;
  widgetTitle?: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  className?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Widget Error Boundary caught an error:', error, errorInfo);
    
    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReportError = () => {
    // In a real app, this would send the error to an error reporting service
    console.log('Error report requested for:', {
      widgetType: this.props.widgetType,
      widgetTitle: this.props.widgetTitle,
      error: this.state.error?.message,
      stack: this.state.error?.stack
    });
    
    // Show a toast or notification that the error was reported
    // For now, just log to console
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Card className={cn("border-destructive/50 bg-destructive/5", this.props.className)}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Widget Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {this.props.widgetTitle && (
                <p className="font-medium text-foreground mb-1">
                  {this.props.widgetTitle}
                </p>
              )}
              <p>
                This widget encountered an error and couldn't load properly.
                {this.state.error && (
                  <span className="block mt-1 text-xs font-mono bg-muted p-1 rounded">
                    {this.state.error.message}
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleRetry}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={this.handleReportError}
                className="flex items-center gap-2"
              >
                <Info className="h-3 w-3" />
                Report
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useWidgetErrorBoundary() {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setHasError(true);
      setError(event.error);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const resetError = React.useCallback(() => {
    setHasError(false);
    setError(null);
  }, []);

  return { hasError, error, resetError };
}
