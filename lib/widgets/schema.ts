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
    default?: string | number | boolean;
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
  'predictive-insights': {
    type: 'predictive-insights',
    title: 'Predictive Insights',
    description: 'Simple heuristic trend insight with confidence',
    category: 'analysis',
    defaultLayout: { w: 6, h: 4, minW: 3, minH: 3 },
    props: {
      symbol: {
        type: 'string',
        label: 'Symbol',
        description: 'Symbol to analyze',
        default: 'AAPL',
      },
    },
    runtime: {
      component: () => null,
    },
  },
  'watchlist': {
    type: 'watchlist',
    title: 'Watchlist',
    description: 'Compact symbol table with live updates',
    category: 'utility',
    defaultLayout: { w: 6, h: 5, minW: 4, minH: 3 },
    props: {
      symbols: { type: 'string', label: 'Symbols (comma-separated)', description: 'e.g., AAPL,MSFT,NVDA', default: 'AAPL,MSFT,NVDA' },
    },
    runtime: { component: () => null },
  },
  'portfolio-performance': {
    type: 'portfolio-performance',
    title: 'Portfolio Performance',
    description: 'Comprehensive portfolio tracking with holdings, P&L, allocation charts, and performance metrics',
    category: 'portfolio',
    defaultLayout: { w: 8, h: 6, minW: 6, minH: 4 },
    props: {},
    runtime: { component: () => null },
  },
  'news-events-feed': {
    type: 'news-events-feed',
    title: 'News & Events Feed',
    description: 'Market news, earnings calendar, economic events, and sentiment analysis',
    category: 'analysis',
    defaultLayout: { w: 6, h: 6, minW: 4, minH: 4 },
    props: {},
    runtime: { component: () => null },
  },
  'backtesting-framework': {
    type: 'backtesting-framework',
    title: 'Backtesting Framework',
    description: 'Strategy testing, performance metrics, risk analysis, and Monte Carlo simulations',
    category: 'analysis',
    defaultLayout: { w: 8, h: 8, minW: 6, minH: 6 },
    props: {},
    runtime: { component: () => null },
  },
  'options-dashboard': {
    type: 'options-dashboard',
    title: 'Options Dashboard',
    description: 'Compact options trader view with Greeks and payoff',
    category: 'analysis',
    defaultLayout: { w: 8, h: 6, minW: 6, minH: 4 },
    props: {
      underlyings: { type: 'string', label: 'Underlyings', description: 'Comma-separated (e.g., NVDA,SPY,AAPL)', default: 'SPY,NVDA,AAPL,TSLA' },
    },
    runtime: { component: () => null },
  },
  'income-statement-breakdown': {
    type: 'income-statement-breakdown',
    title: 'Income Statement Breakdown',
    description: 'Stacked bar chart showing revenue breakdown (Revenue, COGS, Gross Profit, OpEx, Net Income)',
    category: 'financial',
    defaultLayout: { w: 6, h: 4, minW: 4, minH: 3 },
    props: {
      symbol: {
        type: 'string',
        label: 'Symbol',
        description: 'Ticker symbol',
        default: 'AAPL',
      },
    },
    runtime: { component: () => null },
  },
  'kpi-mini-grid': {
    type: 'kpi-mini-grid',
    title: 'KPI Mini-Grid',
    description: 'Grid showing current values with QoQ and YoY percentage changes',
    category: 'financial',
    defaultLayout: { w: 6, h: 4, minW: 4, minH: 3 },
    props: {
      symbol: {
        type: 'string',
        label: 'Symbol',
        description: 'Ticker symbol',
        default: 'AAPL',
      },
    },
    runtime: { component: () => null },
  },
  'market-overview': {
    type: 'market-overview',
    title: 'Market Overview',
    description: 'Macro snapshot with sparklines and session move control',
    category: 'analysis',
    defaultLayout: { w: 6, h: 4, minW: 4, minH: 3 },
    props: {},
    runtime: { component: () => null },
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
  'financials-summary': {
    type: 'financials-summary',
    title: 'Financials Summary',
    description: 'Revenue, Net Income, Cash Flow, and FCF tiles',
    category: 'financial',
    defaultLayout: { w: 6, h: 4, minW: 4, minH: 3 },
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
      component: () => null,
    },
  },
  'peer-comparison': {
    type: 'peer-comparison',
    title: 'Peer Comparison',
    description: 'Tabular peer KPIs (price, change, volume, market cap)',
    category: 'financial',
    defaultLayout: { w: 6, h: 4, minW: 4, minH: 3 },
    props: {
      symbols: {
        type: 'string',
        label: 'Peer Symbols',
        description: 'Comma-separated list of tickers',
        default: 'AAPL,MSFT,NVDA',
      },
    },
    runtime: { component: () => null },
  },
  'quarterly-financials': {
    type: 'quarterly-financials',
    title: 'Quarterly Financials',
    description: 'Recent quarterly revenue, net income, and FCF table',
    category: 'financial',
    defaultLayout: { w: 6, h: 4, minW: 4, minH: 3 },
    props: {
      symbol: {
        type: 'string',
        label: 'Symbol',
        description: 'Ticker symbol',
        default: 'AAPL',
      },
    },
    runtime: { component: () => null },
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
  
  'advanced-chart': {
    type: 'advanced-chart',
    title: 'Advanced Chart',
    description: 'Multi-pane OHLC with RSI/MACD, overlays, annotations and export',
    category: 'charting',
    defaultLayout: { w: 12, h: 10, minW: 10, minH: 8 },
    props: {
      symbol: {
        type: 'string',
        label: 'Symbol',
        description: 'Stock symbol to display',
        required: true,
        default: 'NVDA',
      },
    },
    runtime: {
      component: () => null,
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
  'screener': {
    type: 'screener',
    title: 'Stock Screener',
    description: 'Advanced stock screening with filters, saved screens, and preview charts',
    category: 'analysis',
    defaultLayout: { w: 12, h: 8, minW: 10, minH: 6 },
    props: {
      defaultFilters: {
        type: 'string',
        label: 'Default Filters',
        description: 'JSON string of default filter values',
        required: false,
        default: '{}',
      },
    },
    runtime: {
      component: () => null, // Will be replaced by actual component
    },
  },
  'options-chain': {
    type: 'options-chain',
    title: 'Options Chain',
    description: 'Live options chain with Greeks, scenario analysis, and position building',
    category: 'analysis',
    defaultLayout: { w: 8, h: 8, minW: 6, minH: 6 },
    props: {
      defaultSymbol: {
        type: 'string',
        label: 'Default Symbol',
        description: 'Default underlying symbol to display',
        required: false,
        default: 'NVDA',
      },
      defaultDTE: {
        type: 'number',
        label: 'Default DTE',
        description: 'Default days to expiration',
        required: false,
        default: 30,
        min: 1,
        max: 180,
      },
    },
    runtime: {
      component: () => null, // Will be replaced by actual component
    },
  },
};