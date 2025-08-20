'use client';

import { LineChart as RechartsLineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
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
            domain={["auto", "auto"]}
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
