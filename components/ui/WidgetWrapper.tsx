'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';
import { WidgetSkeleton } from './WidgetSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { MoreHorizontal, Settings, RefreshCw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { cn } from '@/lib/utils';

interface WidgetWrapperProps {
  children: React.ReactNode;
  widget: {
    id: string;
    type: string;
    title: string;
    description?: string;
    category?: string;
  };
  className?: string;
  showHeader?: boolean;
  showActions?: boolean;
  onRefresh?: () => void;
  onSettings?: () => void;
  onDuplicate?: () => void;
  onRemove?: () => void;
  loading?: boolean;
  error?: Error | null;
  skeletonVariant?: 'default' | 'chart' | 'table' | 'card' | 'minimal';
  skeletonHeight?: number;
}

export function WidgetWrapper({
  children,
  widget,
  className,
  showHeader = true,
  showActions = true,
  onRefresh,
  onSettings,
  onDuplicate,
  onRemove,
  loading = false,
  error = null,
  skeletonVariant = 'default',
  skeletonHeight = 200
}: WidgetWrapperProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  const renderWidgetContent = () => {
    if (loading) {
      return (
        <WidgetSkeleton
          title={widget.title}
          variant={skeletonVariant}
          height={skeletonHeight}
        />
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full p-4 text-center">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Failed to load {widget.title}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {error.message}
            </p>
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="mt-2"
              >
                <RefreshCw className={cn("h-3 w-3 mr-1", isRefreshing && "animate-spin")} />
                Retry
              </Button>
            )}
          </div>
        </div>
      );
    }

    return children;
  };

  const renderHeader = () => {
    if (!showHeader) return null;

    return (
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium truncate">
              {widget.title}
            </CardTitle>
            {widget.description && (
              <p className="text-xs text-muted-foreground truncate mt-1">
                {widget.description}
              </p>
            )}
          </div>
          
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-3 w-3" />
                  <span className="sr-only">Widget actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {onRefresh && (
                  <DropdownMenuItem onClick={handleRefresh} disabled={isRefreshing}>
                    <RefreshCw className={cn("h-3 w-3 mr-2", isRefreshing && "animate-spin")} />
                    Refresh
                  </DropdownMenuItem>
                )}
                
                {onSettings && (
                  <DropdownMenuItem onClick={onSettings}>
                    <Settings className="h-3 w-3 mr-2" />
                    Settings
                  </DropdownMenuItem>
                )}
                
                {(onDuplicate || onRemove) && <DropdownMenuSeparator />}
                
                {onDuplicate && (
                  <DropdownMenuItem onClick={onDuplicate}>
                    Duplicate
                  </DropdownMenuItem>
                )}
                
                {onRemove && (
                  <DropdownMenuItem onClick={onRemove} className="text-destructive">
                    Remove
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
    );
  };

  return (
    <Card className={cn("group relative", className)}>
      {renderHeader()}
      
      <CardContent className="p-0">
        <WidgetErrorBoundary
          widgetType={widget.type}
          widgetTitle={widget.title}
          onError={(error, errorInfo) => {
            console.error(`Widget ${widget.id} error:`, error, errorInfo);
          }}
        >
          <Suspense fallback={
            <WidgetSkeleton
              title={widget.title}
              variant={skeletonVariant}
              height={skeletonHeight}
              showHeader={false}
            />
          }>
            {renderWidgetContent()}
          </Suspense>
        </WidgetErrorBoundary>
      </CardContent>
    </Card>
  );
}

// Higher-order component for wrapping existing widgets
export function withWidgetWrapper<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  defaultProps: Partial<WidgetWrapperProps> = {}
) {
  return function WidgetWrapperHOC(props: P & Partial<WidgetWrapperProps>) {
    const {
      widget,
      className,
      showHeader,
      showActions,
      onRefresh,
      onSettings,
      onDuplicate,
      onRemove,
      loading,
      error,
      skeletonVariant,
      skeletonHeight,
      ...widgetProps
    } = props;

    if (!widget) {
      return <WrappedComponent {...(props as P)} />;
    }

    return (
      <WidgetWrapper
        widget={widget}
        className={className}
        showHeader={showHeader}
        showActions={showActions}
        onRefresh={onRefresh}
        onSettings={onSettings}
        onDuplicate={onDuplicate}
        onRemove={onRemove}
        loading={loading}
        error={error}
        skeletonVariant={skeletonVariant}
        skeletonHeight={skeletonHeight}
        {...defaultProps}
      >
        <WrappedComponent {...(widgetProps as P)} />
      </WidgetWrapper>
    );
  };
}
