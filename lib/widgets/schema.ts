/**
 * Widget Schema Definitions using Zod
 * Provides type-safe widget configuration and validation
 */

import { z } from 'zod';
import React from 'react';

// Base widget configuration schema
export const BaseWidgetConfigSchema = z.object({
  title: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  theme: z.enum(['light', 'dark', 'auto']).optional(),
});

// Data reference schema for widgets that consume data
export const DataRefSchema = z.object({
  sourceId: z.string(),
  query: z.string().optional(),
  refresh: z.number().optional(), // refresh interval in ms
});

// Widget metadata interface
export interface WidgetMeta {
  type: string;
  name: string;
  description: string;
  category: 'charting' | 'kpi' | 'risk' | 'options' | 'analysis' | 'utility';
  version: string;
  author?: string;
  // Learning metadata
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  edu?: {
    help?: string;
  };
  
  // Configuration schema using Zod
  configSchema: z.ZodType<any>;
  
  // Default configuration
  defaultConfig: any;
  
  // Default size (grid units)
  defaultSize: { w: number; h: number };
  
  // Widget capabilities
  capabilities: {
    resizable: boolean;
    configurable: boolean;
    dataBinding: boolean;
    exportable: boolean;
    realTimeData: boolean;
  };
  
  // Data requirements
  dataRequirements?: {
    required: boolean;
    types: string[]; // e.g., ['timeseries', 'tabular', 'json']
    schema?: z.ZodType<any>; // Expected data structure
  };
  
  // Tags for search and filtering  
  tags?: string[];
  
  // Preview thumbnail or icon
  icon?: React.ComponentType<{ size?: number }>;
  thumbnail?: string;
}

// Widget runtime interface
export interface WidgetRuntime {
  // The React component that renders the widget
  component: React.ComponentType<WidgetProps>;
  
  // Optional lifecycle hooks
  hooks?: {
    onCreate?: (config: any) => void;
    onUpdate?: (config: any, prevConfig: any) => void;
    onDestroy?: (config: any) => void;
    onUnmount?: (id: string, config: any) => void;
    onDataChange?: (data: any, config: any) => void;
  };
  
  // Optional data transformer
  dataTransform?: (data: any, config: any) => any;
}

// Props passed to all widget components
export interface WidgetProps {
  id: string;
  config: any;
  data?: any;
  isSelected?: boolean;
  isEditMode?: boolean;
  onConfigChange?: (config: any) => void;
  onDataRequest?: (dataRef: any) => void;
  onResize?: (size: { w: number; h: number }) => void;
  onError?: (error: Error) => void;
}

// Complete widget definition
export interface WidgetDefinition {
  meta: WidgetMeta;
  runtime: WidgetRuntime;
}

// Common configuration schemas for reuse
export const CommonSchemas = {
  // Basic text configuration
  text: z.object({
    content: z.string().default(''),
    fontSize: z.number().min(8).max(72).default(14),
    fontWeight: z.enum(['normal', 'bold']).default('normal'),
    textAlign: z.enum(['left', 'center', 'right']).default('left'),
    color: z.string().default('#ffffff'),
  }),
  
  // Chart configuration
  chart: z.object({
    chartType: z.enum(['line', 'bar', 'area', 'scatter']).default('line'),
    xAxis: z.object({
      label: z.string().optional(),
      type: z.enum(['category', 'number', 'time']).default('category'),
    }).default({}),
    yAxis: z.object({
      label: z.string().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
    }).default({}),
    colors: z.array(z.string()).default(['hsl(var(--primary))', '#00d7ff', '#ff6b6b']),
    showGrid: z.boolean().default(true),
    showLegend: z.boolean().default(true),
  }),
  
  // KPI configuration
  kpi: z.object({
    metric: z.string().default('value'),
    format: z.enum(['number', 'currency', 'percentage']).default('number'),
    precision: z.number().min(0).max(10).default(2),
    showChange: z.boolean().default(true),
    showSparkline: z.boolean().default(false),
    threshold: z.object({
      good: z.number().optional(),
      warning: z.number().optional(),
      critical: z.number().optional(),
    }).optional(),
  }),
  
  // Table configuration
  table: z.object({
    columns: z.array(z.object({
      key: z.string(),
      header: z.string(),
      type: z.enum(['string', 'number', 'date', 'boolean']).default('string'),
      format: z.string().optional(),
      sortable: z.boolean().default(true),
      width: z.number().optional(),
    })).default([]),
    pageSize: z.number().min(10).max(1000).default(50),
    sortable: z.boolean().default(true),
    filterable: z.boolean().default(true),
    exportable: z.boolean().default(true),
  }),
  
  // Data binding configuration
  dataBinding: z.object({
    dataRef: DataRefSchema.optional(),
    autoRefresh: z.boolean().default(false),
    refreshInterval: z.number().min(1000).default(30000),
  }),
};

// Utility function to create a widget schema with base config
export function createWidgetSchema<T extends z.ZodRawShape>(
  configSchema: z.ZodObject<T>
) {
  return BaseWidgetConfigSchema.merge(configSchema);
}

// Type helpers
export type BaseWidgetConfig = z.infer<typeof BaseWidgetConfigSchema>;
export type DataRef = z.infer<typeof DataRefSchema>;
export type CommonTextConfig = z.infer<typeof CommonSchemas.text>;
export type CommonChartConfig = z.infer<typeof CommonSchemas.chart>;
export type CommonKpiConfig = z.infer<typeof CommonSchemas.kpi>;
export type CommonTableConfig = z.infer<typeof CommonSchemas.table>;
export type CommonDataBindingConfig = z.infer<typeof CommonSchemas.dataBinding>;