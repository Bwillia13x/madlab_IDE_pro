'use client';

import { LineChart as RechartsLineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { ChartContainer } from '@/components/ui/ChartContainer';
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

export function PnLProfile({ widget: _widget }: Readonly<PnLProfileProps>) {
  return (
    <div 
      className="h-full"
      role="img"
      aria-label="Options P&L profile chart"
      data-testid="pnl-profile"
    >
      <ChartContainer minHeight={180}>
        <RechartsLineChart data={MOCK_PNL_DATA}>
          <XAxis 
            dataKey="price" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            domain={['dataMin', 'dataMax']}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '4px',
              color: 'hsl(var(--foreground))'
            }}
            formatter={(value, _name) => [`$${value}`, 'P&L']}
            labelFormatter={(label) => `Price: $${label}`}
          />
          
          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" />
          
          <Line 
            type="linear" 
            dataKey="pnl" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            dot={{ r: 3, fill: 'hsl(var(--primary))' }}
          />
        </RechartsLineChart>
      </ChartContainer>
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