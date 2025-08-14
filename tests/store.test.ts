import { describe, it, expect, beforeEach } from 'vitest'
import { useWorkspaceStore } from '@/lib/store'

describe('Workspace Store', () => {
  beforeEach(() => {
    // Reset store state before each test
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
    })
  })

  describe('Sheet Management', () => {
    it('should add a new sheet', () => {
      const { addSheet, sheets } = useWorkspaceStore.getState()
      
      addSheet('valuation', 'Test Valuation Sheet')
      
      const updatedState = useWorkspaceStore.getState()
      expect(updatedState.sheets).toHaveLength(1)
      expect(updatedState.sheets[0].title).toBe('Test Valuation Sheet')
      expect(updatedState.sheets[0].kind).toBe('valuation')
      expect(updatedState.activeSheetId).toBe(updatedState.sheets[0].id)
    })

    it('should close a sheet', () => {
      const { addSheet, closeSheet } = useWorkspaceStore.getState()
      
      addSheet('blank', 'Sheet 1')
      addSheet('blank', 'Sheet 2')
      
      const state = useWorkspaceStore.getState()
      const sheetToClose = state.sheets[0].id
      
      closeSheet(sheetToClose)
      
      const updatedState = useWorkspaceStore.getState()
      expect(updatedState.sheets).toHaveLength(1)
      expect(updatedState.sheets[0].title).toBe('Sheet 2')
    })

    it('should set active sheet', () => {
      const { addSheet, setActiveSheet } = useWorkspaceStore.getState()
      
      addSheet('blank', 'Sheet 1')
      addSheet('blank', 'Sheet 2')
      
      const state = useWorkspaceStore.getState()
      const sheet1Id = state.sheets[0].id
      
      setActiveSheet(sheet1Id)
      
      const updatedState = useWorkspaceStore.getState()
      expect(updatedState.activeSheetId).toBe(sheet1Id)
    })
  })

  describe('Widget Management', () => {
    it('should add a widget to a sheet', () => {
      const { addSheet, addWidget } = useWorkspaceStore.getState()
      
      addSheet('blank', 'Test Sheet')
      const state = useWorkspaceStore.getState()
      const sheetId = state.sheets[0].id
      
      addWidget(sheetId, {
        type: 'kpi-card',
        title: 'Test Widget',
        layout: { i: '', x: 0, y: 0, w: 6, h: 4 }
      })
      
      const updatedState = useWorkspaceStore.getState()
      expect(updatedState.sheets[0].widgets).toHaveLength(1)
      expect(updatedState.sheets[0].widgets[0].title).toBe('Test Widget')
    })

    it('should update a widget', () => {
      const { addSheet, addWidget, updateWidget } = useWorkspaceStore.getState()
      
      addSheet('blank', 'Test Sheet')
      const state = useWorkspaceStore.getState()
      const sheetId = state.sheets[0].id
      
      addWidget(sheetId, {
        type: 'kpi-card',
        title: 'Original Title',
        layout: { i: '', x: 0, y: 0, w: 6, h: 4 }
      })
      
      const state2 = useWorkspaceStore.getState()
      const widgetId = state2.sheets[0].widgets[0].id
      
      updateWidget(sheetId, { id: widgetId, title: 'Updated Title' })
      
      const updatedState = useWorkspaceStore.getState()
      expect(updatedState.sheets[0].widgets[0].title).toBe('Updated Title')
    })

    it('should remove a widget', () => {
      const { addSheet, addWidget, removeWidget } = useWorkspaceStore.getState()
      
      addSheet('blank', 'Test Sheet')
      const state = useWorkspaceStore.getState()
      const sheetId = state.sheets[0].id
      
      addWidget(sheetId, {
        type: 'kpi-card',
        title: 'Widget to Remove',
        layout: { i: '', x: 0, y: 0, w: 6, h: 4 }
      })
      
      const state2 = useWorkspaceStore.getState()
      const widgetId = state2.sheets[0].widgets[0].id
      
      removeWidget(sheetId, widgetId)
      
      const updatedState = useWorkspaceStore.getState()
      expect(updatedState.sheets[0].widgets).toHaveLength(0)
    })

    it('should duplicate a widget with offset position', () => {
      const { addSheet, addWidget, duplicateWidget } = useWorkspaceStore.getState()
      
      addSheet('blank', 'Test Sheet')
      const state = useWorkspaceStore.getState()
      const sheetId = state.sheets[0].id
      
      addWidget(sheetId, {
        type: 'kpi-card',
        title: 'Original Widget',
        layout: { i: '', x: 0, y: 0, w: 6, h: 4 }
      })
      
      const state2 = useWorkspaceStore.getState()
      const originalId = state2.sheets[0].widgets[0].id
      
      duplicateWidget(sheetId, originalId)
      
      const updatedState = useWorkspaceStore.getState()
      expect(updatedState.sheets[0].widgets).toHaveLength(2)
      const duplicate = updatedState.sheets[0].widgets[1]
      expect(duplicate.title).toBe('Original Widget (Copy)')
      expect(duplicate.layout.x).toBe(1) // Offset by +1 column
      expect(duplicate.layout.y).toBe(0)
      expect(duplicate.id).not.toBe(originalId)
    })

    it('should set and clear selected widget', () => {
      const { addSheet, addWidget, setSelectedWidget } = useWorkspaceStore.getState()
      
      addSheet('blank', 'Test Sheet')
      const state = useWorkspaceStore.getState()
      const sheetId = state.sheets[0].id
      
      addWidget(sheetId, {
        type: 'kpi-card',
        title: 'Test Widget',
        layout: { i: '', x: 0, y: 0, w: 6, h: 4 }
      })
      
      const state2 = useWorkspaceStore.getState()
      const widgetId = state2.sheets[0].widgets[0].id
      
      setSelectedWidget(widgetId)
      expect(useWorkspaceStore.getState().selectedWidgetId).toBe(widgetId)
      
      setSelectedWidget(undefined)
      expect(useWorkspaceStore.getState().selectedWidgetId).toBeUndefined()
    })
  })

  describe('Chat Management', () => {
    it('should add a message', () => {
      const { addMessage } = useWorkspaceStore.getState()
      
      addMessage('Hello, agent!', 'user')
      
      const state = useWorkspaceStore.getState()
      expect(state.messages).toHaveLength(1)
      expect(state.messages[0].content).toBe('Hello, agent!')
      expect(state.messages[0].sender).toBe('user')
    })

    it('should clear messages', () => {
      const { addMessage, clearMessages } = useWorkspaceStore.getState()
      
      addMessage('Message 1', 'user')
      addMessage('Message 2', 'agent')
      
      clearMessages()
      
      const state = useWorkspaceStore.getState()
      expect(state.messages).toHaveLength(0)
    })
  })

  describe('Template Management', () => {
    it('should save a sheet as template', () => {
      const { addSheet, addWidget, saveTemplate, getTemplates } = useWorkspaceStore.getState()
      
      // Use blank sheet to avoid preset widgets
      addSheet('blank', 'DCF Analysis')
      const state = useWorkspaceStore.getState()
      const sheetId = state.sheets[0].id
      
      // Clear any default widgets from blank preset
      const currentSheet = useWorkspaceStore.getState().sheets.find(s => s.id === sheetId)!
      const initialWidgetCount = currentSheet.widgets.length
      
      addWidget(sheetId, {
        type: 'kpi-card',
        title: 'Revenue',
        layout: { i: '', x: 0, y: 0, w: 6, h: 4 }
      })
      
      saveTemplate('My DCF Template', sheetId)
      
      const templates = getTemplates()
      expect(templates).toHaveLength(1)
      expect(templates[0].name).toBe('My DCF Template')
      // Template should include all widgets (initial + added)
      expect(templates[0].widgets.length).toBe(initialWidgetCount + 1)
      // Should contain our added widget
      const ourWidget = templates[0].widgets.find(w => w.title === 'Revenue')
      expect(ourWidget).toBeDefined()
    })

    it('should create sheet from template with fresh IDs', () => {
      const { addSheet, addWidget, saveTemplate, createSheetFromTemplate } = useWorkspaceStore.getState()
      
      // Create original sheet with blank kind (no preset widgets)
      addSheet('blank', 'Original Sheet')
      const state = useWorkspaceStore.getState()
      const originalSheetId = state.sheets[0].id
      
      addWidget(originalSheetId, {
        type: 'kpi-card',
        title: 'Template Widget',
        layout: { i: '', x: 0, y: 0, w: 6, h: 4 }
      })
      
      const originalState = useWorkspaceStore.getState()
      // Should have 2 widgets: the blank preset + our added widget
      expect(originalState.sheets[0].widgets.length).toBeGreaterThan(0)
      const ourWidget = originalState.sheets[0].widgets.find(w => w.title === 'Template Widget')
      expect(ourWidget).toBeDefined()
      const originalWidgetId = ourWidget!.id
      
      // Save as template
      saveTemplate('Test Template', originalSheetId)
      
      // Create from template
      createSheetFromTemplate('Test Template')
      
      const finalState = useWorkspaceStore.getState()
      expect(finalState.sheets).toHaveLength(2)
      
      const newSheet = finalState.sheets[1]
      expect(newSheet.id).not.toBe(originalSheetId)
      const newWidgetWithTitle = newSheet.widgets.find(w => w.title === 'Template Widget')
      expect(newWidgetWithTitle).toBeDefined()
      expect(newWidgetWithTitle!.id).not.toBe(originalWidgetId)
    })
  })

  describe('UI State Management', () => {
    it('should toggle explorer panel', () => {
      const { toggleExplorer } = useWorkspaceStore.getState()
      
      // Initially not collapsed
      expect(useWorkspaceStore.getState().explorerCollapsed).toBe(false)
      
      toggleExplorer()
      expect(useWorkspaceStore.getState().explorerCollapsed).toBe(true)
      
      toggleExplorer()
      expect(useWorkspaceStore.getState().explorerCollapsed).toBe(false)
    })

    it('should set explorer width', () => {
      const { setExplorerWidth } = useWorkspaceStore.getState()
      
      setExplorerWidth(350)
      expect(useWorkspaceStore.getState().explorerWidth).toBe(350)
      
      // Should enforce minimum width
      setExplorerWidth(150)
      expect(useWorkspaceStore.getState().explorerWidth).toBe(200)
    })

    it('should toggle chat panel', () => {
      const { toggleChat } = useWorkspaceStore.getState()
      
      // Initially not collapsed
      expect(useWorkspaceStore.getState().chatCollapsed).toBe(false)
      
      toggleChat()
      expect(useWorkspaceStore.getState().chatCollapsed).toBe(true)
      
      toggleChat()
      expect(useWorkspaceStore.getState().chatCollapsed).toBe(false)
    })

    it('should set active bottom panel tab', () => {
      const { setActiveBottomTab } = useWorkspaceStore.getState()
      
      setActiveBottomTab('problems')
      expect(useWorkspaceStore.getState().activeBottomTab).toBe('problems')
      
      setActiveBottomTab('terminal')
      expect(useWorkspaceStore.getState().activeBottomTab).toBe('terminal')
    })
  })
})