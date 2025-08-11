'use client';

import { AlertTriangle, TrendingDown } from 'lucide-react';
import type { Widget } from '@/lib/store';

interface VarEsProps {
  widget: Widget;
  onTitleChange?: (title: string) => void;
}

const MOCK_VAR_DATA = {
  var95: { value: '$2.4M', confidence: '95%' },
  var99: { value: '$3.8M', confidence: '99%' },
  es95: { value: '$4.2M', confidence: '95%' },
  es99: { value: '$6.1M', confidence: '99%' }
};

export function VarEs({ widget: _widget }: Readonly<VarEsProps>) {
  return (
    <div className="h-full space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-[#2d2d30] rounded">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <span className="text-xs text-[#969696]">VaR {MOCK_VAR_DATA.var95.confidence}</span>
          </div>
          <p className="text-lg font-semibold text-[#cccccc]">
            {MOCK_VAR_DATA.var95.value}
          </p>
        </div>

        <div className="p-3 bg-[#2d2d30] rounded">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            <span className="text-xs text-[#969696]">VaR {MOCK_VAR_DATA.var99.confidence}</span>
          </div>
          <p className="text-lg font-semibold text-[#cccccc]">
            {MOCK_VAR_DATA.var99.value}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-[#2d2d30] rounded">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-red-400" />
            <span className="text-xs text-[#969696]">ES {MOCK_VAR_DATA.es95.confidence}</span>
          </div>
          <p className="text-lg font-semibold text-[#cccccc]">
            {MOCK_VAR_DATA.es95.value}
          </p>
        </div>

        <div className="p-3 bg-[#2d2d30] rounded">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <span className="text-xs text-[#969696]">ES {MOCK_VAR_DATA.es99.confidence}</span>
          </div>
          <p className="text-lg font-semibold text-[#cccccc]">
            {MOCK_VAR_DATA.es99.value}
          </p>
        </div>
      </div>

      <div className="text-xs text-[#969696] text-center">
        1-Day Risk Metrics | Portfolio Value: $125M
      </div>
    </div>
  );
}

// TODO: Advanced risk metrics implementation
// - Historical simulation VaR
// - Monte Carlo VaR calculations
// - Parametric VaR models
// - Backtesting and model validation
// - Component VaR for portfolio decomposition
// - Integration with real portfolio data

export default VarEs;