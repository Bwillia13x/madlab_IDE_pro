'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
// Note: useIntersectionObserver will be implemented inline for now
import { measureWidgetRender } from '@/lib/performance/monitor';

interface VirtualizedWidgetProps {
  children: React.ReactNode;
  widgetId: string;
  widgetType: string;
  className?: string;
  fallback?: React.ReactNode;
  // Performance optimizations
  renderThreshold?: number;
  unloadThreshold?: number;
  priority?: 'high' | 'normal' | 'low';
}

export function VirtualizedWidget({
  children,
  widgetId,
  widgetType,
  className,
  fallback,
  renderThreshold = 0.1, // Start rendering when 10% visible
  unloadThreshold = -0.5, // Unload when completely out of view + buffer
  priority = 'normal'
}: VirtualizedWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(priority === 'high');
  const renderTimeoutRef = useRef<NodeJS.Timeout>();

  // Intersection observer for virtualization (inline implementation)
  const [isIntersecting, setIsIntersecting] = useState(priority === 'high');
  const [intersectionRatio, setIntersectionRatio] = useState(priority === 'high' ? 1 : 0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || priority === 'high' || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsIntersecting(entry.isIntersecting);
        setIntersectionRatio(entry.intersectionRatio);
      },
      {
        threshold: [0, renderThreshold, 1],
        rootMargin: '50px'
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [renderThreshold, priority]);

  // Determine if widget should be rendered based on visibility and priority
  const shouldBeRendered = useCallback(() => {
    if (priority === 'high') return true; // Always render high priority widgets
    if (priority === 'low' && intersectionRatio < renderThreshold) return false;
    return isIntersecting || intersectionRatio >= renderThreshold;
  }, [isIntersecting, intersectionRatio, priority, renderThreshold]);

  // Handle render state changes with debouncing
  useEffect(() => {
    const shouldRenderNow = shouldBeRendered();
    
    if (shouldRenderNow && !shouldRender) {
      // Debounce rendering for performance
      renderTimeoutRef.current = setTimeout(() => {
        setShouldRender(true);
      }, priority === 'high' ? 0 : 10);
    } else if (!shouldRenderNow && shouldRender && intersectionRatio <= unloadThreshold) {
      // Only unload if we're far enough from view and it's not high priority
      if (priority !== 'high') {
        setShouldRender(false);
      }
    }

    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, [shouldBeRendered, shouldRender, intersectionRatio, unloadThreshold, priority]);

  // Render the widget with performance monitoring
  const renderWidget = useCallback(() => {
    if (!shouldRender) {
      return fallback || (
        <div className="h-full w-full bg-card/30 border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
          Widget not loaded
        </div>
      );
    }

    // Measure widget render performance
    return measureWidgetRender(widgetType, () => children);
  }, [shouldRender, children, widgetType, fallback]);

  return (
    <div
      ref={containerRef}
      className={className}
      data-widget-id={widgetId}
      data-widget-type={widgetType}
      data-rendered={shouldRender}
      data-priority={priority}
      style={{
        // Ensure container maintains size even when not rendered
        minHeight: shouldRender ? undefined : '200px',
        contain: 'layout style paint' // CSS containment for better performance
      }}
    >
      {renderWidget()}
    </div>
  );
}

// Hook for virtualized widget performance
export function useVirtualizedWidget(widgetType: string) {
  const [renderCount, setRenderCount] = useState(0);
  const [lastRenderTime, setLastRenderTime] = useState<number>();

  const trackRender = useCallback(() => {
    setRenderCount(prev => prev + 1);
    setLastRenderTime(Date.now());
  }, []);

  useEffect(() => {
    trackRender();
  }, [trackRender]);

  return {
    renderCount,
    lastRenderTime,
    trackRender
  };
}