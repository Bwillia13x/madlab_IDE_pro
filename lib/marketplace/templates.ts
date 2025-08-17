import type { SheetKind, Widget } from '@/lib/store';

export type MarketplaceTemplate = {
  id: string;
  title: string;
  description: string;
  kind: SheetKind;
  widgets: Omit<Widget, 'id'>[];
};

export const MARKETPLACE_TEMPLATES: MarketplaceTemplate[] = [
  {
    id: 'quick-start',
    title: 'Quick Start Dashboard',
    description: 'KPIs, line chart, and predictive insights for a fast start',
    kind: 'charting',
    widgets: [
      { type: 'kpi-card', title: 'KPIs', layout: { i: '', x: 0, y: 0, w: 4, h: 3 } },
      { type: 'line-chart', title: 'Price', layout: { i: '', x: 4, y: 0, w: 8, h: 6 } },
      { type: 'predictive-insights', title: 'Insights', layout: { i: '', x: 0, y: 3, w: 4, h: 3 } },
    ],
  },
  {
    id: 'options-lab',
    title: 'Options Lab',
    description: 'Greeks, vol cone, strategy builder, and P&L profile',
    kind: 'options',
    widgets: [
      { type: 'greeks-surface', title: 'Greeks Surface', layout: { i: '', x: 0, y: 0, w: 6, h: 4 } },
      { type: 'vol-cone', title: 'Volatility Cone', layout: { i: '', x: 6, y: 0, w: 6, h: 4 } },
      { type: 'strategy-builder', title: 'Strategy Builder', layout: { i: '', x: 0, y: 4, w: 6, h: 4 } },
      { type: 'pnl-profile', title: 'P&L Profile', layout: { i: '', x: 6, y: 4, w: 6, h: 4 } },
    ],
  },
  {
    id: 'risk-desk',
    title: 'Risk Desk',
    description: 'VaR/ES, stress scenarios, factor exposures, and correlations',
    kind: 'risk',
    widgets: [
      { type: 'var-es', title: 'VaR/ES', layout: { i: '', x: 0, y: 0, w: 6, h: 4 } },
      { type: 'stress-scenarios', title: 'Stress Scenarios', layout: { i: '', x: 6, y: 0, w: 6, h: 4 } },
      { type: 'factor-exposures', title: 'Factor Exposures', layout: { i: '', x: 0, y: 4, w: 6, h: 4 } },
      { type: 'correlation-matrix', title: 'Correlation Matrix', layout: { i: '', x: 6, y: 4, w: 6, h: 4 } },
    ],
  },
];


