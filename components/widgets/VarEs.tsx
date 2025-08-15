'use client';

import { AlertTriangle, TrendingDown } from 'lucide-react';
import type { Widget } from '@/lib/store';
import { usePrices } from '@/lib/data/hooks';
import {
  calculateReturns,
  historicalVaR,
  expectedShortfall,
  cornishFisherVaR,
  bootstrapVaREs,
} from '@/lib/quant/risk';
import { useEffect, useRef } from 'react';
import { useMemo, useState } from 'react';
import type { WidgetDefinition, WidgetProps } from '@/lib/widgets/schema';
import { createWidgetSchema } from '@/lib/widgets/schema';
import { z } from 'zod';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import analytics from '@/lib/analytics';

// Configuration schema for VaR/ES widget
const VarEsConfigSchema = createWidgetSchema(
  z.object({
    symbol: z.string().default('AAPL').describe('Asset symbol for analysis'),
    confidence: z.number().min(0.5).max(0.999).default(0.95).describe('Confidence level'),
    window: z.number().int().min(20).max(2000).default(252).describe('Rolling window (days)'),
    title: z.string().default('VaR / ES').optional(),
  })
);

type VarEsConfig = z.infer<typeof VarEsConfigSchema>;

interface VarEsProps {
  widget: Widget;
  onTitleChange?: (title: string) => void;
  symbol?: string;
}

function fmtPct(n?: number) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return (n * 100).toFixed(2) + '%';
}

function VarEsComponent({ config, onConfigChange }: WidgetProps) {
  const cfg = config as VarEsConfig;
  const { data: prices } = usePrices(cfg.symbol, '1Y');

  const updateConfig = (partial: Partial<VarEsConfig>) => onConfigChange?.({ ...cfg, ...partial });

  const returns = useMemo(() => {
    const closes = (prices ?? []).map((p) => p.close);
    const r = calculateReturns(closes, 'log');
    return cfg.window > 0 && r.length > cfg.window ? r.slice(-cfg.window) : r;
  }, [prices, cfg.window]);

  const [metrics, setMetrics] = useState(() => ({
    varHist: NaN,
    esHist: NaN,
    varCF: NaN,
    ci: {
      varHist: [NaN, NaN] as [number, number],
      esHist: [NaN, NaN] as [number, number],
      varCF: [NaN, NaN] as [number, number],
    },
  }));
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!returns || returns.length === 0) {
      setMetrics({
        varHist: NaN,
        esHist: NaN,
        varCF: NaN,
        ci: { varHist: [NaN, NaN], esHist: [NaN, NaN], varCF: [NaN, NaN] },
      });
      return;
    }
    // Use Web Worker for bootstrap to avoid blocking UI
    try {
      if (typeof window !== 'undefined') {
        if (!workerRef.current) {
          // Use JS worker to avoid TS transpile needs in Next static public
          workerRef.current = new Worker('/workers/varWorker.js');
        }
        const worker = workerRef.current;
        const handleMessage = (e: MessageEvent) => {
          if (cancelled) return;
          const msg = e.data as {
            type: 'result' | 'error';
            data?: {
              varHist: number;
              esHist: number;
              ci: { varHist: [number, number]; esHist: [number, number] };
            };
          };
          if (msg?.type === 'result' && msg.data) {
            const base = {
              varHist: msg.data.varHist,
              esHist: msg.data.esHist,
              varCF: cornishFisherVaR(returns, cfg.confidence),
              ci: {
                varHist: msg.data.ci.varHist as [number, number],
                esHist: msg.data.ci.esHist as [number, number],
                varCF: [NaN, NaN] as [number, number],
              },
            };
            setMetrics(base);
          } else if (msg?.type === 'error') {
            // Fallback to in-thread computation if worker fails
            const fallback = bootstrapVaREs(returns, cfg.confidence, {
              samples: 500,
              ci: [0.05, 0.95],
            });
            setMetrics({
              varHist: fallback.varHist,
              esHist: fallback.esHist,
              varCF: cornishFisherVaR(returns, cfg.confidence),
              ci: {
                varHist: fallback.ci.varHist as [number, number],
                esHist: fallback.ci.esHist as [number, number],
                varCF: fallback.ci.varCF as [number, number],
              },
            });
          }
        };
        worker.addEventListener('message', handleMessage);
        worker.postMessage({
          type: 'bootstrap',
          returns,
          confidence: cfg.confidence,
          samples: 500,
        });
        return () => {
          cancelled = true;
          worker.removeEventListener('message', handleMessage);
          try {
            workerRef.current?.terminate();
          } catch {}
          workerRef.current = null;
        };
      }
    } catch {
      // Fallback if Worker not available
      const fb = bootstrapVaREs(returns, cfg.confidence, { samples: 500, ci: [0.05, 0.95] });
      setMetrics({
        varHist: fb.varHist,
        esHist: fb.esHist,
        varCF: cornishFisherVaR(returns, cfg.confidence),
        ci: {
          varHist: [fb.ci.varHist[0], fb.ci.varHist[1]] as [number, number],
          esHist: [fb.ci.esHist[0], fb.ci.esHist[1]] as [number, number],
          varCF: [fb.ci.varCF[0], fb.ci.varCF[1]] as [number, number],
        },
      });
    }
  }, [returns, cfg.confidence]);

  const [assessmentOpen, setAssessmentOpen] = useState(false);

  return (
    <div className="h-full space-y-3">
      <div className="grid grid-cols-3 gap-2 text-xs">
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground inline-flex items-center gap-1">
            Confidence
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="What is VaR?"
                  aria-haspopup="dialog"
                  aria-controls="vares-help-var"
                  className="h-4 w-4 inline-flex items-center justify-center rounded hover:bg-accent"
                >
                  <HelpCircle className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent id="vares-help-var" className="w-64 text-xs" side="bottom">
                <div className="font-medium mb-1">VaR & ES</div>
                <p className="text-muted-foreground">
                  VaR is potential loss at a confidence level. ES is average loss beyond VaR (tail
                  risk).
                </p>
              </PopoverContent>
            </Popover>
          </span>
          <input
            type="number"
            step={0.01}
            value={cfg.confidence}
            onChange={(e) =>
              updateConfig({
                confidence: Math.max(0.5, Math.min(0.999, Number(e.target.value) || 0.95)),
              })
            }
            className="bg-background border border-border rounded px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Window</span>
          <input
            type="number"
            step={1}
            value={cfg.window}
            onChange={(e) =>
              updateConfig({ window: Math.max(20, Math.floor(Number(e.target.value) || 252)) })
            }
            className="bg-background border border-border rounded px-2 py-1"
          />
        </label>
        <div className="flex items-end text-muted-foreground">1-Day horizon</div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-card rounded border border-border">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <span className="text-xs text-muted-foreground">Hist VaR</span>
          </div>
          <p className="text-lg font-semibold text-foreground">{fmtPct(metrics.varHist)}</p>
          <p className="text-[10px] text-muted-foreground">
            CI: {fmtPct(metrics.ci.varHist[0])} — {fmtPct(metrics.ci.varHist[1])}
          </p>
        </div>
        <div className="p-3 bg-card rounded border border-border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-red-400" />
            <span className="text-xs text-muted-foreground">Hist ES</span>
          </div>
          <p className="text-lg font-semibold text-foreground">{fmtPct(metrics.esHist)}</p>
          <p className="text-[10px] text-muted-foreground">
            CI: {fmtPct(metrics.ci.esHist[0])} — {fmtPct(metrics.ci.esHist[1])}
          </p>
        </div>
        <div className="p-3 bg-card rounded border border-border">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            <span className="text-xs text-muted-foreground">Cornish–Fisher VaR</span>
          </div>
          <p className="text-lg font-semibold text-foreground">{fmtPct(metrics.varCF)}</p>
          <p className="text-[10px] text-muted-foreground">
            CI: {fmtPct(metrics.ci.varCF[0])} — {fmtPct(metrics.ci.varCF[1])}
          </p>
        </div>
      </div>

      <div className="text-xs text-muted-foreground text-center">
        1-Day Risk Metrics | Symbol: {cfg.symbol?.toUpperCase() || 'ACME'} | n=
        {returns?.length ?? 0}
      </div>
      <div className="flex justify-end">
        <button
          className="text-xs underline text-muted-foreground"
          onClick={() => setAssessmentOpen(true)}
        >
          Quick VaR Check
        </button>
      </div>
      <Dialog open={assessmentOpen} onOpenChange={setAssessmentOpen}>
        <DialogContent aria-label="VaR knowledge check">
          <DialogHeader>
            <DialogTitle>Quick VaR Check</DialogTitle>
            <DialogDescription>Answer a couple of questions.</DialogDescription>
          </DialogHeader>
          <VarAssessment
            onClose={(pass) => {
              try {
                localStorage.setItem('madlab_assess_var', pass ? 'pass' : 'fail');
              } catch {}
              analytics.track('assessment_completed', { widget: 'var-es', pass }, 'feature_usage');
              if (pass) {
                try {
                  require('@/lib/store').useWorkspaceStore.getState().celebrate?.('Great job!');
                } catch {}
              }
              setAssessmentOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Keep the legacy VarEs function for backward compatibility
export function VarEsLegacy({ widget: _widget, symbol }: Readonly<VarEsProps>) {
  const [confidence, setConfidence] = useState<number>(0.95);
  const [window, setWindow] = useState<number>(252);
  const { data: prices } = usePrices(symbol, '1Y');

  const returns = useMemo(() => {
    const closes = (prices ?? []).map((p) => p.close);
    const r = calculateReturns(closes, 'log');
    return window > 0 && r.length > window ? r.slice(-window) : r;
  }, [prices, window]);

  const metrics = useMemo(() => {
    if (!returns || returns.length === 0) {
      return {
        varHist: NaN,
        esHist: NaN,
        varCF: NaN,
        ci: { varHist: [NaN, NaN], esHist: [NaN, NaN], varCF: [NaN, NaN] },
      } as unknown as {
        varHist: number;
        esHist: number;
        varCF: number;
        ci: { varHist: [number, number]; esHist: [number, number]; varCF: [number, number] };
      };
    }
    return bootstrapVaREs(returns, confidence, { samples: 500, ci: [0.05, 0.95] });
  }, [returns, confidence]);

  return (
    <div className="h-full space-y-3">
      <div className="grid grid-cols-3 gap-2 text-xs">
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Confidence</span>
          <input
            type="number"
            step={0.01}
            value={confidence}
            onChange={(e) =>
              setConfidence(Math.max(0.5, Math.min(0.999, Number(e.target.value) || 0.95)))
            }
            className="bg-background border border-border rounded px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Window</span>
          <input
            type="number"
            step={1}
            value={window}
            onChange={(e) => setWindow(Math.max(20, Math.floor(Number(e.target.value) || 252)))}
            className="bg-background border border-border rounded px-2 py-1"
          />
        </label>
        <div className="flex items-end text-muted-foreground">1-Day horizon</div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-card rounded border border-border">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <span className="text-xs text-muted-foreground">Hist VaR</span>
          </div>
          <p className="text-lg font-semibold text-foreground">{fmtPct(metrics.varHist)}</p>
          <p className="text-[10px] text-muted-foreground">
            CI: {fmtPct(metrics.ci.varHist[0])} — {fmtPct(metrics.ci.varHist[1])}
          </p>
        </div>
        <div className="p-3 bg-card rounded border border-border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-red-400" />
            <span className="text-xs text-muted-foreground">Hist ES</span>
          </div>
          <p className="text-lg font-semibold text-foreground">{fmtPct(metrics.esHist)}</p>
          <p className="text-[10px] text-muted-foreground">
            CI: {fmtPct(metrics.ci.esHist[0])} — {fmtPct(metrics.ci.esHist[1])}
          </p>
        </div>
        <div className="p-3 bg-card rounded border border-border">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            <span className="text-xs text-muted-foreground">Cornish–Fisher VaR</span>
          </div>
          <p className="text-lg font-semibold text-foreground">{fmtPct(metrics.varCF)}</p>
          <p className="text-[10px] text-muted-foreground">
            CI: {fmtPct(metrics.ci.varCF[0])} — {fmtPct(metrics.ci.varCF[1])}
          </p>
        </div>
      </div>

      <div className="text-xs text-muted-foreground text-center">
        1-Day Risk Metrics | Symbol: {symbol?.toUpperCase() || 'ACME'} | n={returns?.length ?? 0}
      </div>
    </div>
  );
}

export const VarEsDefinition: WidgetDefinition = {
  meta: {
    type: 'var-es',
    name: 'VaR / ES',
    description:
      'Historical VaR, Expected Shortfall, and Cornish-Fisher VaR with bootstrap confidence intervals',
    category: 'risk',
    version: '1.0.0',
    difficulty: 'advanced',
    edu: {
      help: 'VaR estimates potential loss at a confidence level; ES estimates average loss beyond VaR.',
    },
    configSchema: VarEsConfigSchema,
    defaultConfig: {
      symbol: 'AAPL',
      confidence: 0.95,
      window: 252,
      title: 'VaR / ES',
    },
    defaultSize: { w: 6, h: 4 },
    capabilities: {
      resizable: true,
      configurable: true,
      dataBinding: true,
      exportable: false,
      realTimeData: true,
    },
    tags: ['risk', 'var', 'expected-shortfall', 'volatility'],
  },
  runtime: {
    component: VarEsComponent,
  },
};

// Default export for lazy import via getLazyWidget('VarEs')
export default function VarEs(props: WidgetProps) {
  return VarEsComponent(props);
}

function VarAssessment({ onClose }: { onClose: (pass: boolean) => void }) {
  const [ans, setAns] = useState<Record<string, string>>({});
  return (
    <div className="space-y-3 text-sm">
      <div>
        <div className="font-medium">1) VaR at 95% represents…</div>
        <select
          className="mt-1 w-full bg-background border border-border rounded px-2 py-1"
          value={ans.q1 || ''}
          onChange={(e) => setAns((a) => ({ ...a, q1: e.target.value }))}
        >
          <option value="">Select…</option>
          <option value="threshold">A loss threshold exceeded 5% of the time</option>
          <option value="average">The average loss on bad days</option>
        </select>
      </div>
      <div>
        <div className="font-medium">2) Expected Shortfall (ES) is…</div>
        <select
          className="mt-1 w-full bg-background border border-border rounded px-2 py-1"
          value={ans.q2 || ''}
          onChange={(e) => setAns((a) => ({ ...a, q2: e.target.value }))}
        >
          <option value="">Select…</option>
          <option value="tailavg">Average loss conditional on exceeding VaR</option>
          <option value="vol">Annualized volatility</option>
        </select>
      </div>
      <div className="flex justify-end">
        <button
          className="h-7 px-3 rounded border border-border text-xs"
          onClick={() => onClose(ans.q1 === 'threshold' && ans.q2 === 'tailavg')}
        >
          Submit
        </button>
      </div>
    </div>
  );
}
