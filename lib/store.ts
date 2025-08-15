import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Layout } from 'react-grid-layout';
import { SHEET_PRESETS } from './presets';
import { exportWorkspaceJson } from './io/export';
import { coerceToWorkspaceState, parseWorkspaceImport } from './io/import';

export type SheetKind = 'valuation' | 'charting' | 'risk' | 'options' | 'blank';

export interface Widget {
  id: string;
  type: string;
  title: string;
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

export interface WorkspaceState {
  sheets: Sheet[];
  activeSheetId?: string;
  messages: Message[];
  theme: 'light' | 'dark';
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
  setExplorerWidth: (width: number) => void;

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
}

type WorkspaceStore = WorkspaceState & WorkspaceActions;

// Persisted store schema version (Batch 4: start at 1)
export const PERSIST_VERSION = 1;

// Persisted state can be of any shape, define a loose type for migration
type RawState = Partial<Record<keyof WorkspaceState, unknown>>;

// Default initial state
const createInitialState = (): WorkspaceState => ({
  sheets: [],
  activeSheetId: undefined,
  messages: [
    {
      id: '1',
      content:
        "Welcome to MAD LAB! I'm your AI assistant for financial analysis. How can I help you today?",
      timestamp: new Date(),
      sender: 'agent',
    },
  ],
  theme: 'dark',
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
});

// Migration helper (exported for tests if needed)
export function migrateState(persisted: unknown, _fromVersion: number): WorkspaceState {
  if (!persisted || typeof persisted !== 'object') return createInitialState();
  const next = persisted as any;

  // Coerce messages timestamps to Date
  if (Array.isArray(next.messages)) {
    next.messages = next.messages.map(
      (m: any) =>
        ({
          ...m,
          timestamp: new Date((m?.timestamp as string) ?? Date.now()),
          sender: m?.sender === 'user' ? 'user' : 'agent',
          id: String(m?.id ?? `msg-${Math.random().toString(36).slice(2)}`),
        }) as Message
    );
  }

  // Ensure basic UI defaults
  next.theme = next.theme === 'light' ? 'light' : 'dark';
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
      (s: any) =>
        ({
          ...s,
          id: String(s?.id ?? `sheet-${Math.random().toString(36).slice(2)}`),
          kind: (['valuation', 'charting', 'risk', 'options', 'blank'] as const).includes(
            s?.kind as SheetKind
          )
            ? (s.kind as SheetKind)
            : 'blank',
          title: String(s?.title ?? 'Untitled'),
          widgets: Array.isArray(s?.widgets)
            ? s.widgets.map(
                (w: any) =>
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

  // Merge with defaults to ensure all required fields are present
  return {
    ...createInitialState(),
    ...next,
  } as WorkspaceState;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist<WorkspaceStore>(
    (set, get) => ({
      // Initial state
      sheets: [],
      activeSheetId: undefined,
      messages: [
        {
          id: '1',
          content:
            "Welcome to MAD LAB! I'm your AI assistant for financial analysis. How can I help you today?",
          timestamp: new Date(),
          sender: 'agent',
        },
      ],
      theme: 'dark',
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

      // Selection
      setSelectedWidget: (id) => set({ selectedWidgetId: id }),
      // Inspector
      setInspectorOpen: (open: boolean) => set({ inspectorOpen: open }),
      toggleInspector: () => set((state) => ({ inspectorOpen: !state.inspectorOpen })),
      setExplorerWidth: (width: number) => set({ explorerWidth: Math.max(200, width) }),

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
        const newWidget: Widget = { version: 1, ...widget, id } as Widget;

        set((state) => ({
          sheets: state.sheets.map((sheet) =>
            sheet.id === sheetId ? { ...sheet, widgets: [...sheet.widgets, newWidget] } : sheet
          ),
        }));
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
        set((state) => ({
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
        }));
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
    }),
    {
      name: 'madlab-workspace',
      version: PERSIST_VERSION,
      migrate: (persistedState, fromVersion) => {
        const migratedState = migrateState(persistedState, fromVersion);
        // Zustand will merge the state with actions, so we can just return the state portion
        return migratedState as any;
      },
      // allow auto hydration for persisted state
    }
  )
);
