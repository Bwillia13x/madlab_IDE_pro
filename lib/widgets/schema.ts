import type { Widget } from '@/lib/store';

export interface WidgetSchema {
  type: string;
  title: string;
  description: string;
  category: 'financial' | 'charting' | 'analysis' | 'utility' | 'portfolio';
  defaultLayout: {
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
  };
  props: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'select';
    label: string;
    description?: string;
    required?: boolean;
    default?: any;
    options?: string[];
    min?: number;
    max?: number;
  }>;
  runtime: {
    component: React.ComponentType<WidgetProps>;
    icon?: React.ComponentType<{ className?: string }>;
  };
}

export interface WidgetProps {
  widget: Widget;
  sheetId: string;
  onTitleChange?: (title: string) => void;
  onPropsChange?: (props: Record<string, unknown>) => void;
}

export interface WidgetRegistry {
  [type: string]: WidgetSchema;
}

// Default widget schemas
export const defaultWidgetSchemas: WidgetRegistry = {
  'kpi-card': {
    type: 'kpi-card',
    title: 'KPI Card',
    description: 'Key performance indicators with trend analysis',
    category: 'financial',
    defaultLayout: { w: 6, h: 4, minW: 4, minH: 3 },
    props: {
      symbol: {
        type: 'string',
        label: 'Symbol',
        description: 'Stock symbol to display',
        required: true,
        default: 'AAPL'
      }
    },
    runtime: {
      component: () => null, // Will be replaced by actual component
    }
  },
  'line-chart': {
    type: 'line-chart',
    title: 'Line Chart',
    description: 'Interactive line chart for price data',
    category: 'charting',
    defaultLayout: { w: 6, h: 4, minW: 4, minH: 3 },
    props: {
      symbol: {
        type: 'string',
        label: 'Symbol',
        description: 'Stock symbol to chart',
        required: true,
        default: 'AAPL'
      },
      range: {
        type: 'select',
        label: 'Time Range',
        description: 'Chart time range',
        default: '6M',
        options: ['1D', '5D', '1M', '3M', '6M', '1Y', '2Y', '5Y']
      }
    },
    runtime: {
      component: () => null, // Will be replaced by actual component
    }
  },
  'bar-chart': {
    type: 'bar-chart',
    title: 'Bar Chart',
    description: 'Bar chart for volume and comparison data',
    category: 'charting',
    defaultLayout: { w: 6, h: 4, minW: 4, minH: 3 },
    props: {
      symbol: {
        type: 'string',
        label: 'Symbol',
        description: 'Stock symbol to display',
        required: true,
        default: 'AAPL'
      }
    },
    runtime: {
      component: () => null, // Will be replaced by actual component
    }
  },
  'heatmap': {
    type: 'heatmap',
    title: 'Heatmap',
    description: 'Heatmap visualization for correlation and sensitivity',
    category: 'analysis',
    defaultLayout: { w: 6, h: 4, minW: 4, minH: 3 },
    props: {
      symbol: {
        type: 'string',
        label: 'Symbol',
        description: 'Stock symbol to analyze',
        required: true,
        default: 'AAPL'
      }
    },
    runtime: {
      component: () => null, // Will be replaced by actual component
    }
  },
  'dcf-basic': {
    type: 'dcf-basic',
    title: 'DCF Basic',
    description: 'Basic discounted cash flow model',
    category: 'financial',
    defaultLayout: { w: 6, h: 4, minW: 4, minH: 3 },
    props: {
      symbol: {
        type: 'string',
        label: 'Symbol',
        description: 'Stock symbol to value',
        required: true,
        default: 'AAPL'
      }
    },
    runtime: {
      component: () => null, // Will be replaced by actual component
    }
  },
  'var-es': {
    type: 'var-es',
    title: 'VaR/ES',
    description: 'Value at Risk and Expected Shortfall calculations',
    category: 'analysis',
    defaultLayout: { w: 6, h: 4, minW: 4, minH: 3 },
    props: {
      symbol: {
        type: 'string',
        label: 'Symbol',
        description: 'Stock symbol to analyze',
        required: true,
        default: 'AAPL'
      }
    },
    runtime: {
      component: () => null, // Will be replaced by actual component
    }
  },
  'stress-scenarios': {
    type: 'stress-scenarios',
    title: 'Stress Scenarios',
    description: 'Stress testing scenarios and analysis',
    category: 'analysis',
    defaultLayout: { w: 6, h: 4, minW: 4, minH: 3 },
    props: {
      symbol: {
        type: 'string',
        label: 'Symbol',
        description: 'Stock symbol to stress test',
        required: true,
        default: 'AAPL'
      }
    },
    runtime: {
      component: () => null, // Will be replaced by actual component
    }
  },
  'factor-exposures': {
    type: 'factor-exposures',
    title: 'Factor Exposures',
    description: 'Factor model exposures and analysis',
    category: 'analysis',
    defaultLayout: { w: 6, h: 4, minW: 4, minH: 3 },
    props: {
      symbol: {
        type: 'string',
        label: 'Symbol',
        description: 'Stock symbol to analyze',
        required: true,
        default: 'AAPL'
      }
    },
    runtime: {
      component: () => null, // Will be replaced by actual component
    }
  },
  'correlation-matrix': {
    type: 'correlation-matrix',
    title: 'Correlation Matrix',
    description: 'Correlation matrix for multiple assets',
    category: 'analysis',
    defaultLayout: { w: 6, h: 4, minW: 4, minH: 3 },
    props: {
      symbols: {
        type: 'string',
        label: 'Symbols',
        description: 'Comma-separated stock symbols',
        required: true,
        default: 'AAPL,MSFT,GOOGL'
      }
    },
    runtime: {
      component: () => null, // Will be replaced by actual component
    }
  },
  'greeks-surface': {
    type: 'greeks-surface',
    title: 'Greeks Surface',
    description: 'Options Greeks surface visualization',
    category: 'analysis',
    defaultLayout: { w: 6, h: 4, minW: 4, minH: 3 },
    props: {
      symbol: {
        type: 'string',
        label: 'Symbol',
        description: 'Stock symbol for options analysis',
        required: true,
        default: 'AAPL'
      }
    },
    runtime: {
      component: () => null, // Will be replaced by actual component
    }
  },
  'vol-cone': {
    type: 'vol-cone',
    title: 'Volatility Cone',
    description: 'Volatility cone analysis for options',
    category: 'analysis',
    defaultLayout: { w: 6, h: 4, minW: 4, minH: 3 },
    props: {
      symbol: {
        type: 'string',
        label: 'Symbol',
        description: 'Stock symbol for volatility analysis',
        required: true,
        default: 'AAPL'
      }
    },
    runtime: {
      component: () => null, // Will be replaced by actual component
    }
  },
  'strategy-builder': {
    type: 'strategy-builder',
    title: 'Strategy Builder',
    description: 'Options strategy builder and P&L analysis',
    category: 'analysis',
    defaultLayout: { w: 6, h: 4, minW: 4, minH: 3 },
    props: {
      symbol: {
        type: 'string',
        label: 'Symbol',
        description: 'Stock symbol for strategy building',
        required: true,
        default: 'AAPL'
      }
    },
    runtime: {
      component: () => null, // Will be replaced by actual component
    }
  },
  'pnl-profile': {
    type: 'pnl-profile',
    title: 'P&L Profile',
    description: 'Profit and loss profile visualization',
    category: 'analysis',
    defaultLayout: { w: 6, h: 4, minW: 4, minH: 3 },
    props: {
      symbol: {
        type: 'string',
        label: 'Symbol',
        description: 'Stock symbol for P&L analysis',
        required: true,
        default: 'AAPL'
      }
    },
    runtime: {
      component: () => null, // Will be replaced by actual component
    }
  },
  'blank-tile': {
    type: 'blank-tile',
    title: 'Blank Tile',
    description: 'Empty tile for custom content',
    category: 'utility',
    defaultLayout: { w: 12, h: 8, minW: 2, minH: 2 },
    props: {},
    runtime: {
      component: () => null, // Will be replaced by actual component
    }
  },
  
  'candlestick-chart': {
    type: 'candlestick-chart',
    title: 'Candlestick Chart',
    description: 'Professional OHLC candlestick chart with volume and indicators',
    category: 'charting',
    defaultLayout: { w: 10, h: 8, minW: 8, minH: 6 },
    props: {
      symbol: {
        type: 'string',
        label: 'Symbol',
        description: 'Stock symbol to display',
        required: true,
        default: 'AAPL',
      },
    },
    runtime: {
      component: () => null, // Will be replaced by actual component
    },
  },
  
  'portfolio-tracker': {
    type: 'portfolio-tracker',
    title: 'Portfolio Tracker',
    description: 'Track multiple assets with real-time data and performance metrics',
    category: 'portfolio',
    defaultLayout: { w: 12, h: 8, minW: 10, minH: 6 },
    props: {
      defaultSymbols: {
        type: 'string',
        label: 'Default Symbols',
        description: 'Comma-separated list of default symbols',
        required: false,
        default: 'AAPL,MSFT,GOOGL',
      },
    },
    runtime: {
      component: () => null, // Will be replaced by actual component
    },
  },
  
  'technical-indicators': {
    type: 'technical-indicators',
    title: 'Technical Indicators',
    description: 'Comprehensive technical analysis with RSI, MACD, Stochastic, and more',
    category: 'analysis',
    defaultLayout: { w: 8, h: 8, minW: 6, minH: 6 },
    props: {
      symbol: {
        type: 'string',
        label: 'Symbol',
        description: 'Stock symbol to analyze',
        required: true,
        default: 'AAPL',
      },
    },
    runtime: {
      component: () => null, // Will be replaced by actual component
    },
  },
  
  'interactive-candlestick': {
    type: 'interactive-candlestick',
    title: 'Interactive Candlestick',
    description: 'Professional D3.js candlestick chart with zoom, pan, and real-time updates',
    category: 'charting',
    defaultLayout: { w: 12, h: 10, minW: 10, minH: 8 },
    props: {
      symbol: {
        type: 'string',
        label: 'Symbol',
        description: 'Stock symbol to display',
        required: true,
        default: 'AAPL',
      },
    },
    runtime: {
      component: () => null, // Will be replaced by actual component
    },
  },
  
  'realtime-portfolio': {
    type: 'realtime-portfolio',
    title: 'Real-time Portfolio',
    description: 'Live portfolio tracking with real-time data updates and performance metrics',
    category: 'portfolio',
    defaultLayout: { w: 14, h: 10, minW: 12, minH: 8 },
    props: {
      defaultSymbols: {
        type: 'string',
        label: 'Default Symbols',
        description: 'Comma-separated list of default symbols',
        required: false,
        default: 'AAPL,MSFT,GOOGL',
      },
    },
    runtime: {
      component: () => null, // Will be replaced by actual component
    },
  },
  
  'portfolio-allocation': {
    type: 'portfolio-allocation',
    title: 'Portfolio Allocation',
    description: 'Interactive portfolio allocation charts with pie, treemap, and bar visualizations',
    category: 'portfolio',
    defaultLayout: { w: 12, h: 10, minW: 10, minH: 8 },
    props: {
      defaultChartType: {
        type: 'string',
        label: 'Default Chart Type',
        description: 'Initial chart type to display',
        required: false,
        default: 'pie',
      },
      showSectors: {
        type: 'boolean',
        label: 'Show Sectors',
        description: 'Display sector breakdown information',
        required: false,
        default: true,
      },
    },
    runtime: {
      component: () => null, // Will be replaced by actual component
    },
  },
};