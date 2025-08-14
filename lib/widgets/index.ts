/**
 * Widget System Exports
 * Consolidated around the schema-based registry only
 */

// Schema-based registry and helpers
export {
  schemaWidgetRegistry,
  registerSchemaWidget,
  getSchemaWidget,
  validateWidgetConfig,
  createWidgetInstance,
  getLazyWidget,
} from './registry';

// Loader utilities
export {
  setWidgetComponents,
  loadWidgetComponent,
  loadBuiltinWidgets,
  ensureWidgetLoaded,
  getWidgetStats,
  reloadWidget,
  validateWidgetManifest,
  initializeWidgets,
} from './loader';