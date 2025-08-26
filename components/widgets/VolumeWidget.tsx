'use client';

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { Widget } from '@/lib/store';

interface VolumeWidgetProps {
  widget: Widget;
  onTitleChange?: (title: string) => void;
}

const MOCK_VOLUME_DATA = [
  { date: 'Mon', volume: 1250000 },
  { date: 'Tue', volume: 1890000 },
  { date: 'Wed', volume: 1420000 },
  { date: 'Thu', volume: 2100000 },
  { date: 'Fri', volume: 1680000 },
];

export function VolumeWidget({ widget: _widget }: Readonly<VolumeWidgetProps>) {
  return (
    <div className="h-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={MOCK_VOLUME_DATA}>
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#969696' }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#969696' }}
            tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#2d2d30',
              border: '1px solid #3e3e42',
              borderRadius: '4px',
              color: '#cccccc',
            }}
            formatter={(value: number) => [`${value.toLocaleString()}`, 'Volume']}
          />
          <Bar dataKey="volume" fill="#10b981" radius={[2, 2, 0, 0]} opacity={0.8} />
        </RechartsBarChart>
      </ResponsiveContainer>

      {/* Data Source Indicator */}
      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
        Sample Data
      </div>
    </div>
  );
}
