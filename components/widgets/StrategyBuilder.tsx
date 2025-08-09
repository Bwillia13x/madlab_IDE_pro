'use client';

import { Plus, Minus, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Widget } from '@/lib/store';

interface StrategyBuilderProps {
  widget: Widget;
  onTitleChange?: (title: string) => void;
}

const MOCK_STRATEGY_LEGS = [
  { type: 'Call', strike: '100', expiry: '30D', action: 'Buy', quantity: 1, premium: 2.45 },
  { type: 'Call', strike: '105', expiry: '30D', action: 'Sell', quantity: 1, premium: 1.20 },
];

export function StrategyBuilder({ widget }: StrategyBuilderProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 space-y-2">
        {MOCK_STRATEGY_LEGS.map((leg, index) => (
          <div key={index} className="p-2 bg-[#2d2d30] rounded flex items-center justify-between">
            <div className="flex items-center gap-2">
              {leg.action === 'Buy' ? (
                <Plus className="h-3 w-3 text-green-400" />
              ) : (
                <Minus className="h-3 w-3 text-red-400" />
              )}
              <span className="text-xs text-[#cccccc]">
                {leg.action} {leg.quantity} {leg.type} ${leg.strike}
              </span>
            </div>
            <span className="text-xs text-[#007acc]">${leg.premium}</span>
          </div>
        ))}
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full bg-[#2d2d30] border-[#3e3e42] text-[#cccccc]"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Leg
        </Button>
      </div>
      
      <div className="mt-3 p-3 bg-[#2d2d30] rounded">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[#969696]">Net Premium:</span>
            <p className="text-green-400 font-medium">$1.25 Credit</p>
          </div>
          <div>
            <span className="text-[#969696]">Max Profit:</span>
            <p className="text-[#cccccc] font-medium">$1.25</p>
          </div>
          <div>
            <span className="text-[#969696]">Max Loss:</span>
            <p className="text-red-400 font-medium">$3.75</p>
          </div>
          <div>
            <span className="text-[#969696]">Breakeven:</span>
            <p className="text-[#cccccc] font-medium">$103.75</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// TODO: Advanced strategy builder features
// - Visual strategy builder with drag-and-drop
// - Pre-defined strategy templates
// - Real-time P&L calculations
// - Greeks analysis for complex strategies
// - Risk/reward visualization
// - Strategy performance backtesting