import type { WorkspaceState, Message } from '@/lib/store';

// Serializable shape written to disk
export interface ExportedWorkspace {
  schemaVersion: number;
  ts: number;
  sheets: WorkspaceState['sheets'];
  activeSheetId: WorkspaceState['activeSheetId'];
  messages: Array<Omit<Message, 'timestamp'> & { timestamp: string }>;
  ui: {
    theme: WorkspaceState['theme'];
    explorerCollapsed: WorkspaceState['explorerCollapsed'];
    explorerWidth: WorkspaceState['explorerWidth'];
    chatCollapsed: WorkspaceState['chatCollapsed'];
    bottomPanelHeight: WorkspaceState['bottomPanelHeight'];
    bottomPanelCollapsed: WorkspaceState['bottomPanelCollapsed'];
    activeBottomTab: WorkspaceState['activeBottomTab'];
  };
}

export function serializeWorkspace(state: WorkspaceState): ExportedWorkspace {
  return {
    schemaVersion: state.schemaVersion,
    ts: Date.now(),
    sheets: state.sheets,
    activeSheetId: state.activeSheetId,
    messages: state.messages.map((m) => ({
      ...m,
      timestamp:
        m.timestamp instanceof Date
          ? m.timestamp.toISOString()
          : typeof m.timestamp === 'string'
            ? m.timestamp
            : new Date().toISOString(),
    })),
    ui: {
      theme: state.theme,
      explorerCollapsed: state.explorerCollapsed,
      explorerWidth: state.explorerWidth,
      chatCollapsed: state.chatCollapsed,
      bottomPanelHeight: state.bottomPanelHeight,
      bottomPanelCollapsed: state.bottomPanelCollapsed,
      activeBottomTab: state.activeBottomTab,
    },
  };
}

export function exportWorkspaceJson(state: WorkspaceState): string {
  const serializable = serializeWorkspace(state);
  return JSON.stringify(serializable, null, 2);
}
