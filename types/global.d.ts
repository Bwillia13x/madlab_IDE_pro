// Global type definitions for MadLab platform

import { SheetKind } from '@/lib/presets';

// Window extensions for E2E testing
declare global {
  interface Window {
    madlab?: {
      addSheetByKind: (kind: SheetKind) => void;
      createSheetFromTemplate: (name: string) => boolean;
      getUiState: () => UiState;
      storeReady: boolean;
      waitForStoreReady: (callback: () => void) => void;
      toggleExplorer: () => void;
      setBottomTab: (tab: string) => void;
      ensureChatOpen: () => void;
      openInspectorForFirstWidget: () => boolean;
      helpersReady: boolean;
      store?: any; // Will be properly typed later
      __listenersInstalled?: boolean;
    };
    madlabBridge?: WebviewBridge;
    requestIdleCallback?: (callback: () => void) => void;
  }

  interface Navigator {
    webdriver?: boolean;
  }
}

// UI State interface for E2E testing
export interface UiState {
  explorerCollapsed: boolean;
  activeBottomTab: string;
  messagesLength: number;
  sheetsCount: number;
  storeReady: boolean;
  inspectorOpen: boolean;
}

// Webview Bridge interface
export interface WebviewBridge {
  onMessage?: (handler: (message: WebviewMessage) => void) => void;
  post?: (type: string, payload?: unknown) => void;
}

// Webview Message types
export type WebviewMessage =
  | { type: 'extension:ready'; payload?: { version?: number } }
  | { type: 'pong'; payload?: unknown }
  | { type: string; payload?: unknown };

// Custom Event types
export interface MadlabCustomEvents {
  'madlab:add-sheet': CustomEvent<{ kind?: SheetKind }>;
  'madlab:set-provider': CustomEvent<{ provider?: 'mock' | 'extension' }>;
  'madlab:set-bottom-tab': CustomEvent<{ tab?: string }>;
  'madlab:toggle-explorer': CustomEvent<{}>;
}

export {};
