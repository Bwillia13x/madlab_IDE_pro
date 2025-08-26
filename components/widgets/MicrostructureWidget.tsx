"use client";

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { WidgetProps } from '@/lib/widgets/schema';
import { marketMicrostructureAnalyzer, type OrderBook, type LiquidityMetrics } from '@/lib/market/microstructure';
import { Badge } from '@/components/ui/badge';

export function MicrostructureWidget({ widget }: WidgetProps) {
  const symbol = String((widget.props as any)?.symbol || 'AAPL').toUpperCase();
  const [book, setBook] = useState<OrderBook | null>(() => marketMicrostructureAnalyzer.getOrderBook(symbol));
  const [liq, setLiq] = useState<LiquidityMetrics | null>(() => marketMicrostructureAnalyzer.getLiquidityMetrics(symbol));

  useEffect(() => {
    let mounted = true;
    const updateBook = (ob: OrderBook) => {
      if (mounted && ob.symbol === symbol) setBook(ob);
    };
    const updateLiq = (m: LiquidityMetrics) => {
      if (mounted && m.symbol === symbol) setLiq(m);
    };
    // Seed: recalc for current symbol on mount
    try { marketMicrostructureAnalyzer.calculateLiquidityMetrics(symbol); } catch {}
    // @ts-ignore - event names are defined in analyzer
    marketMicrostructureAnalyzer.on('orderBookUpdated', updateBook);
    // @ts-ignore
    marketMicrostructureAnalyzer.on('liquidityMetricsCalculated', updateLiq);
    return () => {
      mounted = false;
      // @ts-ignore
      marketMicrostructureAnalyzer.off('orderBookUpdated', updateBook);
      // @ts-ignore
      marketMicrostructureAnalyzer.off('liquidityMetricsCalculated', updateLiq);
    };
  }, [symbol]);

  const topBids = useMemo(() => (book?.bids || []).slice(0, 5), [book]);
  const topAsks = useMemo(() => (book?.asks || []).slice(0, 5), [book]);

  return (
    <Card className="h-full w-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          Order Book & Microstructure
          <Badge variant="secondary">{symbol}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        {/* Top of Book */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-2 border rounded">
            <div className="text-muted-foreground">Mid</div>
            <div className="text-lg font-semibold">{book ? book.midPrice.toFixed(2) : '—'}</div>
          </div>
          <div className="p-2 border rounded">
            <div className="text-muted-foreground">Spread</div>
            <div className="text-lg font-semibold">{book ? book.spread.toFixed(4) : '—'}</div>
          </div>
          <div className="p-2 border rounded">
            <div className="text-muted-foreground">Imbalance</div>
            <div className="text-lg font-semibold">{book ? (book.imbalance * 100).toFixed(1) + '%' : '—'}</div>
          </div>
        </div>

        {/* Order Book Levels */}
        <div className="grid grid-cols-2 gap-3">
          <div className="border rounded">
            <div className="px-2 py-1 font-medium">Bids (Top 5)</div>
            <div className="max-h-32 overflow-auto">
              {topBids.map((l, i) => (
                <div key={i} className="px-2 py-1 flex items-center justify-between">
                  <span className="text-green-600 font-mono">{l.price.toFixed(2)}</span>
                  <span className="font-mono">{Math.round(l.size)}</span>
                </div>
              ))}
              {topBids.length === 0 && <div className="px-2 py-2 text-muted-foreground">No bids</div>}
            </div>
          </div>
          <div className="border rounded">
            <div className="px-2 py-1 font-medium">Asks (Top 5)</div>
            <div className="max-h-32 overflow-auto">
              {topAsks.map((l, i) => (
                <div key={i} className="px-2 py-1 flex items-center justify-between">
                  <span className="text-red-600 font-mono">{l.price.toFixed(2)}</span>
                  <span className="font-mono">{Math.round(l.size)}</span>
                </div>
              ))}
              {topAsks.length === 0 && <div className="px-2 py-2 text-muted-foreground">No asks</div>}
            </div>
          </div>
        </div>

        {/* Microstructure Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {book && (
            <>
              <Metric label="Eff. Spread" value={(book.microstructureMetrics.effectiveSpread).toFixed(4)} />
              <Metric label="Real. Spread" value={(book.microstructureMetrics.realizedSpread).toFixed(4)} />
              <Metric label="Price Impact" value={(book.microstructureMetrics.priceImpact).toFixed(4)} />
              <Metric label="Volatility" value={(book.microstructureMetrics.volatility * 100).toFixed(2) + '%'} />
              <Metric label="TPM" value={book.microstructureMetrics.trades_per_minute.toFixed(0)} />
              <Metric label="Avg Trade" value={book.microstructureMetrics.average_trade_size.toFixed(0)} />
            </>
          )}
          {liq && (
            <>
              <Metric label="Spread (bps)" value={liq.spread_bps.toFixed(2)} />
              <Metric label="Amihud" value={liq.amihud_illiquidity.toFixed(2)} />
              <Metric label="Kyle λ" value={liq.kyle_lambda.toExponential(2)} />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 border rounded flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-sm">{value}</span>
    </div>
  );
}

export default MicrostructureWidget;

