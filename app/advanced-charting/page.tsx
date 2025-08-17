'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AdvancedChart } from '@/components/widgets/AdvancedChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdvancedChartingPage() {
  const [theme, setTheme] = useState<'sunrise' | 'sunset'>(() => {
    if (typeof window === 'undefined') return 'sunrise';
    return (localStorage.getItem('madlabChartTheme') as 'sunrise' | 'sunset') || 'sunrise';
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-theme', theme);
      localStorage.setItem('madlabChartTheme', theme);
    }
  }, [theme]);

  const widget = useMemo(() => ({
    id: 'advanced-chart-page',
    type: 'advanced-chart',
    title: 'MAD LAB — Advanced Charting',
    layout: { i: 'advanced-chart-page', x: 0, y: 0, w: 12, h: 10 },
    props: { symbol: 'NVDA' },
    version: 1,
  }), []);

  return (
    <div className="h-full flex flex-col">
      <div className="h-14 flex items-center gap-3 px-3 border-b border-border bg-background/60 backdrop-blur">
        <div className="w-5 h-5 rounded-md" style={{ background: 'conic-gradient(from 120deg,#7DC8F7,#FFD29D,#FF7EB6,#7DC8F7)' }} />
        <div className="font-semibold tracking-wide">MAD LAB — Advanced Charting</div>
        <span className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-muted/30">/ticker/<b>NVDA</b>/chart</span>
        <div className="flex-1" />
        <div className="text-xs text-muted-foreground">Theme</div>
        <Select value={theme} onValueChange={(v: 'sunrise' | 'sunset') => setTheme(v)}>
          <SelectTrigger className="h-8 w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sunrise">Sunrise</SelectItem>
            <SelectItem value="sunset">Sunset</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1 grid gap-2 p-2" style={{ gridTemplateColumns: '280px 1fr 360px' }}>
        {/* Left controls panel (lightweight mirror of widget controls) */}
        <Card className="overflow-hidden">
          <CardHeader className="py-2 px-3 border-b border-border bg-background/40">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Controls</CardTitle>
          </CardHeader>
          <CardContent className="p-3 text-xs">
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>Use the controls embedded in the chart widget to change overlays, window, comparisons, and annotations. This panel is a placeholder for future global controls.</p>
            </div>
          </CardContent>
        </Card>

        {/* Center chart */}
        <AdvancedChart widget={widget as any} sheetId="page" />

        {/* Right snapshot panel (placeholder) */}
        <Card className="overflow-hidden">
          <CardHeader className="py-2 px-3 border-b border-border bg-background/40">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="p-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="border rounded-md p-2 bg-muted/10"><div className="text-[11px] text-muted-foreground mb-1">Price</div><div>—</div></div>
              <div className="border rounded-md p-2 bg-muted/10"><div className="text-[11px] text-muted-foreground mb-1">Change</div><div>—</div></div>
              <div className="border rounded-md p-2 bg-muted/10"><div className="text-[11px] text-muted-foreground mb-1">ATR(14)</div><div>—</div></div>
              <div className="border rounded-md p-2 bg-muted/10"><div className="text-[11px] text-muted-foreground mb-1">Volatility</div><div>—</div></div>
              <div className="border rounded-md p-2 bg-muted/10 col-span-2">
                <label htmlFor="page-notes" className="text-[11px] text-muted-foreground mb-1 block">Notes</label>
                <textarea id="page-notes" placeholder="Type notes…" aria-label="Notes" className="w-full h-[90px] text-xs rounded-md border border-border bg-background p-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


