'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Widget } from '@/lib/store';
import { usePeerKpis } from '@/lib/data/hooks';

interface PeerComparisonProps {
  widget: Widget;
  sheetId: string;
  onTitleChange?: (title: string) => void;
}

export function PeerComparison({ widget }: Readonly<PeerComparisonProps>) {
  const symbolsProp = (widget.props?.symbols as string) || 'AAPL,MSFT,NVDA';
  const symbols = symbolsProp.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  const { data, loading, error } = usePeerKpis(symbols);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Peer Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading peers…</div>
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left p-2">Symbol</th>
                  <th className="text-right p-2">Price</th>
                  <th className="text-right p-2">Change</th>
                  <th className="text-right p-2">Volume</th>
                  <th className="text-right p-2">Market Cap</th>
                </tr>
              </thead>
              <tbody>
                {symbols.map((sym) => {
                  const row = data[sym];
                  if (!row) return (
                    <tr key={sym}><td className="p-2" colSpan={5}>{sym}</td></tr>
                  );
                  return (
                    <tr key={sym} className="border-t">
                      <td className="p-2 font-medium">{sym}</td>
                      <td className="p-2 text-right">${row.price.toFixed(2)}</td>
                      <td className={`p-2 text-right ${row.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {row.change.toFixed(2)} ({row.changePercent.toFixed(2)}%)
                      </td>
                      <td className="p-2 text-right">{row.volume.toLocaleString()}</td>
                      <td className="p-2 text-right">${(row.marketCap / 1e9).toFixed(1)}B</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


