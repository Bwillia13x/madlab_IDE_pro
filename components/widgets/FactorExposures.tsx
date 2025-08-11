'use client';

import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import type { Widget } from '@/lib/store';

interface FactorExposuresProps {
  widget: Widget;
  onTitleChange?: (title: string) => void;
}

const MOCK_FACTOR_DATA = [
  { factor: 'Market', exposure: 0.85, color: '#007acc' },
  { factor: 'Size', exposure: -0.12, color: '#ff6b6b' },
  { factor: 'Value', exposure: 0.34, color: '#51cf66' },
  { factor: 'Momentum', exposure: 0.18, color: '#ffd43b' },
  { factor: 'Quality', exposure: 0.42, color: '#9c88ff' },
];

export function FactorExposures({ widget: _widget }: Readonly<FactorExposuresProps>) {
  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={MOCK_FACTOR_DATA} layout="horizontal">
          <XAxis 
            type="number" 
            domain={[-0.5, 1]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#969696' }}
          />
          <YAxis 
            type="category" 
            dataKey="factor" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#969696' }}
            width={60}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#2d2d30', 
              border: '1px solid #3e3e42',
              borderRadius: '4px',
              color: '#cccccc'
            }}
            formatter={(value: number | string) => {
              const num = typeof value === 'number' ? value : Number(value);
              const label = Number.isFinite(num) ? num.toFixed(2) : String(value);
              return [label, 'Exposure'];
            }}
          />
          <Bar dataKey="exposure" radius={[0, 2, 2, 0]}>
            {MOCK_FACTOR_DATA.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

// TODO: Enhanced factor analysis
// - Multi-factor model attribution
// - Factor loadings over time
// - Custom factor definitions
// - Sector and regional factor exposures
// - Factor performance attribution
// - Risk-adjusted factor exposures

export default FactorExposures;