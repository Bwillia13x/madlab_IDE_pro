/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Widget Loader for MAD LAB IDE (schema-based only)
 */

import { schemaWidgetRegistry, type WidgetRegistryEntryV2 } from './registry';

// Widget component map - in a real implementation, these would be dynamic imports
type WidgetComponentMap = {
  [key: string]: React.ComponentType<unknown>;
};

// This will be populated by the actual widget components
let componentMap: WidgetComponentMap = {};

/**
 * Set the widget component map
 */
export function setWidgetComponents(components: WidgetComponentMap): void {
  componentMap = { ...components };
}

// Widget dynamic import mapping for code splitting
const WIDGET_IMPORTS: Record<string, () => Promise<{ default: React.ComponentType<unknown> }>> = {
  'line-chart': async () => ({ default: (await import('@/components/widgets/LineChart')).default as any }),
  'bar-chart': async () => ({ default: (await import('@/components/widgets/BarChart')).default as any }),
  'kpi-card': async () => ({ default: (await import('@/components/widgets/KpiCard')).KpiCardDefault as any }),
  'dcf-basic': async () => ({ default: (await import('@/components/widgets/DcfBasic')).default as any }),
  'correlation-matrix': async () => ({ default: (await import('@/components/widgets/CorrelationMatrix')).default as any }),
  'factor-exposures': async () => ({ default: (await import('@/components/widgets/FactorExposures')).FactorExposures as any }),
  'greeks-surface': async () => ({ default: (await import('@/components/widgets/GreeksSurface')).default as any }),
  'heatmap': async () => ({ default: (await import('@/components/widgets/Heatmap')).Heatmap as any }),
  'options-card': async () => ({ default: (await import('@/components/widgets/OptionsCard')).OptionsCard as any }),
  'pnl-profile': async () => ({ default: (await import('@/components/widgets/PnLProfile')).PnLProfile as any }),
  'strategy-builder': async () => ({ default: (await import('@/components/widgets/StrategyBuilder')).StrategyBuilder as any }),
  'var-es': async () => ({ default: (await import('@/components/widgets/VarEs')).default as any }),
  'vol-cone': async () => ({ default: (await import('@/components/widgets/VolCone')).default as any }),
  'table': async () => ({ default: (await import('@/components/widgets/Table')).default as any }),
  'markdown': async () => ({ default: (await import('@/components/widgets/Markdown')).default as any }),
  'kpi': async () => ({ default: (await import('@/components/widgets/KPI')).default as any }),
  'chart-lite': async () => ({ default: (await import('@/components/widgets/ChartLite')).default as any }),
  'blank-tile': async () => ({ default: (await import('@/components/widgets/BlankTile')).BlankTile as any }),
  'stress-scenarios': async () => ({ default: (await import('@/components/widgets/StressScenarios')).default as any }),
};

/**
 * Load a widget component dynamically with code splitting
 */
export async function loadWidgetComponent(type: string): Promise<React.ComponentType<any> | null> {
  try {
    // First check if component is already in the map (synchronously loaded)
    if (componentMap[type]) {
      return componentMap[type];
    }
    
    // Try dynamic import for code splitting
    const importFn = WIDGET_IMPORTS[type];
    if (importFn) {
      console.log(`Loading widget component: ${type}`);
      const mod = await importFn();
      const component = mod.default;
      
      // Cache the component
      componentMap[type] = component;
      return component;
    }
    
    console.warn(`Widget component not found: ${type}`);
    return null;
  } catch (error) {
    console.error(`Failed to load widget component ${type}:`, error);
    return null;
  }
}

/**
 * Load and register all built-in widgets
 */
export async function loadBuiltinWidgets(): Promise<void> {
  console.log('Loading built-in widgets (schema-based)...');
  const schemaEntries = schemaWidgetRegistry.getAllWidgets();
  for (const entry of schemaEntries) {
    try {
      const type = entry.definition.meta.type;
      const component = await loadWidgetComponent(type);
      if (component) {
        // No-op: components are loaded on demand by LazyWidget; registry holds definitions
      }
    } catch (err) {
      console.warn('Failed to prepare schema widget component', err);
    }
  }
  const size = schemaWidgetRegistry.getAllWidgets().length;
  console.log(`Loaded ${size} schema widgets`);
}

/**
 * Load widgets from external sources (future feature)
 */
export async function loadExternalWidgets(source: string): Promise<void> {
  // This would load widgets from external sources like npm packages, URLs, etc.
  console.log(`Loading external widgets from: ${source}`);
  // Implementation would go here
}

/**
 * Lazy load a widget component when needed
 */
export async function ensureWidgetLoaded(type: string): Promise<WidgetRegistryEntryV2 | null> {
  const entry = schemaWidgetRegistry.getWidget(type);
  if (!entry) {
    console.warn(`Widget not found: ${type}`);
    return null;
  }
  // Components are dynamically imported by consumers; ensure import cache is warmed
  try {
    const component = await loadWidgetComponent(type);
    if (!component) {
      console.error(`Failed to load component for widget: ${type}`);
    }
  } catch (error) {
    console.error(`Error loading widget component ${type}:`, error);
  }
  return entry;
}

/**
 * Get widget statistics
 */
export function getWidgetStats() {
  const all = schemaWidgetRegistry.getAllWidgets();
  const categories = Array.from(new Set(all.map(e => e.definition.meta.category)));
  return {
    total: all.length,
    // Loaded/unloaded is not tracked per component now; count definitions only
    loaded: all.length,
    unloaded: 0,
    categories: categories.length,
    tags: 0,
    categoryBreakdown: categories.reduce((acc: Record<string, number>, category: string) => {
      acc[category] = schemaWidgetRegistry.getWidgetsByCategory(category).length;
      return acc;
    }, {} as Record<string, number>),
  };
}

/**
 * Reload a widget (useful for development)
 */
export async function reloadWidget(type: string): Promise<boolean> {
  try {
    if (componentMap[type]) {
      delete componentMap[type];
    }
    await ensureWidgetLoaded(type);
    return true;
  } catch (error) {
    console.error(`Error reloading widget ${type}:`, error);
    return false;
  }
}

/**
 * Validate widget manifest against current schema
 */
export function validateWidgetManifest(manifest: Record<string, any>): boolean {
  // Basic validation - in a real implementation, this would use a schema validator
  const required = ['type', 'name', 'description', 'category', 'version'];
  for (const field of required) {
    if (!manifest[field]) {
      console.error(`Widget manifest missing required field: ${field}`);
      return false;
    }
  }
  
  const validCategories = ['charting', 'kpi', 'risk', 'options', 'analysis', 'utility'];
  if (!validCategories.includes(manifest.category as string)) {
    console.error(`Invalid widget category: ${String(manifest.category)}`);
    return false;
  }
  
  return true;
}

/**
 * Initialize the widget system
 */
export async function initializeWidgets(components?: WidgetComponentMap): Promise<void> {
  console.log('Initializing widget system...');
  
  if (components) {
    setWidgetComponents(components);
  }
  
  await loadBuiltinWidgets();
  
  const stats = getWidgetStats();
  console.log('Widget system initialized:', stats);
}

const widgetLoader = {
  loadBuiltinWidgets,
  loadExternalWidgets,
  ensureWidgetLoaded,
  reloadWidget,
  getWidgetStats,
  validateWidgetManifest,
  initializeWidgets,
};

export default widgetLoader;