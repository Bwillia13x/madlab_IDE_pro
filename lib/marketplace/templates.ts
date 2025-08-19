import type { SheetKind, Widget } from '@/lib/store';

export type MarketplaceTemplate = {
  id: string;
  title: string;
  description: string;
  kind: SheetKind;
  widgets: Omit<Widget, 'id'>[];
  // Enhanced metadata (Phase 2)
  rating?: number;
  popularity?: number;
  downloads?: number;
  views?: number;
  createdAt?: string;
  author?: string;
  tags?: string[];
  version?: string;
  compatibility?: string[];
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
    rating: 4.8,
    popularity: 95,
    downloads: 1247,
    views: 5678,
    createdAt: '2024-01-15',
    author: 'MAD LAB Team',
    tags: ['beginner', 'dashboard', 'quick-start'],
    version: '1.0.0',
    compatibility: ['v1.0+']
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
    rating: 4.9,
    popularity: 98,
    downloads: 892,
    views: 3456,
    createdAt: '2024-02-01',
    author: 'Options Expert',
    tags: ['options', 'greeks', 'volatility', 'advanced'],
    version: '2.1.0',
    compatibility: ['v1.2+']
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
    rating: 4.7,
    popularity: 87,
    downloads: 634,
    views: 2890,
    createdAt: '2024-01-28',
    author: 'Risk Manager',
    tags: ['risk', 'var', 'stress-testing', 'correlations'],
    version: '1.5.0',
    compatibility: ['v1.1+']
  },
  // New templates for Phase 2
  {
    id: 'trading-desk',
    title: 'Trading Desk',
    description: 'Order management, portfolio overview, and trade execution tools',
    kind: 'portfolio',
    widgets: [
      { type: 'order-book', title: 'Order Book', layout: { i: '', x: 0, y: 0, w: 6, h: 4 } },
      { type: 'portfolio-overview', title: 'Portfolio', layout: { i: '', x: 6, y: 0, w: 6, h: 4 } },
      { type: 'trade-history', title: 'Trade History', layout: { i: '', x: 0, y: 4, w: 6, h: 4 } },
      { type: 'risk-metrics', title: 'Risk Metrics', layout: { i: '', x: 6, y: 4, w: 6, h: 4 } },
    ],
    rating: 4.6,
    popularity: 82,
    downloads: 456,
    views: 2345,
    createdAt: '2024-03-01',
    author: 'Trading Desk',
    tags: ['trading', 'orders', 'portfolio', 'execution'],
    version: '1.0.0',
    compatibility: ['v1.3+']
  },
  {
    id: 'technical-analysis',
    title: 'Technical Analysis Suite',
    description: 'Indicators, patterns, and chart analysis tools',
    kind: 'charting',
    widgets: [
      { type: 'technical-indicators', title: 'Indicators', layout: { i: '', x: 0, y: 0, w: 6, h: 4 } },
      { type: 'pattern-recognition', title: 'Patterns', layout: { i: '', x: 6, y: 0, w: 6, h: 4 } },
      { type: 'support-resistance', title: 'S/R Levels', layout: { i: '', x: 0, y: 4, w: 6, h: 4 } },
      { type: 'fibonacci-tools', title: 'Fibonacci', layout: { i: '', x: 6, y: 4, w: 6, h: 4 } },
    ],
    rating: 4.5,
    popularity: 78,
    downloads: 389,
    views: 1987,
    createdAt: '2024-02-15',
    author: 'Technical Analyst',
    tags: ['technical', 'indicators', 'patterns', 'fibonacci'],
    version: '1.2.0',
    compatibility: ['v1.0+']
  },
  {
    id: 'fundamental-analysis',
    title: 'Fundamental Analysis',
    description: 'Financial ratios, earnings analysis, and valuation metrics',
    kind: 'valuation',
    widgets: [
      { type: 'financial-ratios', title: 'Ratios', layout: { i: '', x: 0, y: 0, w: 6, h: 4 } },
      { type: 'earnings-analysis', title: 'Earnings', layout: { i: '', x: 6, y: 0, w: 6, h: 4 } },
      { type: 'valuation-metrics', title: 'Valuation', layout: { i: '', x: 0, y: 4, w: 6, h: 4 } },
      { type: 'peer-comparison', title: 'Peer Comp', layout: { i: '', x: 6, y: 4, w: 6, h: 4 } },
    ],
    rating: 4.4,
    popularity: 75,
    downloads: 312,
    views: 1678,
    createdAt: '2024-02-20',
    author: 'Fundamental Analyst',
    tags: ['fundamental', 'ratios', 'earnings', 'valuation'],
    version: '1.1.0',
    compatibility: ['v1.1+']
  },
  {
    id: 'quantitative-strategies',
    title: 'Quantitative Strategies',
    description: 'Statistical arbitrage, factor models, and backtesting tools',
    kind: 'risk',
    widgets: [
      { type: 'factor-analysis', title: 'Factor Analysis', layout: { i: '', x: 0, y: 0, w: 6, h: 4 } },
      { type: 'statistical-arbitrage', title: 'Stat Arb', layout: { i: '', x: 6, y: 0, w: 6, h: 4 } },
      { type: 'backtest-results', title: 'Backtest', layout: { i: '', x: 0, y: 4, w: 6, h: 4 } },
      { type: 'performance-metrics', title: 'Performance', layout: { i: '', x: 6, y: 4, w: 6, h: 4 } },
    ],
    rating: 4.8,
    popularity: 91,
    downloads: 567,
    views: 2987,
    createdAt: '2024-01-10',
    author: 'Quantitative Researcher',
    tags: ['quantitative', 'factors', 'backtesting', 'statistical'],
    version: '2.0.0',
    compatibility: ['v1.2+']
  }
];


