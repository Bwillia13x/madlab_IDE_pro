"use client";

import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { computeDcf, type DcfResult } from '@/lib/quant/dcf';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart as ReLineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer } from '@/components/ui/ChartContainer';
import type { WidgetDefinition, WidgetProps } from '@/lib/widgets/schema';
import { createWidgetSchema } from '@/lib/widgets/schema';
import { exportDcfAnalysis } from '@/lib/data/export';
import { z } from 'zod';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HelpCircle } from 'lucide-react';
import analytics from '@/lib/analytics';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// Configuration schema
const DcfConfigSchema = createWidgetSchema(
  z.object({
    initialFcf: z.number().min(0).default(100).describe('Free cash flow at t=0'),
    growthPct: z.number().min(-100).max(100).default(3).describe('Growth rate (%)'),
    waccPct: z.number().min(0).max(100).default(10).describe('Discount rate (WACC, %)'),
    years: z.number().int().min(1).max(50).default(5).describe('Forecast horizon (years)'),
    terminalMethod: z.enum(['ggm', 'exit-multiple']).default('ggm').describe('Terminal value method'),
    exitMultiple: z.number().min(0).max(1000).default(10).describe('Exit multiple (if exit-multiple)'),
    title: z.string().default('DCF (Basic)').optional(),
  })
);

type DcfConfig = z.infer<typeof DcfConfigSchema>;

function DcfBasicComponent({ config, onConfigChange }: WidgetProps) {
  const cfg = (config as DcfConfig);
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const result: DcfResult = useMemo(() => {
    return computeDcf({
      initialFcf: cfg.initialFcf,
      growthRate: cfg.growthPct / 100,
      discountRate: cfg.waccPct / 100,
      years: Math.max(1, Math.floor(cfg.years)),
      terminalMethod: cfg.terminalMethod,
      exitMultiple: cfg.exitMultiple,
    });
  }, [cfg.initialFcf, cfg.growthPct, cfg.waccPct, cfg.years, cfg.terminalMethod, cfg.exitMultiple]);

  const update = (partial: Partial<DcfConfig>) => onConfigChange?.({ ...cfg, ...partial });

  const handleExport = () => {
    try {
      const analysisData = {
        symbol: cfg.title || 'DCF Analysis',
        fcfProjections: result.schedule.map(r => r.fcf),
        terminalValue: result.terminalValue,
        enterpriseValue: result.enterpriseValue,
        sharePrice: result.enterpriseValue, // Simplified for now - could add shares outstanding
        wacc: cfg.waccPct / 100,
        growthRate: cfg.growthPct / 100,
      };

      exportDcfAnalysis(analysisData);
      toast.success('DCF analysis exported successfully');
    } catch (err) {
      toast.error(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="h-full flex flex-col gap-3 group">
      <div className="grid grid-cols-6 gap-2 text-xs">
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">FCF₀</span>
          <input
            type="number"
            className="w-full bg-background border border-border rounded px-2 py-1 text-sm"
            value={cfg.initialFcf}
            onChange={(e) => update({ initialFcf: Number(e.target.value) || 0 })}
            step={1}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">g %</span>
          <input
            type="number"
            className="w-full bg-background border border-border rounded px-2 py-1 text-sm"
            value={cfg.growthPct}
            onChange={(e) => update({ growthPct: Number(e.target.value) || 0 })}
            step={0.1}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground inline-flex items-center gap-1">WACC %
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" aria-label="What is WACC?" aria-haspopup="dialog" aria-controls="dcf-help-wacc" className="h-4 w-4 inline-flex items-center justify-center rounded hover:bg-accent">
                  <HelpCircle className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent id="dcf-help-wacc" className="w-64 text-xs" side="bottom">
                <div className="font-medium mb-1">WACC</div>
                <p className="text-muted-foreground">Weighted average cost of capital; used as discount rate in DCF. Typical 6–12% for mature firms.</p>
              </PopoverContent>
            </Popover>
          </span>
          <input
            type="number"
            className="w-full bg-background border border-border rounded px-2 py-1 text-sm"
            value={cfg.waccPct}
            onChange={(e) => update({ waccPct: Number(e.target.value) || 0 })}
            step={0.1}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Years</span>
          <input
            type="number"
            className="w-full bg-background border border-border rounded px-2 py-1 text-sm"
            value={cfg.years}
            onChange={(e) => update({ years: Math.max(1, Math.round(Number(e.target.value) || 1)) })}
            step={1}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground inline-flex items-center gap-1">Terminal
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" aria-label="What is Terminal Value?" aria-haspopup="dialog" aria-controls="dcf-help-terminal" className="h-4 w-4 inline-flex items-center justify-center rounded hover:bg-accent">
                  <HelpCircle className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent id="dcf-help-terminal" className="w-64 text-xs" side="bottom">
                <div className="font-medium mb-1">Terminal Value</div>
                <p className="text-muted-foreground">Value beyond forecast period. Gordon Growth assumes perpetual growth; Exit Multiple applies a market multiple.</p>
              </PopoverContent>
            </Popover>
          </span>
          <select
            className="w-full bg-background border border-border rounded px-2 py-1 text-sm h-[30px]"
            value={cfg.terminalMethod}
            onChange={(e) => update({ terminalMethod: e.target.value as DcfConfig['terminalMethod'] })}
          >
            <option value="ggm">Gordon Growth</option>
            <option value="exit-multiple">Exit Multiple</option>
          </select>
        </label>
        {cfg.terminalMethod === 'exit-multiple' && (
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">Multiple</span>
            <input
              type="number"
              className="w-full bg-background border border-border rounded px-2 py-1 text-sm"
              value={cfg.exitMultiple}
              onChange={(e) => update({ exitMultiple: Number(e.target.value) || 0 })}
              step={0.5}
            />
          </label>
        )}
      </div>

      <div className="flex justify-end opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200">
        <Button
          size="sm"
          variant="outline"
          onClick={handleExport}
          className="h-6 px-2 text-xs flex items-center gap-1"
          data-testid="dcf-export"
        >
          <Download className="h-3 w-3" />
          Export Analysis
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        <Card className="p-3 overflow-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="text-left font-medium">Year</th>
                <th className="text-right font-medium">FCF</th>
                <th className="text-right font-medium">Discount</th>
                <th className="text-right font-medium">PV FCF</th>
                <th className="text-right font-medium">Cum PV</th>
              </tr>
            </thead>
            <tbody>
              {result.schedule.map((r) => (
                <tr key={r.year} className="border-t border-border/50">
                  <td className="py-1">{r.year}</td>
                  <td className="text-right">{r.fcf.toFixed(2)}</td>
                  <td className="text-right">{r.discountFactor.toFixed(4)}</td>
                  <td className="text-right">{r.pvFcf.toFixed(2)}</td>
                  <td className="text-right">{r.cumulativePv.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border">
                <td colSpan={3} className="text-right py-2">PV(Terminal)</td>
                <td className="text-right">{Number.isFinite(result.pvTerminalValue) ? result.pvTerminalValue.toFixed(2) : '∞'}</td>
                <td></td>
              </tr>
              <tr>
                <td colSpan={3} className="text-right">Enterprise Value</td>
                <td className="text-right font-semibold">{Number.isFinite(result.enterpriseValue) ? result.enterpriseValue.toFixed(2) : '∞'}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </Card>

        <Card className="p-3 flex flex-col gap-3">
          <div className="h-40">
            <ChartContainer minHeight={160}>
              <ReLineChart data={result.schedule.map(r => ({ year: r.year, fcf: r.fcf, pvFcf: r.pvFcf }))}>
                <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="fcf" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="pvFcf" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeWidth={2} dot={false} />
              </ReLineChart>
            </ChartContainer>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Enterprise Value</div>
            <div className="text-2xl font-semibold">
              {Number.isFinite(result.enterpriseValue) ? result.enterpriseValue.toFixed(2) : '∞'}
            </div>
            <div className="text-xs text-muted-foreground mt-2">Terminal Value: {Number.isFinite(result.terminalValue) ? result.terminalValue.toFixed(2) : '∞'}</div>
          </div>
        </Card>
      </div>

      {/* Micro-check assessment */}
      <div className="flex justify-end">
        <Button size="sm" className="h-6 px-2 text-xs" variant="secondary" onClick={() => setAssessmentOpen(true)}>
          Quick DCF Check
        </Button>
      </div>
      <Dialog open={assessmentOpen} onOpenChange={setAssessmentOpen}>
        <DialogContent aria-label="DCF knowledge check">
          <DialogHeader>
            <DialogTitle>Quick DCF Check</DialogTitle>
            <DialogDescription>Answer a few questions to confirm understanding.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <div className="font-medium">1) What does WACC represent in a DCF?</div>
              <select className="mt-1 w-full bg-background border border-border rounded px-2 py-1" value={answers.q1 || ''} onChange={(e) => setAnswers(a => ({ ...a, q1: e.target.value }))}>
                <option value="">Select…</option>
                <option value="discount">The discount rate blending debt and equity costs</option>
                <option value="growth">The long-run growth rate</option>
              </select>
            </div>
            <div>
              <div className="font-medium">2) Terminal value via Gordon Growth assumes…</div>
              <select className="mt-1 w-full bg-background border border-border rounded px-2 py-1" value={answers.q2 || ''} onChange={(e) => setAnswers(a => ({ ...a, q2: e.target.value }))}>
                <option value="">Select…</option>
                <option value="perp">Perpetual growth at a stable rate</option>
                <option value="multiple">Applying a market multiple</option>
              </select>
            </div>
            <div>
              <div className="font-medium">3) Increasing WACC generally…</div>
              <select className="mt-1 w-full bg-background border border-border rounded px-2 py-1" value={answers.q3 || ''} onChange={(e) => setAnswers(a => ({ ...a, q3: e.target.value }))}>
                <option value="">Select…</option>
                <option value="lower">Lowers enterprise value</option>
                <option value="raise">Raises enterprise value</option>
              </select>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => {
                const ok = answers.q1 === 'discount' && answers.q2 === 'perp' && answers.q3 === 'lower';
                try { localStorage.setItem('madlab_assess_dcf', ok ? 'pass' : 'fail'); } catch {}
                analytics.track('assessment_completed', { widget: 'dcf-basic', pass: ok }, 'feature_usage');
                if (ok) {
                  try { require('@/lib/store').useWorkspaceStore.getState().celebrate?.('Nice work!'); } catch {}
                }
                setAssessmentOpen(false);
              }}>Submit</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const DcfBasicDefinition: WidgetDefinition = {
  meta: {
    type: 'dcf-basic',
    name: 'DCF (Basic)',
    description: 'Deterministic discounted cash flow model',
    category: 'analysis',
    version: '1.0.0',
    difficulty: 'intermediate',
    edu: { help: 'DCF discounts projected cash flows and a terminal value by WACC to estimate enterprise value.' },
    configSchema: DcfConfigSchema,
    defaultConfig: {
      initialFcf: 100,
      growthPct: 3,
      waccPct: 10,
      years: 5,
      terminalMethod: 'ggm',
      exitMultiple: 10,
      title: 'DCF (Basic)'
    },
    defaultSize: { w: 6, h: 5 },
    capabilities: {
      resizable: true,
      configurable: true,
      dataBinding: false,
      exportable: false,
      realTimeData: false,
    },
    tags: ['analysis', 'dcf', 'valuation'],
  },
  runtime: {
    // The registry will override this to a lazy component when registering core widgets
    component: DcfBasicComponent,
  },
};

// Default export for lazy import via getLazyWidget('DcfBasic')
export default function DcfBasic(props: WidgetProps) {
  return DcfBasicComponent(props);
}
