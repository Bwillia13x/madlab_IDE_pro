'use client';

import { SheetTabs } from './SheetTabs';
import { GridCanvas } from './GridCanvas';
import { useWorkspaceStore } from '@/lib/store';

export function Editor() {
  const { sheets, activeSheetId } = useWorkspaceStore();
  const activeSheet = sheets.find(s => s.id === activeSheetId);

  return (
    <div className="flex-1 flex flex-col bg-[#1e1e1e] min-h-0">
      <SheetTabs />
      <div className="flex-1 relative">
        {activeSheet ? (
          <GridCanvas sheet={activeSheet} />
        ) : (
          <div className="flex items-center justify-center h-full text-[#969696]">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Welcome to MAD LAB</h3>
              <p className="text-sm">Click the "+" button to create your first sheet</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}