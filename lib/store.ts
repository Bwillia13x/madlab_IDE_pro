import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Layout } from 'react-grid-layout';
import { SHEET_PRESETS } from './presets';
import { exportWorkspaceJson } from './io/export';
import { coerceToWorkspaceState, parseWorkspaceImport } from './io/import';
import { getSchemaWidget } from './widgets/registry';
import { workspaceSync } from './collaboration/workspaceSync';

export type SheetKind = 'valuation' | 'charting' | 'screening' | 'portfolio' | 'risk' | 'options' | 'blank';

export interface Widget {
  id: string;
  type: string;
  title: string;
  description?: string;
  category?: string;
  layout: Layout;
  props?: Record<string, unknown>;
  version?: number;
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

// Re-exported for type safety across modules
export interface PaperPosition {
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  averagePrice: number;
  marketPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
  lots: { quantity: number; price: number }[];
}

export interface WorkspaceState {
  sheets: Sheet[];
  activeSheetId?: string;
  messages: Message[];
  theme: 'light' | 'dark' | 'malibu-sunrise' | 'malibu-sunset';
  explorerCollapsed: boolean;
  explorerWidth: number;
  chatCollapsed: boolean;
  bottomPanelHeight: number;
  bottomPanelCollapsed: boolean;
  activeBottomTab: string;
  // Selection
  selectedWidgetId?: string;
  // Inspector panel
  inspectorOpen: boolean;
  // Schema version for persisted state
  schemaVersion: number;
  // Preset version for tracking preset evolution
  presetVersion: number;
  // Data provider selection
  dataProvider: string;
  // Settings panel state
  settingsOpen: boolean;
  // Global symbol context (Phase 1)
  globalSymbol: string;
  // Global timeframe for price series
  globalTimeframe: import('./data/provider.types').PriceRange;
  // Experience mode (Phase 2)
  experienceMode: 'beginner' | 'expert';
  // Undo/Redo stacks for layout operations per sheet
  _undoStack?: Record<string, Layout[][]>;
  _redoStack?: Record<string, Layout[][]>;
  // Paper trading (lightweight persisted state)
  paperTrading: {
    cash: number;
    positions: Record<string, PaperPosition>;
  };
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
  duplicateWidget: (sheetId: string, widgetId: string) => void;
  // Undo/Redo
  undoLayout: (sheetId: string) => void;
  redoLayout: (sheetId: string) => void;

  // Chat management
  addMessage: (content: string, sender: 'user' | 'agent') => void;
  clearMessages: () => void;

  // UI state
  setTheme: (theme: 'light' | 'dark' | 'malibu-sunrise' | 'malibu-sunset') => void;
  toggleExplorer: () => void;
  toggleChat: () => void;
  setBottomPanelHeight: (height: number) => void;
  toggleBottomPanel: () => void;
  setActiveBottomTab: (tab: string) => void;
  setExplorerWidth: (width: number) => void;
  setSettingsOpen: (open: boolean) => void;

  // Persistence
  persist: () => void;
  hydrate: () => void;

  // Selection
  setSelectedWidget: (id?: string) => void;

  // Inspector
  setInspectorOpen: (open: boolean) => void;
  toggleInspector: () => void;

  // Data Provider
  setDataProvider: (provider: string) => Promise<void>;
  getDataProvider: () => string;

  // Global symbol context (Phase 1)
  setGlobalSymbol: (symbol: string) => void;
  applyGlobalSymbolToAllWidgets: (sheetId?: string, options?: { onlyEmpty?: boolean }) => void;
  // Global timeframe
  setGlobalTimeframe: (range: import('./data/provider.types').PriceRange) => void;
  getGlobalTimeframe: () => import('./data/provider.types').PriceRange;

  // Experience mode (Phase 2)
  setExperienceMode: (mode: 'beginner' | 'expert') => void;
  getExperienceMode: () => 'beginner' | 'expert';
  createSheetFromWorkflow: (title: string, kind: SheetKind, widgets: Omit<Widget, 'id'>[]) => string | null;

  // Import/export helpers
  exportWorkspace: () => string;
  importWorkspace: (data: unknown) => boolean;

  // Presets
  populateSheetWithPreset: (sheetId: string, kind: SheetKind) => void;
  getPresetWidgets: (kind: SheetKind) => Omit<Widget, 'id'>[];

  // Templates
  getTemplates: () => {
    name: string;
    kind: SheetKind;
    title: string;
    widgets: Omit<Widget, 'id'>[];
  }[];
  saveTemplate: (name: string, sheetId: string) => boolean;
  createSheetFromTemplate: (name: string) => boolean;

  // Paper trading updates (persist minimal state)
  setPaperTradingState: (state: { cash: number; positions: Record<string, PaperPosition> }) => void;
}

type WorkspaceStore = WorkspaceState & WorkspaceActions;

// Persisted store schema version (Batch 4: start at 1)
export const PERSIST_VERSION = 1;

// Persisted state can be of any shape, define a loose type for migration
// type RawState = Partial<Record<keyof WorkspaceState, unknown>>;

// Helper to create default workbench sheets
const createDefaultSheets = (): Sheet[] => {
  const presetKinds: SheetKind[] = ['valuation', 'charting', 'screening', 'portfolio', 'risk', 'options', 'blank'];
  return presetKinds.map((kind, index) => {
    const preset = SHEET_PRESETS[kind];
    const id = `default-${kind}-${Date.now()}-${index}`;
    return {
      id,
      kind,
      title: preset.label,
      widgets: preset.widgets.map((widget, widgetIndex) => ({
        ...widget,
        id: `widget-${kind}-${widgetIndex}-${Date.now()}`,
        layout: { ...widget.layout, i: `widget-${kind}-${widgetIndex}-${Date.now()}` },
      })),
    };
  });
};

// Default initial state
const createInitialState = (): WorkspaceState => {
  const defaultSheets = createDefaultSheets();
  return {
    sheets: defaultSheets,
    activeSheetId: defaultSheets[0]?.id, // Start with Valuation sheet active
    messages: [
      {
        id: '1',
        content:
          "Welcome to MAD LAB! I'm your AI assistant for financial analysis. How can I help you today?",
        timestamp: new Date(),
        sender: 'agent',
      },
    ],
    theme: 'malibu-sunrise', // Default to Malibu theme
    explorerCollapsed: false,
    explorerWidth: 280,
    chatCollapsed: false,
    bottomPanelHeight: 200,
    bottomPanelCollapsed: false,
    activeBottomTab: 'output',
    selectedWidgetId: undefined,
    inspectorOpen: false,
    schemaVersion: 1,
    presetVersion: 1,
    dataProvider: 'mock',
    settingsOpen: false,
    globalSymbol: 'AAPL',
    globalTimeframe: '6M',
    experienceMode: 'beginner',
    _undoStack: {},
    _redoStack: {},
    paperTrading: { cash: 100000, positions: {} },
  };
};

// Migration helper (exported for tests if needed)
export function migrateState(persisted: unknown, _fromVersion: number): WorkspaceState {
  if (!persisted || typeof persisted !== 'object') return createInitialState();
  const next = persisted as Record<string, unknown>;

  // Coerce messages timestamps to Date
  if (Array.isArray(next.messages)) {
    next.messages = next.messages.map(
      (m: Record<string, unknown>) =>
        ({
          ...m,
          timestamp: new Date((m?.timestamp as string) ?? Date.now()),
          sender: m?.sender === 'user' ? 'user' : 'agent',
          id: String(m?.id ?? `msg-${Math.random().toString(36).slice(2)}`),
        }) as Message
    );
  }

  // Ensure basic UI defaults (allow Malibu variants)
  const allowedThemes = new Set(['light', 'dark', 'malibu-sunrise', 'malibu-sunset']);
  next.theme = allowedThemes.has(next.theme as string)
    ? (next.theme as WorkspaceState['theme'])
    : 'dark';
  next.explorerCollapsed = Boolean(next.explorerCollapsed);
  next.explorerWidth = typeof next.explorerWidth === 'number' ? next.explorerWidth : 280;
  next.chatCollapsed = Boolean(next.chatCollapsed);
  next.bottomPanelHeight =
    typeof next.bottomPanelHeight === 'number' ? next.bottomPanelHeight : 200;
  next.bottomPanelCollapsed = Boolean(next.bottomPanelCollapsed);
  next.activeBottomTab = typeof next.activeBottomTab === 'string' ? next.activeBottomTab : 'output';

  // Selection & inspector defaults
  next.selectedWidgetId =
    typeof next.selectedWidgetId === 'string' ? next.selectedWidgetId : undefined;
  next.inspectorOpen = Boolean(next.inspectorOpen);

  // Sheets/widgets minimal coercion
  if (Array.isArray(next.sheets)) {
    next.sheets = next.sheets.map(
      (s: Record<string, unknown>) =>
        ({
          ...s,
          id: String(s?.id ?? `sheet-${Math.random().toString(36).slice(2)}`),
          kind: (['valuation', 'charting', 'screening', 'portfolio', 'risk', 'options', 'blank'] as const).includes(
            s?.kind as SheetKind
          )
            ? (s.kind as SheetKind)
            : 'blank',
          title: String(s?.title ?? 'Untitled'),
          widgets: Array.isArray(s?.widgets)
            ? s.widgets.map(
                (w: Record<string, unknown>) =>
                  ({
                    ...w,
                    id: String(w?.id ?? `widget-${Math.random().toString(36).slice(2)}`),
                    title: String(w?.title ?? 'Widget'),
                    type: String(w?.type ?? 'unknown'),
                    layout: {
                      i: String(w?.id ?? (w?.layout as Layout)?.i ?? ''),
                      x: Number((w?.layout as Layout)?.x ?? 0),
                      y: Number((w?.layout as Layout)?.y ?? 0),
                      w: Number((w?.layout as Layout)?.w ?? 6),
                      h: Number((w?.layout as Layout)?.h ?? 4),
                    },
                    version: typeof w?.version === 'number' ? w.version : 1,
                  }) as Widget
              )
            : [],
        }) as Sheet
    );
  }

  // Ensure sheets is always an array
  if (!Array.isArray(next.sheets)) {
    next.sheets = [];
  }

  // Workspace export schema version inside state
  next.schemaVersion = 1;

  // Preset version (default to 1 when missing)
  if (typeof next.presetVersion !== 'number') {
    next.presetVersion = 1;
  }

  // Data provider (default to 'mock' when missing)
  if (typeof next.dataProvider !== 'string') {
    next.dataProvider = 'mock';
  }

  // Global timeframe default
  const validRanges = new Set(['1D','5D','1M','3M','6M','1Y','2Y','5Y','MAX']);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candidateRange = (next as any).globalTimeframe as string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (next as any).globalTimeframe = validRanges.has(candidateRange || '')
    ? (candidateRange as WorkspaceState['globalTimeframe'])
    : '6M';

  // Merge with defaults to ensure all required fields are present
  return {
    ...createInitialState(),
    ...next,
  } as WorkspaceState;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist<WorkspaceStore>(
    (set, get) => {
      // Initialize collaboration listeners
      const initCollaboration = () => {
        try {
          // Set up listeners for incoming collaboration changes
          workspaceSync.onStateChange((state) => {
            if (state) {
              // Handle incoming workspace state changes
              console.log('Received collaborative state update:', state);
              // Update local state based on incoming changes
              // This would need more sophisticated conflict resolution in a production system
            }
          });

          workspaceSync.onUserChange((users) => {
            console.log('User list updated:', Array.from(users.values()));
          });

          workspaceSync.onCursorChange((userId, cursor) => {
            console.log('Cursor update from user:', userId, cursor);
          });

          workspaceSync.onChatMessage((message) => {
            console.log('Chat message received:', message);
          });
        } catch (error) {
          console.warn('Failed to initialize collaboration listeners:', error);
        }
      };

      // Initialize collaboration on store creation
      if (typeof window !== 'undefined') {
        // Delay initialization to ensure DOM is ready
        setTimeout(initCollaboration, 100);
      }
      const initialState = createInitialState();
      return {
        // Initial state
        ...initialState,

      // Selection
      setSelectedWidget: (id) => set({ selectedWidgetId: id }),
      // Inspector
      setInspectorOpen: (open: boolean) => set({ inspectorOpen: open }),
      toggleInspector: () => set((state) => ({ inspectorOpen: !state.inspectorOpen })),
      setExplorerWidth: (width: number) => set({ explorerWidth: Math.max(200, width) }),
      setSettingsOpen: (open: boolean) => set({ settingsOpen: open }),

      // Data Provider
      setDataProvider: async (provider: string) => {
        try {
          const { setDataProvider: setProviderRegistry } = await import('./data/providers');
          await setProviderRegistry(provider);
          set({ dataProvider: provider });
        } catch (error) {
          console.warn(`Failed to set data provider to '${provider}':`, error);
        }
      },
      getDataProvider: () => get().dataProvider,

      // Global symbol context (Phase 1)
      setGlobalSymbol: (symbol: string) => {
        const sanitized = (symbol || '').toUpperCase().slice(0, 12);
        set({ globalSymbol: sanitized });
      },
      applyGlobalSymbolToAllWidgets: (sheetId?: string, options?: { onlyEmpty?: boolean }) => {
        const state = get();
        const targetSheetId = sheetId || state.activeSheetId;
        if (!targetSheetId) return;
        const onlyEmpty = options?.onlyEmpty ?? true;
        const symbol = state.globalSymbol;
        set((prev) => ({
          sheets: prev.sheets.map((s) => {
            if (s.id !== targetSheetId) return s;
            return {
              ...s,
              widgets: s.widgets.map((w) => {
                const schema = getSchemaWidget(w.type);
                const supportsSymbol = Boolean(schema?.props?.symbol);
                if (!supportsSymbol) return w;
                const hasSymbol = typeof (w.props as Record<string, unknown>)?.symbol === 'string' && ((w.props as Record<string, unknown>).symbol as string).length > 0;
                if (onlyEmpty && hasSymbol) return w;
                const nextProps = { ...(w.props || {}), symbol } as Record<string, unknown>;
                return { ...w, props: nextProps } as Widget;
              }),
            } as Sheet;
          }),
        }));
      },

      // Global timeframe
      setGlobalTimeframe: (range) => {
        set({ globalTimeframe: range });
      },
      getGlobalTimeframe: () => get().globalTimeframe,

      // Experience mode (Phase 2)
      setExperienceMode: (mode: 'beginner' | 'expert') => {
        set({ experienceMode: mode });
      },
      getExperienceMode: () => get().experienceMode,

      createSheetFromWorkflow: (title: string, kind: SheetKind, widgets: Omit<Widget, 'id'>[]) => {
        // Create sheet and populate with provided widgets
        const before = get().activeSheetId;
        get().addSheet(kind, title);
        const sheetId = get().activeSheetId;
        if (!sheetId || sheetId === before) return null;
        set((state) => ({
          sheets: state.sheets.map((s) => (s.id === sheetId ? { ...s, widgets: [] } : s)),
        }));
        for (const w of widgets) {
          get().addWidget(sheetId, w);
        }
        return sheetId;
      },

      // Sheet actions
      addSheet: (kind: SheetKind, title?: string) => {
        const id = `sheet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const defaultTitle = title || `${kind.charAt(0).toUpperCase() + kind.slice(1)} Sheet`;

        const newSheet: Sheet = {
          id,
          kind,
          title: defaultTitle,
          widgets: [],
        };

        set((state) => ({
          sheets: [...state.sheets, newSheet],
          activeSheetId: id,
        }));

        // Auto-populate with preset widgets for non-blank kinds only
        if (kind !== 'blank') {
          get().populateSheetWithPreset(id, kind);
        }
      },

      closeSheet: (id: string) => {
        set((state) => {
          const sheets = state.sheets.filter((s) => s.id !== id);
          const activeSheetId =
            state.activeSheetId === id ? sheets[sheets.length - 1]?.id : state.activeSheetId;

          return { sheets, activeSheetId };
        });
      },

      setActiveSheet: (id: string) => {
        set({ activeSheetId: id });
      },

      updateSheetTitle: (id: string, title: string) => {
        set((state) => ({
          sheets: state.sheets.map((sheet) => (sheet.id === id ? { ...sheet, title } : sheet)),
        }));
      },

      // Widget actions
      addWidget: (sheetId: string, widget: Omit<Widget, 'id'>) => {
        const id = `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        // Smart defaults (Phase 1): if widget supports a 'symbol' prop, default to globalSymbol when absent
        let derivedProps = widget.props ? { ...widget.props } : undefined;
        try {
          const schema = getSchemaWidget(widget.type);
          const supportsSymbol = Boolean(schema?.props?.symbol);
          const providedSymbol = typeof (derivedProps as Record<string, unknown>)?.symbol === 'string' && ((derivedProps as Record<string, unknown>).symbol as string).length > 0;
          if (supportsSymbol && !providedSymbol) {
            derivedProps = { ...(derivedProps || {}), symbol: get().globalSymbol } as Record<string, unknown>;
          }
        } catch {
          // ignore schema lookup errors and proceed without smart default
        }
        const newWidget: Widget = { version: 1, ...widget, id, props: derivedProps } as Widget;

        set((state) => ({
          sheets: state.sheets.map((sheet) =>
            sheet.id === sheetId ? { ...sheet, widgets: [...sheet.widgets, newWidget] } : sheet
          ),
        }));

        // Broadcast widget addition for collaboration
        try {
          workspaceSync.addWidget(newWidget);
        } catch (error) {
          console.warn('Failed to broadcast widget addition:', error);
        }
      },

      updateWidget: (sheetId: string, widget: Partial<Widget> & { id: string }) => {
        set((state) => ({
          sheets: state.sheets.map((sheet) =>
            sheet.id === sheetId
              ? {
                  ...sheet,
                  widgets: sheet.widgets.map((w) => (w.id === widget.id ? { ...w, ...widget } : w)),
                }
              : sheet
          ),
        }));

        // Broadcast widget update for collaboration
        try {
          const state = get();
          const sheet = state.sheets.find(s => s.id === sheetId);
          const updatedWidget = sheet?.widgets.find(w => w.id === widget.id);
          if (updatedWidget) {
            workspaceSync.updateWidgetConfig(widget.id, updatedWidget);
          }
        } catch (error) {
          console.warn('Failed to broadcast widget update:', error);
        }
      },

      removeWidget: (sheetId: string, widgetId: string) => {
        set((state) => ({
          sheets: state.sheets.map((sheet) =>
            sheet.id === sheetId
              ? { ...sheet, widgets: sheet.widgets.filter((w) => w.id !== widgetId) }
              : sheet
          ),
          selectedWidgetId:
            state.selectedWidgetId === widgetId ? undefined : state.selectedWidgetId,
        }));

        // Broadcast widget removal for collaboration
        try {
          workspaceSync.removeWidget(widgetId);
        } catch (error) {
          console.warn('Failed to broadcast widget removal:', error);
        }
      },

      duplicateWidget: (sheetId: string, widgetId: string) => {
        const state = get();
        const sheet = state.sheets.find((s) => s.id === sheetId);
        const source = sheet?.widgets.find((w) => w.id === widgetId);
        if (!sheet || !source) return;
        const GRID_COLUMNS = 12;
        const nextLayout = { ...source.layout } as Layout;
        if (nextLayout.x + nextLayout.w + 1 <= GRID_COLUMNS) {
          nextLayout.x = nextLayout.x + 1;
        } else {
          nextLayout.x = 0;
          nextLayout.y = nextLayout.y + 1;
        }
        const newId = `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const duplicated: Widget = {
          id: newId,
          type: source.type,
          title: `${source.title} (Copy)`,
          layout: nextLayout,
          props: source.props ? { ...source.props } : undefined,
          version: source.version ?? 1,
        };
        set((prev) => ({
          sheets: prev.sheets.map((s) =>
            s.id === sheetId ? { ...s, widgets: [...s.widgets, duplicated] } : s
          ),
          selectedWidgetId: newId,
        }));
      },

      updateLayout: (sheetId: string, layout: Layout[]) => {
        set((state) => {
          // Push current layout to undo stack
          const currentSheet = state.sheets.find(s => s.id === sheetId);
          const currentLayout = currentSheet ? currentSheet.widgets.map(w => ({ ...w.layout, i: w.id })) : [];
          const undoStack = { ...(state._undoStack || {}) };
          const redoStack = { ...(state._redoStack || {}) };
          undoStack[sheetId] = [...(undoStack[sheetId] || []), currentLayout];
          // Clear redo stack on new action
          redoStack[sheetId] = [];
          return {
            _undoStack: undoStack,
            _redoStack: redoStack,
            sheets: state.sheets.map((sheet) =>
              sheet.id === sheetId
                ? {
                    ...sheet,
                    widgets: sheet.widgets.map((widget) => ({
                      ...widget,
                      layout: layout.find((l) => l.i === widget.id) || widget.layout,
                    })),
                  }
                : sheet
            ),
          };
        });

        // Broadcast layout change for collaboration
        try {
          workspaceSync.updateLayout(layout);
        } catch (error) {
          console.warn('Failed to broadcast layout update:', error);
        }
      },

      undoLayout: (sheetId: string) => {
        set((state) => {
          const stack = state._undoStack?.[sheetId] || [];
          if (stack.length === 0) return {} as Partial<WorkspaceState>;
          const prevLayout = stack[stack.length - 1];
          const newUndo = { ...(state._undoStack || {}) };
          newUndo[sheetId] = stack.slice(0, -1);
          // push current to redo
          const currentSheet = state.sheets.find(s => s.id === sheetId);
          const curr = currentSheet ? currentSheet.widgets.map(w => ({ ...w.layout, i: w.id })) : [];
          const newRedo = { ...(state._redoStack || {}) };
          newRedo[sheetId] = [...(newRedo[sheetId] || []), curr];
          return {
            _undoStack: newUndo,
            _redoStack: newRedo,
            sheets: state.sheets.map((sheet) =>
              sheet.id === sheetId
                ? {
                    ...sheet,
                    widgets: sheet.widgets.map((widget) => ({
                      ...widget,
                      layout: (prevLayout.find((l) => l.i === widget.id) as Layout) || widget.layout,
                    })),
                  }
                : sheet
            ),
          };
        });
      },

      redoLayout: (sheetId: string) => {
        set((state) => {
          const stack = state._redoStack?.[sheetId] || [];
          if (stack.length === 0) return {} as Partial<WorkspaceState>;
          const nextLayout = stack[stack.length - 1];
          const newRedo = { ...(state._redoStack || {}) };
          newRedo[sheetId] = stack.slice(0, -1);
          // push current to undo
          const currentSheet = state.sheets.find(s => s.id === sheetId);
          const curr = currentSheet ? currentSheet.widgets.map(w => ({ ...w.layout, i: w.id })) : [];
          const newUndo = { ...(state._undoStack || {}) };
          newUndo[sheetId] = [...(newUndo[sheetId] || []), curr];
          return {
            _undoStack: newUndo,
            _redoStack: newRedo,
            sheets: state.sheets.map((sheet) =>
              sheet.id === sheetId
                ? {
                    ...sheet,
                    widgets: sheet.widgets.map((widget) => ({
                      ...widget,
                      layout: (nextLayout.find((l) => l.i === widget.id) as Layout) || widget.layout,
                    })),
                  }
                : sheet
            ),
          };
        });
      },

      // Chat actions
      addMessage: (content: string, sender: 'user' | 'agent') => {
        const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const message: Message = {
          id,
          content,
          timestamp: new Date(),
          sender,
        };

        set((state) => ({
          messages: [...state.messages, message],
        }));
      },

      clearMessages: () => {
        set({ messages: [] });
      },

      // UI actions
      setTheme: (theme: WorkspaceState['theme']) => {
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
        presets.forEach((widget) => {
          get().addWidget(sheetId, widget);
        });
      },

      getPresetWidgets: (kind: SheetKind): Omit<Widget, 'id'>[] => {
        return SHEET_PRESETS[kind]?.widgets ?? [];
      },

      // Templates
      getTemplates: () => {
        try {
          const raw =
            typeof window !== 'undefined' ? window.localStorage.getItem('madlab-templates') : null;
          if (!raw) return [];
          const arr = JSON.parse(raw);
          if (!Array.isArray(arr)) return [];
          return arr as {
            name: string;
            kind: SheetKind;
            title: string;
            widgets: Omit<Widget, 'id'>[];
          }[];
        } catch {
          return [];
        }
      },
      saveTemplate: (name: string, sheetId: string) => {
        try {
          const state = get();
          const sheet = state.sheets.find((s) => s.id === sheetId);
          if (!sheet) return false;
          const template = {
            name,
            kind: sheet.kind,
            title: sheet.title,
            widgets: sheet.widgets.map((w) => ({
              type: w.type,
              title: w.title,
              layout: { ...w.layout, i: '' },
              props: w.props ? { ...w.props } : undefined,
            })),
          } as { name: string; kind: SheetKind; title: string; widgets: Omit<Widget, 'id'>[] };
          const existing = get().getTemplates();
          // replace if same name exists
          const next = [...existing.filter((t) => t.name !== name), template];
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('madlab-templates', JSON.stringify(next));
          }
          return true;
        } catch {
          return false;
        }
      },
      createSheetFromTemplate: (name: string) => {
        try {
          const tpl = get()
            .getTemplates()
            .find((t) => t.name === name);
          if (!tpl) return false;
          // Create a sheet with template name
          const sheetName = tpl.title || name;
          const idBefore = get().activeSheetId;
          get().addSheet(tpl.kind || 'blank', sheetName);
          const sheetId = get().activeSheetId;
          if (!sheetId || sheetId === idBefore) return false;
          // Clear any auto-populated widgets from preset if not blank
          set((state) => ({
            sheets: state.sheets.map((s) => (s.id === sheetId ? { ...s, widgets: [] } : s)),
          }));
          for (const w of tpl.widgets) {
            get().addWidget(sheetId, w);
          }
          return true;
        } catch {
          return false;
        }
      },

      // Paper trading minimal persistence
      setPaperTradingState: (state: { cash: number; positions: Record<string, PaperPosition> }) => {
        set({ paperTrading: { cash: state.cash, positions: state.positions } });
      },

      // Import/export helpers
      exportWorkspace: () => {
        const state = get();
        return exportWorkspaceJson(state);
      },

      importWorkspace: (data: unknown) => {
        try {
          const parsed = parseWorkspaceImport(data);
          const coerced = coerceToWorkspaceState(parsed);
          set({
            ...coerced,
            selectedWidgetId: undefined,
            inspectorOpen: false,
          });
          return true;
        } catch (e) {
          console.error('Failed to import workspace', e);
          return false;
        }
      },

      // Persistence methods
      persist: () => {
        // Auto-persisted by zustand persist middleware
      },

      hydrate: () => {
        // Auto-hydrated by zustand persist middleware
      },
    };
    },
    {
      name: 'madlab-workspace',
      version: PERSIST_VERSION,
      migrate: (persistedState, fromVersion) => {
        const migratedState = migrateState(persistedState, fromVersion);
        // Return the full store shape by merging actions at runtime; here we only provide state
        return migratedState as unknown as WorkspaceStore;
      },
      // allow auto hydration for persisted state
    }
  )
);
