import { create } from 'zustand';
import type { Widget } from './store';

interface WidgetState {
  widgets: Widget[];
  addWidget: (widget: Widget) => void;
  removeWidget: (widgetId: string) => void;
  updateWidget: (widgetId: string, updates: Partial<Widget>) => void;
}

export const useWidgetStore = create<WidgetState>((set) => ({
  widgets: [],
  addWidget: (widget) => set((state) => ({ 
    widgets: [...state.widgets, widget] 
  })),
  removeWidget: (widgetId) => set((state) => ({ 
    widgets: state.widgets.filter(w => w.id !== widgetId) 
  })),
  updateWidget: (widgetId, updates) => set((state) => ({
    widgets: state.widgets.map(w => 
      w.id === widgetId ? { ...w, ...updates } : w
    )
  })),
}));