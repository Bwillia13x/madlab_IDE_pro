/**
 * Core Widget Registration
 * Registers all the core widgets with the new schema-based system
 */

import { registerSchemaWidget } from './registry';
import { BlankTileDefinition } from '@/components/widgets/BlankTile';
import { MarkdownDefinition } from '@/components/widgets/Markdown';
import { ChartLiteDefinition } from '@/components/widgets/ChartLite';
import { TableDefinition } from '@/components/widgets/Table';
import { KPIDefinition } from '@/components/widgets/KPI';
import { getLazyWidget } from './registry';
import { DcfBasicDefinition } from '@/components/widgets/DcfBasic';
import { VarEsDefinition } from '@/components/widgets/VarEs';
import { getWidgetHelp } from '@/lib/edu/glossary';

/**
 * Register all core widgets with the schema-based registry
 */
export function registerCoreWidgets(): void {
  // Register each widget with the new schema system
  registerSchemaWidget({
    ...BlankTileDefinition,
    meta: { ...BlankTileDefinition.meta, difficulty: 'beginner', edu: { help: getWidgetHelp('blank-tile') } },
  });
  registerSchemaWidget({
    ...MarkdownDefinition,
    meta: { ...MarkdownDefinition.meta, difficulty: 'beginner', edu: { help: getWidgetHelp('markdown') } },
  } as any);
  // Heavier widgets: prefer lazy runtime component where possible
  registerSchemaWidget({
    ...ChartLiteDefinition,
    meta: { ...ChartLiteDefinition.meta, difficulty: 'beginner', edu: { help: getWidgetHelp('chart-lite') } },
    runtime: { ...ChartLiteDefinition.runtime, component: getLazyWidget('ChartLite') as any },
  });
  registerSchemaWidget({
    ...TableDefinition,
    meta: { ...TableDefinition.meta, difficulty: 'beginner', edu: { help: getWidgetHelp('table') } },
  });
  registerSchemaWidget({
    ...KPIDefinition,
    meta: { ...KPIDefinition.meta, difficulty: 'beginner', edu: { help: getWidgetHelp('kpi') } },
  });
  // Lazy-load heavier analysis widgets
  registerSchemaWidget({
    ...DcfBasicDefinition,
    meta: { ...DcfBasicDefinition.meta, difficulty: 'intermediate', edu: { help: getWidgetHelp('dcf-basic') } },
    runtime: { ...DcfBasicDefinition.runtime, component: getLazyWidget('DcfBasic') as any },
  } as any);
  // Register VarEs with proper schema definition
  registerSchemaWidget({
    ...VarEsDefinition,
    meta: { ...VarEsDefinition.meta, difficulty: 'advanced', edu: { help: getWidgetHelp('var-es') } },
    runtime: { ...VarEsDefinition.runtime, component: getLazyWidget('VarEs') as any },
  });
  // Additional heavy widgets: lazy load components
  // GreeksSurface (lazy)
  registerSchemaWidget({
    meta: {
      ...ChartLiteDefinition.meta,
      type: 'greeks-surface',
      name: 'Greeks Surface',
      description: 'Options greeks overview table',
      category: 'options',
      difficulty: 'advanced',
      edu: { help: getWidgetHelp('greeks-surface') },
    },
    runtime: { component: getLazyWidget('GreeksSurface') as any },
  } as any);
  // VolCone (lazy)
  registerSchemaWidget({
    meta: {
      ...ChartLiteDefinition.meta,
      type: 'vol-cone',
      name: 'Vol Cone',
      description: 'Volatility cone with percentiles',
      category: 'options',
      difficulty: 'advanced',
      edu: { help: getWidgetHelp('vol-cone') },
    },
    runtime: { component: getLazyWidget('VolCone') as any },
  } as any);
  // CorrelationMatrix (lazy)
  registerSchemaWidget({
    meta: {
      ...ChartLiteDefinition.meta,
      type: 'correlation-matrix',
      name: 'Correlation Matrix',
      description: 'Asset correlation heatmap',
      category: 'analysis',
      difficulty: 'intermediate',
      edu: { help: getWidgetHelp('correlation-matrix') },
    },
    runtime: { component: getLazyWidget('CorrelationMatrix') as any },
  } as any);

  // StressScenarios (lazy) — align preset widget type
  registerSchemaWidget({
    meta: {
      ...ChartLiteDefinition.meta,
      type: 'stress-scenarios',
      name: 'Stress Scenarios',
      description: 'Predefined stress scenarios and worst-case summary',
      category: 'risk',
      difficulty: 'intermediate',
      edu: { help: getWidgetHelp('stress-scenarios') },
    },
    runtime: { component: getLazyWidget('StressScenarios') as any },
  } as any);

  // Portfolio Risk (lazy)
  registerSchemaWidget({
    meta: {
      ...ChartLiteDefinition.meta,
      type: 'portfolio-risk',
      name: 'Portfolio Risk',
      description: 'Portfolio VaR/ES and scenario shocks',
      category: 'risk',
      difficulty: 'advanced',
      edu: { help: getWidgetHelp('portfolio-risk') },
    },
    runtime: { component: getLazyWidget('PortfolioRisk') as any },
  } as any);
  
  console.log('Core widgets registered successfully');
}

/**
 * List of all core widget definitions for easy access
 */
export const coreWidgetDefinitions = [
  BlankTileDefinition,
  MarkdownDefinition,
  ChartLiteDefinition,
  TableDefinition,
  KPIDefinition,
];

/**
 * Get widget definition by type
 */
export function getCoreWidgetDefinition(type: string) {
  return coreWidgetDefinitions.find(def => def.meta.type === type);
}