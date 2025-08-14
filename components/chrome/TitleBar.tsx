'use client';

import { useWorkspaceStore, type Sheet } from '@/lib/store';

export function TitleBar() {
  const { sheets, activeSheetId } = useWorkspaceStore();
  const activeSheet = sheets.find((s: Sheet) => s.id === activeSheetId);

  return (
    <div className="h-10 bg-background border-b border-border/20 flex items-center justify-center px-4 text-sm text-foreground select-none" data-testid="title-bar">
      <span className="font-medium text-foreground/90">
        {activeSheet?.title || 'MAD LAB'}
      </span>
    </div>
  );
}