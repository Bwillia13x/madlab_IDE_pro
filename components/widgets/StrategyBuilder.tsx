'use client';

import { Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AccessibleWidget } from '@/components/ui/AccessibleWidget';
import type { Widget } from '@/lib/store';

interface StrategyBuilderProps {
  widget: Widget;
  onTitleChange?: (title: string) => void;
}

const MOCK_STRATEGY_LEGS = [
  { type: 'Call', strike: '100', expiry: '30D', action: 'Buy', quantity: 1, premium: 2.45 },
  { type: 'Call', strike: '105', expiry: '30D', action: 'Sell', quantity: 1, premium: 1.20 },
];

export function StrategyBuilder({ widget: _widget }: Readonly<StrategyBuilderProps>) {
  const content = (
    <div className="h-full flex flex-col" role="region" aria-label="Options strategy builder" data-testid="strategy-builder">
      <div className="flex-1 space-y-2">
        {MOCK_STRATEGY_LEGS.map((leg, index) => (
          <div key={index} className="p-2 bg-card rounded flex items-center justify-between border border-border">
            <div className="flex items-center gap-2">
              {leg.action === 'Buy' ? (
                <Plus className="h-3 w-3 text-green-400" />
              ) : (
                <Minus className="h-3 w-3 text-red-400" />
              )}
              <span className="text-xs text-foreground">
                {leg.action} {leg.quantity} {leg.type} ${leg.strike}
              </span>
            </div>
            <span className="text-xs text-primary">${leg.premium}</span>
          </div>
        ))}
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full bg-card border-border text-foreground"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Leg
        </Button>
      </div>
      
      <div className="mt-3 p-3 bg-card rounded border border-border">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Net Premium:</span>
            <p className="text-green-400 font-medium">$1.25 Credit</p>
          </div>
          <div>
            <span className="text-muted-foreground">Max Profit:</span>
            <p className="text-foreground font-medium">$1.25</p>
          </div>
          <div>
            <span className="text-muted-foreground">Max Loss:</span>
            <p className="text-red-400 font-medium">$3.75</p>
          </div>
          <div>
            <span className="text-muted-foreground">Breakeven:</span>
            <p className="text-foreground font-medium">$103.75</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <AccessibleWidget
      widgetType="strategy-builder"
      title="Strategy Builder"
      helpText="Construct option strategies by adding legs and review summary metrics."
    >
      {content}
    </AccessibleWidget>
  );
}

// TODO: Advanced strategy builder features
// - Visual strategy builder with drag-and-drop
// - Pre-defined strategy templates
// - Real-time P&L calculations
// - Greeks analysis for complex strategies
// - Risk/reward visualization
// - Strategy performance backtesting