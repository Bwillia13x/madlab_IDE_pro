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

    // Initialize webview bridge if present
    if (typeof window !== 'undefined' && window.madlabBridge) {
      type WebviewMsg =
        | { type: 'extension:ready'; payload?: { version?: number } }
        | { type: 'pong'; payload?: unknown }
        | { type: string; payload?: unknown };
      window.madlabBridge.onMessage((msg: WebviewMsg) => {
        // Handle simple demo messages for now
        if (msg?.type === 'extension:ready') {
          // extension is ready
        } else if (msg?.type === 'pong') {
          // keep minimal differentiation for lint; useful during dev
          console.debug('pong from extension', msg.payload);
        }
      });
      // Send a ping to extension
      window.madlabBridge.post('ping', { from: 'web' });
    }
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