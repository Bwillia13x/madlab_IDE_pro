'use client';

import { ResponsiveContainer } from 'recharts';
import { useEffect, useRef, useState } from 'react';

interface ChartContainerProps {
  children: React.ReactNode;
  className?: string;
  minHeight?: number;
  debounceMs?: number;
}

/**
 * Wrapper for ResponsiveContainer that fixes width(0)/height(0) rendering issues
 * by ensuring the container has valid dimensions before rendering charts.
 */
export function ChartContainer({ 
  children, 
  className = '', 
  minHeight = 200, 
  debounceMs = 100 
}: ChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Ensure predictable rendering under test environments (JSDOM has no layout)
    if (process.env.NODE_ENV === 'test' || typeof window === 'undefined') {
      const fallbackWidth = containerRef.current.parentElement?.clientWidth || 600;
      const fallbackHeight = Math.max(minHeight, 200); // Ensure minimum height for charts
      setDimensions({ width: fallbackWidth, height: fallbackHeight });
      setShouldRender(true);
      return;
    }

    const updateDimensions = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0) {
        setDimensions({ width: rect.width, height: rect.height });
        setShouldRender(true);
      }
    };

    // Debounced resize handler
    let timeoutId: NodeJS.Timeout;
    const debouncedUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateDimensions, debounceMs);
    };

    // Initial measurement
    updateDimensions();

    // Set up ResizeObserver for more reliable dimension tracking
    let resizeObserver: ResizeObserver | undefined;
    let intersectionObserver: IntersectionObserver | undefined;

    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(debouncedUpdate);
      resizeObserver.observe(containerRef.current);
    }

    // Fallback with intersection observer for visibility changes
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Slight delay to allow for layout completion
            setTimeout(updateDimensions, 50);
          }
        });
      });
      intersectionObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
    };
  }, [debounceMs]);

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full ${className}`}
      style={{ minHeight }}
      data-testid="chart-container"
    >
      {shouldRender && dimensions.width > 0 && dimensions.height > 0 ? (
        <ResponsiveContainer 
          width={dimensions.width} 
          height={dimensions.height} 
          minHeight={minHeight}
        >
          {children as React.ReactElement}
        </ResponsiveContainer>
      ) : (
        <div 
          className="w-full flex items-center justify-center text-muted-foreground"
          style={{ height: minHeight }}
        >
          <div className="text-sm">Loading chart...</div>
        </div>
      )}
    </div>
  );
}