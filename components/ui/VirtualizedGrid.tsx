'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { debounce } from 'lodash-es';

interface VirtualizedGridProps {
  items: any[];
  itemHeight: number;
  itemWidth: number;
  containerWidth: number;
  containerHeight: number;
  renderItem: (props: {
    index: number;
    style: React.CSSProperties;
    data: any;
  }) => React.ReactNode;
  getItemKey?: (index: number, data: any) => string;
  overscanCount?: number;
  className?: string;
}

export function VirtualizedGrid({
  items,
  itemHeight,
  itemWidth,
  containerWidth,
  containerHeight,
  renderItem,
  getItemKey,
  overscanCount = 2,
  className
}: VirtualizedGridProps) {
  const [dimensions, setDimensions] = useState({
    width: containerWidth,
    height: containerHeight
  });

  const gridRef = useRef<Grid<any[]>>(null);

  // Calculate grid layout
  const columnCount = Math.floor(containerWidth / itemWidth) || 1;
  const rowCount = Math.ceil(items.length / columnCount);

  // Create data structure for react-window
  const gridData = useMemo(() => {
    const data = [];
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
      const row = [];
      for (let colIndex = 0; colIndex < columnCount; colIndex++) {
        const itemIndex = rowIndex * columnCount + colIndex;
        if (itemIndex < items.length) {
          row.push(items[itemIndex]);
        } else {
          row.push(null);
        }
      }
      data.push(row);
    }
    return data;
  }, [items, rowCount, columnCount]);

  const handleResize = useCallback(
    debounce((width: number, height: number) => {
      setDimensions({ width, height });
      if (gridRef.current && (gridRef.current as any).resetAfterIndices) {
        (gridRef.current as any).resetAfterIndices({
          columnIndex: 0,
          rowIndex: 0,
          shouldForceUpdate: true
        });
      }
    }, 150),
    []
  );

  const Cell = ({ columnIndex, rowIndex, style }: { columnIndex: number; rowIndex: number; style: React.CSSProperties }) => {
    const item = gridData[rowIndex]?.[columnIndex];
    const itemIndex = rowIndex * columnCount + columnIndex;

    if (!item) {
      return <div style={style} />;
    }

    return (
      <div style={style}>
        {renderItem({ 
          index: itemIndex, 
          style: { 
            ...style, 
            padding: '4px',
            width: itemWidth - 8,
            height: itemHeight - 8
          }, 
          data: item 
        })}
      </div>
    );
  };

  return (
    <Grid
      ref={gridRef}
      className={className}
      height={dimensions.height}
      width={dimensions.width}
      rowCount={rowCount}
      columnCount={columnCount}
      rowHeight={itemHeight}
      columnWidth={itemWidth}
      itemData={gridData}
      overscanRowCount={overscanCount}
      overscanColumnCount={overscanCount}
      itemKey={getItemKey ? ({ columnIndex, rowIndex }: { columnIndex: number; rowIndex: number }) => {
        const itemIndex = rowIndex * columnCount + columnIndex;
        return getItemKey(itemIndex, gridData[rowIndex]?.[columnIndex]);
      } : undefined}
    >
      {Cell}
    </Grid>
  );
}

// Hook for measuring container dimensions
export function useContainerDimensions(containerRef: React.RefObject<HTMLElement>) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({ width: clientWidth, height: clientHeight });
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  return dimensions;
}

// Virtualized list for single-column layouts
interface VirtualizedListProps {
  items: any[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (props: {
    index: number;
    style: React.CSSProperties;
    data: any;
  }) => React.ReactNode;
  getItemKey?: (index: number, data: any) => string;
  overscanCount?: number;
  className?: string;
}

export function VirtualizedList({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  getItemKey,
  overscanCount = 3,
  className
}: VirtualizedListProps) {
  const Cell = ({ index, style }: any) => {
    const item = items[index];
    return renderItem({ index, style, data: item });
  };

  return (
    <Grid
      className={className}
      height={containerHeight}
      width={typeof window !== 'undefined' ? (document.querySelector('.virtualized-list-container') as HTMLElement)?.clientWidth || 0 : 0}
      rowCount={items.length}
      columnCount={1}
      rowHeight={itemHeight}
      columnWidth={100}
      itemData={items}
      overscanRowCount={overscanCount}
      itemKey={getItemKey ? ({ rowIndex }: { rowIndex: number }) => getItemKey(rowIndex, items[rowIndex]) : undefined}
    >
      {Cell}
    </Grid>
  );
}