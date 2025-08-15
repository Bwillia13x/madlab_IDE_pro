'use client';

import { useState } from 'react';
import { Info, Settings } from 'lucide-react';
import { useWorkspaceStore, type Sheet } from '@/lib/store';
import { DataProviderHealth } from '@/components/panels/DataProviderHealth';
import { DataProviderSettings } from '@/components/panels/DataProviderSettings';

export function TitleBar() {
  const { sheets, activeSheetId } = useWorkspaceStore();
  const activeSheet = sheets.find((s: Sheet) => s.id === activeSheetId);
  const [healthOpen, setHealthOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div
      className="h-10 bg-background border-b border-border/20 flex items-center justify-between px-3 text-sm text-foreground select-none"
      data-testid="title-bar"
    >
      <div className="inline-flex items-center gap-2">
        <span className="font-medium text-foreground/90">{activeSheet?.title || 'MAD LAB'}</span>
      </div>
      <div className="inline-flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border hover:bg-accent"
          onClick={() => setHealthOpen(true)}
          aria-label="Open data provider health"
          data-testid="titlebar-provider-health"
        >
          <Info className="h-3.5 w-3.5" />
          <span>Health</span>
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border hover:bg-accent"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open data provider settings"
          data-testid="titlebar-provider-settings"
        >
          <Settings className="h-3.5 w-3.5" />
          <span>Settings</span>
        </button>
      </div>
      <DataProviderHealth open={healthOpen} onOpenChange={setHealthOpen} />
      <DataProviderSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
