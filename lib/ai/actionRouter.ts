import { useWorkspaceStore } from '../store';
import { getWidgetSchema } from '../widgets/registry';
import { SHEET_PRESETS } from '../presets';

export interface ActionRequest {
  action: string;
  params: Record<string, unknown>;
  context?: {
    currentSheetId?: string;
    globalSymbol?: string;
    globalTimeframe?: string;
  };
}

export interface ActionResponse {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

export interface ActionDefinition {
  name: string;
  description: string;
  parameters: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'select';
    required: boolean;
    description: string;
    options?: string[];
  }[];
  execute: (params: Record<string, unknown>, context?: ActionRequest['context']) => Promise<ActionResponse>;
}

export class ActionRouter {
  private actions: Map<string, ActionDefinition> = new Map();

  constructor() {
    this.registerDefaultActions();
  }

  private registerDefaultActions(): void {
    // Add Widget Action
    this.registerAction({
      name: 'add_widget',
      description: 'Add a new widget to the current sheet',
      parameters: [
        {
          name: 'widgetType',
          type: 'select',
          required: true,
          description: 'Type of widget to add',
          options: this.getAvailableWidgetTypes()
        },
        {
          name: 'title',
          type: 'string',
          required: false,
          description: 'Custom title for the widget'
        },
        {
          name: 'x',
          type: 'number',
          required: false,
          description: 'X position on the grid (0-11)'
        },
        {
          name: 'y',
          type: 'number',
          required: false,
          description: 'Y position on the grid'
        },
        {
          name: 'w',
          type: 'number',
          required: false,
          description: 'Width of the widget (1-12)'
        },
        {
          name: 'h',
          type: 'number',
          required: false,
          description: 'Height of the widget'
        }
      ],
      execute: async (params, context) => {
        try {
          const store = useWorkspaceStore.getState();
          const { widgetType, title, x = 0, y = 0, w = 6, h = 4 } = params;
          
          if (!context?.currentSheetId) {
            return {
              success: false,
              message: 'No active sheet found',
              error: 'No active sheet context'
            };
          }

          const widgetSchema = getWidgetSchema(widgetType as string);
          if (!widgetSchema) {
            return {
              success: false,
              message: `Unknown widget type: ${widgetType}`,
              error: 'Invalid widget type'
            };
          }

          const widgetTitle = (typeof title === 'string' ? title : null) || widgetSchema.title || widgetSchema.type;
          
          store.addWidget(context.currentSheetId, {
            type: widgetType as string,
            title: widgetTitle || widgetSchema.title || 'New Widget',
            description: widgetSchema.description,
            category: widgetSchema.category,
            layout: { i: '', x: Number(x) || 0, y: Number(y) || 0, w: Number(w) || 4, h: Number(h) || 4 },
            props: {}
          });

          return {
            success: true,
            message: `Successfully added ${widgetTitle} widget to the sheet`,
            data: { widgetType, title: widgetTitle }
          };
        } catch (error) {
          return {
            success: false,
            message: 'Failed to add widget',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    });

    // Switch Preset Action
    this.registerAction({
      name: 'switch_preset',
      description: 'Switch the current sheet to use a different preset layout',
      parameters: [
        {
          name: 'presetType',
          type: 'select',
          required: true,
          description: 'Type of preset to switch to',
          options: Object.keys(SHEET_PRESETS)
        }
      ],
      execute: async (params, context) => {
        try {
          const store = useWorkspaceStore.getState();
          const { presetType } = params;
          
          if (!context?.currentSheetId) {
            return {
              success: false,
              message: 'No active sheet found',
              error: 'No active sheet context'
            };
          }

          const preset = SHEET_PRESETS[presetType as keyof typeof SHEET_PRESETS];
          if (!preset) {
            return {
              success: false,
              message: `Unknown preset type: ${presetType}`,
              error: 'Invalid preset type'
            };
          }

          // Update the sheet kind and populate with preset widgets
          store.populateSheetWithPreset(context.currentSheetId, presetType as any);

          return {
            success: true,
            message: `Successfully switched to ${preset.label} preset`,
            data: { presetType, presetLabel: preset.label }
          };
        } catch (error) {
          return {
            success: false,
            message: 'Failed to switch preset',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    });

    // Set Global Symbol Action
    this.registerAction({
      name: 'set_global_symbol',
      description: 'Set the global symbol context for all widgets',
      parameters: [
        {
          name: 'symbol',
          type: 'string',
          required: true,
          description: 'Stock symbol to set globally (e.g., AAPL, MSFT)'
        }
      ],
      execute: async (params, context) => {
        try {
          const store = useWorkspaceStore.getState();
          const { symbol } = params;
          
          if (!symbol || typeof symbol !== 'string') {
            return {
              success: false,
              message: 'Invalid symbol provided',
              error: 'Symbol must be a non-empty string'
            };
          }

          store.setGlobalSymbol(symbol.toUpperCase());
          
          // Apply to current sheet if available
          if (context?.currentSheetId) {
            store.applyGlobalSymbolToAllWidgets(context.currentSheetId);
          }

          return {
            success: true,
            message: `Global symbol set to ${symbol.toUpperCase()}`,
            data: { symbol: symbol.toUpperCase() }
          };
        } catch (error) {
          return {
            success: false,
            message: 'Failed to set global symbol',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    });

    // Create New Sheet Action
    this.registerAction({
      name: 'create_sheet',
      description: 'Create a new sheet with specified type',
      parameters: [
        {
          name: 'sheetType',
          type: 'select',
          required: true,
          description: 'Type of sheet to create',
          options: Object.keys(SHEET_PRESETS)
        },
        {
          name: 'title',
          type: 'string',
          required: false,
          description: 'Custom title for the sheet'
        }
      ],
      execute: async (params, context) => {
        try {
          const store = useWorkspaceStore.getState();
          const { sheetType, title } = params;
          
          const preset = SHEET_PRESETS[sheetType as keyof typeof SHEET_PRESETS];
          if (!preset) {
            return {
              success: false,
              message: `Unknown sheet type: ${sheetType}`,
              error: 'Invalid sheet type'
            };
          }

          const sheetTitle = (typeof title === 'string' ? title : null) || preset.label;
          store.addSheet(sheetType as 'valuation' | 'charting' | 'screening' | 'portfolio' | 'risk' | 'options' | 'blank', sheetTitle);
          
          // Set as active sheet
          const newSheet = store.sheets.find(s => s.title === sheetTitle);
          if (newSheet) {
            store.setActiveSheet(newSheet.id);
          }

          return {
            success: true,
            message: `Successfully created new ${sheetTitle} sheet`,
            data: { sheetType, title: sheetTitle }
          };
        } catch (error) {
          return {
            success: false,
            message: 'Failed to create sheet',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    });

    // Explain Chart Action
    this.registerAction({
      name: 'explain_chart',
      description: 'Get explanation of what a chart or widget shows',
      parameters: [
        {
          name: 'widgetType',
          type: 'select',
          required: true,
          description: 'Type of widget to explain',
          options: this.getAvailableWidgetTypes()
        }
      ],
      execute: async (params, context) => {
        try {
          const { widgetType } = params;
          
          const widgetSchema = getWidgetSchema(widgetType as string);
          if (!widgetSchema) {
            return {
              success: false,
              message: `Unknown widget type: ${widgetType}`,
              error: 'Invalid widget type'
            };
          }

          const explanation = this.generateWidgetExplanation(widgetSchema);
          
          return {
            success: true,
            message: explanation,
            data: { widgetType, explanation }
          };
        } catch (error) {
          return {
            success: false,
            message: 'Failed to explain widget',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    });
  }

  private getAvailableWidgetTypes(): string[] {
    // Get available widget types from registry
    const { getAvailableWidgetTypes } = require('@/lib/widgets/registry');
    return getAvailableWidgetTypes();
  }

  private generateWidgetExplanation(widgetSchema: any): string {
    const descriptions: Record<string, string> = {
      'kpi-card': 'KPI cards display key performance indicators like P/E ratio, market cap, and other financial metrics for a stock.',
      'line-chart': 'Line charts show price movements over time, useful for trend analysis and technical analysis.',
      'candlestick-chart': 'Candlestick charts display open, high, low, and close prices with visual patterns for technical analysis.',
      'portfolio-tracker': 'Portfolio tracker monitors your investment positions, P&L, and portfolio performance over time.',
      'options-dashboard': 'Options dashboard shows options chains, Greeks, and options trading strategies.',
      'watchlist': 'Watchlist displays a list of stocks you want to monitor with real-time price updates.',
      'market-overview': 'Market overview provides a broad view of market indices, sectors, and overall market sentiment.',
      'backtesting-framework': 'Backtesting framework allows you to test trading strategies against historical data.',
      'dcf-basic': 'DCF (Discounted Cash Flow) model calculates the intrinsic value of a stock based on future cash flows.',
      'technical-indicators': 'Technical indicators show various technical analysis tools like RSI, MACD, moving averages, etc.'
    };

    return descriptions[widgetSchema.type] || 
           `This ${widgetSchema.type} widget ${widgetSchema.description || 'provides financial analysis and data visualization.'}`;
  }

  public registerAction(action: ActionDefinition): void {
    this.actions.set(action.name, action);
  }

  public getAction(name: string): ActionDefinition | undefined {
    return this.actions.get(name);
  }

  public getAvailableActions(): ActionDefinition[] {
    return Array.from(this.actions.values());
  }

  public async executeAction(actionName: string, params: Record<string, unknown>, context?: ActionRequest['context']): Promise<ActionResponse> {
    const action = this.actions.get(actionName);
    
    if (!action) {
      return {
        success: false,
        message: `Unknown action: ${actionName}`,
        error: 'Action not found'
      };
    }

    try {
      return await action.execute(params, context);
    } catch (error) {
      return {
        success: false,
        message: `Failed to execute action: ${actionName}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  public async parseAndExecute(query: string, context?: ActionRequest['context']): Promise<ActionResponse> {
    // Simple natural language parsing for common action patterns
    const lowerQuery = query.toLowerCase();
    
    // Add widget patterns
    if (lowerQuery.includes('add') && lowerQuery.includes('widget')) {
      const widgetMatch = lowerQuery.match(/add\s+(?:a\s+)?(?:new\s+)?(\w+(?:-\w+)*)\s+widget/i);
      if (widgetMatch) {
        return this.executeAction('add_widget', { widgetType: widgetMatch[1] }, context);
      }
    }
    
    // Switch preset patterns
    if (lowerQuery.includes('switch') || lowerQuery.includes('change') || lowerQuery.includes('use')) {
      const presetMatch = lowerQuery.match(/(?:switch\s+to|change\s+to|use\s+)(\w+)\s+(?:preset|layout|template)/i);
      if (presetMatch) {
        return this.executeAction('switch_preset', { presetType: presetMatch[1] }, context);
      }
    }
    
    // Set symbol patterns
    if (lowerQuery.includes('symbol') || lowerQuery.includes('stock') || lowerQuery.includes('ticker')) {
      const symbolMatch = lowerQuery.match(/(?:set|use|show|analyze)\s+(\w{1,5})/i);
      if (symbolMatch) {
        return this.executeAction('set_global_symbol', { symbol: symbolMatch[1] }, context);
      }
    }
    
    // Create sheet patterns
    if (lowerQuery.includes('create') || lowerQuery.includes('new') || lowerQuery.includes('make')) {
      const sheetMatch = lowerQuery.match(/(?:create|make|new)\s+(\w+)\s+(?:sheet|workbench|dashboard)/i);
      if (sheetMatch) {
        return this.executeAction('create_sheet', { sheetType: sheetMatch[1] }, context);
      }
    }
    
    // Explain patterns
    if (lowerQuery.includes('explain') || lowerQuery.includes('what') || lowerQuery.includes('show me')) {
      const widgetMatch = lowerQuery.match(/(?:explain|what|show me)\s+(?:the\s+)?(\w+(?:-\w+)*)/i);
      if (widgetMatch) {
        return this.executeAction('explain_chart', { widgetType: widgetMatch[1] }, context);
      }
    }
    
    return {
      success: false,
      message: "I couldn't understand what action you want me to perform. Try saying things like 'add a candlestick-chart widget' or 'switch to portfolio preset'.",
      error: 'No action pattern matched'
    };
  }
}

// Export singleton instance
export const actionRouter = new ActionRouter();
