'use client';

import type { Widget } from '@/lib/store';
import { AccessibleWidget } from '@/components/ui/AccessibleWidget';
import { cn } from '@/lib/utils';
import { dcfSensitivityGrid } from '@/lib/quant/dcf';

interface HeatmapProps {
  widget: Widget;
  onTitleChange?: (title: string) => void;
}

const WACC_VALUES = [0.08, 0.09, 0.10, 0.11, 0.12];
const GROWTH_VALUES = [0.02, 0.025, 0.03, 0.035, 0.04];

function getHeatmapColor(value: number, min: number, max: number): string {
  const normalized = (value - min) / (max - min);
  
  if (normalized < 0.2) return 'bg-red-500';
  if (normalized < 0.4) return 'bg-orange-500';
  if (normalized < 0.6) return 'bg-yellow-500';
  if (normalized < 0.8) return 'bg-green-500';
  return 'bg-green-600';
}

export function Heatmap({ widget: _widget }: Readonly<HeatmapProps>) {
  const base = { initialFcf: 100, years: 5, terminalMethod: 'ggm' as const, exitMultiple: 10 };
  const grid = dcfSensitivityGrid(
    { ...base, growthRate: GROWTH_VALUES[2], discountRate: WACC_VALUES[2] },
    GROWTH_VALUES,
    WACC_VALUES
  );
  // Map to matrix [rows: WACC, cols: growth]
  const matrix: number[][] = WACC_VALUES.map((r) =>
    GROWTH_VALUES.map((g) => grid.find((x) => x.discount === r && x.growth === g)?.enterpriseValue ?? NaN)
  );
  const flatData = matrix.flat();
  const min = Math.min(...flatData);
  const max = Math.max(...flatData);

  const content = (
    <div className="h-full flex flex-col" role="img" aria-label="DCF sensitivity heatmap" data-testid="heatmap">
      <div className="grid grid-cols-6 gap-1 text-xs text-muted-foreground mb-2">
        <div></div>
        {GROWTH_VALUES.map((growth) => (
          <div key={growth} className="text-center">{growth}</div>
        ))}
      </div>
      
      <div className="flex-1">
        {matrix.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-6 gap-1 mb-1">
            <div className="text-xs text-muted-foreground flex items-center">
              {(WACC_VALUES[rowIndex] * 100).toFixed(0)}%
            </div>
            {row.map((value, colIndex) => (
              <div
                key={colIndex}
                className={cn(
                  "aspect-square rounded text-xs font-medium text-foreground flex items-center justify-center",
                  getHeatmapColor(value, min, max)
                )}
              >
                {Number.isFinite(value) ? value.toFixed(0) : '—'}
              </div>
            ))}
          </div>
        ))}
      </div>
      
      <div className="text-xs text-muted-foreground mt-2 text-center">
        DCF EV Sensitivity (WACC vs Growth)
      </div>
    </div>
  );

  return (
    <AccessibleWidget
      widgetType="heatmap"
      title="Sensitivity (WACC x g)"
      helpText="Heatmap of enterprise value sensitivity across WACC and growth rates."
    >
      {content}
    </AccessibleWidget>
  );
}

// Default export for dynamic loader compatibility
export default function HeatmapDefault(_props: unknown) {
  return <Heatmap widget={{ id: 'heat', type: 'heatmap', title: 'Sensitivity (WACC x g)', layout: { i: 'heat', x: 0, y: 0, w: 6, h: 4 } } as any} />;
}

// TODO: Enhanced heatmap functionality
// - Interactive hover with detailed tooltips
// - Configurable color scales and ranges
// - Support for different data types (correlation, volatility, etc.)
// - Export functionality
// - Custom axis labels and formatting
// - Real-time data updates