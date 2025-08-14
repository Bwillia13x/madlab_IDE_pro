import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore } from '@/lib/store';
import { createResetState } from './utils/testStore';

function resetStore() {
  useWorkspaceStore.setState(createResetState());
}

describe('Workspace Templates', () => {
  beforeEach(() => {
    resetStore()
    if (typeof window !== 'undefined') {
      window.localStorage.clear()
    }
  })

  it('saves current sheet as a template and lists it', () => {
    const store = useWorkspaceStore.getState()
    store.addSheet('charting', 'My Chart Sheet')
    const sheetId = useWorkspaceStore.getState().activeSheetId!
    const widgetCount = useWorkspaceStore.getState().sheets[0].widgets.length
    expect(widgetCount).toBeGreaterThan(0)

    const ok = store.saveTemplate('MyTpl', sheetId)
    expect(ok).toBe(true)

    const templates = store.getTemplates()
    const tpl = templates.find(t => t.name === 'MyTpl')
    expect(tpl).toBeTruthy()
    expect(tpl?.title).toBe('My Chart Sheet')
    expect(tpl?.widgets.length).toBe(widgetCount)
  })

  it('creates a new sheet from a saved template with fresh widget ids', () => {
    const store = useWorkspaceStore.getState()
    store.addSheet('valuation', 'Val Sheet')
    const original = useWorkspaceStore.getState().sheets[0]
    const originalIds = original.widgets.map(w => w.id)

    const saved = store.saveTemplate('ValTpl', original.id)
    expect(saved).toBe(true)

    const ok = store.createSheetFromTemplate('ValTpl')
    expect(ok).toBe(true)

    const state = useWorkspaceStore.getState()
    expect(state.sheets.length).toBe(2)
    const newSheet = state.sheets[1]
    expect(newSheet.title).toBe('Val Sheet')
    expect(newSheet.widgets.length).toBe(original.widgets.length)
    // ensure widget ids are different from the template source
    const newIds = newSheet.widgets.map(w => w.id)
    for (const id of newIds) {
      expect(originalIds).not.toContain(id)
    }
  })

  it('deletes a template', () => {
    const store = useWorkspaceStore.getState()
    store.addSheet('valuation', 'ToDelete')
    const id = useWorkspaceStore.getState().activeSheetId!
    expect(store.saveTemplate('TmpDel', id)).toBe(true)
    expect(store.getTemplates().some(t => t.name === 'TmpDel')).toBe(true)
    expect(store.deleteTemplate('TmpDel')).toBe(true)
    expect(store.getTemplates().some(t => t.name === 'TmpDel')).toBe(false)
  })

  it('renames a template (overwrite if conflict)', () => {
    const store = useWorkspaceStore.getState()
    store.addSheet('charting', 'ToRename')
    const id = useWorkspaceStore.getState().activeSheetId!
    expect(store.saveTemplate('OldName', id)).toBe(true)
    // create a conflicting name to ensure overwrite behavior keeps single entry
    expect(store.saveTemplate('NewName', id)).toBe(true)
    expect(store.renameTemplate('OldName', 'NewName')).toBe(true)
    const names = store.getTemplates().map(t => t.name)
    // Should only have one 'NewName'
    expect(names.filter(n => n === 'NewName').length).toBe(1)
  })
})
