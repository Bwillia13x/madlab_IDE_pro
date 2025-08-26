'use client';

import { useMemo } from 'react';
import { useWorkspaceStore } from '@/lib/store';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import '@/styles/mobile.css';

export default function MobilePage() {
  const { sheets, activeSheetId } = useWorkspaceStore();
  const activeSheet = useMemo(() => sheets.find(s => s.id === activeSheetId), [sheets, activeSheetId]);

  return (
    <div className="min-h-screen">
      <MobileLayout
        widgets={activeSheet?.widgets || []}
        onWidgetAdd={(type) => {
          if (!activeSheet) return;
          useWorkspaceStore.getState().addWidget(activeSheet.id, {
            type,
            title: type,
            layout: { i: '', x: 0, y: 0, w: 6, h: 4 },
            props: {},
          });
        }}
        onWidgetRemove={(widgetId) => {
          if (!activeSheet) return;
          useWorkspaceStore.getState().removeWidget(activeSheet.id, widgetId);
        }}
        onWidgetUpdate={(widgetId, updates) => {
          if (!activeSheet) return;
          useWorkspaceStore.getState().updateWidget(activeSheet.id, { id: widgetId, ...updates });
        }}
      />
    </div>
  );
}


