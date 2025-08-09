import type { SheetKind, Widget } from './store';

export const SHEET_PRESETS: Record<SheetKind, { 
  label: string; 
  description: string; 
  widgets: Omit<Widget, 'id'>[] 
}> = {
  valuation: {
    label: 'Valuation Workbench',
    description: 'KPI cards, DCF models, peer analysis, and sensitivity testing',
    widgets: [
      {
        type: 'kpi-card',
        title: 'KPI',
        layout: { i: '', x: 0, y: 0, w: 6, h: 4 }
      },
      {
        type: 'dcf-basic',
        title: 'DCF (Basic)',
        layout: { i: '', x: 6, y: 0, w: 6, h: 4 }
      },
      {
        type: 'bar-chart',
        title: 'Peer Multiples',
        layout: { i: '', x: 0, y: 4, w: 6, h: 4 }
      },
      {
        type: 'heatmap',
        title: 'Sensitivity (WACC x g)',
        layout: { i: '', x: 6, y: 4, w: 6, h: 4 }
      }
    ]
  },
  charting: {
    label: 'Charting & Graphing',
    description: 'Price charts, bar graphs, heatmaps, and volume analysis',
    widgets: [
      {
        type: 'line-chart',
        title: 'Price Line',
        layout: { i: '', x: 0, y: 0, w: 6, h: 4 }
      },
      {
        type: 'bar-chart',
        title: 'Bar Chart',
        layout: { i: '', x: 6, y: 0, w: 6, h: 4 }
      },
      {
        type: 'heatmap',
        title: 'Heatmap',
        layout: { i: '', x: 0, y: 4, w: 6, h: 4 }
      },
      {
        type: 'line-chart',
        title: 'Volume',
        layout: { i: '', x: 6, y: 4, w: 6, h: 4 }
      }
    ]
  },
  risk: {
    label: 'Risk Analysis',
    description: 'VaR/ES calculations, stress testing, and correlation analysis',
    widgets: [
      {
        type: 'var-es',
        title: 'VaR/ES',
        layout: { i: '', x: 0, y: 0, w: 6, h: 4 }
      },
      {
        type: 'stress-scenarios',
        title: 'Stress Scenarios',
        layout: { i: '', x: 6, y: 0, w: 6, h: 4 }
      },
      {
        type: 'factor-exposures',
        title: 'Factor Exposures',
        layout: { i: '', x: 0, y: 4, w: 6, h: 4 }
      },
      {
        type: 'correlation-matrix',
        title: 'Correlation Matrix',
        layout: { i: '', x: 6, y: 4, w: 6, h: 4 }
      }
    ]
  },
  options: {
    label: 'Options Wizard',
    description: 'Greeks analysis, volatility cones, strategy building, and P&L profiles',
    widgets: [
      {
        type: 'greeks-surface',
        title: 'Greeks Surface',
        layout: { i: '', x: 0, y: 0, w: 6, h: 4 }
      },
      {
        type: 'vol-cone',
        title: 'Vol Cone',
        layout: { i: '', x: 6, y: 0, w: 6, h: 4 }
      },
      {
        type: 'strategy-builder',
        title: 'Strategy Builder',
        layout: { i: '', x: 0, y: 4, w: 6, h: 4 }
      },
      {
        type: 'pnl-profile',
        title: 'P&L Profile',
        layout: { i: '', x: 6, y: 4, w: 6, h: 4 }
      }
    ]
  },
  blank: {
    label: 'Blank',
    description: 'Start with an empty sheet and add widgets as needed',
    widgets: [
      {
        type: 'blank-tile',
        title: 'Click to configure',
        layout: { i: '', x: 0, y: 0, w: 12, h: 8 }
      }
    ]
  }
};

// TODO: Add more sophisticated preset configurations
// - Custom widget arrangements based on user preferences
// - Industry-specific presets (e.g., Real Estate, Energy, Healthcare)
// - Template import/export functionality
// - Preset versioning and updates