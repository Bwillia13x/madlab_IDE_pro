import { defaultWidgetSchemas } from './schema';
import type { WidgetSchema, WidgetRegistry } from './schema';

// Global widget registry
let widgetRegistry: WidgetRegistry = { ...defaultWidgetSchemas };

// Widget component imports
const widgetComponents = {
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

// Legacy function for backward compatibility
export function getSchemaWidget(type: string): WidgetSchema | undefined {
  return getWidgetSchema(type);
}

// Initialize registry on module load
initializeWidgetRegistry();