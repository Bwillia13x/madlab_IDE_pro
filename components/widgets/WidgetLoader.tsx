'use client';

import React, { Suspense, lazy } from 'react';
import { log } from '@/lib/utils/errorLogger';

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

import type { Widget } from '@/lib/store';

// Widget loading skeleton
function WidgetSkeleton() {
  return (
    <div className="w-full h-full p-4">
      <Skeleton className="w-full h-4 mb-2" />
      <Skeleton className="w-full h-32" />
    </div>
  );
}

class WidgetErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error) {
    log('error', 'Widget failed to render', undefined, error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs p-3">
          Failed to load widget.
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

// Adapter components to convert config/data to expected props
const KpiCardAdapter = ({ config, data }: { config: Record<string, unknown>; data?: Record<string, unknown> }) => {
  const mockWidget: Widget = {
    id: 'kpi-card',
    type: 'kpi-card',
    title: 'KPI Card',
    layout: { x: 0, y: 0, w: 1, h: 1, i: 'kpi-card' },
    props: { ...config, ...data },
  };
  
  return <KpiCard widget={mockWidget} symbol={data?.symbol as string} />;
};

const LineChartAdapter = ({ config, data }: { config: Record<string, unknown>; data?: Record<string, unknown> }) => {
  const mockWidget: Widget = {
    id: 'line-chart',
    type: 'line-chart',
    title: 'Line Chart',
    layout: { x: 0, y: 0, w: 1, h: 1, i: 'line-chart' },
    props: { ...config, ...data },
  };
  
  return <LineChart widget={mockWidget} />;
};

const BarChartAdapter = ({ config, data }: { config: Record<string, unknown>; data?: Record<string, unknown> }) => {
  const mockWidget: Widget = {
    id: 'bar-chart',
    type: 'bar-chart',
    title: 'Bar Chart',
    layout: { x: 0, y: 0, w: 1, h: 1, i: 'bar-chart' },
    props: { ...config, ...data },
  };
  
  return <BarChart widget={mockWidget} />;
};

const HeatmapAdapter = ({ config, data }: { config: Record<string, unknown>; data?: Record<string, unknown> }) => {
  const mockWidget: Widget = {
    id: 'heatmap',
    type: 'heatmap',
    title: 'Heatmap',
    layout: { x: 0, y: 0, w: 1, h: 1, i: 'heatmap' },
    props: { ...config, ...data },
  };
  
  return <Heatmap widget={mockWidget} />;
};

const AdvancedChartAdapter = ({ config, data }: { config: Record<string, unknown>; data?: Record<string, unknown> }) => {
  const mockWidget: Widget = {
    id: 'advanced-chart',
    type: 'advanced-chart',
    title: 'Advanced Chart',
    layout: { x: 0, y: 0, w: 1, h: 1, i: 'advanced-chart' },
    props: { ...config, ...data },
  };
  
  return <AdvancedChart widget={mockWidget} sheetId="default" />;
};

const CandlestickChartAdapter = ({ config, data }: { config: Record<string, unknown>; data?: Record<string, unknown> }) => {
  const mockWidget: Widget = {
    id: 'candlestick-chart',
    type: 'candlestick-chart',
    title: 'Candlestick Chart',
    layout: { x: 0, y: 0, w: 1, h: 1, i: 'candlestick-chart' },
    props: { ...config, ...data },
  };
  
  return <CandlestickChart widget={mockWidget} sheetId="default" />;
};

const PortfolioTrackerAdapter = ({ config, data }: { config: Record<string, unknown>; data?: Record<string, unknown> }) => {
  const mockWidget: Widget = {
    id: 'portfolio-tracker',
    type: 'portfolio-tracker',
    title: 'Portfolio Tracker',
    layout: { x: 0, y: 0, w: 1, h: 1, i: 'portfolio-tracker' },
    props: { ...config, ...data },
  };
  
  return <PortfolioTracker widget={mockWidget} sheetId="default" />;
};

const OptionsChainWidgetAdapter = ({ config, data }: { config: Record<string, unknown>; data?: Record<string, unknown> }) => {
  const mockWidget: Widget = {
    id: 'options-chain',
    type: 'options-chain',
    title: 'Options Chain',
    layout: { x: 0, y: 0, w: 1, h: 1, i: 'options-chain' },
    props: { ...config, ...data },
  };
  
  return <OptionsChainWidget widget={mockWidget} sheetId="default" />;
};

const BacktestingFrameworkWidgetAdapter = ({ config, data }: { config: Record<string, unknown>; data?: Record<string, unknown> }) => {
  const mockWidget: Widget = {
    id: 'backtesting-framework',
    type: 'backtesting-framework',
    title: 'Backtesting Framework',
    layout: { x: 0, y: 0, w: 1, h: 1, i: 'backtesting-framework' },
    props: { ...config, ...data },
  };
  
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
    <WidgetErrorBoundary>
      <Suspense fallback={<WidgetSkeleton />}>
        <WidgetComponent config={config} data={data} />
      </Suspense>
    </WidgetErrorBoundary>
  );
}