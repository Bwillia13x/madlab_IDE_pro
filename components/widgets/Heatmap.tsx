'use client';

import type { Widget } from '@/lib/store';
import { cn } from '@/lib/utils';

interface HeatmapProps {
  widget: Widget;
  onTitleChange?: (title: string) => void;
}

const MOCK_HEATMAP_DATA = [
  [156.2, 142.8, 129.4, 116.0, 102.6],
  [174.8, 160.3, 145.8, 131.3, 116.8],
  [193.4, 177.8, 162.2, 146.6, 131.0],
  [212.0, 195.3, 178.6, 161.9, 145.2],
  [230.6, 212.8, 195.0, 177.2, 159.4],
];

const WACC_VALUES = ['8%', '9%', '10%', '11%', '12%'];
const GROWTH_VALUES = ['2%', '2.5%', '3%', '3.5%', '4%'];

function getHeatmapColor(value: number, min: number, max: number): string {
  const normalized = (value - min) / (max - min);
  
  if (normalized < 0.2) return 'bg-red-500';
  if (normalized < 0.4) return 'bg-orange-500';
  if (normalized < 0.6) return 'bg-yellow-500';
  if (normalized < 0.8) return 'bg-green-500';
  return 'bg-green-600';
}

export function Heatmap({ widget: _widget }: Readonly<HeatmapProps>) {
  const flatData = MOCK_HEATMAP_DATA.flat();
  const min = Math.min(...flatData);
  const max = Math.max(...flatData);

  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-6 gap-1 text-xs text-[#969696] mb-2">
        <div></div>
        {GROWTH_VALUES.map((growth) => (
          <div key={growth} className="text-center">{growth}</div>
        ))}
      </div>
      
      <div className="flex-1">
        {MOCK_HEATMAP_DATA.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-6 gap-1 mb-1">
            <div className="text-xs text-[#969696] flex items-center">
              {WACC_VALUES[rowIndex]}
            </div>
            {row.map((value, colIndex) => (
              <div
                key={colIndex}
                className={cn(
                  "aspect-square rounded text-xs font-medium text-white flex items-center justify-center",
                  getHeatmapColor(value, min, max)
                )}
              >
                {value.toFixed(0)}
              </div>
            ))}
          </div>
        ))}
      </div>
      
      <div className="text-xs text-[#969696] mt-2 text-center">
        WACC vs Growth Rate Sensitivity
      </div>
    </div>
  );
}

// TODO: Enhanced heatmap functionality
// - Interactive hover with detailed tooltips
// - Configurable color scales and ranges
// - Support for different data types (correlation, volatility, etc.)
// - Export functionality
// - Custom axis labels and formatting
// - Real-time data updates

export default Heatmap;