'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Widget } from '@/lib/store';
import { useQuarterlyFinancials } from '@/lib/data/hooks';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KpiMiniGridProps {
  widget: Widget;
  sheetId: string;
}

export function KpiMiniGrid({ widget }: Readonly<KpiMiniGridProps>) {
  const symbol = (widget.props?.symbol as string) || 'AAPL';
  const { data, loading, error } = useQuarterlyFinancials(symbol, 4);

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    return `$${value.toFixed(0)}`;
  };

  const calculateDelta = (current: number, previous: number) => {
    if (previous === 0) return { value: 0, percent: 0 };
    const delta = current - previous;
    const percent = (delta / previous) * 100;
    return { value: delta, percent };
  };

  const getDeltaIcon = (percent: number) => {
    if (Math.abs(percent) < 0.1) return <Minus className="w-4 h-4 text-muted-foreground" />;
    return percent > 0 ? 
      <TrendingUp className="w-4 h-4 text-green-600" /> : 
      <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  const getDeltaColor = (percent: number) => {
    if (Math.abs(percent) < 0.1) return 'text-muted-foreground';
    return percent > 0 ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">KPI Mini-Grid — {symbol}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading KPIs…</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">KPI Mini-Grid — {symbol}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-destructive">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (data.length < 2) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">KPI Mini-Grid — {symbol}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Need at least 2 quarters for comparison</div>
        </CardContent>
      </Card>
    );
  }

  const current = data[0];
  const previous = data[1];
  const yearAgo = data[3] || data[data.length - 1];

  const qoqRevenue = calculateDelta(current.revenue, previous.revenue);
  const yoyRevenue = calculateDelta(current.revenue, yearAgo.revenue);
  const qoqNetIncome = calculateDelta(current.netIncome, previous.netIncome);
  const yoyNetIncome = calculateDelta(current.netIncome, yearAgo.netIncome);
  const qoqFcf = calculateDelta(current.fcf, previous.fcf);
  const yoyFcf = calculateDelta(current.fcf, yearAgo.fcf);

  const kpis = [
    {
      label: 'Revenue',
      current: current.revenue,
      qoq: qoqRevenue,
      yoy: yoyRevenue,
      format: formatCurrency,
    },
    {
      label: 'Net Income',
      current: current.netIncome,
      qoq: qoqNetIncome,
      yoy: yoyNetIncome,
      format: formatCurrency,
    },
    {
      label: 'Free Cash Flow',
      current: current.fcf,
      qoq: qoqFcf,
      yoy: yoyFcf,
      format: formatCurrency,
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">KPI Mini-Grid — {symbol}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">{kpi.label}</div>
              <div className="text-lg font-semibold">{kpi.format(kpi.current)}</div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs">
                  {getDeltaIcon(kpi.qoq.percent)}
                  <span className={getDeltaColor(kpi.qoq.percent)}>
                    QoQ: {kpi.qoq.percent > 0 ? '+' : ''}{kpi.qoq.percent.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  {getDeltaIcon(kpi.yoy.percent)}
                  <span className={getDeltaColor(kpi.yoy.percent)}>
                    YoY: {kpi.yoy.percent > 0 ? '+' : ''}{kpi.yoy.percent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 text-xs text-muted-foreground">
          {current.period} vs {previous.period} (QoQ), {current.period} vs {yearAgo.period} (YoY)
        </div>
      </CardContent>
    </Card>
  );
}
