'use client';

import React, { useState } from 'react';
import { TitleBar } from '@/components/chrome/TitleBar';
import { ActivityBar } from '@/components/chrome/ActivityBar';
import { Explorer } from '@/components/chrome/Explorer';
import { StatusBar } from '@/components/chrome/StatusBar';
import { AgentChat } from '@/components/panels/AgentChat';
import { BottomPanel } from '@/components/panels/BottomPanel';
import { Editor } from '@/components/editor/Editor';
import { Inspector } from '@/components/inspector/Inspector';
import { DataProvider } from '@/components/providers/DataProvider';
import { DataProviderConfig } from '@/components/providers/DataProviderConfig';
import { MarketplacePanel } from '@/components/panels/MarketplacePanel';
import { CommandPalette } from '@/components/CommandPalette';
import { DemoBanner } from '@/components/DemoBanner';
import { WidgetGallery } from '@/components/widgets/WidgetGallery';

export default function HomePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [widgetGalleryOpen, setWidgetGalleryOpen] = useState(false);

  // Listen to open-marketplace command from activity bar
  React.useEffect(() => {
    const onOpen = () => setMarketplaceOpen(true);
    window.addEventListener('madlab:open-marketplace', onOpen);
    return () => window.removeEventListener('madlab:open-marketplace', onOpen);
  }, []);

  return (
    <DataProvider>
      <TitleBar />
      <div className="flex-1 min-h-0 flex">
        <ActivityBar 
          onSettingsToggle={() => setSettingsOpen(true)}
          onWidgetGalleryToggle={() => setWidgetGalleryOpen(true)}
        />
        <Explorer />
        <div className="flex-1 min-w-0 flex flex-col">
          <Editor />
          <BottomPanel />
        </div>
        <Inspector />
        <AgentChat />
      </div>
      <StatusBar />

      {settingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-background border rounded-lg shadow-xl p-4 max-w-2xl w-full">
            <DataProviderConfig onClose={() => setSettingsOpen(false)} />
          </div>
        </div>
      )}

      {marketplaceOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-background border rounded-lg shadow-xl p-4 max-w-3xl w-full">
            <MarketplacePanel onClose={() => setMarketplaceOpen(false)} />
          </div>
        </div>
      )}
      
      <CommandPalette />
      <DemoBanner />
      <WidgetGallery 
        open={widgetGalleryOpen} 
        onOpenChange={setWidgetGalleryOpen}
      />
    </DataProvider>
  );
}