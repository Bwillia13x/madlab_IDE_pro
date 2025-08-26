"use client";

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { highFrequencyHandler } from '@/lib/data/highFrequencyHandler';
import { multiExchangeAggregator } from '@/lib/data/multiExchangeAggregator';
import type { WidgetProps } from '@/lib/widgets/schema';

export function MarketTickerHFT({ widget }: WidgetProps) {
  const symbol = String((widget.props as any)?.symbol || 'AAPL').toUpperCase();
  const [metrics, setMetrics] = useState(() => highFrequencyHandler.getPerformanceMetrics());
  const [mid, setMid] = useState<number | null>(null);
  const [spread, setSpread] = useState<number | null>(null);
  const [rate, setRate] = useState<number>(0);

  useEffect(() => {
    const id = setInterval(() => {
      try {
        const m = highFrequencyHandler.getPerformanceMetrics();
        setMetrics(m);
        const agg = multiExchangeAggregator.getAggregatedData(symbol);
        if (agg) {
          setMid(agg.midPrice || 0);
          setSpread(agg.spread || 0);
        }
      } catch {}
    }, 1000);
    return () => clearInterval(id);
  }, [symbol]);

  // Track messages/sec using delta
  useEffect(() => {
    let last = highFrequencyHandler.getPerformanceMetrics().totalMessages;
    const tid = setInterval(() => {
      const curr = highFrequencyHandler.getPerformanceMetrics().totalMessages;
      setRate(Math.max(0, curr - last));
      last = curr;
    }, 1000);
    return () => clearInterval(tid);
  }, []);

  const compressionRatio = useMemo(() => {
    const total = metrics.totalMessages || 1;
    const compressed = metrics.compressedMessages || 0;
    return Math.min(100, Math.round((compressed / total) * 100));
  }, [metrics]);

  return (
    <Card className="h-full w-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          Market Ticker (HFT)
          <Badge variant="secondary">{symbol}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 border rounded">
            <div className="text-muted-foreground">Msgs/sec</div>
            <div className="text-xl font-semibold">{rate}</div>
          </div>
          <div className="p-2 border rounded">
            <div className="text-muted-foreground">Avg Proc (ms)</div>
            <div className="text-xl font-semibold">{metrics.averageProcessingTime.toFixed(1)}</div>
          </div>
          <div className="p-2 border rounded">
            <div className="text-muted-foreground">Compressed</div>
            <div className="text-xl font-semibold">{metrics.compressedMessages}</div>
          </div>
          <div className="p-2 border rounded">
            <div className="text-muted-foreground">Compression %</div>
            <div className="text-xl font-semibold">{compressionRatio}%</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 border rounded">
            <div className="text-muted-foreground">Mid Price</div>
            <div className="text-xl font-semibold">{mid !== null ? mid.toFixed(2) : '—'}</div>
          </div>
          <div className="p-2 border rounded">
            <div className="text-muted-foreground">Spread</div>
            <div className="text-xl font-semibold">{spread !== null ? spread.toFixed(4) : '—'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MarketTickerHFT;

