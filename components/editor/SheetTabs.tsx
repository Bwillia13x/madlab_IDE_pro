'use client';

import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspaceStore } from '@/lib/store';
import { SHEET_PRESETS } from '@/lib/presets';
import type { SheetKind } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { PresetPicker } from './PresetPicker';

export function SheetTabs() {
  const { sheets, activeSheetId, addSheet, closeSheet, setActiveSheet } = useWorkspaceStore();

  const handleAddSheet = (kind: SheetKind) => {
    const preset = SHEET_PRESETS[kind];
    addSheet(kind, preset.label);
  };

  const handleCloseSheet = (e: React.MouseEvent, sheetId: string) => {
    e.stopPropagation();
    closeSheet(sheetId);
  };

  const handleMiddleClick = (e: React.MouseEvent, sheetId: string) => {
    if (e.button === 1) { // Middle click
      e.preventDefault();
      closeSheet(sheetId);
    }
  };

  const [presetOpen, setPresetOpen] = useState(false);

  // Keyboard shortcuts: Cmd/Ctrl+W close active, Cmd/Ctrl+T open preset picker
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === 'w') {
        if (activeSheetId) {
          e.preventDefault();
          closeSheet(activeSheetId);
        }
      } else if (key === 't') {
        e.preventDefault();
        setPresetOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeSheetId, closeSheet]);

  return (
    <div className="h-9 bg-[#2d2d30] border-b border-[#2d2d30] flex items-center">
      {/* Sheet Tabs */}
      <div className="flex overflow-x-auto scrollbar-none" role="tablist" aria-label="Sheets">
        {sheets.map((sheet) => (
          <button
            key={sheet.id}
            className={cn(
              "flex items-center h-9 px-3 border-r border-[#2d2d30] cursor-pointer group hover:bg-[#37373d] min-w-0",
              activeSheetId === sheet.id && "bg-[#1e1e1e]"
            )}
            onClick={() => setActiveSheet(sheet.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveSheet(sheet.id);
            }}
            onMouseDown={(e) => handleMiddleClick(e, sheet.id)}
            role="tab"
            aria-selected={activeSheetId === sheet.id ? 'true' : 'false'}
            tabIndex={0}
          >
            <span className="text-xs text-[#cccccc] truncate max-w-32">
              {sheet.title}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 ml-2 opacity-0 group-hover:opacity-100 hover:bg-[#464647]"
              onClick={(e) => handleCloseSheet(e, sheet.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </button>
        ))}
      </div>

      {/* Add Sheet Button + Preset Picker */}
      <PresetPicker
        open={presetOpen}
        onOpenChange={setPresetOpen}
        onSelect={(kind) => {
          handleAddSheet(kind);
          setPresetOpen(false);
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 hover:bg-[#37373d]"
          data-testid="add-sheet-button"
          aria-label="Open Preset Picker"
        >
          <Plus className="h-4 w-4 text-[#cccccc]" />
        </Button>
      </PresetPicker>
    </div>
  );
}