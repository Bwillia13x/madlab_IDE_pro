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
})