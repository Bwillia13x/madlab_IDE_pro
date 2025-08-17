'use client';

import { Card } from '@/components/ui/card';
import type { WidgetProps } from '@/lib/widgets/schema';
import { useEffect, useState } from 'react';
import { getProvider } from '@/lib/data/providers';

export function PredictiveInsights({ widget }: WidgetProps) {
  const symbol = String((widget.props as any)?.symbol || '').toUpperCase() || 'AAPL';
  const [trend, setTrend] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const provider = getProvider();
        const prices = await provider.getPrices(symbol, '3M');
        if (!mounted || prices.length < 10) return;
        const start = prices[0].close;
        const end = prices[prices.length - 1].close;
        const change = (end - start) / start;
        const conf = Math.min(0.95, Math.max(0.55, Math.abs(change) * 4));
        setConfidence(conf);
        setTrend(change > 0 ? 'Uptrend likely to continue' : 'Downtrend risk elevated');
      } catch {
        if (!mounted) return;
        setTrend('Insufficient data for trend.');
        setConfidence(0.5);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [symbol]);

  return (
    <Card className="w-full h-full bg-background border-border">
      <div className="p-3">
        <div className="text-sm font-medium">Predictive Insights</div>
        <div className="text-xs text-muted-foreground">Symbol: {symbol}</div>
        <div className="mt-3 text-sm">{trend || 'Analyzing...'}</div>
        <div className="text-xs text-muted-foreground mt-1">Confidence: {(confidence * 100).toFixed(0)}%</div>
      </div>
    </Card>
  );
}


