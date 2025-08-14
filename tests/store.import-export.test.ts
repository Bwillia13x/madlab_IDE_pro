import { describe, it, expect, beforeEach } from 'vitest'
import { useWorkspaceStore } from '@/lib/store'

describe('Workspace Import/Export', () => {
  beforeEach(() => {
    // Reset store state before each test to a minimal baseline
    useWorkspaceStore.setState({
      sheets: [],
      activeSheetId: undefined,
      messages: [],
      theme: 'dark',
      explorerCollapsed: false,
      chatCollapsed: false,
      bottomPanelHeight: 200,
      bottomPanelCollapsed: false,
      activeBottomTab: 'output',
      selectedWidgetId: undefined,
      inspectorOpen: false,
      schemaVersion: 1,
    })
  })

  it('exportWorkspace returns valid JSON with expected fields', () => {
    const store = useWorkspaceStore.getState()

    // prepare state
    store.addSheet('blank', 'Export Test')
    store.addMessage('Hello', 'user')
    store.toggleExplorer()
    store.setExplorerWidth(333)

    const json = store.exportWorkspace()
    expect(typeof json).toBe('string')
    const parsed = JSON.parse(json)

    expect(parsed.schemaVersion).toBe(1)
    expect(Array.isArray(parsed.sheets)).toBe(true)
    expect(parsed.sheets.length).toBe(1)
    expect(parsed.activeSheetId).toBe(useWorkspaceStore.getState().activeSheetId)

    expect(Array.isArray(parsed.messages)).toBe(true)
    expect(parsed.messages.length).toBe(1)
    expect(typeof parsed.messages[0].timestamp).toBe('string')

    expect(parsed.ui).toBeTruthy()
    expect(parsed.ui.theme).toBe('dark')
    expect(typeof parsed.ui.explorerCollapsed).toBe('boolean')
    expect(parsed.ui.explorerWidth).toBe(333)
    expect(typeof parsed.ui.bottomPanelHeight).toBe('number')
  })

  it('importWorkspace restores sheets, messages, and UI state', () => {
    const store = useWorkspaceStore.getState()

    // build a workspace and export it
    store.addSheet('blank', 'Import Source')
    store.addMessage('From export', 'user')
    const exported = store.exportWorkspace()

    // mutate current state so we can verify restoration
    useWorkspaceStore.setState({
      sheets: [],
      activeSheetId: undefined,
      messages: [],
      theme: 'light',
      explorerCollapsed: true,
      chatCollapsed: true,
      bottomPanelHeight: 100,
      bottomPanelCollapsed: true,
      activeBottomTab: 'log',
      selectedWidgetId: undefined,
      inspectorOpen: false,
      schemaVersion: 1,
    })

    const ok = useWorkspaceStore.getState().importWorkspace(exported)
    expect(ok).toBe(true)

    const after = useWorkspaceStore.getState()
    expect(after.sheets.length).toBe(1)
    expect(after.activeSheetId).toBeTruthy()
    expect(after.messages.length).toBe(1)
    expect(after.messages[0].content).toBe('From export')
    expect(after.messages[0].timestamp instanceof Date).toBe(true)

    // ui state restored
    expect(after.theme).toBe('dark')
    expect(typeof after.explorerCollapsed).toBe('boolean')
    expect(typeof after.explorerWidth).toBe('number')
    expect(typeof after.bottomPanelHeight).toBe('number')
  })

  it('importWorkspace sets default explorerWidth when missing in payload', () => {
    const minimal = {
      schemaVersion: 1,
      sheets: [],
      activeSheetId: undefined,
      messages: [],
      ui: {
        theme: 'dark',
        explorerCollapsed: false,
        // explorerWidth intentionally omitted
        chatCollapsed: false,
        bottomPanelHeight: 200,
        bottomPanelCollapsed: false,
        activeBottomTab: 'output',
      },
    }
    const ok = useWorkspaceStore.getState().importWorkspace(JSON.stringify(minimal))
    expect(ok).toBe(true)
    expect(useWorkspaceStore.getState().explorerWidth).toBe(280)
  })

  it('importWorkspace handles invalid payloads safely', () => {
    const ok = useWorkspaceStore.getState().importWorkspace('{not json')
    expect(ok).toBe(false)
  })
})
