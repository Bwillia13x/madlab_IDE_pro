import type { Layout } from 'react-grid-layout';
import { useWorkspaceStore } from '@/lib/store';

type SavedLayout = { id: string; layout: Layout }[];

const STORAGE_KEY_PREFIX = 'madlab_layout_';

export function saveActiveSheetLayout(): boolean {
  const state = useWorkspaceStore.getState();
  const activeId = state.activeSheetId;
  if (!activeId) return false;
  const sheet = state.sheets.find((s) => s.id === activeId);
  if (!sheet) return false;
  const payload: SavedLayout = sheet.widgets.map((w) => ({ id: w.id, layout: w.layout }));
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${activeId}`, JSON.stringify(payload));
    }
    return true;
  } catch {
    return false;
  }
}

export function restoreActiveSheetLayout(): boolean {
  const state = useWorkspaceStore.getState();
  const activeId = state.activeSheetId;
  if (!activeId) return false;
  try {
    const raw = typeof window !== 'undefined'
      ? window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${activeId}`)
      : null;
    if (!raw) return false;
    const saved = JSON.parse(raw) as SavedLayout;
    const layout: Layout[] = saved.map((item) => ({ ...item.layout, i: item.id }));
    state.updateLayout(activeId, layout);
    return true;
  } catch {
    return false;
  }
}

export function resetActiveSheetLayout(): boolean {
  const state = useWorkspaceStore.getState();
  const activeId = state.activeSheetId;
  if (!activeId) return false;
  const sheet = state.sheets.find((s) => s.id === activeId);
  if (!sheet) return false;
  const cols = 12;
  const defaultW = 6;
  const defaultH = 4;
  const layout: Layout[] = sheet.widgets.map((w, idx) => {
    const x = (idx * defaultW) % cols;
    const y = Math.floor((idx * defaultW) / cols) * defaultH;
    return {
      i: w.id,
      x,
      y,
      w: w.layout?.w ?? defaultW,
      h: w.layout?.h ?? defaultH,
    } as Layout;
  });
  state.updateLayout(activeId, layout);
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(`${STORAGE_KEY_PREFIX}${activeId}`);
    }
  } catch {
    // ignore
  }
  return true;
}

