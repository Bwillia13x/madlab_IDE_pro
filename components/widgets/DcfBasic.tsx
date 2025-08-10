'use client';

import type { Widget } from '@/lib/store';

interface DcfBasicProps {
  widget: Widget;
  onTitleChange?: (title: string) => void;
}

const MOCK_DCF_DATA = [
  { company: 'ACME', multiple: '12.1x' },
  { company: 'Beta Corp', multiple: '14.8x' },
  { company: 'Globex', multiple: '18.3x' },
];

export function DcfBasic({ widget: _widget }: Readonly<DcfBasicProps>) {
  return (
    <div className="h-full flex flex-col">
      <div className="space-y-3">
        {MOCK_DCF_DATA.map((item, index) => (
          <div key={index} className="flex justify-between items-center p-2 bg-[#2d2d30] rounded">
            <span className="text-sm text-[#cccccc]">{item.company}</span>
            <span className="text-sm font-medium text-[#007acc]">{item.multiple}</span>
          </div>
        ))}
      </div>
      
      <div className="mt-auto p-3 bg-[#2d2d30] rounded">
        <div className="text-center">
          <p className="text-xs text-[#969696] mb-1">Estimated Valuation</p>
          <p className="text-lg font-semibold text-[#cccccc]">$156.7M</p>
          <p className="text-xs text-green-400">+23.5% upside</p>
        </div>
      </div>
    </div>
  );
}

// TODO: Implement comprehensive DCF modeling
// - Multi-stage DCF with growth phases
// - Sensitivity analysis for key assumptions
// - Terminal value calculations with multiple methods
// - WACC calculation with market data
// - Cash flow forecasting with scenario modeling
// - Integration with company fundamental data