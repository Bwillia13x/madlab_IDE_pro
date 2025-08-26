'use client';

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { Widget } from '@/lib/store';
import { usePrices } from '@/lib/data/hooks';
import { useWorkspaceStore } from '@/lib/store';

interface LineChartProps {
  widget: Widget;
  onTitleChange?: (title: string) => void;
}

export function LineChart({ widget: _widget }: Readonly<LineChartProps>) {
  const { globalSymbol, globalTimeframe } = useWorkspaceStore();
  const { data, loading, error } = usePrices(globalSymbol, globalTimeframe);

  const chartData = (data || []).map((p) => ({
    date: new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    value: p.close,
  }));

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-red-400">
        Failed to load prices: {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-xs text-muted-foreground">Loading chart data...</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-muted-foreground">
            <svg
              className="h-12 w-12 mx-auto mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground">No Data Available</p>
          <p className="text-xs text-muted-foreground">
            {globalSymbol ? `No price data for ${globalSymbol}` : 'Select a symbol to view chart'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={chartData}>
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#969696' }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#969696' }}
            domain={['auto', 'auto']}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#2d2d30',
              border: '1px solid #3e3e42',
              borderRadius: '4px',
              color: '#cccccc',
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#007acc"
            strokeWidth={2}
            dot={false}
            isAnimationActive={!loading}
            activeDot={{ r: 4, stroke: '#007acc', strokeWidth: 2 }}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}

// TODO: Enhance charting capabilities
// - Multiple data series support
// - Interactive zoom and pan
// - Candlestick charts for OHLC data
// - Technical indicators overlay
// - Real-time data streaming
// - Custom time range selection
// - Export chart as image/PDF
