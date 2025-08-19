import { defaultWidgetSchemas } from './schema';
import type { WidgetSchema, WidgetRegistry } from './schema';

// Global widget registry
const widgetRegistry: WidgetRegistry = { ...defaultWidgetSchemas };

// Widget component imports
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const widgetComponents: Record<string, () => Promise<{ default: React.ComponentType<any> }>> = {
  'kpi-card': () => import('@/components/widgets/KpiCard').then(m => ({ default: m.KpiCard })),
  'line-chart': () => import('@/components/widgets/LineChart').then(m => ({ default: m.LineChart })),
  'bar-chart': () => import('@/components/widgets/BarChart').then(m => ({ default: m.BarChart })),
  'heatmap': () => import('@/components/widgets/Heatmap').then(m => ({ default: m.Heatmap })),
  'dcf-basic': () => import('@/components/widgets/DcfBasic').then(m => ({ default: m.DcfBasic })),
  'var-es': () => import('@/components/widgets/VarEs').then(m => ({ default: m.VarEs })),
  'stress-scenarios': () => import('@/components/widgets/StressScenarios').then(m => ({ default: m.StressScenarios })),
  'factor-exposures': () => import('@/components/widgets/FactorExposures').then(m => ({ default: m.FactorExposures })),
  'correlation-matrix': () => import('@/components/widgets/CorrelationMatrix').then(m => ({ default: m.CorrelationMatrix })),
  'greeks-surface': () => import('@/components/widgets/GreeksSurface').then(m => ({ default: m.GreeksSurface })),
  'vol-cone': () => import('@/components/widgets/VolCone').then(m => ({ default: m.VolCone })),
  'strategy-builder': () => import('@/components/widgets/StrategyBuilder').then(m => ({ default: m.StrategyBuilder })),
  'pnl-profile': () => import('@/components/widgets/PnLProfile').then(m => ({ default: m.PnLProfile })),
  'blank-tile': () => import('@/components/widgets/BlankTile').then(m => ({ default: m.BlankTile })),
  
  // New enhanced widgets
  'candlestick-chart': () => import('@/components/widgets/CandlestickChart').then(m => ({ default: m.CandlestickChart })),
  'portfolio-tracker': () => import('@/components/widgets/PortfolioTracker').then(m => ({ default: m.PortfolioTracker })),
  'technical-indicators': () => import('@/components/widgets/TechnicalIndicators').then(m => ({ default: m.TechnicalIndicators })),
  
  // Interactive and real-time widgets
  'interactive-candlestick': () => import('@/components/widgets/InteractiveCandlestickChart').then(m => ({ default: m.InteractiveCandlestickChart })),
  'realtime-portfolio': () => import('@/components/widgets/RealtimePortfolioDashboard').then(m => ({ default: m.RealtimePortfolioDashboard })),
  
  // Advanced portfolio and charting widgets
  'portfolio-allocation': () => import('@/components/widgets/PortfolioAllocationCharts').then(m => ({ default: m.PortfolioAllocationCharts })),
  'predictive-insights': () => import('@/components/widgets/PredictiveInsights').then(m => ({ default: m.PredictiveInsights })),
  'watchlist': () => import('@/components/widgets/WatchlistWidget').then(m => ({ default: m.WatchlistWidget })),
  'options-dashboard': () => import('@/components/widgets/OptionsDashboardWidget').then(m => ({ default: m.OptionsDashboardWidget })),
  'market-overview': () => import('@/components/widgets/MarketOverviewWidget').then(m => ({ default: m.MarketOverviewWidget })),
  'portfolio-performance': () => import('@/components/widgets/PortfolioPerformanceWidget').then(m => ({ default: m.PortfolioPerformanceWidget })),
  'news-events-feed': () => import('@/components/widgets/NewsEventsFeedWidget').then(m => ({ default: m.NewsEventsFeedWidget })),
  'backtesting-framework': () => import('@/components/widgets/BacktestingFrameworkWidget').then(m => ({ default: m.BacktestingFrameworkWidget })),
  'financials-summary': () => import('@/components/widgets/FinancialsSummary').then(m => ({ default: m.FinancialsSummary })),
  'peer-comparison': () => import('@/components/widgets/PeerComparison').then(m => ({ default: m.PeerComparison })),
  'quarterly-financials': () => import('@/components/widgets/QuarterlyFinancials').then(m => ({ default: m.QuarterlyFinancials })),
  'income-statement-breakdown': () => import('@/components/widgets/IncomeStatementBreakdown').then(m => ({ default: m.IncomeStatementBreakdown })),
  'kpi-mini-grid': () => import('@/components/widgets/KpiMiniGrid').then(m => ({ default: m.KpiMiniGrid })),
  'screener': () => import('@/components/widgets/ScreenerWidget').then(m => ({ default: m.ScreenerWidget })),
  'options-chain': () => import('@/components/widgets/OptionsChainWidget').then(m => ({ default: m.OptionsChainWidget })),
  'advanced-chart': () => import('@/components/widgets/AdvancedChart').then(m => ({ default: m.AdvancedChart })),
};

// Initialize widget components in registry
export function initializeWidgetRegistry(): void {
  Object.entries(widgetComponents).forEach(([type, importFn]) => {
    if (widgetRegistry[type]) {
      // Update the runtime component with the actual imported component
      importFn().then(module => {
        if (widgetRegistry[type]) {
          widgetRegistry[type].runtime.component = module.default;
        }
      }).catch(err => {
        console.warn(`Failed to load widget component for ${type}:`, err);
      });
    }
  });
}

export function registerWidget(schema: WidgetSchema): void {
  widgetRegistry[schema.type] = schema;
}

export function unregisterWidget(type: string): void {
  if (type in defaultWidgetSchemas) {
    console.warn(`Cannot unregister default widget: ${type}`);
    return;
  }
  delete widgetRegistry[type];
}

export function getWidgetSchema(type: string): WidgetSchema | undefined {
  return widgetRegistry[type];
}

export function getAllWidgetSchemas(): WidgetSchema[] {
  return Object.values(widgetRegistry);
}

export function getWidgetsByCategory(category: string): WidgetSchema[] {
  return Object.values(widgetRegistry).filter(widget => widget.category === category);
}

export function getAvailableWidgetTypes(): string[] {
  return Object.keys(widgetRegistry);
}

// Cache for loaded components to avoid re-importing
const componentCache = new Map<string, React.ComponentType<{ widget: any; sheetId: string }>>();

// Critical widgets that should be preloaded
const CRITICAL_WIDGETS = ['kpi-card', 'line-chart', 'bar-chart', 'watchlist', 'market-overview'];

// Preload critical widgets
export function preloadCriticalWidgets(): void {
  CRITICAL_WIDGETS.forEach(type => {
    if (!componentCache.has(type)) {
      getWidgetComponent(type).catch(err => {
        console.warn(`Failed to preload critical widget ${type}:`, err);
      });
    }
  });
}

// Get widget component for rendering with caching
export async function getWidgetComponent(type: string): Promise<React.ComponentType<{ widget: any; sheetId: string }> | null> {
  // Return cached component if available
  if (componentCache.has(type)) {
    return componentCache.get(type)!;
  }
  
  // Try to load component dynamically
  const importFn = widgetComponents[type];
  if (importFn) {
    try {
      const mod = await importFn();
      const component = mod.default;
      
      // Cache the component
      componentCache.set(type, component);
      
      return component;
    } catch (error) {
      console.warn(`Failed to load widget component for ${type}:`, error);
      return null;
    }
  }
  
  return null;
}

// Preload a specific widget component
export async function preloadWidget(type: string): Promise<boolean> {
  try {
    const component = await getWidgetComponent(type);
    return component !== null;
  } catch (error) {
    console.warn(`Failed to preload widget ${type}:`, error);
    return false;
  }
}

// Get component cache size for debugging
export function getComponentCacheSize(): number {
  return componentCache.size;
}

// Clear component cache (useful for development)
export function clearComponentCache(): void {
  componentCache.clear();
}

// Legacy function for backward compatibility
export function getSchemaWidget(type: string): WidgetSchema | undefined {
  return getWidgetSchema(type);
}

// Initialize registry on module load
initializeWidgetRegistry();

// Preload critical widgets after initialization
if (typeof window !== 'undefined') {
  // Only preload in browser environment
  setTimeout(() => {
    preloadCriticalWidgets();
  }, 100);
}