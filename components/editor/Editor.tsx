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
            <div className="text-center space-y-3">
              <h3 className="text-lg font-medium">Welcome to MAD LAB</h3>
              <p className="text-sm">Get started by choosing a data provider or creating a sheet.</p>
              <div className="flex items-center justify-center gap-2">
                <button
                  className="px-3 py-1.5 text-xs rounded border border-[#3e3e42] bg-[#2d2d30] hover:bg-[#3a3a3e]"
                  onClick={() => window.dispatchEvent(new Event('madlab:open-settings'))}
                >
                  Configure Provider
                </button>
                <button
                  className="px-3 py-1.5 text-xs rounded border border-[#3e3e42] bg-[#2d2d30] hover:bg-[#3a3a3e]"
                  onClick={() => window.dispatchEvent(new Event('madlab:open-marketplace'))}
                >
                  Browse Templates
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
