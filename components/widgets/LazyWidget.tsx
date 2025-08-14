'use client';

import { Suspense, useState, useEffect } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { loadWidgetComponent } from '@/lib/widgets/loader';
import type { WidgetProps } from '@/lib/widgets/schema';

interface LazyWidgetProps extends WidgetProps {
  type: string;
  fallback?: React.ReactNode;
}

function LoadingSpinner({ name }: { name?: string }) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-4 text-sm">
      <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
      <span className="text-muted-foreground">
        Loading {name || 'widget'}...
      </span>
    </div>
  );
}

function LoadingError({ error, type, onRetry }: { error: string; type: string; onRetry?: () => void }) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-4 text-sm border border-destructive/40 bg-card/50">
      <AlertCircle className="h-6 w-6 text-destructive mb-2" />
      <div className="text-center mb-2">
        <div className="font-medium text-destructive">Failed to load widget</div>
        <div className="text-xs text-muted-foreground mt-1">
          Widget type: {type}
        </div>
        <div className="text-xs text-muted-foreground">
          Error: {error}
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs px-2 py-1 rounded border border-border hover:bg-accent"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function LazyWidget({ type, fallback, ...props }: LazyWidgetProps) {
  const [Component, setComponent] = useState<React.ComponentType<WidgetProps> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadComponent = async () => {
      try {
        setLoading(true);
        setError(null);

        const component = (await loadWidgetComponent(type)) as React.ComponentType<WidgetProps> | null;
        
        if (cancelled) return;

        if (component) {
          setComponent(() => component as React.ComponentType<WidgetProps>);
        } else {
          setError(`Widget component not found: ${type}`);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unknown loading error');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadComponent();

    return () => {
      cancelled = true;
    };
  }, [type, retryKey]);

  const handleRetry = () => {
    setRetryKey(prev => prev + 1);
  };

  if (loading) {
    return fallback || <LoadingSpinner name={type} />;
  }

  if (error) {
    return <LoadingError error={error} type={type} onRetry={handleRetry} />;
  }

  if (!Component) {
    return <LoadingError error="Component not available" type={type} onRetry={handleRetry} />;
  }

  return (
    <ErrorBoundary errorComponent={`Widget (${type})`}>
      <Suspense fallback={fallback || <LoadingSpinner name={type} />}>
        <Component {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

// Higher-order component for lazy loading widgets
export function withLazyLoading<P extends WidgetProps>(type: string) {
  return function LazyWrappedWidget(props: P) {
    return <LazyWidget type={type} {...props} />;
  };
}

// Preload a widget component for better UX
export async function preloadWidget(type: string): Promise<void> {
  try {
    await loadWidgetComponent(type);
  } catch (error) {
    console.warn(`Failed to preload widget ${type}:`, error);
  }
}

// Preload multiple widgets
export async function preloadWidgets(types: string[]): Promise<void> {
  const promises = types.map(type => preloadWidget(type));
  await Promise.allSettled(promises);
}

export default LazyWidget;