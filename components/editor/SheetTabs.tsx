'use client';

import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useWorkspaceStore } from '@/lib/store';
import { SHEET_PRESETS } from '@/lib/presets';
import type { SheetKind } from '@/lib/store';
import { cn } from '@/lib/utils';

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

  return (
    <div className="h-9 bg-[#2d2d30] border-b border-[#2d2d30] flex items-center">
      {/* Sheet Tabs */}
      <div className="flex overflow-x-auto scrollbar-none">
        {sheets.map((sheet) => (
          <div
            key={sheet.id}
            className={cn(
              "flex items-center h-9 px-3 border-r border-[#2d2d30] cursor-pointer group hover:bg-[#37373d] min-w-0",
              activeSheetId === sheet.id && "bg-[#1e1e1e]"
            )}
            onClick={() => setActiveSheet(sheet.id)}
            onMouseDown={(e) => handleMiddleClick(e, sheet.id)}
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
          </div>
        ))}
      </div>

      {/* Add Sheet Button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-9 w-9 p-0 hover:bg-[#37373d]"
          >
            <Plus className="h-4 w-4 text-[#cccccc]" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80">
          {Object.entries(SHEET_PRESETS).map(([kind, preset]) => (
            <DropdownMenuItem
              key={kind}
              onClick={() => handleAddSheet(kind as SheetKind)}
              className="flex flex-col items-start gap-1 p-3"
            >
              <div className="font-medium">{preset.label}</div>
              <div className="text-xs text-muted-foreground">
                {preset.description}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}