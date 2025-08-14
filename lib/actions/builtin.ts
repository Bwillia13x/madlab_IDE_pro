/**
 * Built-in actions for MAD LAB IDE
 */

import { ActionManifest, ActionContext, ActionResult } from './registry';

// Workspace Actions
const createNewSheet = async (args: { type: string; title?: string }, context?: ActionContext): Promise<ActionResult> => {
  try {
    if (!context?.workspaceStore) {
      return { success: false, error: 'Workspace store not available' };
    }
    
    const { type, title } = args;
    context.workspaceStore.addSheet(type, title);
    
    return {
      success: true,
      message: `Created new ${type} sheet${title ? ` "${title}"` : ''}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

const closeSheet = async (args: { sheetId?: string }, context?: ActionContext): Promise<ActionResult> => {
  try {
    if (!context?.workspaceStore) {
      return { success: false, error: 'Workspace store not available' };
    }
    
    const sheetId = args.sheetId || context.activeSheet;
    if (!sheetId) {
      return { success: false, error: 'No sheet to close' };
    }
    
    context.workspaceStore.closeSheet(sheetId);
    
    return {
      success: true,
      message: 'Sheet closed successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Widget Actions
const addWidget = async (args: { type: string; title?: string; props?: any }, context?: ActionContext): Promise<ActionResult> => {
  try {
    if (!context?.workspaceStore || !context?.activeSheet) {
      return { success: false, error: 'No active sheet' };
    }
    
    const { type, title, props } = args;
    const widget = {
      type,
      title: title || type.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      layout: { i: '', x: 0, y: 0, w: 6, h: 4 },
      props: props || {},
    };
    
    context.workspaceStore.addWidget(context.activeSheet, widget);
    
    return {
      success: true,
      message: `Added ${widget.title} widget`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

const duplicateWidget = async (args: { widgetId?: string }, context?: ActionContext): Promise<ActionResult> => {
  try {
    if (!context?.workspaceStore || !context?.activeSheet) {
      return { success: false, error: 'No active sheet' };
    }
    
    const widgetId = args.widgetId || context.selectedWidget;
    if (!widgetId) {
      return { success: false, error: 'No widget selected' };
    }
    
    context.workspaceStore.duplicateWidget(context.activeSheet, widgetId);
    
    return {
      success: true,
      message: 'Widget duplicated successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

const removeWidget = async (args: { widgetId?: string }, context?: ActionContext): Promise<ActionResult> => {
  try {
    if (!context?.workspaceStore || !context?.activeSheet) {
      return { success: false, error: 'No active sheet' };
    }
    
    const widgetId = args.widgetId || context.selectedWidget;
    if (!widgetId) {
      return { success: false, error: 'No widget selected' };
    }
    
    context.workspaceStore.removeWidget(context.activeSheet, widgetId);
    
    return {
      success: true,
      message: 'Widget removed successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Data Actions
const refreshData = async (args: { scope?: 'widget' | 'sheet' | 'workspace' }, context?: ActionContext): Promise<ActionResult> => {
  try {
    const scope = args.scope || 'widget';
    
    // Simulate data refresh
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      message: `Data refreshed for ${scope}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

const exportData = async (args: { format: 'json' | 'csv' | 'excel'; scope?: string }, context?: ActionContext): Promise<ActionResult> => {
  try {
    const { format, scope = 'sheet' } = args;
    
    // Simulate export
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      message: `Data exported as ${format.toUpperCase()}`,
      data: { format, scope, timestamp: new Date().toISOString() },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Built-in action manifests
export const builtinActions: ActionManifest[] = [
  // Workspace Actions
  {
    id: 'workspace.newSheet',
    label: 'New Sheet',
    description: 'Create a new worksheet',
    category: 'workspace',
    handler: createNewSheet,
    icon: 'plus',
    shortcut: ['Ctrl', 'N'],
    args: {
      type: {
        type: 'select',
        label: 'Sheet Type',
        required: true,
        options: [
          { value: 'valuation', label: 'Valuation' },
          { value: 'charting', label: 'Charting' },
          { value: 'risk', label: 'Risk Analysis' },
          { value: 'options', label: 'Options' },
          { value: 'blank', label: 'Blank' },
        ],
        default: 'blank',
      },
      title: {
        type: 'string',
        label: 'Sheet Title',
        description: 'Optional custom title for the sheet',
      },
    },
    group: 'sheet-management',
    order: 1,
    version: '1.0.0',
    tags: ['workspace', 'sheet', 'create'],
  },
  
  {
    id: 'workspace.closeSheet',
    label: 'Close Sheet',
    description: 'Close the current or specified sheet',
    category: 'workspace',
    handler: closeSheet,
    icon: 'x',
    shortcut: ['Ctrl', 'W'],
    enabledWhen: {
      hasActiveSheet: true,
    },
    args: {
      sheetId: {
        type: 'string',
        label: 'Sheet ID',
        description: 'ID of sheet to close (defaults to active sheet)',
      },
    },
    confirmation: {
      title: 'Close Sheet',
      message: 'Are you sure you want to close this sheet? Any unsaved changes will be lost.',
      destructive: true,
    },
    group: 'sheet-management',
    order: 2,
    version: '1.0.0',
    tags: ['workspace', 'sheet', 'close'],
  },
  
  // Widget Actions
  {
    id: 'widget.add',
    label: 'Add Widget',
    description: 'Add a new widget to the current sheet',
    category: 'widget',
    handler: addWidget,
    icon: 'plus-square',
    shortcut: ['Ctrl', 'Shift', 'W'],
    enabledWhen: {
      hasActiveSheet: true,
    },
    args: {
      type: {
        type: 'select',
        label: 'Widget Type',
        required: true,
        options: [
          { value: 'kpi-card', label: 'KPI Card' },
          { value: 'line-chart', label: 'Line Chart' },
          { value: 'vol-cone', label: 'Volatility Cone' },
          { value: 'var-es', label: 'VaR & ES' },
          { value: 'data-table', label: 'Data Table' },
        ],
        default: 'kpi-card',
      },
      title: {
        type: 'string',
        label: 'Widget Title',
        description: 'Optional custom title for the widget',
      },
    },
    group: 'widget-management',
    order: 1,
    version: '1.0.0',
    tags: ['widget', 'create', 'add'],
  },
  
  {
    id: 'widget.duplicate',
    label: 'Duplicate Widget',
    description: 'Create a copy of the selected widget',
    category: 'widget',
    handler: duplicateWidget,
    icon: 'copy',
    shortcut: ['Ctrl', 'D'],
    enabledWhen: {
      hasSelectedWidget: true,
    },
    args: {
      widgetId: {
        type: 'string',
        label: 'Widget ID',
        description: 'ID of widget to duplicate (defaults to selected widget)',
      },
    },
    group: 'widget-management',
    order: 2,
    version: '1.0.0',
    tags: ['widget', 'duplicate', 'copy'],
  },
  
  {
    id: 'widget.remove',
    label: 'Remove Widget',
    description: 'Remove the selected widget from the sheet',
    category: 'widget',
    handler: removeWidget,
    icon: 'trash',
    shortcut: ['Delete'],
    enabledWhen: {
      hasSelectedWidget: true,
    },
    args: {
      widgetId: {
        type: 'string',
        label: 'Widget ID',
        description: 'ID of widget to remove (defaults to selected widget)',
      },
    },
    confirmation: {
      title: 'Remove Widget',
      message: 'Are you sure you want to remove this widget?',
      destructive: true,
    },
    group: 'widget-management',
    order: 3,
    version: '1.0.0',
    tags: ['widget', 'remove', 'delete'],
  },
  
  // Data Actions
  {
    id: 'data.refresh',
    label: 'Refresh Data',
    description: 'Refresh data for the current widget, sheet, or workspace',
    category: 'data',
    handler: refreshData,
    icon: 'refresh-cw',
    shortcut: ['F5'],
    args: {
      scope: {
        type: 'select',
        label: 'Refresh Scope',
        options: [
          { value: 'widget', label: 'Current Widget' },
          { value: 'sheet', label: 'Current Sheet' },
          { value: 'workspace', label: 'Entire Workspace' },
        ],
        default: 'widget',
      },
    },
    group: 'data-operations',
    order: 1,
    version: '1.0.0',
    tags: ['data', 'refresh', 'reload'],
  },
  
  {
    id: 'data.export',
    label: 'Export Data',
    description: 'Export data in various formats',
    category: 'data',
    handler: exportData,
    icon: 'download',
    shortcut: ['Ctrl', 'E'],
    args: {
      format: {
        type: 'select',
        label: 'Export Format',
        required: true,
        options: [
          { value: 'json', label: 'JSON' },
          { value: 'csv', label: 'CSV' },
          { value: 'excel', label: 'Excel' },
        ],
        default: 'json',
      },
      scope: {
        type: 'select',
        label: 'Export Scope',
        options: [
          { value: 'widget', label: 'Current Widget' },
          { value: 'sheet', label: 'Current Sheet' },
          { value: 'workspace', label: 'Entire Workspace' },
        ],
        default: 'sheet',
      },
    },
    group: 'data-operations',
    order: 2,
    version: '1.0.0',
    tags: ['data', 'export', 'save'],
  },
  
  // View Actions
  {
    id: 'view.toggleSidebar',
    label: 'Toggle Sidebar',
    description: 'Show or hide the sidebar',
    category: 'view',
    handler: async () => {
      // This would integrate with UI state management
      return { success: true, message: 'Sidebar toggled' };
    },
    icon: 'sidebar',
    shortcut: ['Ctrl', 'B'],
    group: 'layout',
    order: 1,
    version: '1.0.0',
    tags: ['view', 'sidebar', 'layout'],
  },
  
  {
    id: 'view.fullscreen',
    label: 'Toggle Fullscreen',
    description: 'Enter or exit fullscreen mode',
    category: 'view',
    handler: async () => {
      // This would integrate with the browser fullscreen API
      return { success: true, message: 'Fullscreen toggled' };
    },
    icon: 'maximize',
    shortcut: ['F11'],
    group: 'layout',
    order: 2,
    version: '1.0.0',
    tags: ['view', 'fullscreen', 'layout'],
  },
  
  // System Actions
  {
    id: 'system.showHelp',
    label: 'Show Help',
    description: 'Open the help documentation',
    category: 'system',
    handler: async () => {
      return { success: true, message: 'Help opened' };
    },
    icon: 'help-circle',
    shortcut: ['F1'],
    group: 'help',
    order: 1,
    version: '1.0.0',
    tags: ['system', 'help', 'documentation'],
  },
  
  {
    id: 'system.showAbout',
    label: 'About MAD LAB',
    description: 'Show information about the application',
    category: 'system',
    handler: async () => {
      return {
        success: true,
        message: 'About dialog shown',
        data: { version: '1.0.0', author: 'MAD LAB Team' },
      };
    },
    icon: 'info',
    group: 'help',
    order: 2,
    version: '1.0.0',
    tags: ['system', 'about', 'info'],
  },
];