'use client';

import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { Widget } from '@/lib/store';

interface BarChartProps {
  widget: Widget;
  onTitleChange?: (title: string) => void;
}

const MOCK_BAR_DATA = [
  { name: 'ACME', value: 12.1, category: 'P/E' },
  { name: 'Beta', value: 14.8, category: 'P/E' },
  { name: 'Globex', value: 18.3, category: 'P/E' },
  { name: 'Delta', value: 9.7, category: 'P/E' },
  { name: 'Echo', value: 22.1, category: 'P/E' },
];

export function BarChart({ widget }: BarChartProps) {
  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={MOCK_BAR_DATA}>
          <XAxis 
            dataKey="name" 
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
          <Bar 
            dataKey="value" 
            fill="#007acc"
            radius={[2, 2, 0, 0]}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

// TODO: Advanced bar chart features
// - Grouped and stacked bar charts
// - Horizontal bar charts
// - Custom color schemes and themes
// - Data labels and annotations
// - Drill-down capabilities
// - Comparison benchmarks