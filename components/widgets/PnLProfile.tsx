'use client';

import { LineChart as RechartsLineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import type { Widget } from '@/lib/store';

interface PnLProfileProps {
  widget: Widget;
  onTitleChange?: (title: string) => void;
}

const MOCK_PNL_DATA = [
  { price: 90, pnl: -375 },
  { price: 95, pnl: -375 },
  { price: 100, pnl: -375 },
  { price: 103.75, pnl: 0 },
  { price: 105, pnl: 125 },
  { price: 110, pnl: 125 },
  { price: 115, pnl: 125 },
];

export function PnLProfile({ widget }: PnLProfileProps) {
  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={MOCK_PNL_DATA}>
          <XAxis 
            dataKey="price" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#969696' }}
            domain={['dataMin', 'dataMax']}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#969696' }}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#2d2d30', 
              border: '1px solid #3e3e42',
              borderRadius: '4px',
              color: '#cccccc'
            }}
            formatter={(value, name) => [`$${value}`, 'P&L']}
            labelFormatter={(label) => `Price: $${label}`}
          />
          
          <ReferenceLine y={0} stroke="#969696" strokeDasharray="2 2" />
          
          <Line 
            type="linear" 
            dataKey="pnl" 
            stroke="#007acc" 
            strokeWidth={2}
            dot={{ r: 3, fill: '#007acc' }}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}

// TODO: Enhanced P&L analysis
// - Time decay visualization
// - Greeks impact on P&L profile
// - Multi-scenario P&L analysis
// - Interactive price/volatility sliders
// - Export P&L charts and data
// - Real-time P&L tracking