/**
 * Sheet slice
 */
import { SHEET_PRESETS, type SheetKind } from '@/lib/presets';
import type { Widget } from '@/lib/store';

export function createSheetSlice(
	set: (fn: (state: any) => void | Partial<any>) => void,
	get: () => any
): {
	addSheet: (kind: SheetKind, title?: string) => void;
	closeSheet: (id: string) => void;
	setActiveSheet: (id: string) => void;
	updateSheetTitle: (id: string, title: string) => void;
	populateSheetWithPreset: (sheetId: string, kind: SheetKind) => void;
	getPresetWidgets: (kind: SheetKind) => Omit<Widget, 'id'>[];
} {
	return {
		addSheet: (kind: SheetKind, title?: string) => {
			const id = `sheet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
			const isFirst = get().sheets.length === 0;
			const defaultTitle = title || SHEET_PRESETS[kind]?.label || `${String(kind).charAt(0).toUpperCase() + String(kind).slice(1)} Sheet`;
			const newSheet = { id, kind, title: defaultTitle, widgets: [] as Widget[] };
			set((state: any) => ({ sheets: [...state.sheets, newSheet], activeSheetId: id }));
			if (kind !== 'blank') {
				get().populateSheetWithPreset(id, kind);
			}
			if (isFirst) {
				try { get().celebrate('First sheet created'); } catch {}
			}
			// Learning progression: mark createdFirstSheet on first-ever creation
			try {
				const s = get() as any;
				if (!s.learningProgress?.createdFirstSheet) {
					s.safeUpdate?.({ learningProgress: { ...s.learningProgress, createdFirstSheet: true } });
				}
			} catch {}
		},
		closeSheet: (id: string) => {
			set((state: any) => {
				const sheets = state.sheets.filter((s: any) => s.id !== id);
				const activeSheetId = state.activeSheetId === id ? sheets[sheets.length - 1]?.id : state.activeSheetId;
				return { sheets, activeSheetId };
			});
		},
		setActiveSheet: (id: string) => {
			set(() => ({ activeSheetId: id }));
			try { localStorage.setItem('madlab_recent_sheet_id', id); } catch {}
		},
		updateSheetTitle: (id: string, title: string) => {
			set((state: any) => ({ sheets: state.sheets.map((sheet: any) => (sheet.id === id ? { ...sheet, title } : sheet)) }));
		},
		populateSheetWithPreset: (sheetId: string, kind: SheetKind) => {
			const widgets = SHEET_PRESETS[kind]?.widgets ?? [];
			widgets.forEach((w) => get().addWidget(sheetId, w));
		},
		getPresetWidgets: (kind: SheetKind) => {
			return SHEET_PRESETS[kind]?.widgets ?? [];
		},
	};
}


