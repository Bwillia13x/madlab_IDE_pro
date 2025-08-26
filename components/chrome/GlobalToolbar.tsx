'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useWorkspaceStore } from '@/lib/store';
import type { PriceRange } from '@/lib/data/provider.types';

const RANGES: PriceRange[] = ['1D','5D','1M','3M','6M','1Y','2Y','5Y','MAX'];

export function GlobalToolbar() {
  const {
    globalSymbol,
    setGlobalSymbol,
    applyGlobalSymbolToAllWidgets,
    globalTimeframe,
    setGlobalTimeframe,
  } = useWorkspaceStore();

  const [symbol, setSymbol] = useState(globalSymbol);
  useEffect(() => setSymbol(globalSymbol), [globalSymbol]);

  return (
    <div className="h-10 bg-[#1c1c1c] border-b border-[#2d2d30] flex items-center gap-2 px-3 text-xs">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground uppercase tracking-wide">Symbol</span>
        <Input
          value={symbol}
          onChange={(e) => setSymbol((e.target.value || '').toUpperCase().slice(0,12))}
          onBlur={() => setGlobalSymbol(symbol)}
          onKeyDown={(e) => { if (e.key === 'Enter') setGlobalSymbol(symbol); }}
          placeholder="AAPL"
          className="h-7 w-28 bg-[#2d2d30] border-[#3e3e42] text-[#cccccc] placeholder-[#969696]"
        />
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2"
          onClick={() => applyGlobalSymbolToAllWidgets(undefined, { onlyEmpty: true })}
          title="Apply symbol to widgets missing a symbol"
        >
          Apply to widgets
        </Button>
      </div>

      <div className="flex items-center gap-2 ml-4">
        <span className="text-muted-foreground uppercase tracking-wide">Timeframe</span>
        <Select value={globalTimeframe} onValueChange={(val) => setGlobalTimeframe(val as PriceRange)}>
          <SelectTrigger className="h-7 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map(r => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="hidden md:flex items-center gap-1 ml-1">
          {(['1D','1M','3M','6M','1Y'] as PriceRange[]).map((r) => (
            <Button key={r} size="sm" variant={globalTimeframe === r ? 'default' : 'outline'} className="h-7 px-2" onClick={() => setGlobalTimeframe(r)}>
              {r}
            </Button>
          ))}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2"
          onClick={() => {
            try { window.open('/mobile', '_blank'); } catch {}
          }}
        >
          Open Mobile
        </Button>
      </div>
    </div>
  );
}
