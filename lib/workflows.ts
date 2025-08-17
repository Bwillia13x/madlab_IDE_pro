import type { SheetKind, Widget } from '@/lib/store';

export interface WorkflowDefinition {
  id: string;
  title: string;
  description: string;
  kind: SheetKind;
  widgets: (symbol: string) => Omit<Widget, 'id'>[];
  keywords: string[];
}

export const WORKFLOWS: WorkflowDefinition[] = [
  {
    id: 'earnings-analysis',
    title: 'Earnings Analysis',
    description: 'KPIs, DCF snapshot, peer multiples, and sensitivity heatmap',
    kind: 'valuation',
    keywords: ['earnings', 'revenue', 'eps', 'guidance', 'valuation', 'dcf'],
    widgets: (symbol: string) => [
      { type: 'kpi-card', title: 'KPI', layout: { i: '', x: 0, y: 0, w: 6, h: 4 }, props: { symbol } },
      { type: 'dcf-basic', title: 'DCF (Basic)', layout: { i: '', x: 6, y: 0, w: 6, h: 4 }, props: { symbol } },
      { type: 'bar-chart', title: 'Peer Multiples', layout: { i: '', x: 0, y: 4, w: 6, h: 4 }, props: { symbol } },
      { type: 'heatmap', title: 'Sensitivity (WACC x g)', layout: { i: '', x: 6, y: 4, w: 6, h: 4 }, props: { symbol } },
    ],
  },
  {
    id: 'risk-overview',
    title: 'Risk Overview',
    description: 'VaR/ES, stress testing, factor exposures, correlations',
    kind: 'risk',
    keywords: ['risk', 'var', 'es', 'stress', 'scenario', 'factor', 'correlation', 'drawdown'],
    widgets: (symbol: string) => [
      { type: 'var-es', title: 'VaR/ES', layout: { i: '', x: 0, y: 0, w: 6, h: 4 }, props: { symbol } },
      { type: 'stress-scenarios', title: 'Stress Scenarios', layout: { i: '', x: 6, y: 0, w: 6, h: 4 }, props: { symbol } },
      { type: 'factor-exposures', title: 'Factor Exposures', layout: { i: '', x: 0, y: 4, w: 6, h: 4 }, props: { symbol } },
      { type: 'correlation-matrix', title: 'Correlation Matrix', layout: { i: '', x: 6, y: 4, w: 6, h: 4 }, props: { symbol } },
    ],
  },
  {
    id: 'sector-comparison',
    title: 'Sector Comparison',
    description: 'Price vs peers, comparative bars, correlation heatmap',
    kind: 'charting',
    keywords: ['sector', 'peers', 'compare', 'comparison', 'relative', 'benchmark'],
    widgets: (symbol: string) => [
      { type: 'line-chart', title: 'Price vs Peers', layout: { i: '', x: 0, y: 0, w: 6, h: 4 }, props: { symbol } },
      { type: 'bar-chart', title: 'Comparative Metrics', layout: { i: '', x: 6, y: 0, w: 6, h: 4 }, props: { symbol } },
      { type: 'heatmap', title: 'Peer Correlations', layout: { i: '', x: 0, y: 4, w: 12, h: 4 }, props: { symbol } },
    ],
  },
  {
    id: 'options-play',
    title: 'Options Playbook',
    description: 'Greeks, volatility cone, strategy builder, P&L',
    kind: 'options',
    keywords: ['option', 'options', 'calls', 'puts', 'strategy', 'greeks', 'volatility'],
    widgets: (symbol: string) => [
      { type: 'greeks-surface', title: 'Greeks Surface', layout: { i: '', x: 0, y: 0, w: 6, h: 4 }, props: { symbol } },
      { type: 'vol-cone', title: 'Volatility Cone', layout: { i: '', x: 6, y: 0, w: 6, h: 4 }, props: { symbol } },
      { type: 'strategy-builder', title: 'Strategy Builder', layout: { i: '', x: 0, y: 4, w: 6, h: 4 }, props: { symbol } },
      { type: 'pnl-profile', title: 'P&L Profile', layout: { i: '', x: 6, y: 4, w: 6, h: 4 }, props: { symbol } },
    ],
  },
];

export function getWorkflowFromQuery(query: string, symbol: string) {
  const normalized = (query || '').toLowerCase();
  let best: WorkflowDefinition | null = null;
  let bestScore = 0;
  for (const wf of WORKFLOWS) {
    const score = wf.keywords.reduce((acc, kw) => (normalized.includes(kw) ? acc + 1 : acc), 0);
    if (score > bestScore) {
      best = wf;
      bestScore = score;
    }
  }
  if (!best) return null;
  return {
    id: best.id,
    title: best.title,
    description: best.description,
    kind: best.kind,
    widgets: best.widgets(symbol),
  } as { id: string; title: string; description: string; kind: SheetKind; widgets: Omit<Widget, 'id'>[] };
}

export function suggestWorkflows(query: string): WorkflowDefinition[] {
  const normalized = (query || '').toLowerCase();
  return WORKFLOWS.filter((wf) => wf.keywords.some((kw) => normalized.includes(kw)));
}


