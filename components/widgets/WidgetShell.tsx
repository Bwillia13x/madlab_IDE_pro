'use client';

import React, { Suspense } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function FallbackSkeleton() {
  return (
    <div className="w-full h-full p-3">
      <Skeleton className="h-4 w-1/3 mb-2" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

class Boundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; message?: string }>{
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(err: unknown) {
    return { hasError: true, message: err instanceof Error ? err.message : 'Widget error' };
  }
  componentDidCatch(err: unknown) {
    // eslint-disable-next-line no-console
    console.warn('Widget render error:', err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <Card className="w-full h-full bg-destructive/10 border-destructive">
          <div className="w-full h-full flex items-center justify-center text-xs text-destructive p-3 text-center">
            Failed to render widget{this.state.message ? `: ${this.state.message}` : ''}
          </div>
        </Card>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

export function WidgetShell({ children }: { children: React.ReactNode }) {
  return (
    <Boundary>
      <Suspense fallback={<FallbackSkeleton />}>{children}</Suspense>
    </Boundary>
  );
}

