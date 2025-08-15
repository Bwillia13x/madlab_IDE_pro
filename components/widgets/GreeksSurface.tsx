'use client';

import type { Widget } from '@/lib/store';
import type { WidgetProps } from '@/lib/widgets/schema';
import { AccessibleWidget } from '@/components/ui/AccessibleWidget';

interface GreeksSurfaceProps {
  widget: Widget;
  onTitleChange?: (title: string) => void;
}

const MOCK_GREEKS_DATA = [
  { strike: '95', delta: '0.89', gamma: '0.02', theta: '-0.08', vega: '0.15' },
  { strike: '100', delta: '0.65', gamma: '0.05', theta: '-0.12', vega: '0.28' },
  { strike: '105', delta: '0.42', gamma: '0.06', theta: '-0.10', vega: '0.32' },
  { strike: '110', delta: '0.23', gamma: '0.04', theta: '-0.07', vega: '0.25' },
];

export function GreeksSurface({ widget: _widget }: Readonly<GreeksSurfaceProps>) {
  const content = (
    <div
      className="h-full overflow-auto"
      role="table"
      aria-label="Options Greeks table"
      data-testid="greeks-surface"
    >
      <div className="min-w-full">
        <div className="grid grid-cols-5 gap-2 text-xs text-muted-foreground mb-2 font-medium">
          <div>Strike</div>
          <div>Delta</div>
          <div>Gamma</div>
          <div>Theta</div>
          <div>Vega</div>
        </div>

        {MOCK_GREEKS_DATA.map((row, index) => (
          <div
            key={index}
            className="grid grid-cols-5 gap-2 text-xs mb-2 p-2 bg-card rounded"
            role="row"
          >
            <div className="text-foreground font-medium">{row.strike}</div>
            <div className="text-green-400">{row.delta}</div>
            <div className="text-blue-400">{row.gamma}</div>
            <div className="text-red-400">{row.theta}</div>
            <div className="text-purple-400">{row.vega}</div>
          </div>
        ))}
      </div>

      <div className="text-xs text-muted-foreground mt-3 text-center">
        Current Spot: $102.45 | DTE: 30
      </div>
    </div>
  );

  return (
    <AccessibleWidget
      widgetType="greeks-surface"
      title="Greeks Surface"
      helpText="Tabular display of option Greeks across strikes."
    >
      {content}
    </AccessibleWidget>
  );
}

// TODO: Advanced Greeks analysis
// - 3D Greeks surface visualization
// - Greeks sensitivity to underlying price changes
// - Time decay analysis and Greeks evolution
// - Implied volatility surface integration
// - Portfolio Greeks aggregation
// - Real-time Greeks updates

// Default export for lazy import via getLazyWidget('GreeksSurface')
export default function GreeksSurfaceDefault(props: WidgetProps) {
  const cfg = (props.config as Record<string, unknown>) || {};
  const stub = {
    id: props.id,
    type: 'greeks-surface',
    title: cfg.title || 'Greeks Surface',
    layout: { i: props.id, x: 0, y: 0, w: 6, h: 6 },
  } as unknown as Widget;
  return <GreeksSurface widget={stub} />;
}
