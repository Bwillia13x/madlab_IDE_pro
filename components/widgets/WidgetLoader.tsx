'use client';

import { Suspense, lazy } from 'react';

import { Skeleton } from '@/components/ui/skeleton';

// Dynamic imports for heavy widgets to improve initial load performance
const AdvancedChart = lazy(() => import('./AdvancedChart').then(mod => ({ default: mod.AdvancedChart })));
const CandlestickChart = lazy(() => import('./CandlestickChart').then(mod => ({ default: mod.CandlestickChart })));
const PortfolioTracker = lazy(() => import('./PortfolioTracker').then(mod => ({ default: mod.PortfolioTracker })));
const OptionsChainWidget = lazy(() => import('./OptionsChainWidget').then(mod => ({ default: mod.OptionsChainWidget })));
const BacktestingFrameworkWidget = lazy(() => import('./BacktestingFrameworkWidget').then(mod => ({ default: mod.BacktestingFrameworkWidget })));

// Lightweight widgets can be imported normally
import { KpiCard } from './KpiCard';
import { LineChart } from './LineChart';
import { BarChart } from './BarChart';
import { Heatmap } from './Heatmap';

interface WidgetComponentProps {
  type: string;
  config: Record<string, unknown>;
  data?: Record<string, unknown>;
}

// Widget loading skeleton
function WidgetSkeleton() {
  return (
    <div className="w-full h-full p-4">
      <Skeleton className="w-full h-4 mb-2" />
      <Skeleton className="w-full h-32" />
    </div>
  );
}

// Adapter components to convert config/data to expected props
const KpiCardAdapter = ({ config, data }: { config: Record<string, unknown>; data?: Record<string, unknown> }) => {
  const mockWidget = {
    id: 'kpi-card',
    type: 'kpi-card',
    title: 'KPI Card',
    config: config,
    position: { x: 0, y: 0, w: 1, h: 1 },
    data: data || {}
  } as any;
  
  return <KpiCard widget={mockWidget} symbol={data?.symbol as string} />;
};

const LineChartAdapter = ({ config, data }: { config: Record<string, unknown>; data?: Record<string, unknown> }) => {
  const mockWidget = {
    id: 'line-chart',
    type: 'line-chart',
    title: 'Line Chart',
    config: config,
    position: { x: 0, y: 0, w: 1, h: 1 },
    data: data || {}
  } as any;
  
  return <LineChart widget={mockWidget} />;
};

const BarChartAdapter = ({ config, data }: { config: Record<string, unknown>; data?: Record<string, unknown> }) => {
  const mockWidget = {
    id: 'bar-chart',
    type: 'bar-chart',
    title: 'Bar Chart',
    config: config,
    position: { x: 0, y: 0, w: 1, h: 1 },
    data: data || {}
  } as any;
  
  return <BarChart widget={mockWidget} />;
};

const HeatmapAdapter = ({ config, data }: { config: Record<string, unknown>; data?: Record<string, unknown> }) => {
  const mockWidget = {
    id: 'heatmap',
    type: 'heatmap',
    title: 'Heatmap',
    config: config,
    position: { x: 0, y: 0, w: 1, h: 1 },
    data: data || {}
  } as any;
  
  return <Heatmap widget={mockWidget} />;
};

const AdvancedChartAdapter = ({ config, data }: { config: Record<string, unknown>; data?: Record<string, unknown> }) => {
  const mockWidget = {
    id: 'advanced-chart',
    type: 'advanced-chart',
    title: 'Advanced Chart',
    config: config,
    position: { x: 0, y: 0, w: 1, h: 1 },
    data: data || {}
  } as any;
  
  return <AdvancedChart widget={mockWidget} sheetId="default" />;
};

const CandlestickChartAdapter = ({ config, data }: { config: Record<string, unknown>; data?: Record<string, unknown> }) => {
  const mockWidget = {
    id: 'candlestick-chart',
    type: 'candlestick-chart',
    title: 'Candlestick Chart',
    config: config,
    position: { x: 0, y: 0, w: 1, h: 1 },
    data: data || {}
  } as any;
  
  return <CandlestickChart widget={mockWidget} sheetId="default" />;
};

const PortfolioTrackerAdapter = ({ config, data }: { config: Record<string, unknown>; data?: Record<string, unknown> }) => {
  const mockWidget = {
    id: 'portfolio-tracker',
    type: 'portfolio-tracker',
    title: 'Portfolio Tracker',
    config: config,
    position: { x: 0, y: 0, w: 1, h: 1 },
    data: data || {}
  } as any;
  
  return <PortfolioTracker widget={mockWidget} sheetId="default" />;
};

const OptionsChainWidgetAdapter = ({ config, data }: { config: Record<string, unknown>; data?: Record<string, unknown> }) => {
  const mockWidget = {
    id: 'options-chain',
    type: 'options-chain',
    title: 'Options Chain',
    config: config,
    position: { x: 0, y: 0, w: 1, h: 1 },
    data: data || {}
  } as any;
  
  return <OptionsChainWidget widget={mockWidget} sheetId="default" />;
};

const BacktestingFrameworkWidgetAdapter = ({ config, data }: { config: Record<string, unknown>; data?: Record<string, unknown> }) => {
  const mockWidget = {
    id: 'backtesting-framework',
    type: 'backtesting-framework',
    title: 'Backtesting Framework',
    config: config,
    position: { x: 0, y: 0, w: 1, h: 1 },
    data: data || {}
  } as any;
  
  return <BacktestingFrameworkWidget widget={mockWidget} sheetId="default" />;
};

// Widget registry with adapter components
const widgetRegistry: Record<string, React.ComponentType<{ config: Record<string, unknown>; data?: Record<string, unknown> }>> = {
  // Lightweight widgets (with adapters)
  'kpi-card': KpiCardAdapter,
  'line-chart': LineChartAdapter,
  'bar-chart': BarChartAdapter,
  'heatmap': HeatmapAdapter,
  
  // Heavy widgets (with adapters)
  'advanced-chart': AdvancedChartAdapter,
  'candlestick-chart': CandlestickChartAdapter,
  'portfolio-tracker': PortfolioTrackerAdapter,
  'options-chain': OptionsChainWidgetAdapter,
  'backtesting-framework': BacktestingFrameworkWidgetAdapter,
};

export function WidgetLoader({ type, config, data }: WidgetComponentProps) {
  const WidgetComponent = widgetRegistry[type];
  
  if (!WidgetComponent) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        Unknown widget type: {type}
      </div>
    );
  }

  return (
    <Suspense fallback={<WidgetSkeleton />}>
      <WidgetComponent config={config} data={data} />
    </Suspense>
  );
}