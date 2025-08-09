import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Layout } from 'react-grid-layout';

export type SheetKind = 'valuation' | 'charting' | 'risk' | 'options' | 'blank';

export interface Widget {
  id: string;
  type: string;
  title: string;
  layout: Layout;
  props?: Record<string, unknown>;
}

export interface Sheet {
  id: string;
  kind: SheetKind;
  title: string;
  widgets: Widget[];
}

export interface Message {
  id: string;
  content: string;
  timestamp: Date;
  sender: 'user' | 'agent';
}

interface WorkspaceState {
  sheets: Sheet[];
  activeSheetId?: string;
  messages: Message[];
  theme: 'light' | 'dark';
  explorerCollapsed: boolean;
  chatCollapsed: boolean;
  bottomPanelHeight: number;
  bottomPanelCollapsed: boolean;
  activeBottomTab: string;
  // Selection
  selectedWidgetId?: string;
}

interface WorkspaceActions {
  // Sheet management
  addSheet: (kind: SheetKind, title?: string) => void;
  closeSheet: (id: string) => void;
  setActiveSheet: (id: string) => void;
  updateSheetTitle: (id: string, title: string) => void;
  
  // Widget management
  addWidget: (sheetId: string, widget: Omit<Widget, 'id'>) => void;
  updateWidget: (sheetId: string, widget: Partial<Widget> & { id: string }) => void;
  removeWidget: (sheetId: string, widgetId: string) => void;
  updateLayout: (sheetId: string, layout: Layout[]) => void;
  
  // Chat management
  addMessage: (content: string, sender: 'user' | 'agent') => void;
  clearMessages: () => void;
  
  // UI state
  setTheme: (theme: 'light' | 'dark') => void;
  toggleExplorer: () => void;
  toggleChat: () => void;
  setBottomPanelHeight: (height: number) => void;
  toggleBottomPanel: () => void;
  setActiveBottomTab: (tab: string) => void;
  
  // Persistence
  persist: () => void;
  hydrate: () => void;

  // Selection
  setSelectedWidget: (id?: string) => void;
}

type WorkspaceStore = WorkspaceState & WorkspaceActions;

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      // Initial state
      sheets: [],
      activeSheetId: undefined,
      messages: [
        {
          id: '1',
          content: 'Welcome to MAD LAB! I\'m your AI assistant for financial analysis. How can I help you today?',
          timestamp: new Date(),
          sender: 'agent'
        }
      ],
      theme: 'dark',
      explorerCollapsed: false,
      chatCollapsed: false,
      bottomPanelHeight: 200,
      bottomPanelCollapsed: false,
      activeBottomTab: 'output',
  selectedWidgetId: undefined,

  // Selection
  setSelectedWidget: (id) => set({ selectedWidgetId: id }),

      // Sheet actions
      addSheet: (kind: SheetKind, title?: string) => {
        const id = `sheet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const defaultTitle = title || `${kind.charAt(0).toUpperCase() + kind.slice(1)} Sheet`;
        
        const newSheet: Sheet = {
          id,
          kind,
          title: defaultTitle,
          widgets: []
        };

        set((state) => ({
          sheets: [...state.sheets, newSheet],
          activeSheetId: id
        }));

        // Auto-populate with preset widgets
        if (kind !== 'blank') {
          get().populateSheetWithPreset(id, kind);
        }
      },

      closeSheet: (id: string) => {
        set((state) => {
          const sheets = state.sheets.filter(s => s.id !== id);
          const activeSheetId = state.activeSheetId === id 
            ? sheets[sheets.length - 1]?.id 
            : state.activeSheetId;
          
          return { sheets, activeSheetId };
        });
      },

      setActiveSheet: (id: string) => {
        set({ activeSheetId: id });
      },

      updateSheetTitle: (id: string, title: string) => {
        set((state) => ({
          sheets: state.sheets.map(sheet =>
            sheet.id === id ? { ...sheet, title } : sheet
          )
        }));
      },

      // Widget actions
      addWidget: (sheetId: string, widget: Omit<Widget, 'id'>) => {
        const id = `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newWidget: Widget = { ...widget, id };

        set((state) => ({
          sheets: state.sheets.map(sheet =>
            sheet.id === sheetId
              ? { ...sheet, widgets: [...sheet.widgets, newWidget] }
              : sheet
          )
        }));
      },

      updateWidget: (sheetId: string, widget: Partial<Widget> & { id: string }) => {
        set((state) => ({
          sheets: state.sheets.map(sheet =>
            sheet.id === sheetId
              ? {
                  ...sheet,
                  widgets: sheet.widgets.map(w =>
                    w.id === widget.id ? { ...w, ...widget } : w
                  )
                }
              : sheet
          )
        }));
      },

      removeWidget: (sheetId: string, widgetId: string) => {
        set((state) => ({
          sheets: state.sheets.map(sheet =>
            sheet.id === sheetId
              ? { ...sheet, widgets: sheet.widgets.filter(w => w.id !== widgetId) }
              : sheet
          )
        }));
      },

      updateLayout: (sheetId: string, layout: Layout[]) => {
        set((state) => ({
          sheets: state.sheets.map(sheet =>
            sheet.id === sheetId
              ? {
                  ...sheet,
                  widgets: sheet.widgets.map(widget => ({
                    ...widget,
                    layout: layout.find(l => l.i === widget.id) || widget.layout
                  }))
                }
              : sheet
          )
        }));
      },

      // Chat actions
      addMessage: (content: string, sender: 'user' | 'agent') => {
        const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const message: Message = {
          id,
          content,
          timestamp: new Date(),
          sender
        };

        set((state) => ({
          messages: [...state.messages, message]
        }));
      },

      clearMessages: () => {
        set({ messages: [] });
      },

      // UI actions
      setTheme: (theme: 'light' | 'dark') => {
        set({ theme });
      },

      toggleExplorer: () => {
        set((state) => ({ explorerCollapsed: !state.explorerCollapsed }));
      },

      toggleChat: () => {
        set((state) => ({ chatCollapsed: !state.chatCollapsed }));
      },

      setBottomPanelHeight: (height: number) => {
        set({ bottomPanelHeight: height });
      },

      toggleBottomPanel: () => {
        set((state) => ({ bottomPanelCollapsed: !state.bottomPanelCollapsed }));
      },

      setActiveBottomTab: (tab: string) => {
        set({ activeBottomTab: tab });
      },

      // Utility methods
      populateSheetWithPreset: (sheetId: string, kind: SheetKind) => {
        const presets = get().getPresetWidgets(kind);
        presets.forEach(widget => {
          get().addWidget(sheetId, widget);
        });
      },

      getPresetWidgets: (kind: SheetKind): Omit<Widget, 'id'>[] => {
        const presets = {
          valuation: [
            {
              type: 'kpi-card',
              title: 'KPI',
              layout: { i: '', x: 0, y: 0, w: 6, h: 4 }
            },
            {
              type: 'dcf-basic',
              title: 'DCF (Basic)',
              layout: { i: '', x: 6, y: 0, w: 6, h: 4 }
            },
            {
              type: 'bar-chart',
              title: 'Peer Multiples',
              layout: { i: '', x: 0, y: 4, w: 6, h: 4 }
            },
            {
              type: 'heatmap',
              title: 'Sensitivity (WACC x g)',
              layout: { i: '', x: 6, y: 4, w: 6, h: 4 }
            }
          ],
          charting: [
            {
              type: 'line-chart',
              title: 'Price Line',
              layout: { i: '', x: 0, y: 0, w: 6, h: 4 }
            },
            {
              type: 'bar-chart',
              title: 'Bar Chart',
              layout: { i: '', x: 6, y: 0, w: 6, h: 4 }
            },
            {
              type: 'heatmap',
              title: 'Heatmap',
              layout: { i: '', x: 0, y: 4, w: 6, h: 4 }
            },
            {
              type: 'line-chart',
              title: 'Volume',
              layout: { i: '', x: 6, y: 4, w: 6, h: 4 }
            }
          ],
          risk: [
            {
              type: 'var-es',
              title: 'VaR/ES',
              layout: { i: '', x: 0, y: 0, w: 6, h: 4 }
            },
            {
              type: 'stress-scenarios',
              title: 'Stress Scenarios',
              layout: { i: '', x: 6, y: 0, w: 6, h: 4 }
            },
            {
              type: 'factor-exposures',
              title: 'Factor Exposures',
              layout: { i: '', x: 0, y: 4, w: 6, h: 4 }
            },
            {
              type: 'correlation-matrix',
              title: 'Correlation Matrix',
              layout: { i: '', x: 6, y: 4, w: 6, h: 4 }
            }
          ],
          options: [
            {
              type: 'greeks-surface',
              title: 'Greeks Surface',
              layout: { i: '', x: 0, y: 0, w: 6, h: 4 }
            },
            {
              type: 'vol-cone',
              title: 'Vol Cone',
              layout: { i: '', x: 6, y: 0, w: 6, h: 4 }
            },
            {
              type: 'strategy-builder',
              title: 'Strategy Builder',
              layout: { i: '', x: 0, y: 4, w: 6, h: 4 }
            },
            {
              type: 'pnl-profile',
              title: 'P&L Profile',
              layout: { i: '', x: 6, y: 4, w: 6, h: 4 }
            }
          ],
          blank: [
            {
              type: 'blank-tile',
              title: 'Click to configure',
              layout: { i: '', x: 0, y: 0, w: 12, h: 8 }
            }
          ]
        };

        return presets[kind] || [];
      },

      // Persistence methods
      persist: () => {
        // Auto-persisted by zustand persist middleware
      },

      hydrate: () => {
        // Auto-hydrated by zustand persist middleware
      },
    }),
    {
      name: 'madlab-workspace',
  // allow auto hydration for persisted state
    }
  )
);