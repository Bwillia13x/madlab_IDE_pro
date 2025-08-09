'use client';

import { Minimize2, Square, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspaceStore } from '@/lib/store';

export function TitleBar() {
  const { sheets, activeSheetId } = useWorkspaceStore();
  const activeSheet = sheets.find(s => s.id === activeSheetId);

  return (
    <div className="h-8 bg-[#323233] border-b border-[#2d2d30] flex items-center justify-between px-2 text-xs text-[#cccccc] select-none">
      {/* Left: Window controls (macOS style) */}
      <div className="flex items-center gap-2">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28ca42]" />
        </div>
      </div>

      {/* Center: Title */}
      <div className="flex items-center gap-2 text-center flex-1">
        <span className="font-medium">
          {activeSheet ? `${activeSheet.title} - ` : ''}MAD LAB - Agent-Programmable Workbench
        </span>
      </div>

      {/* Right: Window controls (Windows style - hidden on macOS) */}
      <div className="hidden md:flex items-center">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-[#3e3e42]">
          <Minimize2 className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-[#3e3e42]">
          <Square className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-red-600">
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}