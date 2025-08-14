import { useEffect } from 'react';
import { useWorkspaceStore } from '@/lib/store';

export function useKeyboardShortcuts() {
  const { 
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
    inspectorOpen
  } = useWorkspaceStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      // Global shortcuts
      if (isCtrlOrCmd) {
        switch (e.key.toLowerCase()) {
          case 'n':
            // Ctrl/Cmd + N: New sheet
            e.preventDefault();
            addSheet('blank', 'New Sheet');
            break;
            
          case 'w':
            // Ctrl/Cmd + W: Close current sheet
            if (activeSheetId && sheets.length > 1) {
              e.preventDefault();
              closeSheet(activeSheetId);
            }
            break;
            
          case 't':
            // Ctrl/Cmd + T: New sheet (alternative)
            e.preventDefault();
            addSheet('blank', 'New Sheet');
            break;
            
          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
          case '6':
          case '7':
          case '8':
          case '9':
            // Ctrl/Cmd + 1-9: Switch to sheet by index
            e.preventDefault();
            const index = parseInt(e.key) - 1;
            if (sheets[index]) {
              setActiveSheet(sheets[index].id);
            }
            break;
            
          case 'd':
            // Ctrl/Cmd + D: Duplicate selected widget
            if (selectedWidgetId && activeSheetId) {
              e.preventDefault();
              duplicateWidget(activeSheetId, selectedWidgetId);
            }
            break;
            
          case 'i':
            // Ctrl/Cmd + I: Toggle inspector
            e.preventDefault();
            if (setInspectorOpen) {
              setInspectorOpen(!inspectorOpen);
            }
            break;

          case 'k':
            // Ctrl/Cmd + K: Command palette (placeholder for future)
            e.preventDefault();
            console.log('Command palette shortcut triggered');
            break;
        }
      }

      // Widget-specific shortcuts (no modifier needed)
      if (selectedWidgetId && activeSheetId) {
        switch (e.key) {
          case 'Delete':
          case 'Backspace':
            // Delete: Remove selected widget
            e.preventDefault();
            removeWidget(activeSheetId, selectedWidgetId);
            break;
            
          case 'Escape':
            // Escape: Deselect widget
            e.preventDefault();
            setSelectedWidget(undefined as any);
            break;
            
          case 'Enter':
            // Enter: Open inspector for selected widget
            e.preventDefault();
            if (setInspectorOpen) {
              setInspectorOpen(true);
            }
            break;
        }
      }

      // Tab navigation
      if (e.key === 'Tab' && !e.shiftKey && !isCtrlOrCmd) {
        // Tab through sheets
        const currentIndex = sheets.findIndex(s => s.id === activeSheetId);
        if (currentIndex !== -1) {
          const nextIndex = (currentIndex + 1) % sheets.length;
          // Only prevent default and switch if we're not in a focusable element
          if (!target.closest('button, input, textarea, select, [tabindex]')) {
            e.preventDefault();
            setActiveSheet(sheets[nextIndex].id);
          }
        }
      }

      // Shift+Tab: Previous sheet
      if (e.key === 'Tab' && e.shiftKey && !isCtrlOrCmd) {
        const currentIndex = sheets.findIndex(s => s.id === activeSheetId);
        if (currentIndex !== -1) {
          const prevIndex = currentIndex === 0 ? sheets.length - 1 : currentIndex - 1;
          if (!target.closest('button, input, textarea, select, [tabindex]')) {
            e.preventDefault();
            setActiveSheet(sheets[prevIndex].id);
          }
        }
      }

      // Arrow keys for widget navigation (when no widget selected, select first one)
      if (!selectedWidgetId && activeSheetId && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        const activeSheet = sheets.find(s => s.id === activeSheetId);
        if (activeSheet && Array.isArray(activeSheet.widgets) && activeSheet.widgets.length > 0) {
          e.preventDefault();
          setSelectedWidget(activeSheet.widgets[0].id);
        }
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
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
  ]);

  // Return helper functions for programmatic use
  return {
    shortcuts: {
      newSheet: () => addSheet('blank', 'New Sheet'),
      closeSheet: () => activeSheetId && sheets.length > 1 && closeSheet(activeSheetId),
      duplicateWidget: () => selectedWidgetId && activeSheetId && duplicateWidget(activeSheetId, selectedWidgetId),
      toggleInspector: () => setInspectorOpen && setInspectorOpen(!inspectorOpen),
      deleteWidget: () => selectedWidgetId && activeSheetId && removeWidget(activeSheetId, selectedWidgetId),
      deselectWidget: () => setSelectedWidget(undefined as any),
    }
  };
}