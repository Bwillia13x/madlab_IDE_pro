'use client';

import type { Widget } from '@/lib/store';
import type { WidgetProps } from '@/lib/widgets/schema';
import { cn } from '@/lib/utils';
import { AccessibleWidget } from '@/components/ui/AccessibleWidget';

interface CorrelationMatrixProps {
  widget: Widget;
  onTitleChange?: (title: string) => void;
}

const ASSETS = ['SPY', 'QQQ', 'IWM', 'EFA', 'BND'];
const MOCK_CORRELATION_DATA = [
  [1.00, 0.85, 0.76, 0.68, -0.12],
  [0.85, 1.00, 0.72, 0.64, -0.18],
  [0.76, 0.72, 1.00, 0.59, -0.08],
  [0.68, 0.64, 0.59, 1.00, -0.15],
  [-0.12, -0.18, -0.08, -0.15, 1.00],
];

function getCorrelationColor(value: number): string {
  if (value > 0.7) return 'bg-green-500';
  if (value > 0.3) return 'bg-green-400';
  if (value > 0.1) return 'bg-yellow-400';
  if (value > -0.1) return 'bg-gray-400';
  if (value > -0.3) return 'bg-orange-400';
  return 'bg-red-500';
}

export function CorrelationMatrix({ widget: _widget }: Readonly<CorrelationMatrixProps>) {
  const content = (
    <div className="h-full flex flex-col" role="img" aria-label="Asset correlation matrix" data-testid="correlation-matrix">
      <div className="grid grid-cols-6 gap-1 text-xs text-muted-foreground mb-2">
        <div></div>
        {ASSETS.map((asset) => (
          <div key={asset} className="text-center">{asset}</div>
        ))}
      </div>
      
      <div className="flex-1">
        {MOCK_CORRELATION_DATA.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-6 gap-1 mb-1">
            <div className="text-xs text-muted-foreground flex items-center">
              {ASSETS[rowIndex]}
            </div>
            {row.map((value, colIndex) => (
              <div
                key={colIndex}
                className={cn(
                  "aspect-square rounded text-xs font-medium text-foreground flex items-center justify-center",
                  getCorrelationColor(value)
                )}
              >
                {value.toFixed(2)}
              </div>
            ))}
          </div>
        ))}
      </div>
      
      <div className="text-xs text-muted-foreground mt-2 text-center">
        30-Day Rolling Correlation
      </div>
    </div>
  );

  return (
    <AccessibleWidget
      widgetType="correlation-matrix"
      title="Correlation Matrix"
      helpText="Matrix of pairwise asset correlations over a rolling window."
    >
      {content}
    </AccessibleWidget>
  );
}

// TODO: Advanced correlation analysis
// - Dynamic correlation calculation
// - Time-series correlation plots
// - Correlation clustering and hierarchical grouping
// - Rolling window correlation analysis
// - Conditional correlation models
// - Export correlation matrices

// Default export for lazy import via getLazyWidget('CorrelationMatrix')
export default function CorrelationMatrixDefault(props: WidgetProps) {
  const cfg = (props.config as any) || {};
  const stub = { id: props.id, type: 'correlation-matrix', title: cfg.title || 'Correlation Matrix', layout: { i: props.id, x: 0, y: 0, w: 6, h: 6 } } as unknown as Widget;
  return <CorrelationMatrix widget={stub} />;
}