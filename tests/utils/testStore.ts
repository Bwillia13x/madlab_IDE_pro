import type { WorkspaceState, Message, Sheet } from '@/lib/store';

export function createResetState(): WorkspaceState {
  return {
    sheets: [] as Sheet[],
    activeSheetId: undefined,
    messages: [] as Message[],
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
    // Actions are not part of the state, so they are not included here
  } as unknown as WorkspaceState;
}