import { SHEET_PRESETS, type SheetKind } from '@/lib/presets';
import { useWorkspaceStore } from '@/lib/store';
import type { Widget } from '@/lib/types';

export type CommandItem = {
  id: string;
  title: string;
  subtitle?: string;
  keywords?: string[];
  run: () => void | Promise<void>;
  enabled?: () => boolean;
  group?: string;
};

function duplicateSelectedWidget() {
  const state = useWorkspaceStore.getState();
  const sheetId = state.activeSheetId;
  const selectedId = state.selectedWidgetId;
  if (!sheetId || !selectedId) return;
  const sheet = state.sheets.find((s) => s.id === sheetId);
  const w = sheet?.widgets.find((w) => w.id === selectedId);
  if (!sheet || !w) return;

  // Compute layout offset +1 column, wrap to next row if overflow
  const nextLayout = { ...w.layout };
  const GRID_COLUMNS = 12;
  if (nextLayout.x + nextLayout.w + 1 <= GRID_COLUMNS) {
    nextLayout.x = nextLayout.x + 1;
  } else {
    nextLayout.x = 0;
    nextLayout.y = nextLayout.y + 1;
  }

  const newWidget: Omit<Widget, 'id'> = {
    type: w.type,
    title: w.title + ' (Copy)',
    layout: nextLayout,
    props: { ...(w.props || {}) },
  };
  state.addWidget(sheetId, newWidget);
}

function removeSelectedWidget() {
  const state = useWorkspaceStore.getState();
  const sheetId = state.activeSheetId;
  const selectedId = state.selectedWidgetId;
  if (!sheetId || !selectedId) return;
  state.removeWidget(sheetId, selectedId);
  state.setSelectedWidget(undefined);
}

function openInspector() {
  const state = useWorkspaceStore.getState();
  if (!state.selectedWidgetId) return;
  state.setInspectorOpen(true);
}

function addSheet(kind: SheetKind) {
  const label = SHEET_PRESETS[kind]?.label;
  useWorkspaceStore.getState().addSheet(kind, label);
}

export function getCommands(): CommandItem[] {
  return [
    // New sheet commands
    ...(['valuation', 'charting', 'risk', 'options', 'blank'] as SheetKind[]).map((k) => ({
      id: `new-sheet-${k}`,
      group: 'New Sheet',
      title: `New Sheet: ${SHEET_PRESETS[k]?.label ?? k}`,
      keywords: [k],
      run: () => addSheet(k),
    })),

    // UI toggles
    {
      id: 'toggle-explorer',
      group: 'View',
      title: 'Toggle Explorer',
      run: () => useWorkspaceStore.getState().toggleExplorer(),
    },
    {
      id: 'toggle-chat',
      group: 'View',
      title: 'Toggle Chat',
      run: () => useWorkspaceStore.getState().toggleChat(),
    },

    // Selection actions
    {
      id: 'duplicate-widget',
      group: 'Selection',
      title: 'Duplicate Widget',
      run: () => duplicateSelectedWidget(),
      enabled: () => !!useWorkspaceStore.getState().selectedWidgetId,
    },
    {
      id: 'remove-widget',
      group: 'Selection',
      title: 'Remove Widget',
      run: () => removeSelectedWidget(),
      enabled: () => !!useWorkspaceStore.getState().selectedWidgetId,
    },
    {
      id: 'open-inspector',
      group: 'Selection',
      title: 'Open Inspector',
      run: () => openInspector(),
      enabled: () => !!useWorkspaceStore.getState().selectedWidgetId,
    },
    // Templates / onboarding productivity
    {
      id: 'save-template-current',
      group: 'Templates',
      title: 'Save Current Sheet as Template…',
      enabled: () => !!useWorkspaceStore.getState().activeSheetId,
      run: () => {
        const state = useWorkspaceStore.getState();
        const sheetId = state.activeSheetId;
        if (!sheetId) return;
        const current = state.sheets.find((s) => s.id === sheetId);
        const defName = current?.title || 'My Template';
        setTimeout(() => {
          const name = window.prompt('Template name', defName)?.trim();
          const finalName = name && name.length > 0 ? name : defName;
          state.saveTemplate(finalName, sheetId);
        }, 0);
      }
    },
  ];
}
