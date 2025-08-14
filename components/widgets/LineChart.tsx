"use client";

import { useState } from 'react';
import { AccessibleWidget } from '@/components/ui/AccessibleWidget';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer } from '@/components/ui/ChartContainer';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import type { Widget } from '@/lib/store';
import { usePrices, useDataCache } from '@/lib/data/hooks';
import { Button } from '@/components/ui/button';
import type { PriceRange } from '@/lib/data/providers';
import { exportPriceData } from '@/lib/data/export';

interface LineChartProps {
  widget: Widget;
  onTitleChange?: (title: string) => void;
  symbol?: string;
}

const RANGES: PriceRange[] = ['1D','5D','1M','3M','6M','1Y','2Y','5Y'];

export function LineChart({ widget: _widget, symbol }: Readonly<LineChartProps>) {
  const [range, setRange] = useState<PriceRange>('6M');
  const actualSymbol = symbol || 'AAPL';
  const { data, loading, error } = usePrices(actualSymbol, range);
  const { clearCache } = useDataCache();

  const handleExport = () => {
    if (!data || data.length === 0) {
      toast.error('No price data available to export');
      return;
    }

    try {
      // Transform data to include OHLC structure (with close as all values for line chart data)
      const exportData = data.map(point => ({
        date: point.date instanceof Date ? point.date.toISOString().split('T')[0] : (point as any).date,
        open: point.close, // Line chart typically only has close prices
        high: point.close,
        low: point.close,
        close: point.close,
        volume: 0, // Line chart data may not include volume
      }));

      exportPriceData(exportData, actualSymbol, {
        filename: `${actualSymbol}_${range}_prices_${new Date().toISOString().split('T')[0]}.csv`
      });
      toast.success(`Price data for ${actualSymbol} (${range}) exported successfully`);
    } catch (err) {
      toast.error(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };
  const content = (
    <div className="h-full group" data-testid="line-chart">
      <div className="flex items-center gap-2 px-2 py-1">
        <div className="text-xs text-muted-foreground">{actualSymbol}</div>
        <div className="ml-auto flex items-center gap-1 opacity-60 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200" data-testid="line-range">
          {RANGES.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={r === range ? 'default' : 'ghost'}
              className="h-6 px-2 text-xs"
              data-testid={`line-range-${r}`}
              onClick={() => setRange(r)}
            >
              {r}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-xs"
            data-testid="line-export"
            onClick={handleExport}
            title="Export Data"
            disabled={!data || data.length === 0 || loading}
          >
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-xs"
            data-testid="line-refresh"
            onClick={() => clearCache()}
            title="Refresh"
          >
            Refresh
          </Button>
        </div>
      </div>
      {error && (
        <div className="text-xs text-red-400 px-2 py-1" role="status">{String(error)}</div>
      )}
      <div 
        role="img" 
        aria-labelledby="chart-title" 
        aria-describedby="chart-desc"
        aria-label={`Line chart showing ${actualSymbol} price over ${range} period`}
      >
        <div id="chart-title" className="sr-only">
          {actualSymbol} Stock Price Chart - {range}
        </div>
        <div id="chart-desc" className="sr-only">
          {loading 
            ? 'Loading price data...'
            : error 
              ? `Error loading data: ${error}`
              : data 
                ? `Chart displays ${data.length} price points from ${data[0]?.date} to ${data[data.length-1]?.date}`
                : 'No data available'
          }
        </div>
        <ChartContainer minHeight={180}>
          <RechartsLineChart data={data ?? []}>
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '4px',
              color: 'hsl(var(--foreground))'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="close" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
          />
        </RechartsLineChart>
        </ChartContainer>
      </div>
      {loading && !data && (
        <div className="text-xs text-muted-foreground px-2 py-1" role="status" aria-live="polite">Loading…</div>
      )}
    </div>
  );

  return (
    <AccessibleWidget
      widgetType="line-chart"
      title={`${actualSymbol} Line Chart`}
      loading={loading}
      error={error ?? null}
      helpText={`Line chart for ${actualSymbol}. Use the range buttons to switch periods.`}
    >
      {content}
    </AccessibleWidget>
  );
}

export default LineChart;

// TODO: Enhance charting capabilities
// - Multiple data series support
// - Interactive zoom and pan
// - Candlestick charts for OHLC data
// - Technical indicators overlay
// - Real-time data streaming
// - Custom time range selection
// - Export chart as image/PDF