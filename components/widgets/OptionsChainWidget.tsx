'use client';

import { useState, useMemo, useRef, memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import type { Widget } from '@/lib/store';
import { Search, ExternalLink } from 'lucide-react';

interface OptionsChainWidgetProps {
  widget: Widget;
  sheetId: string;
}

interface OptionData {
  strike: number;
  call: {
    price: number;
    mid: number;
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    iv: number;
    isITM: boolean;
  };
  put: {
    price: number;
    mid: number;
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    iv: number;
    isITM: boolean;
  };
}

interface UnderlyingData {
  symbol: string;
  price: number;
  iv: number;
  ivRank: number;
  beta: number;
  r: number;
}

// Mock underlying data
const MOCK_UNDERLYINGS: Record<string, UnderlyingData> = {
  'SPY': { symbol: 'SPY', price: 550, iv: 0.21, ivRank: 45, beta: 1.0, r: 0.05 },
  'NVDA': { symbol: 'NVDA', price: 1175, iv: 0.54, ivRank: 72, beta: 1.8, r: 0.05 },
  'AAPL': { symbol: 'AAPL', price: 191, iv: 0.28, ivRank: 38, beta: 1.2, r: 0.05 },
  'TSLA': { symbol: 'TSLA', price: 245, iv: 0.62, ivRank: 85, beta: 2.1, r: 0.05 },
};

const DTE_OPTIONS = [7, 14, 21, 30, 45, 60];

// Simplified Black-Scholes calculations
function normalCDF(x: number): number {
  const a1 = 0.31938153;
  const a2 = -0.356563782;
  const a3 = 1.781477937;
  const a4 = -1.821255978;
  const a5 = 1.330274429;
  
  const L = Math.abs(x);
  const k = 1 / (1 + 0.2316419 * L);
  const w = 1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-L * L / 2) *
    (a1 * k + a2 * k ** 2 + a3 * k ** 3 + a4 * k ** 4 + a5 * k ** 5);
  
  return x < 0 ? 1 - w : w;
}

function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function blackScholes(S: number, K: number, T: number, r: number, sigma: number, isCall: boolean) {
  const sqrtT = Math.sqrt(Math.max(T, 1/365));
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  
  const Nd1 = normalCDF(isCall ? d1 : -d1);
  const Nd2 = normalCDF(isCall ? d2 : -d2);
  
  const price = isCall
    ? S * Nd1 - K * Math.exp(-r * T) * Nd2
    : K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
    
  const delta = isCall ? normalCDF(d1) : normalCDF(d1) - 1;
  const gamma = normalPDF(d1) / (S * sigma * sqrtT);
  const vega = S * normalPDF(d1) * sqrtT * 0.01;
  const theta = (
    -(S * normalPDF(d1) * sigma) / (2 * sqrtT) -
    (isCall 
      ? r * K * Math.exp(-r * T) * normalCDF(d2)
      : -r * K * Math.exp(-r * T) * normalCDF(-d2)
    )
  ) / 365;
  
  return { price, delta, gamma, theta, vega };
}

function generateOptionChain(underlying: UnderlyingData, dte: number, priceShock: number = 0): OptionData[] {
  const S = underlying.price * (1 + priceShock / 100);
  const baseIV = underlying.iv;
  const T = dte / 365;
  const r = underlying.r;
  
  const strikes: number[] = [];
  const strikeSpacing = S <= 50 ? 2.5 : S <= 100 ? 5 : S <= 200 ? 10 : S <= 500 ? 25 : 50;
  
  // Generate more strikes for virtualization demo (30 strikes)
  for (let i = -15; i <= 15; i++) {
    const strike = Math.round((S + i * strikeSpacing) / strikeSpacing) * strikeSpacing;
    if (strike > 0) strikes.push(strike);
  }
  
  return strikes.map(strike => {
    const skew = -0.1;
    const moneyness = strike / S;
    const callIV = Math.max(0.05, baseIV + skew * (moneyness - 1));
    const putIV = Math.max(0.05, baseIV + skew * (moneyness - 1) + 0.01);
    
    const callData = blackScholes(S, strike, T, r, callIV, true);
    const putData = blackScholes(S, strike, T, r, putIV, false);
    
    const callBid = Math.max(0, callData.price * 0.99);
    const callAsk = callData.price * 1.01;
    const putBid = Math.max(0, putData.price * 0.99);
    const putAsk = putData.price * 1.01;
    
    return {
      strike,
      call: {
        price: callData.price,
        mid: (callBid + callAsk) / 2,
        delta: callData.delta,
        gamma: callData.gamma,
        theta: callData.theta,
        vega: callData.vega,
        iv: callIV,
        isITM: strike < S,
      },
      put: {
        price: putData.price,
        mid: (putBid + putAsk) / 2,
        delta: putData.delta,
        gamma: putData.gamma,
        theta: putData.theta,
        vega: putData.vega,
        iv: putIV,
        isITM: strike > S,
      }
    };
  });
}

const OptionsChainWidget = memo(function OptionsChainWidget({ widget: _widget }: OptionsChainWidgetProps) {
  const [symbol, setSymbol] = useState('NVDA');
  const [dte, setDte] = useState(30);
  const [showGreeks, setShowGreeks] = useState(true);
  const [priceShock, setPriceShock] = useState(0);
  const [selectedLeg, setSelectedLeg] = useState<{ side: 'C' | 'P'; strike: number; price: number } | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  
  const tableRef = useRef<HTMLDivElement>(null);
  const ITEM_HEIGHT = 32; // Height of each row in pixels
  const VISIBLE_ITEMS = 8; // Number of visible items
  const CONTAINER_HEIGHT = VISIBLE_ITEMS * ITEM_HEIGHT;

  const underlying = useMemo(() => MOCK_UNDERLYINGS[symbol], [symbol]);
  const adjustedPrice = useMemo(() => underlying?.price * (1 + priceShock / 100) || 0, [underlying, priceShock]);

  const optionChain = useMemo(() => {
    if (!underlying) return [];
    return generateOptionChain(underlying, dte, priceShock);
  }, [underlying, dte, priceShock]);

  const atmStrike = useMemo(() => {
    if (optionChain.length === 0) return 0;
    return optionChain.reduce((prev, current) => 
      Math.abs(current.strike - adjustedPrice) < Math.abs(prev.strike - adjustedPrice) ? current : prev
    ).strike;
  }, [optionChain, adjustedPrice]);

  const handleLegSelection = useCallback((side: 'C' | 'P', strike: number, price: number) => {
    setSelectedLeg({ side, strike, price });
  }, []);

  const handleSymbolChange = useCallback((value: string) => {
    setSymbol(value);
  }, []);

  const handleDteChange = useCallback((value: string) => {
    setDte(parseInt(value));
  }, []);

  const handlePriceShockChange = useCallback(([value]: number[]) => {
    setPriceShock(value);
  }, []);

  const handleGreeksToggle = useCallback((checked: boolean | string) => {
    setShowGreeks(!!checked);
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Virtual scrolling calculations
  const { visibleItems, offsetY } = useMemo(() => {
    const startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    const endIndex = Math.min(startIndex + VISIBLE_ITEMS + 2, optionChain.length);
    const visibleOptions = optionChain.slice(startIndex, endIndex);
    const offsetY = startIndex * ITEM_HEIGHT;
    
    return {
      visibleItems: visibleOptions.map((option, index) => ({
        ...option,
        index: startIndex + index
      })),
      offsetY
    };
  }, [optionChain, scrollTop, ITEM_HEIGHT, VISIBLE_ITEMS]);

  const totalHeight = optionChain.length * ITEM_HEIGHT;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Search className="w-4 h-4" />
          Options Chain
          <Badge variant="secondary" className="ml-auto text-xs">{symbol} {dte}d</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Symbol</label>
            <Select value={symbol} onValueChange={handleSymbolChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(MOCK_UNDERLYINGS).map(sym => (
                  <SelectItem key={sym} value={sym}>{sym}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">DTE</label>
            <Select value={dte.toString()} onValueChange={handleDteChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DTE_OPTIONS.map(days => (
                  <SelectItem key={days} value={days.toString()}>{days}d</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Underlying Snapshot */}
        {underlying && (
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <div className="text-muted-foreground">Price</div>
              <div className="font-bold">${adjustedPrice.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">IV</div>
              <div className="font-bold">{(underlying.iv * 100).toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-muted-foreground">IVR</div>
              <div className="font-bold">{underlying.ivRank}%</div>
            </div>
          </div>
        )}

        {/* Price Shock */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Price Shock</span>
            <span>{priceShock.toFixed(1)}%</span>
          </div>
          <Slider
            value={[priceShock]}
            onValueChange={handlePriceShockChange}
            max={10}
            min={-10}
            step={0.5}
            className="w-full"
          />
        </div>

        {/* Options Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showGreeks"
              checked={showGreeks}
              onCheckedChange={handleGreeksToggle}
            />
            <label htmlFor="showGreeks" className="text-xs">Greeks</label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('/options-chain', '_blank')}
            className="h-6 text-xs px-2"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Full Chain
          </Button>
        </div>

        {/* Virtual Options Chain Table */}
        <div className="overflow-x-auto">
          {/* Fixed Header */}
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-background">
                <th className="text-left py-1">C</th>
                {showGreeks && <th className="text-right py-1">Δ</th>}
                <th className="text-right py-1">Mid</th>
                <th className="text-center py-1 font-bold">Strike</th>
                <th className="text-left py-1">Mid</th>
                {showGreeks && <th className="text-left py-1">Δ</th>}
                <th className="text-right py-1">P</th>
              </tr>
            </thead>
          </table>

          {/* Virtualized Body */}
          <div 
            ref={tableRef}
            className="relative overflow-auto border border-border rounded"
            style={{ height: CONTAINER_HEIGHT }}
            onScroll={handleScroll}
          >
            <div style={{ height: totalHeight }}>
              <div 
                style={{ 
                  transform: `translateY(${offsetY}px)`,
                  height: visibleItems.length * ITEM_HEIGHT
                }}
              >
                <table className="w-full text-xs">
                  <tbody>
                    {visibleItems.map((option) => (
                      <tr 
                        key={option.strike} 
                        className="border-b border-border/50 hover:bg-muted/20"
                        style={{ height: ITEM_HEIGHT }}
                      >
                        <td className={`py-1 text-left ${option.call.isITM ? 'bg-primary/10' : ''}`}>
                          C
                        </td>
                        {showGreeks && (
                          <td className="py-1 text-right">{option.call.delta.toFixed(2)}</td>
                        )}
                        <td 
                          className="py-1 text-right cursor-pointer hover:bg-accent/20 font-medium"
                          onClick={() => handleLegSelection('C', option.strike, option.call.mid)}
                        >
                          {option.call.mid.toFixed(2)}
                        </td>
                        <td className={`py-1 text-center font-bold ${option.strike === atmStrike ? 'bg-accent/20' : ''}`}>
                          {option.strike}
                        </td>
                        <td 
                          className="py-1 text-left cursor-pointer hover:bg-accent/20 font-medium"
                          onClick={() => handleLegSelection('P', option.strike, option.put.mid)}
                        >
                          {option.put.mid.toFixed(2)}
                        </td>
                        {showGreeks && (
                          <td className="py-1 text-left">{option.put.delta.toFixed(2)}</td>
                        )}
                        <td className={`py-1 text-right ${option.put.isITM ? 'bg-primary/10' : ''}`}>
                          P
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Leg */}
        {selectedLeg && (
          <div className="border border-dashed rounded-lg p-3 bg-muted/10">
            <div className="text-xs space-y-1">
              <div className="font-medium">Selected</div>
              <div className="flex justify-between">
                <span>{symbol} {dte}d {selectedLeg.side} {selectedLeg.strike}</span>
                <span className="font-bold">${selectedLeg.price.toFixed(2)}</span>
              </div>
              <div className="text-muted-foreground">
                Premium: ${(selectedLeg.price * 100).toFixed(0)} per contract
              </div>
            </div>
          </div>
        )}

        {/* Quick Greeks Summary */}
        {showGreeks && selectedLeg && (
          <div className="text-xs text-muted-foreground">
            Click a price to see Greeks and build positions in the full chain view.
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export { OptionsChainWidget };