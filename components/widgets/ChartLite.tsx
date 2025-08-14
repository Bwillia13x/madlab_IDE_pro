'use client';

import React from 'react';
import { 
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
} from 'recharts';
import { ChartContainer } from '@/components/ui/ChartContainer';
import { BarChart3 } from 'lucide-react';
import type { WidgetProps, WidgetDefinition } from '@/lib/widgets/schema';
import { createWidgetSchema, CommonSchemas } from '@/lib/widgets/schema';
import { z } from 'zod';

// Configuration schema for ChartLite
const ChartLiteConfigSchema = createWidgetSchema(
  z.object({
    ...CommonSchemas.chart.shape,
    data: z.array(z.record(z.union([z.string(), z.number()]))).default([]).describe('Chart data array'),
    xAxisKey: z.string().default('name').describe('Key for X-axis data'),
    yAxisKeys: z.array(z.string()).default(['value']).describe('Keys for Y-axis data'),
    animate: z.boolean().default(true).describe('Enable chart animations'),
    strokeWidth: z.number().min(1).max(5).default(2).describe('Line stroke width'),
  })
);

type ChartLiteConfig = z.infer<typeof ChartLiteConfigSchema>;

// Sample data for demonstration
const SAMPLE_DATA = [
  { name: 'Jan', value: 400, value2: 240 },
  { name: 'Feb', value: 300, value2: 139 },
  { name: 'Mar', value: 200, value2: 980 },
  { name: 'Apr', value: 278, value2: 390 },
  { name: 'May', value: 189, value2: 480 },
  { name: 'Jun', value: 239, value2: 380 },
];

function ChartLiteComponent({ config, data }: WidgetProps) {
  const typedConfig = config as ChartLiteConfig;
  
  // Use provided data or fall back to sample data
  const chartData = data && Array.isArray(data) && data.length > 0 
    ? data 
    : typedConfig.data.length > 0 
      ? typedConfig.data 
      : SAMPLE_DATA;

  // Custom tooltip formatter
  interface TooltipEntry { name: string; value: number | string; color?: string }
  interface TooltipProps { active?: boolean; payload?: TooltipEntry[]; label?: string }
  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded p-3 shadow-lg">
          <p className="text-gray-300 mb-2">{`${typedConfig.xAxis?.label || 'X'}: ${label}`}</p>
          {payload.map((entry: TooltipEntry, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.name}: ${typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    const xAxisProps = {
      dataKey: typedConfig.xAxisKey,
      stroke: 'hsl(var(--muted-foreground))',
      fontSize: 12,
      ...(typedConfig.xAxis?.label && { label: { value: typedConfig.xAxis.label, position: 'insideBottom', offset: -10, style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' } } }),
    };

    const yAxisProps = {
      stroke: 'hsl(var(--muted-foreground))',
      fontSize: 12,
      ...(typedConfig.yAxis?.min !== undefined && { domain: [typedConfig.yAxis.min, 'auto'] as [number, string] }),
      ...(typedConfig.yAxis?.max !== undefined && { domain: ['auto', typedConfig.yAxis.max] as [string, number] }),
      ...(typedConfig.yAxis?.label && { label: { value: typedConfig.yAxis.label, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' } } }),
    };

    const gridProps = typedConfig.showGrid ? {
      strokeDasharray: '3 3',
      stroke: 'hsl(var(--border))',
      opacity: 0.3,
    } : false;

    switch (typedConfig.chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            {gridProps && <CartesianGrid {...gridProps} />}
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            {typedConfig.showLegend && <Legend />}
            {typedConfig.yAxisKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={typedConfig.colors[index % typedConfig.colors.length]}
                strokeWidth={typedConfig.strokeWidth}
                dot={{ fill: typedConfig.colors[index % typedConfig.colors.length], strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6 }}
                animationDuration={typedConfig.animate ? 1000 : 0}
              />
            ))}
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {gridProps && <CartesianGrid {...gridProps} />}
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            {typedConfig.showLegend && <Legend />}
            {typedConfig.yAxisKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={typedConfig.colors[index % typedConfig.colors.length]}
                animationDuration={typedConfig.animate ? 1000 : 0}
              />
            ))}
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {gridProps && <CartesianGrid {...gridProps} />}
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            {typedConfig.showLegend && <Legend />}
            {typedConfig.yAxisKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={typedConfig.colors[index % typedConfig.colors.length]}
                fill={typedConfig.colors[index % typedConfig.colors.length]}
                fillOpacity={0.3}
                strokeWidth={typedConfig.strokeWidth}
                animationDuration={typedConfig.animate ? 1000 : 0}
              />
            ))}
          </AreaChart>
        );

      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            {gridProps && <CartesianGrid {...gridProps} />}
            <XAxis {...xAxisProps} type="number" />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            {typedConfig.showLegend && <Legend />}
            {typedConfig.yAxisKeys.map((key, index) => (
              <Scatter
                key={key}
                name={key}
                dataKey={key}
                fill={typedConfig.colors[index % typedConfig.colors.length]}
                animationDuration={typedConfig.animate ? 1000 : 0}
              />
            ))}
          </ScatterChart>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Unsupported chart type: {typedConfig.chartType}</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full w-full" role="img" aria-label="Chart Lite visualization" data-testid="chart-lite">
      <ChartContainer minHeight={200}>{renderChart()}</ChartContainer>
    </div>
  );
}

// Widget definition conforming to the SDK
export const ChartLiteDefinition: WidgetDefinition = {
  meta: {
    type: 'chart-lite',
    name: 'Chart Lite',
    description: 'Lightweight charting widget with line, bar, area, and scatter chart support',
    category: 'charting',
    version: '1.0.0',
    configSchema: ChartLiteConfigSchema,
    defaultConfig: {
      title: 'Chart Lite',
      chartType: 'line',
      data: SAMPLE_DATA,
      xAxisKey: 'name',
      yAxisKeys: ['value'],
      xAxis: {
        label: 'Month',
        type: 'category',
      },
      yAxis: {
        label: 'Value',
      },
      colors: ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--destructive))'],
      showGrid: true,
      showLegend: true,
      animate: true,
      strokeWidth: 2,
    },
    defaultSize: { w: 8, h: 5 },
    capabilities: {
      resizable: true,
      configurable: true,
      dataBinding: true,
      exportable: true,
      realTimeData: true,
    },
    dataRequirements: {
      required: false,
      types: ['array', 'json'],
      schema: z.array(z.record(z.union([z.string(), z.number()]))),
    },
    tags: ['chart', 'visualization', 'data', 'recharts'],
    icon: BarChart3 as any,
  },
  runtime: {
    component: ChartLiteComponent,
    hooks: {
      onCreate: (config) => {
        console.log('ChartLite widget created with config:', config);
      },
      onDataChange: (data, config) => {
        console.log('ChartLite data updated:', { dataLength: data?.length, config });
      },
    },
    dataTransform: (data, config) => {
      // If data is not an array, try to convert it
      if (!Array.isArray(data)) {
        console.warn('ChartLite expects array data, got:', typeof data);
        return [];
      }
      return data;
    },
  },
};

// Export the component for backward compatibility
export function ChartLite(props: WidgetProps) {
  return <ChartLiteComponent {...props} />;
}

// Default export for lazy import via getLazyWidget('ChartLite')
export default function ChartLiteDefault(props: WidgetProps) {
  return ChartLiteComponent(props);
}