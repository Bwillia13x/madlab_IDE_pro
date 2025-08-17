'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Widget } from '@/lib/store';

interface DcfBasicProps {
  widget: Widget;
  onTitleChange?: (title: string) => void;
}

interface DcfInputs {
  fcf: number;
  wacc: number;
  g: number;
  netDebt: number;
  shares: number;
}

interface DcfResults {
  enterpriseValue: number;
  equityValue: number;
  impliedPrice: number;
}

function calculateDcf(inputs: DcfInputs): DcfResults {
  const { fcf, wacc, g, netDebt, shares } = inputs;
  const waccDecimal = wacc / 100;
  const gDecimal = g / 100;
  
  // Terminal value calculation: FCF / (WACC - g)
  const enterpriseValue = waccDecimal > gDecimal && waccDecimal > 0 
    ? fcf * 1e6 / (waccDecimal - gDecimal) 
    : 0;
  
  const equityValue = enterpriseValue - (netDebt * 1e6);
  const impliedPrice = shares > 0 ? equityValue / (shares * 1e6) : 0;
  
  return { enterpriseValue, equityValue, impliedPrice };
}

export function DcfBasic({ widget: _widget }: Readonly<DcfBasicProps>) {
  const [inputs, setInputs] = useState<DcfInputs>({
    fcf: 260,      // FCF₁ in millions
    wacc: 8.0,     // WACC percentage
    g: 2.0,        // Long-term growth percentage
    netDebt: 1120, // Net debt in millions
    shares: 310,   // Shares outstanding in millions
  });

  const results = calculateDcf(inputs);

  const updateInput = useCallback((field: keyof DcfInputs, value: number) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSensitivity = (type: 'wacc+' | 'g-') => {
    if (type === 'wacc+') {
      updateInput('wacc', inputs.wacc + 0.5);
    } else if (type === 'g-') {
      updateInput('g', Math.max(-5, inputs.g - 0.5));
    }
  };

  const formatCurrency = (value: number, scale: 'M' | 'B' = 'B') => {
    if (value === 0 || !isFinite(value)) return '—';
    const divisor = scale === 'B' ? 1e9 : 1e6;
    return `$${(value / divisor).toFixed(2)}${scale}`;
  };

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground">DCF (Basic) — live</h4>
      
      {/* Input Controls */}
      <div className="grid grid-cols-5 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">FCF₁ ($M)</Label>
          <Input
            type="number"
            value={inputs.fcf}
            onChange={(e) => updateInput('fcf', parseFloat(e.target.value) || 0)}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">WACC %</Label>
          <Input
            type="number"
            step="0.1"
            value={inputs.wacc}
            onChange={(e) => updateInput('wacc', parseFloat(e.target.value) || 0)}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">g (LT) %</Label>
          <Input
            type="number"
            step="0.1"
            value={inputs.g}
            onChange={(e) => updateInput('g', parseFloat(e.target.value) || 0)}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Net Debt ($M)</Label>
          <Input
            type="number"
            value={inputs.netDebt}
            onChange={(e) => updateInput('netDebt', parseFloat(e.target.value) || 0)}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Shares (M)</Label>
          <Input
            type="number"
            value={inputs.shares}
            onChange={(e) => updateInput('shares', parseFloat(e.target.value) || 0)}
            className="h-8 text-xs"
          />
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-card/50 border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <tbody>
            <tr className="border-b border-border/50">
              <td className="p-2 text-muted-foreground">Enterprise Value</td>
              <td className="p-2 font-mono">{formatCurrency(results.enterpriseValue)}</td>
              <td className="p-2 text-muted-foreground">Equity Value</td>
              <td className="p-2 font-mono">{formatCurrency(results.equityValue)}</td>
            </tr>
            <tr>
              <td className="p-2 text-muted-foreground" colSpan={2}>—</td>
              <td className="p-2 text-muted-foreground">Implied Price</td>
              <td className="p-2 font-mono font-semibold text-primary">
                {results.impliedPrice > 0 ? `$${results.impliedPrice.toFixed(2)}` : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Sensitivity Quick Test */}
      <div className="bg-card/30 border border-dashed rounded-lg p-3">
        <div className="text-xs text-muted-foreground mb-2">Sensitivity quick‑test:</div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSensitivity('wacc+')}
            className="h-7 px-2 text-xs"
          >
            WACC +50 bps
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSensitivity('g-')}
            className="h-7 px-2 text-xs"
          >
            g −50 bps
          </Button>
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