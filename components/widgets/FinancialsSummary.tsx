'use client';

import { RefreshCcw, DollarSign, TrendingUp, PiggyBank, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Widget } from '@/lib/store';
import { useFinancials, useDataCache } from '@/lib/data/hooks';

interface FinancialsSummaryProps {
  widget: Widget;
  sheetId: string;
  onTitleChange?: (title: string) => void;
}

function fmtMoney(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function FinancialsSummary({ widget }: Readonly<FinancialsSummaryProps>) {
  const symbol = (widget.props?.symbol as string) || 'AAPL';
  const { data, loading, error, refetch } = useFinancials(symbol);
  const { clearSymbolCache } = useDataCache();

  const handleRefresh = async () => {
    clearSymbolCache(symbol);
    await refetch();
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Financials — {symbol}</CardTitle>
          <button
            type="button"
            onClick={handleRefresh}
            title="Refresh"
            className="h-8 w-8 p-0 inline-flex items-center justify-center rounded border hover:bg-muted"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading financials…</div>
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded border p-3 bg-card/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-3.5 w-3.5" /> Revenue (TTM)
              </div>
              <div className="text-lg font-semibold">{data ? fmtMoney(data.revenue) : '—'}</div>
            </div>
            <div className="rounded border p-3 bg-card/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="h-3.5 w-3.5" /> Net Income (TTM)
              </div>
              <div className="text-lg font-semibold">{data ? fmtMoney(data.netIncome) : '—'}</div>
            </div>
            <div className="rounded border p-3 bg-card/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Wallet className="h-3.5 w-3.5" /> Operating Cash Flow
              </div>
              <div className="text-lg font-semibold">{data ? fmtMoney(data.cashFlow) : '—'}</div>
            </div>
            <div className="rounded border p-3 bg-card/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <PiggyBank className="h-3.5 w-3.5" /> Free Cash Flow
              </div>
              <div className="text-lg font-semibold">{data ? fmtMoney(data.fcf) : '—'}</div>
            </div>
          </div>
        )}
        <div className="text-xs text-muted-foreground">Mock data — for demo purposes only</div>
      </CardContent>
    </Card>
  );
}


