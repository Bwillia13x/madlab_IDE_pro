'use client';

import { Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart } from 'recharts';
import type { Widget } from '@/lib/store';

interface VolConeProps {
  widget: Widget;
  onTitleChange?: (title: string) => void;
}

const MOCK_VOL_CONE_DATA = [
  { dte: 7, p10: 0.15, p25: 0.18, p50: 0.22, p75: 0.26, p90: 0.32, current: 0.24 },
  { dte: 14, p10: 0.16, p25: 0.19, p50: 0.23, p75: 0.27, p90: 0.33, current: 0.25 },
  { dte: 30, p10: 0.17, p25: 0.20, p50: 0.24, p75: 0.28, p90: 0.34, current: 0.26 },
  { dte: 60, p10: 0.18, p25: 0.21, p50: 0.25, p75: 0.29, p90: 0.35, current: 0.27 },
  { dte: 90, p10: 0.19, p25: 0.22, p50: 0.26, p75: 0.30, p90: 0.36, current: 0.28 },
];

export function VolCone({ widget: _widget }: Readonly<VolConeProps>) {
  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={MOCK_VOL_CONE_DATA}>
          <XAxis 
            dataKey="dte" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#969696' }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#969696' }}
            tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#2d2d30', 
              border: '1px solid #3e3e42',
              borderRadius: '4px',
              color: '#cccccc'
            }}
            labelFormatter={(label) => `${label} DTE`}
            formatter={(value: number | string, name) => {
              const num = typeof value === 'number' ? value : Number(value);
              const out = Number.isFinite(num) ? `${(num * 100).toFixed(1)}%` : String(value);
              return [out, name];
            }}
          />
          
          <Area dataKey="p90" stackId="1" stroke="none" fill="#ef4444" fillOpacity={0.1} />
          <Area dataKey="p75" stackId="1" stroke="none" fill="#f97316" fillOpacity={0.2} />
          <Area dataKey="p50" stackId="1" stroke="none" fill="#eab308" fillOpacity={0.3} />
          <Area dataKey="p25" stackId="1" stroke="none" fill="#22c55e" fillOpacity={0.2} />
          <Area dataKey="p10" stackId="1" stroke="none" fill="#3b82f6" fillOpacity={0.1} />
          
          <Line 
            type="monotone" 
            dataKey="current" 
            stroke="#007acc" 
            strokeWidth={2}
            dot={{ r: 3, fill: '#007acc' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// TODO: Enhanced volatility analysis
// - Historical vs implied volatility comparison
// - Volatility skew analysis
// - Term structure visualization
// - Real-time volatility surface updates
// - Volatility forecasting models
// - Integration with options pricing

export default VolCone;