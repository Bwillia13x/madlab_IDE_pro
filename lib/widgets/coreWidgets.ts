import { registerWidget } from './registry';
import { defaultWidgetSchemas } from './schema';

let coreWidgetsRegistered = false;

export function registerCoreWidgets(): void {
  if (coreWidgetsRegistered) {
    return; // Already registered
  }

  // Register all default widget schemas
  Object.values(defaultWidgetSchemas).forEach(schema => {
    registerWidget(schema);
  });

  coreWidgetsRegistered = true;
}

export function getCoreWidgetTypes(): string[] {
  return Object.keys(defaultWidgetSchemas);
}

export function isCoreWidget(type: string): boolean {
  return type in defaultWidgetSchemas;
}

// Auto-register core widgets when this module is imported
registerCoreWidgets();