"use client";

import { useEffect } from 'react';
import { useWorkspaceStore } from '@/lib/store';

export function KeyboardProvider({ children }: { children: React.ReactNode }) {
  const { 
    toggleExplorer, 
    toggleChat,
    addSheet,
    closeSheet,
    activeSheetId,
    sheets,
    setActiveSheet,
    selectedWidgetId,
    setSelectedWidget,
    removeWidget,
    duplicateWidget,
    setInspectorOpen,
    inspectorOpen,
    dataProvider,
    setDataProvider
  } = useWorkspaceStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore shortcuts if focus is on an input, textarea, select or contenteditable
      const target = event.target as HTMLElement;
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
        (target as any)?.isContentEditable
      ) {
        // Still allow Escape to clear widget selection even in inputs
        if (event.key === 'Escape') {
          event.preventDefault();
          setSelectedWidget(undefined);
        }
        return;
      }

      const isCtrlOrCmd = event.ctrlKey || event.metaKey;
      const isAlt = event.altKey;
      const isShift = event.shiftKey;

      // Panel toggles (Alt+Number)
      if (isAlt && event.key === '1') {
        event.preventDefault();
        toggleExplorer();
        return;
      }

      if (isAlt && event.key === '3') {
        event.preventDefault();
        toggleChat();
        return;
      }

      // Data provider toggle (Alt+P)
      if (isAlt && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        const next = dataProvider === 'mock' ? 'extension' : 'mock';
        try {
          setDataProvider(next);
        } catch (e) {
          // Silent fallback on provider switch failure
        }
        return;
      }

      // Sheet management (Ctrl/Cmd+Key)
      if (isCtrlOrCmd) {
        switch (event.key.toLowerCase()) {
          case 'n':
            // New sheet
            event.preventDefault();
            addSheet('blank', 'New Sheet');
            return;
            
          case 'w':
            // Close current sheet
            if (activeSheetId && sheets.length > 1) {
              event.preventDefault();
              closeSheet(activeSheetId);
            }
            return;
            
          case 't':
            // Open preset picker via custom event the UI listens to
            event.preventDefault();
            window.dispatchEvent(new Event('madlab:toggle-command-palette'));
            return;
            
          case 'i':
            // Toggle inspector
            event.preventDefault();
            setInspectorOpen?.(!inspectorOpen);
            return;
            
          case 'k':
            // Command palette
            event.preventDefault();
            window.dispatchEvent(new Event('madlab:toggle-command-palette'));
            return;
          
          case 'd':
            // Duplicate selected widget (handled by editor but also available globally)
            if (selectedWidgetId && activeSheetId) {
              event.preventDefault();
              duplicateWidget(activeSheetId, selectedWidgetId);
            }
            return;
          
          case 'e':
            // Focus on explorer
            event.preventDefault();
            const explorerPanel = document.querySelector('[data-testid="explorer"]') as HTMLElement;
            explorerPanel?.focus();
            return;
          
          case 'j':
            // Focus on chat panel  
            event.preventDefault();
            const chatPanel = document.querySelector('[data-testid="agent-chat"]') as HTMLElement;
            chatPanel?.focus();
            return;
        }

        // Sheet switching (Ctrl/Cmd+1-9)
        if (event.key >= '1' && event.key <= '9') {
          const index = parseInt(event.key) - 1;
          if (sheets[index]) {
            event.preventDefault();
            setActiveSheet(sheets[index].id);
          }
          return;
        }
      }

      // Widget operations are handled within the editor region (GridCanvas) to support
      // local behaviors like confirmation dialogs. Avoid handling them globally here.

      // Advanced shortcuts
      if (isCtrlOrCmd) {
        switch (event.key.toLowerCase()) {
          case 'f':
            // Search/Find (future feature)
            event.preventDefault();
            // Search functionality placeholder
            return;
            
          case 'h':
            // Help/Documentation
            event.preventDefault();
            window.open('https://docs.madlab.ai', '_blank');
            return;
            
          case 'r':
            // Refresh current sheet data
            if (activeSheetId) {
              event.preventDefault();
              // Trigger data refresh for current sheet
              // Implementation would refresh data providers
            }
            return;
            
          case 's':
            // Save/Export current workspace
            event.preventDefault();
            try {
              const workspaceData = JSON.stringify(useWorkspaceStore.getState(), null, 2);
              const blob = new Blob([workspaceData], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `madlab-workspace-${new Date().toISOString().split('T')[0]}.json`;
              a.click();
              URL.revokeObjectURL(url);
            } catch (e) {
              // Silent fallback on export failure
            }
            return;
            
          case 'z':
            // Undo (future feature with command history)
            event.preventDefault();
            // Undo functionality (coming soon)
            return;
            
          case 'y':
            // Redo (future feature with command history)
            event.preventDefault();
            // Redo functionality (coming soon)
            return;
        }
      }

      // Function keys
      switch (event.key) {
        case 'F1':
          // Help
          event.preventDefault();
          window.open('https://docs.madlab.ai/keyboard-shortcuts', '_blank');
          return;
          
        case 'F5':
          // Refresh data
          event.preventDefault();
          window.location.reload();
          return;
          
        case 'F11':
          // Toggle fullscreen
          event.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            document.documentElement.requestFullscreen();
          }
          return;
      }

      // Global Escape to deselect
      if (event.key === 'Escape') {
        event.preventDefault();
        setSelectedWidget(undefined);
        return;
      }

      // Tab navigation through sheets
      if (event.key === 'Tab' && !isCtrlOrCmd && !target.closest('button, input, textarea, select, [tabindex]')) {
        const currentIndex = sheets.findIndex(s => s.id === activeSheetId);
        if (currentIndex !== -1) {
          event.preventDefault();
          const nextIndex = isShift 
            ? (currentIndex === 0 ? sheets.length - 1 : currentIndex - 1)
            : (currentIndex + 1) % sheets.length;
          setActiveSheet(sheets[nextIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    toggleExplorer,
    toggleChat,
    addSheet,
    closeSheet,
    activeSheetId,
    sheets,
    setActiveSheet,
    selectedWidgetId,
    setSelectedWidget,
    removeWidget,
    duplicateWidget,
    setInspectorOpen,
    inspectorOpen,
    dataProvider,
    setDataProvider,
  ]);

  return <>{children}</>;
}
