'use client';

import React, { useMemo, useCallback } from 'react';
import { FixedSizeGrid as Grid, FixedSizeList as List } from 'react-window';
import { formatValue } from '@/lib/data/export';

export interface TableColumn {
  key: string;
  label: string;
  width: number;
  format?: 'currency' | 'percentage' | 'number' | 'date' | 'text';
  align?: 'left' | 'center' | 'right';
}

interface VirtualizedTableProps {
  data: Record<string, any>[];
  columns: TableColumn[];
  height: number;
  width: number;
  rowHeight?: number;
  headerHeight?: number;
  overscanCount?: number;
  className?: string;
  onRowClick?: (row: Record<string, any>, index: number) => void;
  getRowKey?: (row: Record<string, any>, index: number) => string;
  loading?: boolean;
  emptyMessage?: string;
}

const DEFAULT_ROW_HEIGHT = 35;
const DEFAULT_HEADER_HEIGHT = 40;

export function VirtualizedTable({
  data,
  columns,
  height,
  width,
  rowHeight = DEFAULT_ROW_HEIGHT,
  headerHeight = DEFAULT_HEADER_HEIGHT,
  overscanCount = 5,
  className = '',
  onRowClick,
  getRowKey,
  loading = false,
  emptyMessage = 'No data available'
}: VirtualizedTableProps) {
  const totalWidth = useMemo(() => 
    columns.reduce((sum, col) => sum + col.width, 0), 
    [columns]
  );

  const Header = useCallback(() => (
    <div 
      className="flex bg-muted border-b border-border font-medium financial-data-header"
      style={{ height: headerHeight, width: totalWidth }}
    >
      {columns.map((column) => (
        <div
          key={column.key}
          className={`flex items-center px-3 border-r border-border last:border-r-0 ${
            column.align === 'center' ? 'justify-center' :
            column.align === 'right' ? 'justify-end' : 'justify-start'
          }`}
          style={{ width: column.width }}
        >
          {column.label}
        </div>
      ))}
    </div>
  ), [columns, headerHeight, totalWidth]);

  const Row = useCallback(({ index, style }: any) => {
    const row = data[index];
    const isEven = index % 2 === 0;
    
    return (
      <div
        style={style}
        className={`flex border-b border-border financial-data-cell hover:bg-accent/50 cursor-pointer ${
          isEven ? 'bg-background' : 'bg-muted/20'
        }`}
        onClick={onRowClick ? () => onRowClick(row, index) : undefined}
      >
        {columns.map((column) => {
          const value = row[column.key];
          const formattedValue = formatValue(value, column.format);
          
          return (
            <div
              key={`${index}-${column.key}`}
              className={`flex items-center px-3 border-r border-border/50 last:border-r-0 ${
                column.align === 'center' ? 'justify-center' :
                column.align === 'right' ? 'justify-end' : 'justify-start'
              } ${column.format === 'currency' || column.format === 'number' ? 'font-mono' : ''}`}
              style={{ width: column.width }}
              title={typeof value === 'string' ? value : String(formattedValue)}
            >
              <span className="truncate">{formattedValue}</span>
            </div>
          );
        })}
      </div>
    );
  }, [data, columns, onRowClick]);

  if (loading) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ height, width }}
      >
        <div className="financial-data-cell text-muted-foreground">Loading data...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ height, width }}
      >
        <div className="financial-data-cell text-muted-foreground">{emptyMessage}</div>
      </div>
    );
  }

  const listHeight = height - headerHeight;

  return (
    <div className={`border border-border rounded-md overflow-hidden ${className}`} style={{ height, width }}>
      <Header />
      <List
        height={listHeight}
        width={width}
        itemCount={data.length}
        itemSize={rowHeight}
        itemData={data}
        overscanCount={overscanCount}
        itemKey={getRowKey ? (index) => getRowKey(data[index], index) : undefined}
      >
        {Row}
      </List>
    </div>
  );
}

// Financial data table with common financial formatting
interface FinancialTableProps extends Omit<VirtualizedTableProps, 'columns'> {
  data: Array<Record<string, any>>;
  type: 'prices' | 'portfolio' | 'transactions' | 'generic';
}

export function FinancialTable({ data, type, ...props }: FinancialTableProps) {
  const columns = useMemo(() => {
    if (data.length === 0) return [];

    switch (type) {
      case 'prices':
        return [
          { key: 'date', label: 'Date', width: 100, format: 'date' as const, align: 'left' as const },
          { key: 'open', label: 'Open', width: 100, format: 'currency' as const, align: 'right' as const },
          { key: 'high', label: 'High', width: 100, format: 'currency' as const, align: 'right' as const },
          { key: 'low', label: 'Low', width: 100, format: 'currency' as const, align: 'right' as const },
          { key: 'close', label: 'Close', width: 100, format: 'currency' as const, align: 'right' as const },
          { key: 'volume', label: 'Volume', width: 120, format: 'number' as const, align: 'right' as const },
        ].filter(col => data[0] && data[0][col.key] !== undefined);

      case 'portfolio':
        return [
          { key: 'symbol', label: 'Symbol', width: 80, format: 'text' as const, align: 'left' as const },
          { key: 'quantity', label: 'Qty', width: 80, format: 'number' as const, align: 'right' as const },
          { key: 'price', label: 'Price', width: 100, format: 'currency' as const, align: 'right' as const },
          { key: 'value', label: 'Value', width: 120, format: 'currency' as const, align: 'right' as const },
          { key: 'pnl', label: 'P&L', width: 100, format: 'currency' as const, align: 'right' as const },
          { key: 'pnlPercent', label: 'P&L %', width: 80, format: 'percentage' as const, align: 'right' as const },
        ].filter(col => data[0] && data[0][col.key] !== undefined);

      case 'transactions':
        return [
          { key: 'date', label: 'Date', width: 100, format: 'date' as const, align: 'left' as const },
          { key: 'symbol', label: 'Symbol', width: 80, format: 'text' as const, align: 'left' as const },
          { key: 'side', label: 'Side', width: 60, format: 'text' as const, align: 'center' as const },
          { key: 'quantity', label: 'Quantity', width: 100, format: 'number' as const, align: 'right' as const },
          { key: 'price', label: 'Price', width: 100, format: 'currency' as const, align: 'right' as const },
          { key: 'amount', label: 'Amount', width: 120, format: 'currency' as const, align: 'right' as const },
        ].filter(col => data[0] && data[0][col.key] !== undefined);

      case 'generic':
      default:
        // Auto-generate columns from first data row
        const sampleRow = data[0];
        if (!sampleRow) return [];

        return Object.keys(sampleRow).map(key => {
          const value = sampleRow[key];
          let format: TableColumn['format'] = 'text';
          let align: TableColumn['align'] = 'left';
          let width = 120;

          // Auto-detect format based on value type and key name
          if (typeof value === 'number') {
            if (key.toLowerCase().includes('price') || key.toLowerCase().includes('amount') || 
                key.toLowerCase().includes('value') || key.toLowerCase().includes('cost')) {
              format = 'currency';
              align = 'right';
            } else if (key.toLowerCase().includes('percent') || key.toLowerCase().includes('rate') || 
                       key.toLowerCase().includes('ratio')) {
              format = 'percentage';
              align = 'right';
            } else {
              format = 'number';
              align = 'right';
            }
          } else if (key.toLowerCase().includes('date') || value instanceof Date) {
            format = 'date';
            width = 100;
          } else if (key.toLowerCase().includes('symbol') || key.toLowerCase().includes('ticker')) {
            width = 80;
            align = 'left';
          }

          return {
            key,
            label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
            width,
            format,
            align
          };
        });
    }
  }, [data, type]);

  return <VirtualizedTable columns={columns} data={data} {...props} />;
}

export default VirtualizedTable;