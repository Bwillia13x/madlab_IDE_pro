'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Table as TableIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AccessibleWidget } from '@/components/ui/AccessibleWidget';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  VirtualizedTable,
  FinancialTable,
  type TableColumn,
} from '@/components/ui/VirtualizedTable';
import { useContainerDimensions } from '@/components/ui/VirtualizedGrid';
import type { WidgetProps, WidgetDefinition } from '@/lib/widgets/schema';
import { createWidgetSchema, CommonSchemas } from '@/lib/widgets/schema';
import { z } from 'zod';

// Configuration schema for Table widget
const TableConfigSchema = createWidgetSchema(
  z.object({
    ...CommonSchemas.table.shape,
    showHeader: z.boolean().default(true).describe('Show table header'),
    showSearch: z.boolean().default(true).describe('Show search functionality'),
    showPagination: z.boolean().default(true).describe('Show pagination controls'),
    striped: z.boolean().default(true).describe('Striped row styling'),
    compact: z.boolean().default(false).describe('Compact table layout'),
    maxHeight: z.number().min(200).max(800).default(400).describe('Maximum table height in pixels'),
    data: z.array(z.record(z.any())).default([]).describe('Table data array'),
  })
);

type TableConfig = z.infer<typeof TableConfigSchema>;

// Sample data for demonstration
const SAMPLE_DATA = [
  {
    id: 1,
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 175.43,
    change: 2.34,
    changePercent: 1.35,
    volume: 52847291,
  },
  {
    id: 2,
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    price: 2741.56,
    change: -12.45,
    changePercent: -0.45,
    volume: 1234567,
  },
  {
    id: 3,
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    price: 331.62,
    change: 5.78,
    changePercent: 1.77,
    volume: 34567890,
  },
  {
    id: 4,
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    price: 208.91,
    change: -8.12,
    changePercent: -3.74,
    volume: 45678901,
  },
  {
    id: 5,
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    price: 3201.45,
    change: 15.67,
    changePercent: 0.49,
    volume: 23456789,
  },
  {
    id: 6,
    symbol: 'META',
    name: 'Meta Platforms Inc.',
    price: 318.75,
    change: 7.23,
    changePercent: 2.32,
    volume: 12345678,
  },
];

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

function formatCellValue(value: unknown, type: string, format?: string): React.ReactNode {
  if (value == null) return '—';

  switch (type) {
    case 'number':
      const num = Number(value);
      if (format === 'currency') {
        return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      } else if (format === 'percentage') {
        return `${num.toFixed(2)}%`;
      } else {
        return num.toLocaleString();
      }

    case 'date': {
      const input =
        value instanceof Date || typeof value === 'string' || typeof value === 'number'
          ? (value as string | number | Date)
          : String(value);
      const date = new Date(input as string | number | Date);
      return date.toLocaleDateString();
    }

    case 'boolean':
      return <Badge variant={value ? 'default' : 'secondary'}>{value ? 'Yes' : 'No'}</Badge>;

    default:
      return String(value);
  }
}

function TableComponent({ config, data }: WidgetProps) {
  const typedConfig = config as TableConfig;
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const dimensions = useContainerDimensions(containerRef);

  // Use provided data or fall back to sample data
  const tableData =
    data && Array.isArray(data) && data.length > 0
      ? data
      : typedConfig.data.length > 0
        ? typedConfig.data
        : SAMPLE_DATA;

  // Auto-generate columns if not configured
  const columns = useMemo(() => {
    if (typedConfig.columns.length > 0) {
      return typedConfig.columns;
    }

    // Auto-generate from first data row
    if (tableData.length > 0) {
      return Object.keys(tableData[0]).map((key) => ({
        key,
        header: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
        type: typeof tableData[0][key] === 'number' ? ('number' as const) : ('string' as const),
        sortable: true,
        width: undefined as number | undefined,
        format: undefined as string | undefined,
      }));
    }

    return [];
  }, [typedConfig.columns, tableData]);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return tableData;

    return tableData.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [tableData, searchTerm]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * typedConfig.pageSize;
    return sortedData.slice(startIndex, startIndex + typedConfig.pageSize);
  }, [sortedData, currentPage, typedConfig.pageSize]);

  const totalPages = Math.ceil(sortedData.length / typedConfig.pageSize);

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return current.direction === 'asc' ? { key, direction: 'desc' } : null; // Remove sort
      }
      return { key, direction: 'asc' };
    });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return <ArrowUpDown className="h-3 w-3" />;
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  };

  const exportData = () => {
    const csv = [
      columns.map((col) => col.header).join(','),
      ...sortedData.map((row) => columns.map((col) => String(row[col.key] || '')).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${typedConfig.title || 'table'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const content = (
    <div
      className="h-full flex flex-col"
      role="table"
      aria-label="Data table"
      data-testid="data-table"
    >
      {/* Header with search and export */}
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">{typedConfig.title || 'Data Table'}</h3>
        <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200">
          {typedConfig.showSearch && (
            <div className="relative">
              <Search className="h-3 w-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-7 w-32 pl-7 text-xs"
              />
            </div>
          )}
          {typedConfig.exportable && (
            <Button variant="ghost" size="sm" onClick={exportData} className="h-7 px-2">
              <Download className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Virtualized Table */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
        style={{ maxHeight: `${typedConfig.maxHeight}px` }}
      >
        {!Array.isArray(tableData) || tableData.length === 0 ? (
          <div
            className="h-full flex items-center justify-center text-xs text-muted-foreground"
            role="status"
          >
            {Array.isArray(tableData) ? 'No data available' : 'Loading…'}
          </div>
        ) : sortedData.length > 100 ? (
          // Use virtualized table for large datasets
          <FinancialTable
            data={sortedData}
            type="generic"
            height={dimensions.height || typedConfig.maxHeight}
            width={dimensions.width || 800}
            rowHeight={typedConfig.compact ? 28 : 35}
            headerHeight={40}
            loading={false}
            emptyMessage="No data matches your filter"
            getRowKey={(row, index) => row.id || String(index)}
          />
        ) : (
          // Use regular table for smaller datasets
          <Table>
            {typedConfig.showHeader && (
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead
                      key={column.key}
                      className={`text-xs text-gray-400 ${column.sortable ? 'cursor-pointer hover:text-gray-200' : ''}`}
                      style={{ width: column.width }}
                      onClick={() => column.sortable && handleSort(column.key)}
                    >
                      <div className="flex items-center gap-1">
                        {column.header}
                        {column.sortable && getSortIcon(column.key)}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
            )}
            <TableBody>
              {paginatedData.map((row, index) => (
                <TableRow
                  key={row.id || index}
                  className={typedConfig.striped && index % 2 === 0 ? 'bg-gray-900/50' : ''}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={`text-xs ${typedConfig.compact ? 'py-1' : 'py-2'} text-gray-300`}
                    >
                      {formatCellValue(row[column.key], column.type, column.format)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {typedConfig.showPagination && totalPages > 1 && (
        <div className="p-3 border-t border-gray-700 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Showing {(currentPage - 1) * typedConfig.pageSize + 1} to{' '}
            {Math.min(currentPage * typedConfig.pageSize, sortedData.length)} of {sortedData.length}{' '}
            rows
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-7 px-2 text-xs"
            >
              Previous
            </Button>
            <Select
              value={currentPage.toString()}
              onValueChange={(value) => setCurrentPage(Number(value))}
            >
              <SelectTrigger className="w-20 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: totalPages }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-7 px-2 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <AccessibleWidget
      widgetType="table"
      title={typedConfig.title || 'Data Table'}
      helpText="Sortable, filterable table with optional virtualization and export."
      data={{ rows: sortedData.length }}
    >
      {content}
    </AccessibleWidget>
  );
}

// Widget definition conforming to the SDK
export const TableDefinition: WidgetDefinition = {
  meta: {
    type: 'table',
    name: 'Data Table',
    description: 'Virtualized table widget with sorting, filtering, and export capabilities',
    category: 'analysis',
    version: '1.0.0',
    configSchema: TableConfigSchema,
    defaultConfig: {
      title: 'Data Table',
      columns: [],
      pageSize: 50,
      sortable: true,
      filterable: true,
      exportable: true,
      showHeader: true,
      showSearch: true,
      showPagination: true,
      striped: true,
      compact: false,
      maxHeight: 400,
      data: SAMPLE_DATA,
    },
    defaultSize: { w: 10, h: 6 },
    capabilities: {
      resizable: true,
      configurable: true,
      dataBinding: true,
      exportable: true,
      realTimeData: true,
    },
    dataRequirements: {
      required: false,
      types: ['array', 'tabular'],
      schema: z.array(z.record(z.any())),
    },
    tags: ['table', 'data', 'analysis', 'export'],
    icon: TableIcon,
  },
  runtime: {
    component: TableComponent,
    hooks: {
      onCreate: (config) => {
        console.log('Table widget created with config:', config);
      },
      onDataChange: (data, config) => {
        console.log('Table data updated:', { dataLength: data?.length, config });
      },
    },
    dataTransform: (data, config) => {
      // If data is not an array, try to convert it
      if (!Array.isArray(data)) {
        console.warn('Table expects array data, got:', typeof data);
        return [];
      }
      return data;
    },
  },
};

// Export the component for backward compatibility
export function DataTable(props: any) {
  return <TableComponent {...props} />;
}

// Default export for lazy import via getLazyWidget('Table')
export default function TableDefault(props: WidgetProps) {
  return TableComponent(props);
}
