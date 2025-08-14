/**
 * Widget Registry System for MAD LAB IDE (Schema-based only)
 */

import React, { lazy } from 'react';
import { z } from 'zod';
import { WidgetDefinition, WidgetMeta, WidgetProps } from './schema';

// New schema-based widget registry
export interface WidgetRegistryEntryV2 {
  definition: WidgetDefinition;
  isLoaded: boolean;
  loadError?: string;
}

class SchemaWidgetRegistry {
  private widgets = new Map<string, WidgetRegistryEntryV2>();
  private categories = new Map<string, Set<string>>();
  private tags = new Map<string, Set<string>>();
  private instanceCleanup = new Map<string, (id: string) => void>();
  
  /**
   * Register a widget using the new schema-based definition
   */
  registerWidget(definition: WidgetDefinition): boolean {
    try {
      // Validate the widget definition
      if (!this.validateDefinition(definition)) {
        console.error(`Invalid widget definition for: ${definition.meta.type}`);
        return false;
      }
      
      // Check for conflicts
      if (this.widgets.has(definition.meta.type)) {
        console.warn(`Widget type '${definition.meta.type}' is already registered. Overwriting.`);
      }
      
      const entry: WidgetRegistryEntryV2 = {
        definition,
        isLoaded: true, // Assume loaded if we have the definition
      };
      
      this.widgets.set(definition.meta.type, entry);
      this.updateIndices(definition.meta);
      
      console.log(`Registered widget: ${definition.meta.type} (${definition.meta.name})`);
      return true;
    } catch (error) {
      console.error(`Failed to register widget ${definition.meta.type}:`, error);
      return false;
    }
  }
  
  /**
   * Get a widget definition by type
   */
  getWidget(type: string): WidgetRegistryEntryV2 | undefined {
    return this.widgets.get(type);
  }
  
  /**
   * Get all registered widgets
   */
  getAllWidgets(): WidgetRegistryEntryV2[] {
    return Array.from(this.widgets.values());
  }
  
  /**
   * Get widgets by category
   */
  getWidgetsByCategory(category: string): WidgetRegistryEntryV2[] {
    const types = this.categories.get(category) || new Set();
    return Array.from(types)
      .map(type => this.widgets.get(type))
      .filter((entry): entry is WidgetRegistryEntryV2 => !!entry);
  }
  
  /**
   * Search widgets by name, description, or tags
   */
  searchWidgets(query: string): WidgetRegistryEntryV2[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllWidgets().filter(entry => {
      const { meta } = entry.definition;
      return (
        meta.name.toLowerCase().includes(lowerQuery) ||
        meta.description.toLowerCase().includes(lowerQuery) ||
        meta.type.toLowerCase().includes(lowerQuery) ||
        (meta.tags && meta.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
      );
    });
  }
  
  /**
   * Validate configuration using widget's schema
   */
  validateConfig(type: string, config: any): { valid: boolean; errors?: z.ZodError; data?: any } {
    const entry = this.widgets.get(type);
    if (!entry) {
      return { valid: false, errors: new z.ZodError([{ 
        code: 'custom', 
        message: `Widget type '${type}' not found`,
        path: []
      }]) };
    }
    
    try {
      const result = entry.definition.meta.configSchema.parse(config);
      return { valid: true, data: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { valid: false, errors: error };
      }
      return { valid: false, errors: new z.ZodError([{ 
        code: 'custom', 
        message: error instanceof Error ? error.message : 'Unknown validation error',
        path: []
      }]) };
    }
  }
  
  /**
   * Get default configuration for a widget type
   */
  getDefaultConfig(type: string): any | null {
    const entry = this.widgets.get(type);
    return entry ? entry.definition.meta.defaultConfig : null;
  }
  
  /**
   * Create a widget instance with validated configuration
   */
  createWidget(type: string, props: Partial<WidgetProps>): React.ReactElement | null {
    const entry = this.widgets.get(type);
    if (!entry) {
      console.error(`Widget type '${type}' not found`);
      return null;
    }
    
    const { component: Component } = entry.definition.runtime;
    const config = props.config || entry.definition.meta.defaultConfig;
    
    // Validate configuration
    const validation = this.validateConfig(type, config);
    if (!validation.valid) {
      console.error(`Invalid configuration for widget '${type}':`, validation.errors);
      return null;
    }
    
    const widgetProps: WidgetProps = {
      id: props.id || `widget-${Date.now()}`,
      config: validation.data,
      ...props,
    };
    // Register optional onUnmount cleanup for this instance
    if (entry.definition.runtime.hooks?.onUnmount) {
      this.instanceCleanup.set(widgetProps.id, (id: string) => {
        try { entry.definition.runtime.hooks?.onUnmount?.(id, widgetProps.config) } catch {}
      })
    }
    return React.createElement(Component, widgetProps);
  }

  /**
   * Invoke cleanup if widget instance has registered onUnmount hook
   */
  cleanupInstance(id: string) {
    const fn = this.instanceCleanup.get(id)
    if (fn) {
      try { fn(id) } catch {}
      this.instanceCleanup.delete(id)
    }
  }
  
  private validateDefinition(definition: WidgetDefinition): boolean {
    const { meta, runtime } = definition;
    
    // Validate meta
    if (!meta.type || typeof meta.type !== 'string') {
      console.error('Widget meta must have a valid type');
      return false;
    }
    
    if (!meta.name || typeof meta.name !== 'string') {
      console.error('Widget meta must have a valid name');
      return false;
    }
    
    // Soft-validate semantic version presence without breaking existing widgets
    if (!meta.version || typeof meta.version !== 'string') {
      console.warn(`Widget '${meta.type}' is missing a semantic version string on meta.version`);
    }
    
    if (!meta.configSchema) {
      console.error('Widget meta must have a configSchema');
      return false;
    }
    
    // Validate runtime
    if (!runtime.component) {
      console.error('Widget runtime must have a component');
      return false;
    }
    
    return true;
  }
  
  private updateIndices(meta: WidgetMeta): void {
    // Update category index
    if (!this.categories.has(meta.category)) {
      this.categories.set(meta.category, new Set());
    }
    this.categories.get(meta.category)!.add(meta.type);
    
    // Update tag index
    if (meta.tags) {
      for (const tag of meta.tags) {
        if (!this.tags.has(tag)) {
          this.tags.set(tag, new Set());
        }
        this.tags.get(tag)!.add(meta.type);
      }
    }
  }
}

// Global schema-based registry instance
export const schemaWidgetRegistry = new SchemaWidgetRegistry();

// Convenience functions for the new registry
export function registerSchemaWidget(definition: WidgetDefinition): boolean {
  return schemaWidgetRegistry.registerWidget(definition);
}

export function getSchemaWidget(type: string): WidgetRegistryEntryV2 | undefined {
  return schemaWidgetRegistry.getWidget(type);
}

export function validateWidgetConfig(type: string, config: any) {
  return schemaWidgetRegistry.validateConfig(type, config);
}

export function createWidgetInstance(type: string, props: Partial<WidgetProps>): React.ReactElement | null {
  return schemaWidgetRegistry.createWidget(type, props);
}

// Performance: lazy helper for heavy widgets by conventional filename
export function getLazyWidget(kind: string) {
  return lazy(() => import(`@/components/widgets/${kind}.tsx`));
}
