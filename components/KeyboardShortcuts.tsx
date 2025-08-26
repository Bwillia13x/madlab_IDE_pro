'use client';

import { useEffect } from 'react';
import { keyboardShortcutsManager, type KeyboardShortcut } from './widgets/WidgetShell';

// Default keyboard shortcuts for the MAD LAB platform
const defaultShortcuts: KeyboardShortcut[] = [
  // Navigation shortcuts
  {
    key: 'p',
    ctrlKey: true,
    description: 'Open command palette',
    category: 'navigation',
    action: () => {
      // Open command palette
      document.dispatchEvent(new CustomEvent('madlab:open-command-palette'));
    }
  },
  {
    key: 'k',
    ctrlKey: true,
    description: 'Focus search',
    category: 'navigation',
    action: () => {
      // Focus search input
      const searchInput = document.querySelector('input[placeholder*="search" i]') as HTMLInputElement;
      searchInput?.focus();
    }
  },
  {
    key: 'b',
    ctrlKey: true,
    description: 'Toggle explorer panel',
    category: 'navigation',
    action: () => {
      // Toggle explorer
      document.dispatchEvent(new CustomEvent('madlab:toggle-explorer'));
    }
  },
  {
    key: 'j',
    ctrlKey: true,
    description: 'Toggle chat panel',
    category: 'navigation',
    action: () => {
      // Toggle chat
      document.dispatchEvent(new CustomEvent('madlab:toggle-chat'));
    }
  },
  {
    key: 'g',
    ctrlKey: true,
    shiftKey: true,
    description: 'Open widget gallery',
    category: 'navigation',
    action: () => {
      // Open widget gallery
      document.dispatchEvent(new CustomEvent('madlab:open-widget-gallery'));
    }
  },

  // Editing shortcuts
  {
    key: 'z',
    ctrlKey: true,
    description: 'Undo last action',
    category: 'editing',
    action: () => {
      // Undo layout changes
      document.dispatchEvent(new CustomEvent('madlab:undo'));
    }
  },
  {
    key: 'y',
    ctrlKey: true,
    description: 'Redo last action',
    category: 'editing',
    action: () => {
      // Redo layout changes
      document.dispatchEvent(new CustomEvent('madlab:redo'));
    }
  },
  {
    key: 'd',
    ctrlKey: true,
    description: 'Duplicate selected widget',
    category: 'editing',
    action: () => {
      // Duplicate selected widget
      document.dispatchEvent(new CustomEvent('madlab:duplicate-widget'));
    }
  },
  {
    key: 'Delete',
    description: 'Delete selected widget',
    category: 'editing',
    action: () => {
      // Delete selected widget
      document.dispatchEvent(new CustomEvent('madlab:delete-widget'));
    }
  },

  // Workspace shortcuts
  {
    key: 'n',
    ctrlKey: true,
    description: 'Create new sheet',
    category: 'workspace',
    action: () => {
      // Create new sheet
      document.dispatchEvent(new CustomEvent('madlab:new-sheet'));
    }
  },
  {
    key: 'w',
    ctrlKey: true,
    description: 'Close current sheet',
    category: 'workspace',
    action: () => {
      // Close current sheet
      document.dispatchEvent(new CustomEvent('madlab:close-sheet'));
    }
  },
  {
    key: 's',
    ctrlKey: true,
    description: 'Save workspace',
    category: 'workspace',
    action: () => {
      // Save workspace
      document.dispatchEvent(new CustomEvent('madlab:save-workspace'));
    }
  },
  {
    key: 'o',
    ctrlKey: true,
    description: 'Open workspace',
    category: 'workspace',
    action: () => {
      // Open workspace
      document.dispatchEvent(new CustomEvent('madlab:open-workspace'));
    }
  },

  // Tools shortcuts
  {
    key: ',',
    ctrlKey: true,
    description: 'Open settings',
    category: 'tools',
    action: () => {
      // Open settings
      document.dispatchEvent(new CustomEvent('madlab:open-settings'));
    }
  },
  {
    key: 'm',
    ctrlKey: true,
    shiftKey: true,
    description: 'Toggle telemetry',
    category: 'tools',
    action: () => {
      // Toggle telemetry
      document.dispatchEvent(new CustomEvent('madlab:open-telemetry'));
    }
  },
  {
    key: 'r',
    ctrlKey: true,
    shiftKey: true,
    description: 'Refresh all widgets',
    category: 'tools',
    action: () => {
      // Refresh all widgets
      document.dispatchEvent(new CustomEvent('madlab:refresh-all'));
    }
  }
];

// Setup keyboard shortcuts
export function setupKeyboardShortcuts() {
  // Register default shortcuts
  defaultShortcuts.forEach(shortcut => {
    keyboardShortcutsManager.register(shortcut);
  });

  console.log('✅ Keyboard shortcuts registered:', defaultShortcuts.length);
}

// Keyboard shortcuts provider component
export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    setupKeyboardShortcuts();
  }, []);

  return <>{children}</>;
}

// Export for use in other components
export { defaultShortcuts };

