'use client';

import { LineChart as RechartsLineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { Widget } from '@/lib/store';

interface LineChartProps {
  widget: Widget;
  onTitleChange?: (title: string) => void;
}

const MOCK_CHART_DATA = [
  { date: 'Jan', value: 4000, volume: 2400 },
  { date: 'Feb', value: 3000, volume: 1398 },
  { date: 'Mar', value: 2000, volume: 9800 },
  { date: 'Apr', value: 2780, volume: 3908 },
  { date: 'May', value: 1890, volume: 4800 },
  { date: 'Jun', value: 2390, volume: 3800 },
  { date: 'Jul', value: 3490, volume: 4300 },
];

export function LineChart({ widget }: LineChartProps) {
  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={MOCK_CHART_DATA}>
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
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#2d2d30', 
              border: '1px solid #3e3e42',
              borderRadius: '4px',
              color: '#cccccc'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#007acc" 
            strokeWidth={2}
            dot={false}
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