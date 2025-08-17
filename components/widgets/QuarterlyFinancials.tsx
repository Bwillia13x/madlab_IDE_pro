'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Widget } from '@/lib/store';
import { useQuarterlyFinancials } from '@/lib/data/hooks';

interface QuarterlyFinancialsProps {
  widget: Widget;
  sheetId: string;
}

function Money({ value }: { value: number }) {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const text = abs >= 1_000_000_000
    ? `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`
    : abs >= 1_000_000
    ? `${sign}$${(abs / 1_000_000).toFixed(2)}M`
    : `${sign}$${abs.toFixed(0)}`;
  return <span>{text}</span>;
}

export function QuarterlyFinancials({ widget }: Readonly<QuarterlyFinancialsProps>) {
  const symbol = (widget.props?.symbol as string) || 'AAPL';
  const { data, loading, error } = useQuarterlyFinancials(symbol, 8);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Quarterly Financials — {symbol}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left p-2">Quarter</th>
                  <th className="text-right p-2">Revenue</th>
                  <th className="text-right p-2">Net Income</th>
                  <th className="text-right p-2">FCF</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.period} className="border-t">
                    <td className="p-2">{row.period}</td>
                    <td className="p-2 text-right"><Money value={row.revenue} /></td>
                    <td className="p-2 text-right"><Money value={row.netIncome} /></td>
                    <td className="p-2 text-right"><Money value={row.fcf} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="text-xs text-muted-foreground">Mock series derived from base financials</div>
      </CardContent>
    </Card>
  );
}


