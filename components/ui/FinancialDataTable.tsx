/**
 * FinancialDataTable Component
 * Professional-grade data table with Bloomberg-class data density and formatting
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { FinancialNumber, Price, Percentage, Volume } from './FinancialNumber';
import { announceToScreenReader, KEYBOARD_KEYS } from '@/lib/accessibility';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';

interface ColumnDefinition {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'currency' | 'percentage' | 'volume' | 'date' | 'custom';
  width?: string;
  align?: 'left' | 'center' | 'right';
  currency?: string;
  precision?: number;
  sortable?: boolean;
  render?: (value: any, row: any, index: number) => React.ReactNode;
  className?: string;
}

interface FinancialDataTableProps {
  data: Record<string, any>[];
  columns: ColumnDefinition[];
  className?: string;
  density?: 'comfortable' | 'normal' | 'compact';
  striped?: boolean;
  bordered?: boolean;
  hover?: boolean;
  sticky?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: any, index: number) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
}

export function FinancialDataTable({
  data,
  columns,
  className,
  density = 'normal',
  striped = true,
  bordered = false,
  hover = true,
  sticky = false,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  onSort,
  sortKey,
  sortDirection,
}: FinancialDataTableProps) {
  
  const handleSort = (column: ColumnDefinition) => {
    if (!column.sortable || !onSort) return;
    
    const newDirection = sortKey === column.key && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(column.key, newDirection);
    
    // Announce sort change to screen readers
    announceToScreenReader(
      `Table sorted by ${column.label} in ${newDirection}ending order`,
      'polite'
    );
  };

  const renderCellContent = (column: ColumnDefinition, value: any, row: any, index: number) => {
    // Custom render function takes precedence
    if (column.render) {
      return column.render(value, row, index);
    }

    // Handle null/undefined values
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground">—</span>;
    }

    // Type-based rendering
    switch (column.type) {
      case 'currency':
        return (
          <Price 
            value={value} 
            currency={column.currency || 'USD'}
            precision={column.precision}
            density={density === 'compact' ? 'dense' : 'normal'}
            size={density === 'compact' ? 'sm' : 'md'}
          />
        );
      
      case 'percentage':
        return (
          <Percentage 
            value={value}
            precision={column.precision ?? 2}
            density={density === 'compact' ? 'dense' : 'normal'}
            size={density === 'compact' ? 'sm' : 'md'}
          />
        );
      
      case 'volume':
        return (
          <Volume 
            value={value}
            density={density === 'compact' ? 'dense' : 'normal'}
            size={density === 'compact' ? 'sm' : 'md'}
          />
        );
      
      case 'number':
        return (
          <FinancialNumber 
            value={value}
            precision={column.precision}
            density={density === 'compact' ? 'dense' : 'normal'}
            size={density === 'compact' ? 'sm' : 'md'}
          />
        );
      
      case 'date':
        return formatDate(value);
      
      case 'text':
      default:
        return String(value);
    }
  };

  const getDensityClasses = () => {
    const baseClass = 'financial-data-table';
    switch (density) {
      case 'compact':
        return `${baseClass} financial-data-dense`;
      case 'comfortable':
        return `${baseClass} leading-relaxed`;
      default:
        return baseClass;
    }
  };

  const getRowHeight = () => {
    switch (density) {
      case 'compact':
        return 'h-8'; // 32px
      case 'comfortable':
        return 'h-12'; // 48px
      default:
        return 'h-10'; // 40px
    }
  };

  if (loading) {
    return (
      <div className="w-full" role="region" aria-label="Financial data table">
        <Table className={cn(getDensityClasses(), className)} role="table">
          <TableHeader className={sticky ? 'sticky top-0 bg-background z-10' : undefined}>
            <TableRow role="row">
              {columns.map((column) => (
                <TableHead 
                  key={column.key}
                  role="columnheader"
                  className={cn(
                    'financial-data-header text-muted-foreground',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.className
                  )}
                  style={{ width: column.width }}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        </Table>
        <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
          <div className="animate-pulse financial-data-cell text-muted-foreground">Loading financial data...</div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full">
        <Table className={cn(getDensityClasses(), className)}>
          <TableHeader className={sticky ? 'sticky top-0 bg-background z-10' : undefined}>
            <TableRow>
              {columns.map((column) => (
                <TableHead 
                  key={column.key}
                  className={cn(
                    'financial-data-header text-muted-foreground',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.className
                  )}
                  style={{ width: column.width }}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        </Table>
        <div className="flex items-center justify-center py-8">
          <div className="financial-data-cell text-muted-foreground">{emptyMessage}</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn('w-full', className)}
      role="region"
      aria-label={`Financial data table with ${data.length} rows`}
    >
      <Table 
        className={cn(getDensityClasses(), bordered && 'border')}
        role="table"
        aria-rowcount={data.length + 1}
        aria-colcount={columns.length}
      >
        <TableHeader className={sticky ? 'sticky top-0 bg-background z-10 shadow-sm' : undefined}>
          <TableRow role="row">
            {columns.map((column, columnIndex) => (
              <TableHead 
                key={column.key}
                role="columnheader"
                aria-sort={
                  sortKey === column.key 
                    ? sortDirection === 'asc' ? 'ascending' : 'descending'
                    : column.sortable ? 'none' : undefined
                }
                aria-colindex={columnIndex + 1}
                className={cn(
                  'text-xs font-semibold text-muted-foreground uppercase tracking-wider',
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right',
                  column.sortable && 'cursor-pointer hover:text-foreground select-none',
                  column.className
                )}
                style={{ width: column.width }}
                onClick={() => handleSort(column)}
                onKeyDown={(e) => {
                  if (e.key === KEYBOARD_KEYS.ENTER || e.key === KEYBOARD_KEYS.SPACE) {
                    e.preventDefault();
                    handleSort(column);
                  }
                }}
                tabIndex={column.sortable ? 0 : -1}
              >
                <div className="flex items-center gap-1">
                  {column.label}
                  {column.sortable && (
                    <div className="flex flex-col">
                      <div className={cn(
                        'w-0 h-0 border-l-[3px] border-r-[3px] border-b-[4px] border-transparent',
                        sortKey === column.key && sortDirection === 'asc' 
                          ? 'border-b-foreground' 
                          : 'border-b-muted-foreground/40'
                      )} />
                      <div className={cn(
                        'w-0 h-0 border-l-[3px] border-r-[3px] border-t-[4px] border-transparent',
                        sortKey === column.key && sortDirection === 'desc' 
                          ? 'border-t-foreground' 
                          : 'border-t-muted-foreground/40'
                      )} />
                    </div>
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIndex) => (
            <TableRow 
              key={rowIndex}
              role="row"
              aria-rowindex={rowIndex + 2}
              className={cn(
                getRowHeight(),
                striped && rowIndex % 2 === 1 && 'bg-muted/20',
                hover && 'hover:bg-muted/40 transition-colors',
                onRowClick && 'cursor-pointer',
                'border-b border-border/50'
              )}
              onClick={() => onRowClick?.(row, rowIndex)}
              onKeyDown={(e) => {
                if (onRowClick && (e.key === KEYBOARD_KEYS.ENTER || e.key === KEYBOARD_KEYS.SPACE)) {
                  e.preventDefault();
                  onRowClick(row, rowIndex);
                }
              }}
              tabIndex={onRowClick ? 0 : -1}
            >
              {columns.map((column, columnIndex) => (
                <TableCell 
                  key={`${rowIndex}-${column.key}`}
                  role="gridcell"
                  aria-colindex={columnIndex + 1}
                  className={cn(
                    'financial-data-cell py-1 px-3',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    (column.type === 'number' || column.type === 'currency' || column.type === 'percentage' || column.type === 'volume') && 'financial-data-number',
                    density === 'compact' && 'py-0.5 px-2',
                    column.className
                  )}
                >
                  {renderCellContent(column, row[column.key], row, rowIndex)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Helper function for date formatting
function formatDate(value: any): string {
  if (!value) return '—';
  
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value);
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return String(value);
  }
}

// Example usage component for documentation
export function ExampleFinancialDataTable() {
  const sampleData = [
    {
      symbol: 'AAPL',
      price: 173.50,
      change: 2.15,
      changePercent: 1.25,
      volume: 45234567,
      marketCap: 2800000000000,
      pe: 28.7,
      lastUpdate: '2024-01-15T16:00:00Z'
    },
    {
      symbol: 'GOOGL',
      price: 142.80,
      change: -1.22,
      changePercent: -0.85,
      volume: 23445678,
      marketCap: 1790000000000,
      pe: 25.3,
      lastUpdate: '2024-01-15T16:00:00Z'
    },
  ];

  const columns: ColumnDefinition[] = [
    { key: 'symbol', label: 'Symbol', type: 'text', width: '80px', sortable: true },
    { key: 'price', label: 'Price', type: 'currency', align: 'right', sortable: true },
    { key: 'change', label: 'Change', type: 'currency', align: 'right', sortable: true },
    { key: 'changePercent', label: 'Change %', type: 'percentage', align: 'right', sortable: true },
    { key: 'volume', label: 'Volume', type: 'volume', align: 'right', sortable: true },
    { key: 'marketCap', label: 'Market Cap', type: 'currency', align: 'right', sortable: true, precision: 0 },
    { key: 'pe', label: 'P/E', type: 'number', align: 'right', precision: 1, sortable: true },
    { key: 'lastUpdate', label: 'Updated', type: 'date', width: '120px' },
  ];

  return (
    <FinancialDataTable 
      data={sampleData}
      columns={columns}
      density="compact"
      onRowClick={(row) => console.log('Clicked:', row.symbol)}
      onSort={(key, direction) => console.log('Sort:', key, direction)}
    />
  );
}