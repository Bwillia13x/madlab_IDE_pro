/**
 * Action System Exports
 */

// Core registry
export {
  type ActionManifest,
  type ActionContext,
  type ActionResult,
  type ActionHandler,
  type ActionRegistryEntry,
  actionRegistry,
  registerAction,
  getAction,
  executeAction,
  getActionsByCategory,
  searchActions,
  getAvailableActions,
} from './registry';

// Built-in actions
export { builtinActions } from './builtin';

// Loader utilities
export {
  setActionHandlers,
  loadActionHandler,
  loadBuiltinActions,
  loadExternalActions,
  ensureActionLoaded,
  getActionStats,
  reloadAction,
  getCommandPaletteEntries,
  executeActionSafely,
  registerShortcutHandlers,
  initializeActions,
} from './loader';

// Re-export default from loader
export { default as actionLoader } from './loader';