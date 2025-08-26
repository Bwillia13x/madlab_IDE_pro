'use client';

import React from 'react';
import { Skeleton } from './skeleton';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { cn } from '@/lib/utils';

interface WidgetSkeletonProps {
  title?: string;
  className?: string;
  variant?: 'default' | 'chart' | 'table' | 'card' | 'minimal';
  showHeader?: boolean;
  height?: number;
  width?: number | string;
}

export function WidgetSkeleton({
  title,
  className,
  variant = 'default',
  showHeader = true,
  height = 200,
  width = '100%'
}: WidgetSkeletonProps) {
  const renderSkeletonContent = () => {
    switch (variant) {
      case 'chart':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-4/6" />
              <Skeleton className="h-3 w-3/6" />
            </div>
            <div className="flex items-end justify-between space-x-2 pt-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="w-2"
                  style={{ height: `${Math.random() * 60 + 20}px` }}
                />
              ))}
            </div>
          </div>
        );

      case 'table':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex space-x-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        );

      case 'card':
        return (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-6 w-24" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        );

      case 'minimal':
        return (
          <div className="flex items-center justify-center h-full">
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        );

      default:
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        );
    }
  };

  return (
    <Card className={cn("animate-pulse", className)} style={{ height, width }}>
      {showHeader && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            {title ? (
              <Skeleton className="h-5 w-32" />
            ) : (
              <Skeleton className="h-5 w-24" />
            )}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {renderSkeletonContent()}
      </CardContent>
    </Card>
  );
}

// Specialized skeleton variants for common widget types
export function ChartSkeleton({ title, className, height, width }: Omit<WidgetSkeletonProps, 'variant'>) {
  return (
    <WidgetSkeleton
      title={title}
      variant="chart"
      className={className}
      height={height}
      width={width}
    />
  );
}

export function TableSkeleton({ title, className, height, width }: Omit<WidgetSkeletonProps, 'variant'>) {
  return (
    <WidgetSkeleton
      title={title}
      variant="table"
      className={className}
      height={height}
      width={width}
    />
  );
}

export function CardSkeleton({ title, className, height, width }: Omit<WidgetSkeletonProps, 'variant'>) {
  return (
    <WidgetSkeleton
      title={title}
      variant="card"
      className={className}
      height={height}
      width={width}
    />
  );
}

export function MinimalSkeleton({ className, height, width }: Omit<WidgetSkeletonProps, 'variant' | 'title'>) {
  return (
    <WidgetSkeleton
      variant="minimal"
      className={className}
      height={height}
      width={width}
      showHeader={false}
    />
  );
}
