/**
 * Action Registry System for MAD LAB IDE
 * Provides infrastructure for registering and managing actions/commands
 */

export interface ActionContext {
  workspaceStore?: any;
  selectedWidget?: string;
  activeSheet?: string;
  clipboard?: any;
  [key: string]: any;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export type ActionHandler = (args?: any, context?: ActionContext) => Promise<ActionResult> | ActionResult;

export interface ActionManifest {
  id: string;
  label: string;
  description: string;
  category: 'workspace' | 'widget' | 'sheet' | 'data' | 'view' | 'system';
  
  // Handler function or path
  handler: ActionHandler | string;
  
  // UI information
  icon?: string;
  shortcut?: string[];
  
  // Execution context
  enabledWhen?: {
    // Conditions when action should be enabled
    hasActiveSheet?: boolean;
    hasSelectedWidget?: boolean;
    widgetType?: string[];
    sheetType?: string[];
    custom?: (context: ActionContext) => boolean;
  };
  
  // Arguments schema
  args?: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect';
      label: string;
      description?: string;
      required?: boolean;
      default?: any;
      options?: Array<{ value: any; label: string }>;
      validation?: {
        min?: number;
        max?: number;
        pattern?: string;
        custom?: (value: any) => boolean | string;
      };
    };
  };
  
  // Confirmation requirements
  confirmation?: {
    title: string;
    message: string;
    destructive?: boolean;
  };
  
  // Grouping and organization
  group?: string;
  order?: number;
  
  // Metadata
  version: string;
  author?: string;
  tags?: string[];
}

export interface ActionRegistryEntry {
  manifest: ActionManifest;
  handler?: ActionHandler;
  isLoaded: boolean;
  loadError?: string;
}

class ActionRegistry {
  private actions = new Map<string, ActionRegistryEntry>();
  private categories = new Map<string, Set<string>>();
  private shortcuts = new Map<string, string>();
  private groups = new Map<string, Set<string>>();
  
  /**
   * Register an action
   */
  register(manifest: ActionManifest, handler?: ActionHandler): boolean {
    try {
      if (!this.validateManifest(manifest)) {
        return false;
      }
      
      // Check for ID conflicts
      if (this.actions.has(manifest.id)) {
        console.warn(`Action '${manifest.id}' is already registered. Overwriting.`);
      }
      
      // Check for shortcut conflicts
      if (manifest.shortcut) {
        const shortcutKey = manifest.shortcut.join('+');
        const existing = this.shortcuts.get(shortcutKey);
        if (existing && existing !== manifest.id) {
          console.warn(`Shortcut '${shortcutKey}' is already registered to action '${existing}'. Overwriting.`);
        }
        this.shortcuts.set(shortcutKey, manifest.id);
      }
      
      const resolvedHandler = handler || (typeof manifest.handler === 'function' ? manifest.handler : undefined);
      
      const entry: ActionRegistryEntry = {
        manifest,
        handler: resolvedHandler,
        isLoaded: !!resolvedHandler,
      };
      
      this.actions.set(manifest.id, entry);
      this.updateIndices(manifest);
      
      console.log(`Registered action: ${manifest.id} (${manifest.label})`);
      return true;
    } catch (error) {
      console.error(`Failed to register action ${manifest.id}:`, error);
      return false;
    }
  }
  
  /**
   * Unregister an action
   */
  unregister(id: string): boolean {
    const entry = this.actions.get(id);
    if (!entry) return false;
    
    this.actions.delete(id);
    this.removeFromIndices(entry.manifest);
    
    // Remove shortcut mapping
    if (entry.manifest.shortcut) {
      const shortcutKey = entry.manifest.shortcut.join('+');
      this.shortcuts.delete(shortcutKey);
    }
    
    console.log(`Unregistered action: ${id}`);
    return true;
  }
  
  /**
   * Get an action by ID
   */
  get(id: string): ActionRegistryEntry | undefined {
    return this.actions.get(id);
  }
  
  /**
   * Get all registered actions
   */
  getAll(): ActionRegistryEntry[] {
    return Array.from(this.actions.values());
  }
  
  /**
   * Get actions by category
   */
  getByCategory(category: string): ActionRegistryEntry[] {
    const ids = this.categories.get(category) || new Set();
    return Array.from(ids)
      .map(id => this.actions.get(id))
      .filter((entry): entry is ActionRegistryEntry => !!entry)
      .sort((a, b) => (a.manifest.order || 0) - (b.manifest.order || 0));
  }
  
  /**
   * Get actions by group
   */
  getByGroup(group: string): ActionRegistryEntry[] {
    const ids = this.groups.get(group) || new Set();
    return Array.from(ids)
      .map(id => this.actions.get(id))
      .filter((entry): entry is ActionRegistryEntry => !!entry)
      .sort((a, b) => (a.manifest.order || 0) - (b.manifest.order || 0));
  }
  
  /**
   * Get action by shortcut
   */
  getByShortcut(shortcut: string[]): ActionRegistryEntry | undefined {
    const shortcutKey = shortcut.join('+');
    const id = this.shortcuts.get(shortcutKey);
    return id ? this.actions.get(id) : undefined;
  }
  
  /**
   * Search actions
   */
  search(query: string): ActionRegistryEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(entry => {
      const { manifest } = entry;
      return (
        manifest.label.toLowerCase().includes(lowerQuery) ||
        manifest.description.toLowerCase().includes(lowerQuery) ||
        manifest.id.toLowerCase().includes(lowerQuery) ||
        (manifest.tags && manifest.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
      );
    });
  }
  
  /**
   * Get available actions for a context
   */
  getAvailableActions(context: ActionContext): ActionRegistryEntry[] {
    return this.getAll().filter(entry => this.isActionEnabled(entry, context));
  }
  
  /**
   * Check if an action is enabled in the given context
   */
  isActionEnabled(entry: ActionRegistryEntry, context: ActionContext): boolean {
    const { enabledWhen } = entry.manifest;
    if (!enabledWhen) return true;
    
    if (enabledWhen.hasActiveSheet && !context.activeSheet) return false;
    if (enabledWhen.hasSelectedWidget && !context.selectedWidget) return false;
    
    if (enabledWhen.widgetType && context.selectedWidget) {
      // In a real implementation, you'd get widget type from the store
      // For now, just assume it matches
    }
    
    if (enabledWhen.sheetType && context.activeSheet) {
      // In a real implementation, you'd get sheet type from the store
      // For now, just assume it matches
    }
    
    if (enabledWhen.custom && !enabledWhen.custom(context)) return false;
    
    return true;
  }
  
  /**
   * Execute an action
   */
  async execute(id: string, args?: any, context?: ActionContext): Promise<ActionResult> {
    const entry = this.actions.get(id);
    if (!entry) {
      return {
        success: false,
        error: `Action not found: ${id}`,
      };
    }
    
    if (!entry.isLoaded || !entry.handler) {
      return {
        success: false,
        error: `Action handler not loaded: ${id}`,
      };
    }
    
    try {
      // Validate arguments if schema is provided
      if (entry.manifest.args && args) {
        const validation = this.validateArgs(args, entry.manifest.args);
        if (!validation.valid) {
          return {
            success: false,
            error: `Invalid arguments: ${validation.errors.join(', ')}`,
          };
        }
      }
      
      // Check if action is enabled
      if (context && !this.isActionEnabled(entry, context)) {
        return {
          success: false,
          error: `Action not available in current context: ${id}`,
        };
      }
      
      const result = await entry.handler(args, context);
      return result;
    } catch (error) {
      console.error(`Error executing action ${id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  /**
   * Get categories
   */
  getCategories(): string[] {
    return Array.from(this.categories.keys());
  }
  
  /**
   * Get groups
   */
  getGroups(): string[] {
    return Array.from(this.groups.keys());
  }
  
  /**
   * Get all shortcuts
   */
  getShortcuts(): Map<string, string> {
    return new Map(this.shortcuts);
  }
  
  /**
   * Clear all actions
   */
  clear(): void {
    this.actions.clear();
    this.categories.clear();
    this.shortcuts.clear();
    this.groups.clear();
  }
  
  /**
   * Get action count
   */
  size(): number {
    return this.actions.size;
  }
  
  /**
   * Validate action manifest
   */
  private validateManifest(manifest: ActionManifest): boolean {
    if (!manifest.id || typeof manifest.id !== 'string') {
      console.error('Action manifest must have a valid id');
      return false;
    }
    
    if (!manifest.label || typeof manifest.label !== 'string') {
      console.error('Action manifest must have a valid label');
      return false;
    }
    
    if (!manifest.description || typeof manifest.description !== 'string') {
      console.error('Action manifest must have a valid description');
      return false;
    }
    
    const validCategories = ['workspace', 'widget', 'sheet', 'data', 'view', 'system'];
    if (!validCategories.includes(manifest.category)) {
      console.error(`Action category must be one of: ${validCategories.join(', ')}`);
      return false;
    }
    
    if (!manifest.handler) {
      console.error('Action manifest must have a handler');
      return false;
    }
    
    return true;
  }
  
  /**
   * Validate action arguments
   */
  private validateArgs(args: any, schema: NonNullable<ActionManifest['args']>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const [key, config] of Object.entries(schema)) {
      const value = args[key];
      
      if (config.required && (value === undefined || value === null)) {
        errors.push(`Required argument missing: ${key}`);
        continue;
      }
      
      if (value !== undefined && value !== null) {
        // Type validation
        switch (config.type) {
          case 'string':
            if (typeof value !== 'string') {
              errors.push(`Argument '${key}' must be a string`);
            }
            break;
          case 'number':
            if (typeof value !== 'number' || isNaN(value)) {
              errors.push(`Argument '${key}' must be a number`);
            }
            break;
          case 'boolean':
            if (typeof value !== 'boolean') {
              errors.push(`Argument '${key}' must be a boolean`);
            }
            break;
        }
        
        // Custom validation
        if (config.validation?.custom && !config.validation.custom(value)) {
          errors.push(`Argument '${key}' failed custom validation`);
        }
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  /**
   * Update search indices
   */
  private updateIndices(manifest: ActionManifest): void {
    // Update category index
    if (!this.categories.has(manifest.category)) {
      this.categories.set(manifest.category, new Set());
    }
    this.categories.get(manifest.category)!.add(manifest.id);
    
    // Update group index
    if (manifest.group) {
      if (!this.groups.has(manifest.group)) {
        this.groups.set(manifest.group, new Set());
      }
      this.groups.get(manifest.group)!.add(manifest.id);
    }
  }
  
  /**
   * Remove from search indices
   */
  private removeFromIndices(manifest: ActionManifest): void {
    // Remove from category index
    const categorySet = this.categories.get(manifest.category);
    if (categorySet) {
      categorySet.delete(manifest.id);
      if (categorySet.size === 0) {
        this.categories.delete(manifest.category);
      }
    }
    
    // Remove from group index
    if (manifest.group) {
      const groupSet = this.groups.get(manifest.group);
      if (groupSet) {
        groupSet.delete(manifest.id);
        if (groupSet.size === 0) {
          this.groups.delete(manifest.group);
        }
      }
    }
  }
}

// Global registry instance
export const actionRegistry = new ActionRegistry();

// Convenience functions
export function registerAction(manifest: ActionManifest, handler?: ActionHandler): boolean {
  return actionRegistry.register(manifest, handler);
}

export function getAction(id: string): ActionRegistryEntry | undefined {
  return actionRegistry.get(id);
}

export function executeAction(id: string, args?: any, context?: ActionContext): Promise<ActionResult> {
  return actionRegistry.execute(id, args, context);
}

export function getActionsByCategory(category: string): ActionRegistryEntry[] {
  return actionRegistry.getByCategory(category);
}

export function searchActions(query: string): ActionRegistryEntry[] {
  return actionRegistry.search(query);
}

export function getAvailableActions(context: ActionContext): ActionRegistryEntry[] {
  return actionRegistry.getAvailableActions(context);
}