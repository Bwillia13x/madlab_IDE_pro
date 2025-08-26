'use client';

import { Card } from '@/components/ui/card';
import type { WidgetProps } from '@/lib/widgets/schema';
import { useEffect, useMemo, useState } from 'react';
import { getProvider } from '@/lib/data/providers';
import { advancedAI } from '@/lib/ai/advancedFeatures';

interface PredictiveInsightsProps {
  symbol?: string;
}

export function PredictiveInsights({ widget }: WidgetProps) {
  const symbol = String((widget.props as PredictiveInsightsProps)?.symbol || '').toUpperCase() || 'AAPL';
  const [trend, setTrend] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [sentiment, setSentiment] = useState<{ score: number; trend: string; volatility: string } | null>(null);
  const [predictions, setPredictions] = useState<Array<{ direction: string; confidence: number; timeframe: string }>>([]);
  const [patterns, setPatterns] = useState<Array<{ name: string; confidence: number; direction: string }>>([]);
  const [useAdvanced, setUseAdvanced] = useState<boolean>(() => {
    try {
      const flag = String(process.env.NEXT_PUBLIC_FEATURE_ADV_AI || '').toLowerCase() === 'true';
      const ls = typeof window !== 'undefined' ? localStorage.getItem('madlab_feature_adv_ai') : null;
      return flag || ls === 'true';
    } catch { return false; }
  });

  // Listen for runtime toggle of advanced AI feature
  useEffect(() => {
    const handler = () => {
      try {
        const flag = String(process.env.NEXT_PUBLIC_FEATURE_ADV_AI || '').toLowerCase() === 'true';
        const ls = typeof window !== 'undefined' ? localStorage.getItem('madlab_feature_adv_ai') : null;
        setUseAdvanced(flag || ls === 'true');
      } catch {}
    };
    window.addEventListener('madlab:adv-ai-changed', handler as any);
    window.addEventListener('storage', handler as any);
    return () => {
      window.removeEventListener('madlab:adv-ai-changed', handler as any);
      window.removeEventListener('storage', handler as any);
    };
  }, []);

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

  // Advanced AI optional path
  useEffect(() => {
    let mounted = true;
    if (!useAdvanced) {
      setSentiment(null);
      setPredictions([]);
      setPatterns([]);
      return;
    }
    (async () => {
      try {
        const [s, p, pat] = await Promise.all([
          advancedAI.analyzeMarketSentiment(symbol),
          advancedAI.generateMarketPredictions(symbol, '1d', true),
          advancedAI.detectTechnicalPatterns(symbol, '1d', 0.7),
        ]);
        if (!mounted) return;
        setSentiment({ score: s.score, trend: s.trend, volatility: s.volatility });
        setPredictions(p.map(pp => ({ direction: pp.direction, confidence: pp.confidence, timeframe: pp.timeframe })));
        setPatterns(pat.map(t => ({ name: t.name, confidence: t.confidence, direction: t.direction })));
      } catch {
        if (!mounted) return;
        // Silent fallback
        setSentiment(null);
        setPredictions([]);
        setPatterns([]);
      }
    })();
    return () => { mounted = false; };
  }, [symbol, useAdvanced]);

  const adv = useAdvanced;
  return (
    <Card className="w-full h-full bg-background border-border">
      <div className="p-3 space-y-2">
        <div className="text-sm font-medium flex items-center gap-2">
          Predictive Insights
          {adv && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-200 border border-purple-500/30">Advanced</span>}
        </div>
        <div className="text-xs text-muted-foreground">Symbol: {symbol}</div>
        <div className="mt-2 text-sm">{trend || 'Analyzing...'}</div>
        <div className="text-xs text-muted-foreground">Confidence: {(confidence * 100).toFixed(0)}%</div>

        {adv && (
          <div className="mt-3 space-y-2">
            {sentiment && (
              <div className="text-xs">
                <div className="font-medium">Sentiment</div>
                <div className="text-muted-foreground">Trend: {sentiment.trend} · Volatility: {sentiment.volatility} · Score: {sentiment.score.toFixed(2)}</div>
              </div>
            )}
            {predictions.length > 0 && (
              <div className="text-xs">
                <div className="font-medium">Predictions</div>
                <ul className="list-disc list-inside text-muted-foreground">
                  {predictions.slice(0, 3).map((p, i) => (
                    <li key={i}>{p.timeframe}: {p.direction} ({(p.confidence * 100).toFixed(0)}%)</li>
                  ))}
                </ul>
              </div>
            )}
            {patterns.length > 0 && (
              <div className="text-xs">
                <div className="font-medium">Patterns</div>
                <ul className="list-disc list-inside text-muted-foreground">
                  {patterns.slice(0, 3).map((t, i) => (
                    <li key={i}>{t.name}: {t.direction} ({(t.confidence * 100).toFixed(0)}%)</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

