import { create } from 'zustand';
import { createUiSlice } from './store/slices/uiSlice';
import { createSheetSlice } from './store/slices/sheetSlice';
import { createWidgetSlice } from './store/slices/widgetSlice';
import { createTemplateSlice } from './store/slices/templateSlice';
import { createProviderSlice } from './store/slices/providerSlice';
import { createCoreSlice } from './store/slices/coreSlice';
import { createChatSlice } from './store/slices/chatSlice';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Layout } from 'react-grid-layout';
import { SHEET_PRESETS, type SheetKind } from './presets';
import { dataProviderRegistry, registerDataProvider } from './data/providers';
import { extensionProvider } from './data/providers/ExtensionBridgeProvider';

// SheetKind now sourced from presets to avoid drift

// Detect automation/E2E to stabilize state and avoid hydration races
const isAutomation = typeof window !== 'undefined' && (() => {
  try {
    const sp = new URLSearchParams(window.location.search);
    return sp.get('e2e') === '1' || ((navigator as any)?.webdriver === true);
  } catch {
    return (typeof navigator !== 'undefined' && (navigator as any)?.webdriver === true);
  }
})();

const STORAGE_KEY = isAutomation ? 'madlab-workspace-e2e' : 'madlab-workspace';
const STORAGE_IMPL: Storage | undefined = typeof window !== 'undefined'
  ? (isAutomation ? window.sessionStorage : window.localStorage)
  : undefined;

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
  // State initialization tracking to prevent race conditions
  _hydrationComplete: boolean;
  _initializationPhase: 'loading' | 'hydrating' | 'ready';
  // Progressive disclosure: onboarding completion flag for UI gating
  onboardingCompleted?: boolean;
  // Ephemeral celebration UI trigger
  lastCelebration?: { message: string; ts: number } | null;
  // User-selected skill level for progressive disclosure
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  // Learning progression milestones
  learningProgress: {
    createdFirstSheet: boolean;
    configuredWidget: boolean;
    exportedWorkspace: boolean;
    savedTemplate: boolean;
    installedWidget: boolean;
  };
  // Streaming & cache preferences
  streamMode?: 'auto' | 'websocket' | 'polling';
  pollingIntervalMs?: number;
  cacheTtlMs?: number;
  cacheMaxEntries?: number;
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

  // Initialization state management
  setInitializationPhase: (phase: 'loading' | 'hydrating' | 'ready') => void;
  completeHydration: () => void;
  isReady: () => boolean;
  safeUpdate: (update: Partial<WorkspaceState>) => void;
  markOnboardingCompleted: () => void;
  celebrate: (message: string) => void;
  setSkillLevel: (level: 'beginner' | 'intermediate' | 'advanced') => void;

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
  deleteTemplate: (name: string) => boolean;
  renameTemplate: (oldName: string, newName: string) => boolean;
}

type WorkspaceStore = WorkspaceState & WorkspaceActions;

// Narrow type for the core slice to satisfy the store composition typing
type CoreSlice = Pick<WorkspaceActions,
  | 'exportWorkspace'
  | 'importWorkspace'
  | 'setInitializationPhase'
  | 'completeHydration'
  | 'isReady'
  | 'safeUpdate'
  | 'persist'
  | 'hydrate'
>;

type UiSlice = Pick<WorkspaceActions,
  | 'setInspectorOpen'
  | 'toggleInspector'
  | 'setExplorerWidth'
  | 'setTheme'
  | 'toggleExplorer'
  | 'toggleChat'
  | 'setBottomPanelHeight'
  | 'toggleBottomPanel'
  | 'setActiveBottomTab'
  | 'markOnboardingCompleted'
  | 'celebrate'
  | 'setSkillLevel'
>;

type SheetSlice = Pick<WorkspaceActions,
  | 'addSheet'
  | 'closeSheet'
  | 'setActiveSheet'
  | 'updateSheetTitle'
  | 'populateSheetWithPreset'
  | 'getPresetWidgets'
>;

type WidgetSlice = Pick<WorkspaceActions,
  | 'setSelectedWidget'
  | 'addWidget'
  | 'updateWidget'
  | 'removeWidget'
  | 'duplicateWidget'
  | 'updateLayout'
>;

type TemplateSlice = Pick<WorkspaceActions,
  | 'getTemplates'
  | 'saveTemplate'
  | 'createSheetFromTemplate'
  | 'deleteTemplate'
  | 'renameTemplate'
>;

type ProviderSlice = Pick<WorkspaceActions,
  | 'setDataProvider'
  | 'getDataProvider'
>;

type ChatSlice = Pick<WorkspaceActions,
  | 'addMessage'
  | 'clearMessages'
>;

// Persisted store schema version (Batch 4: start at 1)
export const PERSIST_VERSION = 1;

// Persisted state can be of any shape, define a loose type for migration
type RawState = Partial<Record<keyof WorkspaceState, unknown>>;

// Default initial state
const createInitialState = (): WorkspaceState => {
  // In automation/E2E, seed with a default valuation sheet to avoid race conditions
  const seedValuation = () => {
    const id = `sheet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const preset = SHEET_PRESETS['valuation'];
    const widgets = (preset?.widgets || []).map((w) => ({
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: w.type,
      title: w.title,
      layout: { ...w.layout, i: '' },
      version: 1,
      props: w.props ? { ...w.props } : undefined,
    }));
    return {
      sheets: [
        {
          id,
          kind: 'valuation' as SheetKind,
          title: preset?.label || 'Valuation Workbench',
          widgets,
        },
      ],
      activeSheetId: id,
    } as Pick<WorkspaceState, 'sheets' | 'activeSheetId'>;
  };

  const seeded = isAutomation ? seedValuation() : { sheets: [], activeSheetId: undefined };

  return {
    ...seeded,
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
    onboardingCompleted: false,
    skillLevel: 'beginner',
    learningProgress: {
      createdFirstSheet: false,
      configuredWidget: false,
      exportedWorkspace: false,
      savedTemplate: false,
      installedWidget: false,
    },
  } as WorkspaceState;
};

// Migration helper (exported for tests if needed)
export function migrateState(persisted: unknown, _fromVersion: number): WorkspaceState {
  if (!persisted || typeof persisted !== 'object') return createInitialState();
  
  // Type-safe migration with proper validation
  const base = createInitialState();
  const candidate = persisted as Record<string, unknown>;

  // Safely migrate messages with proper typing
  const messages: Message[] = Array.isArray(candidate.messages)
    ? candidate.messages.map((m: unknown): Message => {
        const msg = m as Record<string, unknown>;
        return {
          id: String(msg?.id ?? `msg-${Math.random().toString(36).slice(2)}`),
          content: String(msg?.content ?? ''),
          timestamp: new Date(msg?.timestamp ? String(msg.timestamp) : Date.now()),
          sender: msg?.sender === 'user' ? 'user' : 'agent',
        };
      })
    : base.messages;

  // Safely migrate sheets with proper typing
  const sheets: Sheet[] = Array.isArray(candidate.sheets)
    ? candidate.sheets.map((s: unknown): Sheet => {
        const sheet = s as Record<string, unknown>;
        const widgets = Array.isArray(sheet.widgets)
          ? sheet.widgets.map((w: unknown): Widget => {
              const widget = w as Record<string, unknown>;
              const layout = widget.layout as Record<string, unknown> || {};
              return {
                id: String(widget?.id ?? `widget-${Math.random().toString(36).slice(2)}`),
                title: String(widget?.title ?? 'Widget'),
                type: String(widget?.type ?? 'unknown'),
                layout: {
                  i: String(widget?.id ?? layout?.i ?? ''),
                  x: Number(layout?.x ?? 0),
                  y: Number(layout?.y ?? 0),
                  w: Number(layout?.w ?? 6),
                  h: Number(layout?.h ?? 4),
                },
                version: typeof widget?.version === 'number' ? widget.version : 1,
                props: widget.props as Record<string, unknown> || undefined,
              };
            })
          : [];
        return {
          id: String(sheet?.id ?? `sheet-${Math.random().toString(36).slice(2)}`),
          kind: (['valuation', 'charting', 'risk', 'options', 'blank'] as const).includes(sheet?.kind as SheetKind)
            ? (sheet.kind as SheetKind)
            : 'blank',
          title: String(sheet?.title ?? 'Untitled'),
          widgets,
        };
      })
    : base.sheets;

  // Build result with type-safe defaults
  return {
    ...base,
    schemaVersion: typeof candidate.schemaVersion === 'number' ? candidate.schemaVersion : 1,
    presetVersion: typeof candidate.presetVersion === 'number' ? candidate.presetVersion : 1,
    theme: candidate.theme === 'light' ? 'light' : 'dark',
    explorerCollapsed: Boolean(candidate.explorerCollapsed),
    explorerWidth: typeof candidate.explorerWidth === 'number' ? candidate.explorerWidth : base.explorerWidth,
    chatCollapsed: Boolean(candidate.chatCollapsed),
    bottomPanelHeight: typeof candidate.bottomPanelHeight === 'number' ? candidate.bottomPanelHeight : base.bottomPanelHeight,
    bottomPanelCollapsed: Boolean(candidate.bottomPanelCollapsed),
    activeBottomTab: typeof candidate.activeBottomTab === 'string' ? candidate.activeBottomTab : base.activeBottomTab,
    selectedWidgetId: typeof candidate.selectedWidgetId === 'string' ? candidate.selectedWidgetId : undefined,
    inspectorOpen: Boolean(candidate.inspectorOpen),
    activeSheetId: typeof candidate.activeSheetId === 'string' ? candidate.activeSheetId : undefined,
    dataProvider: typeof candidate.dataProvider === 'string' ? candidate.dataProvider : 'mock',
    _hydrationComplete: false,
    _initializationPhase: 'loading' as const,
    messages,
    sheets,
    // Defaults for new preferences
    streamMode: ((): any => {
      const v = (candidate as any).streamMode; 
      return v === 'websocket' || v === 'polling' ? v : 'auto';
    })(),
    pollingIntervalMs: typeof (candidate as any).pollingIntervalMs === 'number' ? (candidate as any).pollingIntervalMs : 1000,
    cacheTtlMs: typeof (candidate as any).cacheTtlMs === 'number' ? (candidate as any).cacheTtlMs : 300_000,
    cacheMaxEntries: typeof (candidate as any).cacheMaxEntries === 'number' ? (candidate as any).cacheMaxEntries : 100,
  };
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist<WorkspaceStore>(
    (set, get) => ({
      // Week 3/4: Slice composition (behavior-preserving)
      ...createUiSlice(set as any, get as any) as unknown as UiSlice,
      ...createSheetSlice(set as any, get as any) as unknown as SheetSlice,
      ...createWidgetSlice(set as any, get as any) as unknown as WidgetSlice,
      ...createTemplateSlice(set as any, get as any) as unknown as TemplateSlice,
      ...createProviderSlice(set as any, get as any) as unknown as ProviderSlice,
      ...createChatSlice(set as any, get as any) as unknown as ChatSlice,
      ...createCoreSlice(set as any, get as any) as unknown as CoreSlice,
      // Initial state
      ...createInitialState(),

      // Selection (moved to widgetSlice)
      // Inspector and explorer width (moved to uiSlice)

      // Data Provider moved to providerSlice

      // Sheet actions moved to sheetSlice

      // Widget actions moved to widgetSlice

      // Chat actions moved to chatSlice

      // UI actions moved to uiSlice

      // Preset helpers moved to sheetSlice

      // Templates moved to templateSlice

      // Onboarding and celebratory UI moved to uiSlice

      // Persistence methods handled by middleware; APIs provided by coreSlice
    }),
    {
      name: STORAGE_KEY,
      version: PERSIST_VERSION,
      storage: createJSONStorage(() => STORAGE_IMPL as Storage),
      // Note: avoid using get/set here to keep types simple for --noEmit
      
      migrate: (persistedState, fromVersion) => {
        const migratedState = migrateState(persistedState, fromVersion);
        // Return only the state portion, Zustand will merge with actions
        return migratedState as WorkspaceStore;
      },
      // allow auto hydration for persisted state
    }
  )
);
