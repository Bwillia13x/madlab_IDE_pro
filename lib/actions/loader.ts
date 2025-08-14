/**
 * Action Loader for MAD LAB IDE
 * Handles loading and registration of actions
 */

import { registerAction, actionRegistry, type ActionRegistryEntry, type ActionHandler } from './registry';
import { builtinActions } from './builtin';

// Action handler map for external action registration
type ActionHandlerMap = {
  [key: string]: ActionHandler;
};

let handlerMap: ActionHandlerMap = {};

/**
 * Set external action handlers
 */
export function setActionHandlers(handlers: ActionHandlerMap): void {
  handlerMap = { ...handlers };
}

/**
 * Load an action handler dynamically
 */
export async function loadActionHandler(id: string, handlerPath?: string): Promise<ActionHandler | null> {
  try {
    // Check if handler is already in the map
    if (handlerMap[id]) {
      return handlerMap[id];
    }
    
    // In a real implementation, this could load handlers from external modules
    // For now, we'll use the handler map
    if (handlerPath && handlerMap[handlerPath]) {
      return handlerMap[handlerPath];
    }
    
    console.warn(`Action handler not found: ${id}`);
    return null;
  } catch (error) {
    console.error(`Failed to load action handler ${id}:`, error);
    return null;
  }
}

/**
 * Load and register all built-in actions
 */
export async function loadBuiltinActions(): Promise<void> {
  console.log('Loading built-in actions...');
  
  for (const manifest of builtinActions) {
    try {
      const handler = typeof manifest.handler === 'function' 
        ? manifest.handler 
        : await loadActionHandler(manifest.id, typeof manifest.handler === 'string' ? manifest.handler : undefined);
      
      const success = registerAction(manifest, handler || undefined);
      
      if (!success) {
        console.error(`Failed to register action: ${manifest.id}`);
      }
    } catch (error) {
      console.error(`Error loading action ${manifest.id}:`, error);
    }
  }
  
  console.log(`Loaded ${actionRegistry.size()} actions`);
}

/**
 * Load actions from external sources (future feature)
 */
export async function loadExternalActions(source: string): Promise<void> {
  console.log(`Loading external actions from: ${source}`);
  // Implementation would go here - could load from packages, URLs, etc.
}

/**
 * Lazy load an action handler when needed
 */
export async function ensureActionLoaded(id: string): Promise<ActionRegistryEntry | null> {
  const entry = actionRegistry.get(id);
  if (!entry) {
    console.warn(`Action not found: ${id}`);
    return null;
  }
  
  if (entry.isLoaded) {
    return entry;
  }
  
  try {
    const handlerPath = typeof entry.manifest.handler === 'string' ? entry.manifest.handler : undefined;
    const handler = await loadActionHandler(id, handlerPath);
    
    if (handler) {
      entry.handler = handler;
      entry.isLoaded = true;
      entry.loadError = undefined;
      console.log(`Loaded action handler: ${id}`);
    } else {
      entry.loadError = 'Handler not found';
      console.error(`Failed to load handler for action: ${id}`);
    }
  } catch (error) {
    entry.loadError = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error loading action handler ${id}:`, error);
  }
  
  return entry;
}

/**
 * Get action statistics
 */
export function getActionStats() {
  const all = actionRegistry.getAll();
  const loaded = all.filter(entry => entry.isLoaded).length;
  const categories = actionRegistry.getCategories();
  const groups = actionRegistry.getGroups();
  
  return {
    total: all.length,
    loaded,
    unloaded: all.length - loaded,
    categories: categories.length,
    groups: groups.length,
    shortcuts: actionRegistry.getShortcuts().size,
    categoryBreakdown: categories.reduce((acc, category) => {
      acc[category] = actionRegistry.getByCategory(category).length;
      return acc;
    }, {} as Record<string, number>),
    groupBreakdown: groups.reduce((acc, group) => {
      acc[group] = actionRegistry.getByGroup(group).length;
      return acc;
    }, {} as Record<string, number>),
  };
}

/**
 * Reload an action handler (useful for development)
 */
export async function reloadAction(id: string): Promise<boolean> {
  const entry = actionRegistry.get(id);
  if (!entry) return false;
  
  try {
    // Clear the handler from cache
    if (handlerMap[id]) {
      delete handlerMap[id];
    }
    
    // Reset the entry
    entry.handler = undefined;
    entry.isLoaded = false;
    entry.loadError = undefined;
    
    // Reload
    const reloaded = await ensureActionLoaded(id);
    return reloaded?.isLoaded || false;
  } catch (error) {
    console.error(`Error reloading action ${id}:`, error);
    return false;
  }
}

/**
 * Create a command palette entry for actions
 */
export function getCommandPaletteEntries() {
  return actionRegistry.getAll().map(entry => ({
    id: entry.manifest.id,
    label: entry.manifest.label,
    description: entry.manifest.description,
    category: entry.manifest.category,
    shortcut: entry.manifest.shortcut?.join('+'),
    icon: entry.manifest.icon,
    group: entry.manifest.group,
    tags: entry.manifest.tags,
  }));
}

/**
 * Execute an action with context validation
 */
export async function executeActionSafely(
  id: string, 
  args?: any, 
  context?: any
) {
  // Ensure action is loaded
  const entry = await ensureActionLoaded(id);
  if (!entry || !entry.handler) {
    return {
      success: false,
      error: `Action not available: ${id}`,
    };
  }
  
  // Execute through the registry (which handles validation)
  return actionRegistry.execute(id, args, context);
}

/**
 * Register keyboard shortcut handlers
 */
export function registerShortcutHandlers(handleShortcut: (shortcut: string[], actionId: string) => void) {
  const shortcuts = actionRegistry.getShortcuts();
  
  shortcuts.forEach((actionId, shortcut) => {
    const keys = shortcut.split('+');
    handleShortcut(keys, actionId);
  });
}

/**
 * Initialize the action system
 */
export async function initializeActions(handlers?: ActionHandlerMap): Promise<void> {
  console.log('Initializing action system...');
  
  if (handlers) {
    setActionHandlers(handlers);
  }
  
  await loadBuiltinActions();
  
  const stats = getActionStats();
  console.log('Action system initialized:', stats);
}

export default {
  loadBuiltinActions,
  loadExternalActions,
  ensureActionLoaded,
  reloadAction,
  getActionStats,
  getCommandPaletteEntries,
  executeActionSafely,
  registerShortcutHandlers,
  initializeActions,
};