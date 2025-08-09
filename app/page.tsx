'use client';

import { useEffect } from 'react';
import { TitleBar } from '@/components/chrome/TitleBar';
import { ActivityBar } from '@/components/chrome/ActivityBar';
import { Explorer } from '@/components/chrome/Explorer';
import { Editor } from '@/components/editor/Editor';
import { AgentChat } from '@/components/panels/AgentChat';
import { BottomPanel } from '@/components/panels/BottomPanel';
import { StatusBar } from '@/components/chrome/StatusBar';
import { useWorkspaceStore } from '@/lib/store';

export default function Home() {
  const { hydrate } = useWorkspaceStore();

  useEffect(() => {
    // Hydrate store from localStorage on mount
    hydrate();
  }, [hydrate]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Title Bar */}
      <TitleBar />
      
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar */}
        <ActivityBar />
        
        {/* Explorer Panel */}
        <Explorer />
        
        {/* Editor Region */}
        <div className="flex-1 flex flex-col min-w-0">
          <Editor />
          <BottomPanel />
        </div>
        
        {/* Agent Chat Panel */}
        <AgentChat />
      </div>
      
      {/* Status Bar */}
      <StatusBar />
    </div>
  );
}