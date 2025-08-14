export const widgetHelpByType: Record<string, string> = {
  'kpi': 'KPI shows a key metric with optional change and target progress. Use it to track the most important number.',
  'dcf-basic': 'DCF estimates enterprise value by discounting forecasted free cash flows and a terminal value back to today.',
  'var-es': 'VaR/ES estimates potential loss for a portfolio over a time horizon at a confidence level (VaR) and expected tail loss (ES).',
  'greeks-surface': 'Greeks quantify option sensitivity to underlying factors like price (Delta), time (Theta), and volatility (Vega).',
  'vol-cone': 'Volatility cone shows historical distribution of realized volatility over different windows to contextualize current levels.',
  'correlation-matrix': 'Correlation matrix shows linear relationships between assets to understand diversification and co-movement.',
  'stress-scenarios': 'Stress scenarios apply shocks (e.g., rate moves, drawdowns) to estimate portfolio impact under adverse conditions.',
  'chart-lite': 'Simple chart for visualizing a single series with minimal configuration.',
  'table': 'Table displays structured data with pagination and sorting.',
  'blank-tile': 'A placeholder tile you can replace with any widget.',
};

export function getWidgetHelp(type: string): string | undefined {
  return widgetHelpByType[type];
}

// Lightweight glossary for contextual help across the app
export type GlossaryTermKey = 'wacc' | 'terminal-value' | 'var' | 'es' | 'greeks' | 'delta' | 'theta' | 'vega';

export const glossaryTerms: Record<GlossaryTermKey, { title: string; body: string }> = {
  'wacc': {
    title: 'WACC (Weighted Average Cost of Capital)',
    body: 'The blended required return rate for a firm, weighted by the proportion of debt and equity. Used as the discount rate in DCF. Typical range 6–12% for mature firms.'
  },
  'terminal-value': {
    title: 'Terminal Value',
    body: 'The value of a business beyond the forecast horizon in a DCF. Common methods: Gordon Growth (perpetual growth) and Exit Multiple (apply a market multiple to a terminal metric).'
  },
  'var': {
    title: 'Value-at-Risk (VaR)',
    body: 'An estimate of the potential loss over a specified horizon at a given confidence level. For example, 95% 1‑day VaR of 2% means losses should exceed 2% only 5% of the time.'
  },
  'es': {
    title: 'Expected Shortfall (ES)',
    body: 'Also known as Conditional VaR. The average loss given that the loss exceeded the VaR threshold. Captures tail risk beyond VaR.'
  },
  'greeks': {
    title: 'Option Greeks',
    body: 'Sensitivities of an option price to underlying risk factors: Delta (price), Gamma (convexity), Theta (time decay), Vega (volatility), Rho (rates).'
  },
  'delta': {
    title: 'Delta',
    body: 'Change in option price per unit change in the underlying asset price (∂Price/∂S).'
  },
  'theta': {
    title: 'Theta',
    body: 'Sensitivity of option price to the passage of time (time decay). Often negative for long options.'
  },
  'vega': {
    title: 'Vega',
    body: 'Sensitivity of option price to changes in implied volatility. Higher Vega means price moves more with volatility.'
  },
};

export function getGlossaryTerm(key: GlossaryTermKey): { title: string; body: string } | undefined {
  return glossaryTerms[key];
}


