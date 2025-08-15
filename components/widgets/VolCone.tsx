'use client';

import { Line, XAxis, YAxis, Tooltip, Area, AreaChart } from 'recharts';
import { ChartContainer } from '@/components/ui/ChartContainer';
import type { Widget } from '@/lib/store';
import { useVolSurface } from '@/lib/data/hooks';
import type { WidgetProps } from '@/lib/widgets/schema';

interface VolConeProps {
  widget: Widget;
  onTitleChange?: (title: string) => void;
  symbol?: string;
}

export function VolCone({ widget: _widget, symbol }: Readonly<VolConeProps>) {
  const { data } = useVolSurface(symbol);
  return (
    <div
      className="h-full"
      role="img"
      aria-label={`Volatility cone for ${symbol || 'selected asset'}`}
      data-testid="vol-cone"
    >
      <ChartContainer minHeight={200}>
        <AreaChart data={data?.points ?? []}>
          <XAxis
            dataKey="dte"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '4px',
              color: 'hsl(var(--foreground))',
            }}
            labelFormatter={(label) => `${label} DTE`}
            formatter={(value: number | string, name) => {
              const num = typeof value === 'number' ? value : Number(value);
              const out = Number.isFinite(num) ? `${(num * 100).toFixed(1)}%` : String(value);
              return [out, name];
            }}
          />

          <Area
            dataKey="p90"
            stackId="1"
            stroke="none"
            fill="hsl(var(--destructive))"
            fillOpacity={0.1}
          />
          <Area
            dataKey="p75"
            stackId="1"
            stroke="none"
            fill="var(--chart-orange)"
            fillOpacity={0.2}
          />
          <Area
            dataKey="p50"
            stackId="1"
            stroke="none"
            fill="var(--chart-yellow)"
            fillOpacity={0.3}
          />
          <Area
            dataKey="p25"
            stackId="1"
            stroke="none"
            fill="var(--chart-green)"
            fillOpacity={0.2}
          />
          <Area
            dataKey="p10"
            stackId="1"
            stroke="none"
            fill="var(--chart-blue)"
            fillOpacity={0.1}
          />

          <Line
            type="monotone"
            dataKey="current"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3, fill: 'hsl(var(--primary))' }}
          />
        </AreaChart>
      </ChartContainer>
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

// Default export for lazy import via getLazyWidget('VolCone')
export default function VolConeDefault(props: WidgetProps) {
  const cfg = (props.config as Record<string, unknown>) || {};
  const symbol = typeof cfg.symbol === 'string' ? cfg.symbol : undefined;
  const stub = {
    id: props.id,
    type: 'vol-cone',
    title: cfg.title || 'Volatility Cone',
    layout: { i: props.id, x: 0, y: 0, w: 6, h: 5 },
  } as unknown as Widget;
  return <VolCone widget={stub} symbol={symbol} />;
}
