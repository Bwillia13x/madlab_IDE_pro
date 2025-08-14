'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Activity, DollarSign, Percent, Hash } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line } from 'recharts';
import { ChartContainer } from '@/components/ui/ChartContainer';
import { AccessibleWidget } from '@/components/ui/AccessibleWidget';
import type { WidgetProps, WidgetDefinition } from '@/lib/widgets/schema';
import { createWidgetSchema, CommonSchemas } from '@/lib/widgets/schema';
import { z } from 'zod';

// Configuration schema for KPI widget
const KPIConfigSchema = createWidgetSchema(
  z.object({
    ...CommonSchemas.kpi.shape,
    value: z.number().default(0).describe('Current KPI value'),
    previousValue: z.number().optional().describe('Previous value for change calculation'),
    target: z.number().optional().describe('Target value'),
    unit: z.string().default('').describe('Unit of measurement'),
    title: z.string().default('KPI').describe('KPI title'),
    subtitle: z.string().optional().describe('KPI subtitle or description'),
    icon: z.enum(['activity', 'dollar', 'percent', 'hash']).default('activity').describe('Display icon'),
    color: z.string().default('hsl(var(--primary))').describe('Primary color'),
    sparklineData: z.array(z.object({
      value: z.number(),
      timestamp: z.string().optional(),
    })).default([]).describe('Historical data for sparkline'),
    layout: z.enum(['horizontal', 'vertical']).default('vertical').describe('Layout orientation'),
    size: z.enum(['small', 'medium', 'large']).default('medium').describe('Display size'),
  })
);

type KPIConfig = z.infer<typeof KPIConfigSchema>;

// Sample sparkline data
const SAMPLE_SPARKLINE_DATA = [
  { value: 100 }, { value: 120 }, { value: 90 }, { value: 150 }, { value: 140 },
  { value: 160 }, { value: 180 }, { value: 170 }, { value: 200 }, { value: 175 },
];

function formatValue(value: number, format: string, precision: number, unit: string): string {
  let formatted = '';
  
  switch (format) {
    case 'currency':
      formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      }).format(value);
      break;
    
    case 'percentage':
      formatted = `${value.toFixed(precision)}%`;
      break;
    
    default:
      formatted = value.toLocaleString(undefined, {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      });
      if (unit) formatted += ` ${unit}`;
      break;
  }
  
  return formatted;
}

function calculateChange(current: number, previous?: number): { value: number; percentage: number } | null {
  if (previous === undefined || previous === null) return null;
  
  const value = current - previous;
  const percentage = previous !== 0 ? (value / previous) * 100 : 0;
  
  return { value, percentage };
}

function getChangeColor(change: number, threshold: KPIConfig['threshold']): string {
  if (!threshold) return change >= 0 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))';
  
  if (threshold.critical !== undefined && Math.abs(change) >= threshold.critical) {
    return 'hsl(var(--destructive))';
  }
  if (threshold.warning !== undefined && Math.abs(change) >= threshold.warning) {
    return 'hsl(var(--warning))';
  }
  if (threshold.good !== undefined && change >= threshold.good) {
    return 'hsl(var(--primary))';
  }
  
  return change >= 0 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))';
}

function getIcon(iconType: string, size: number = 20) {
  const props = { size, className: 'text-current' };
  
  switch (iconType) {
    case 'dollar': return <DollarSign {...props} />;
    case 'percent': return <Percent {...props} />;
    case 'hash': return <Hash {...props} />;
    default: return <Activity {...props} />;
  }
}

function KPIComponent({ config, data }: WidgetProps) {
  const typedConfig = config as KPIConfig;
  
  // Use data if provided, otherwise use config values
  const currentValue = data?.value ?? typedConfig.value;
  const previousValue = data?.previousValue ?? typedConfig.previousValue;
  const target = data?.target ?? typedConfig.target;
  const sparklineData = data?.sparklineData ?? typedConfig.sparklineData.length > 0 
    ? typedConfig.sparklineData 
    : SAMPLE_SPARKLINE_DATA;

  const change = calculateChange(currentValue, previousValue);
  const changeColor = change ? getChangeColor(change.percentage, typedConfig.threshold) : undefined;
  
  const targetProgress = target ? (currentValue / target) * 100 : undefined;

  const getSizeClasses = () => {
    switch (typedConfig.size) {
      case 'small':
        return {
          card: 'p-2',
          title: 'text-xs',
          value: 'text-lg',
          subtitle: 'text-xs',
          icon: 16,
        };
      case 'large':
        return {
          card: 'p-6',
          title: 'text-base',
          value: 'text-3xl',
          subtitle: 'text-sm',
          icon: 28,
        };
      default:
        return {
          card: 'p-4',
          title: 'text-sm',
          value: 'text-2xl',
          subtitle: 'text-sm',
          icon: 20,
        };
    }
  };

  const sizeClasses = getSizeClasses();

  if (typedConfig.layout === 'horizontal') {
    const content = (
      <Card className="h-full bg-card border-border" data-testid="kpi-horizontal">
        <CardContent className={`${sizeClasses.card} h-full flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div style={{ color: typedConfig.color }}>
              {getIcon(typedConfig.icon, sizeClasses.icon)}
            </div>
            <div>
              <h3 className={`${sizeClasses.title} font-medium text-foreground`}>
                {typedConfig.title}
              </h3>
              {typedConfig.subtitle && (
                <p className={`${sizeClasses.subtitle} text-muted-foreground`}>
                  {typedConfig.subtitle}
                </p>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <div className={`${sizeClasses.value} font-bold text-foreground`}>
              {formatValue(currentValue, typedConfig.format, typedConfig.precision, typedConfig.unit)}
            </div>
            
            {change && (
              <div className="flex items-center gap-1 mt-1">
                {change.value >= 0 ? (
                  <TrendingUp className="h-3 w-3" style={{ color: changeColor }} />
                ) : (
                  <TrendingDown className="h-3 w-3" style={{ color: changeColor }} />
                )}
                <span className="text-xs" style={{ color: changeColor }}>
                  {change.value >= 0 ? '+' : ''}{change.percentage.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
    return (
      <AccessibleWidget
        widgetType="kpi"
        title={typedConfig.title || 'KPI'}
        helpText={typedConfig.subtitle || 'Key performance indicator'}
        data={data}
      >
        {content}
      </AccessibleWidget>
    );
  }

  const content = (
    <Card className="h-full bg-card border-border" data-testid="kpi">
      <CardContent className={`${sizeClasses.card} h-full flex flex-col`}>
        {currentValue == null && (
          <div className="text-xs text-muted-foreground" role="status">Loading…</div>
        )}
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className={`${sizeClasses.title} font-medium text-foreground`}>
              {typedConfig.title}
            </h3>
            {typedConfig.subtitle && (
              <p className={`${sizeClasses.subtitle} text-muted-foreground mt-1`}>
                {typedConfig.subtitle}
              </p>
            )}
          </div>
          <div style={{ color: typedConfig.color }}>
            {getIcon(typedConfig.icon, sizeClasses.icon)}
          </div>
        </div>

        {/* Main Value */}
        <div className={`${sizeClasses.value} font-bold text-foreground mb-2`}>
          {formatValue(currentValue, typedConfig.format, typedConfig.precision, typedConfig.unit)}
        </div>

        {/* Change Indicator */}
        {change && (
          <div className="flex items-center gap-1 mb-3">
            {change.value >= 0 ? (
              <TrendingUp className="h-4 w-4" style={{ color: changeColor }} />
            ) : (
              <TrendingDown className="h-4 w-4" style={{ color: changeColor }} />
            )}
            <span className="text-sm" style={{ color: changeColor }}>
              {change.value >= 0 ? '+' : ''}
              {formatValue(change.value, typedConfig.format, typedConfig.precision, typedConfig.unit)}
            </span>
            <span className="text-xs text-muted-foreground">
              ({change.value >= 0 ? '+' : ''}{change.percentage.toFixed(1)}%)
            </span>
          </div>
        )}

        {/* Target Progress */}
        {target && targetProgress !== undefined && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Target</span>
              <span>{targetProgress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(100, targetProgress)}%`,
                  backgroundColor: targetProgress >= 100 ? 'hsl(var(--primary))' : typedConfig.color
                }}
              />
            </div>
          </div>
        )}

        {/* Sparkline */}
        {typedConfig.showSparkline && sparklineData.length > 0 && (
          <div className="flex-1 min-h-0">
            <ChartContainer minHeight={80}>
              <LineChart data={sparklineData}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={typedConfig.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={false}
                />
              </LineChart>
            </ChartContainer>
          </div>
        )}

        {/* Status Badge */}
        {typedConfig.threshold && change && (
          <div className="mt-2">
            <Badge 
              variant={Math.abs(change.percentage) >= (typedConfig.threshold.critical || Infinity) ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {Math.abs(change.percentage) >= (typedConfig.threshold.critical || Infinity) ? 'Critical' :
               Math.abs(change.percentage) >= (typedConfig.threshold.warning || Infinity) ? 'Warning' : 'Normal'}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
  return (
    <AccessibleWidget
      widgetType="kpi"
      title={typedConfig.title || 'KPI'}
      helpText={typedConfig.subtitle || 'Key performance indicator'}
      data={data}
    >
      {content}
    </AccessibleWidget>
  );
}

// Widget definition conforming to the SDK
export const KPIDefinition: WidgetDefinition = {
  meta: {
    type: 'kpi',
    name: 'KPI Indicator',
    description: 'Key Performance Indicator widget with change tracking, targets, and sparklines',
    category: 'kpi',
    version: '1.0.0',
    difficulty: 'beginner',
    edu: { help: 'KPI highlights a single metric and its change; use it for top-line indicators.' },
    configSchema: KPIConfigSchema,
    defaultConfig: {
      title: 'Revenue',
      subtitle: 'Monthly recurring revenue',
      value: 147250,
      previousValue: 142000,
      target: 150000,
      unit: '',
      format: 'currency',
      precision: 0,
      showChange: true,
      showSparkline: true,
      threshold: {
        good: 5,
        warning: -2,
        critical: -10,
      },
      icon: 'dollar',
      color: 'hsl(var(--primary))',
      sparklineData: SAMPLE_SPARKLINE_DATA,
      layout: 'vertical',
      size: 'medium',
    },
    defaultSize: { w: 4, h: 3 },
    capabilities: {
      resizable: true,
      configurable: true,
      dataBinding: true,
      exportable: false,
      realTimeData: true,
    },
    dataRequirements: {
      required: false,
      types: ['number', 'json'],
      schema: z.object({
        value: z.number(),
        previousValue: z.number().optional(),
        target: z.number().optional(),
        sparklineData: z.array(z.object({
          value: z.number(),
          timestamp: z.string().optional(),
        })).optional(),
      }),
    },
    tags: ['kpi', 'metric', 'performance', 'indicator'],
    icon: Activity as any,
  },
  runtime: {
    component: KPIComponent,
    hooks: {
      onCreate: (config) => {
        console.log('KPI widget created with config:', config);
      },
      onDataChange: (data, config) => {
        console.log('KPI data updated:', { value: data?.value, config });
      },
    },
    dataTransform: (data, config) => {
      // Handle different data formats
      if (typeof data === 'number') {
        return { value: data };
      }
      if (typeof data === 'object' && data !== null) {
        return data;
      }
      console.warn('KPI expects number or object data, got:', typeof data);
      return null;
    },
  },
};

// Export the component for backward compatibility
export function KPI(props: any) {
  return <KPIComponent {...props} />;
}

// Default export for lazy import via getLazyWidget('KPI')
export default function KPIDefault(props: WidgetProps) {
  return KPIComponent(props);
}