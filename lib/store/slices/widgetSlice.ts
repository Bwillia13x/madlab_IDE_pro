/**
 * Widget slice
 */
import type { Layout } from 'react-grid-layout'
import type { Widget } from '@/lib/store'

export function createWidgetSlice(
	set: (fn: (state: any) => void | Partial<any>) => void,
	_get: () => any
): {
	setSelectedWidget: (id?: string) => void;
	addWidget: (sheetId: string, widget: Omit<Widget, 'id'>) => void;
	updateWidget: (sheetId: string, widget: Partial<Widget> & { id: string }) => void;
	removeWidget: (sheetId: string, widgetId: string) => void;
	duplicateWidget: (sheetId: string, widgetId: string) => void;
	updateLayout: (sheetId: string, layout: Layout[]) => void;
} {
	return {
		setSelectedWidget: (id?: string) => set(() => ({ selectedWidgetId: id })),
		addWidget: (sheetId: string, widget: Omit<Widget, 'id'>) => {
			const id = `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
			const newWidget = { version: 1, ...widget, id };
			set((state: any) => ({
				sheets: state.sheets.map((sheet: any) => sheet.id === sheetId ? { ...sheet, widgets: [...sheet.widgets, newWidget] } : sheet),
			}));
		},
		updateWidget: (sheetId: string, widget: Partial<Widget> & { id: string }) => {
			set((state: any) => ({
				sheets: state.sheets.map((sheet: any) => sheet.id === sheetId ? { ...sheet, widgets: sheet.widgets.map((w: Widget) => (w.id === widget.id ? { ...w, ...widget } : w)) } : sheet),
			}));
		},
		removeWidget: (sheetId: string, widgetId: string) => {
			try {
				// Attempt instance cleanup if registered
				const reg = require('@/lib/widgets/registry')
				if (reg?.schemaWidgetRegistry?.cleanupInstance) {
					reg.schemaWidgetRegistry.cleanupInstance(widgetId)
				}
			} catch {}
			set((state: any) => ({
				sheets: state.sheets.map((sheet: any) => sheet.id === sheetId ? { ...sheet, widgets: sheet.widgets.filter((w: Widget) => w.id !== widgetId) } : sheet),
				selectedWidgetId: state.selectedWidgetId === widgetId ? undefined : state.selectedWidgetId,
			}));
		},
		duplicateWidget: (sheetId: string, widgetId: string) => {
			set((state: any) => {
				const sheet = state.sheets.find((s: any) => s.id === sheetId);
				const source = sheet?.widgets.find((w: Widget) => w.id === widgetId);
				if (!sheet || !source) return {} as any;
				const GRID_COLUMNS = 12;
				const nextLayout: Layout = { ...source.layout } as Layout;
				if (nextLayout.x + nextLayout.w + 1 <= GRID_COLUMNS) nextLayout.x = nextLayout.x + 1; else { nextLayout.x = 0; nextLayout.y = nextLayout.y + 1; }
				const newId = `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
				const duplicated: Widget = { id: newId, type: source.type, title: `${source.title} (Copy)`, layout: nextLayout, props: source.props ? { ...source.props } : undefined, version: source.version ?? 1 };
				return {
					sheets: state.sheets.map((s: any) => s.id === sheetId ? { ...s, widgets: [...s.widgets, duplicated] } : s),
					selectedWidgetId: newId,
				};
			});
		},
		updateLayout: (sheetId: string, layout: Layout[]) => {
			set((state: any) => ({
				sheets: state.sheets.map((sheet: any) => sheet.id === sheetId ? { ...sheet, widgets: sheet.widgets.map((widget: Widget) => ({ ...widget, layout: (layout.find((l: Layout) => l.i === widget.id) as Layout) || widget.layout })) } : sheet),
			}));
		},
	};
}


