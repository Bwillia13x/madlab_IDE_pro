'use client';

import type { Widget } from '@/lib/store';
import { useMemo, useState } from 'react';
import { greeks as bsGreeks, normalizeGreeks, type OptionType } from '@/lib/quant/blackScholes';
import { usePrices } from '@/lib/data/hooks';
import { buildVolCone } from '@/lib/quant/vol';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LineChart as ReLineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer } from '@/components/ui/ChartContainer';
import { AccessibleWidget } from '@/components/ui/AccessibleWidget';

interface OptionsCardProps {
  widget: Widget;
  onTitleChange?: (title: string) => void;
  symbol?: string;
}

function numInput(value: number, setValue: (v: number) => void, step = 0.01) {
  return {
    value: Number.isFinite(value) ? value : 0,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValue(Number(e.target.value) || 0),
    step,
    className: 'w-full bg-background border border-border rounded px-2 py-1 text-sm',
    type: 'number' as const,
  };
}

export function OptionsCard({ widget: _widget, symbol }: Readonly<OptionsCardProps>) {
  const [S, setS] = useState<number>(100);
  const [K, setK] = useState<number>(100);
  const [sigmaPct, setSigmaPct] = useState<number>(20);
  const [rPct, setRPct] = useState<number>(1);
  const [T, setT] = useState<number>(1);
  const [type, setType] = useState<OptionType>('call');
  const [tab, setTab] = useState<string>('greeks');

  const inputs = useMemo(() => ({
    S, K, r: rPct / 100, sigma: sigmaPct / 100, T, type,
  }), [S, K, rPct, sigmaPct, T, type]);

  const g = useMemo(() => bsGreeks(inputs), [inputs]);
  const gn = useMemo(() => normalizeGreeks(g), [g]);

  const { data: prices } = usePrices(symbol, '1Y');
  const cone = useMemo(() => {
    const closes = (prices ?? []).map(p => p.close);
    const points = buildVolCone(closes, [20, 60, 120, 252]).filter(p => Number.isFinite(p.vol));
    return points.map(p => ({ window: p.window, vol: p.vol }));
  }, [prices]);

  const content = (
    <div className="h-full flex flex-col gap-3 group" data-testid="options-card">
      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="greeks">Greeks</TabsTrigger>
          <TabsTrigger value="volcone">Vol Cone</TabsTrigger>
        </TabsList>

        <TabsContent value="greeks" className="flex-1 min-h-0">
          <div className="grid grid-cols-6 gap-2 text-xs mb-3">
            <label className="flex flex-col gap-1"><span className="text-muted-foreground">S</span><input {...numInput(S, setS, 0.1)} /></label>
            <label className="flex flex-col gap-1"><span className="text-muted-foreground">K</span><input {...numInput(K, setK, 0.1)} /></label>
            <label className="flex flex-col gap-1"><span className="text-muted-foreground">σ %</span><input {...numInput(sigmaPct, setSigmaPct, 0.1)} /></label>
            <label className="flex flex-col gap-1"><span className="text-muted-foreground">r %</span><input {...numInput(rPct, setRPct, 0.01)} /></label>
            <label className="flex flex-col gap-1"><span className="text-muted-foreground">T (yrs)</span><input {...numInput(T, setT, 0.01)} /></label>
            <label className="flex flex-col gap-1"><span className="text-muted-foreground">Type</span>
              <select className="bg-background border border-border rounded px-2 py-1 text-sm" value={type} onChange={(e) => setType((e.target.value as OptionType) || 'call')}>
                <option value="call">Call</option>
                <option value="put">Put</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3 text-xs"><div className="text-muted-foreground">Price</div><div className="text-lg font-semibold">{g.price.toFixed(3)}</div></Card>
            <Card className="p-3 text-xs"><div className="text-muted-foreground">Delta</div><div className="text-lg font-semibold">{g.delta.toFixed(3)}</div></Card>
            <Card className="p-3 text-xs"><div className="text-muted-foreground">Gamma</div><div className="text-lg font-semibold">{g.gamma.toFixed(5)}</div></Card>
            <Card className="p-3 text-xs"><div className="text-muted-foreground">Vega</div><div className="text-lg font-semibold">{g.vega.toFixed(3)}</div></Card>
            <Card className="p-3 text-xs"><div className="text-muted-foreground">Theta</div><div className="text-lg font-semibold">{g.theta.toFixed(3)}</div></Card>
            <Card className="p-3 text-xs"><div className="text-muted-foreground">Rho</div><div className="text-lg font-semibold">{g.rho.toFixed(3)}</div></Card>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <Card className="p-3 text-xs"><div className="text-muted-foreground">Vega (per 1%)</div><div className="text-lg font-semibold">{gn.vegaPerPct.toFixed(3)}</div></Card>
            <Card className="p-3 text-xs"><div className="text-muted-foreground">Theta (per day)</div><div className="text-lg font-semibold">{gn.thetaPerDay.toFixed(3)}</div></Card>
            <Card className="p-3 text-xs"><div className="text-muted-foreground">Rho (per 1%)</div><div className="text-lg font-semibold">{gn.rhoPerPctRate.toFixed(3)}</div></Card>
          </div>
        </TabsContent>

        <TabsContent value="volcone" className="flex-1 min-h-0">
          <Card className="p-3 h-full">
            <div className="h-48">
              <ChartContainer minHeight={180}>
                <ReLineChart data={cone}>
                  <XAxis dataKey="window" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => (v * 100).toFixed(1) + '%'} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} formatter={(v: any) => [(v * 100).toFixed(2) + '%', 'Realized Vol']} labelFormatter={(l) => `Window ${l}d`} />
                  <Line type="monotone" dataKey="vol" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </ReLineChart>
              </ChartContainer>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <AccessibleWidget
      widgetType="options-card"
      title="Options Card"
      helpText="Compute option Greeks and visualize realized volatility cones."
    >
      {content}
    </AccessibleWidget>
  );
}


