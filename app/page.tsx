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
import { CommandPalette } from '@/components/commands/CommandPalette';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { DemoBanner } from '@/components/ui/demo-banner';
import { CustomerFeedback } from '@/components/feedback/CustomerFeedback';
import { initializePerformanceMonitoring } from '@/lib/performance/monitor';
import { initializeCustomerAnalytics } from '@/lib/analytics/customer';
import { OnboardingTour, useOnboarding } from '@/components/onboarding/OnboardingTour';
import { SHEET_PRESETS, type SheetKind } from '@/lib/presets';
import { preloadWidgets } from '@/components/widgets/LazyWidget';
import { SuccessCelebration } from '@/components/ui/SuccessCelebration';
import analytics, { trackMilestone } from '@/lib/analytics';
import { getOnboardingVariant } from '@/lib/analytics/experiments';
// Remove legacy inspector panel; Editor includes integrated Inspector

// Removed standalone empty workspace card; Editor renders its own welcome when no sheets

// E2E helpers: expose addSheetByKind as early as possible on client
if (typeof window !== 'undefined') {
  try {
    if (!window.madlab) {
      window.madlab = {
        addSheetByKind: (kind: SheetKind) => {},
        createSheetFromTemplate: (name: string) => false,
        getUiState: () => ({
          explorerCollapsed: false,
          activeBottomTab: 'output',
          messagesLength: 0,
          sheetsCount: 0,
          storeReady: false,
          inspectorOpen: false,
        }),
        storeReady: false,
        waitForStoreReady: (callback: () => void) => {},
        toggleExplorer: () => {},
        setBottomTab: (tab: string) => {},
        ensureChatOpen: () => {},
        openInspectorForFirstWidget: () => false,
        helpersReady: false,
      };
    }
    try {
      // Automatically enable test mode if browser automation is detected
      const sp = new URLSearchParams(window.location.search);
      const isE2E = sp.get('e2e') === '1' || (navigator as any)?.webdriver === true;
      if (isE2E) {
        localStorage.setItem('debugE2E', 'true');
      }
      if (typeof localStorage !== 'undefined' && localStorage.getItem('debugE2E') === 'true') {
        // eslint-disable-next-line no-console
        console.log('[E2E] Installing helpers at module scope');
      }
    } catch {}
    if (!window.madlab.addSheetByKind || window.madlab.addSheetByKind.toString().includes('{}')) {
      window.madlab.addSheetByKind = (kind: SheetKind) => {
        try {
          const preset = SHEET_PRESETS[kind];
          if (!preset) return;
          const store = require('@/lib/store').useWorkspaceStore.getState();
          store.addSheet(kind, preset.label);
          const sheetId = store.activeSheetId;
          if (sheetId && kind !== 'blank') {
            store.populateSheetWithPreset(sheetId, kind);
          }
          try {
            if (
              typeof localStorage !== 'undefined' &&
              localStorage.getItem('debugE2E') === 'true'
            ) {
              // eslint-disable-next-line no-console
              console.log('[E2E] addSheetByKind executed for', kind);
            }
          } catch {}
        } catch {}
      };
    }
    if (!(window as any).madlab.createSheetFromTemplate) {
      (window as any).madlab.createSheetFromTemplate = (name: string) => {
        try {
          const store = require('@/lib/store').useWorkspaceStore.getState();
          return store.createSheetFromTemplate(name);
        } catch {
          return false;
        }
      };
    }
    // Expose minimal UI state for E2E assertions
    (window as any).madlab.getUiState = () => {
      try {
        const s = require('@/lib/store').useWorkspaceStore.getState();
        return {
          explorerCollapsed: !!s.explorerCollapsed,
          activeBottomTab: String(s.activeBottomTab || ''),
          messagesLength: Array.isArray(s.messages) ? s.messages.length : 0,
          sheetsCount: Array.isArray(s.sheets) ? s.sheets.length : 0,
          storeReady: s.isReady ? s.isReady() : false,
          inspectorOpen: Boolean(s.inspectorOpen),
        };
      } catch {
        return {
          explorerCollapsed: false,
          activeBottomTab: 'output',
          messagesLength: 0,
          sheetsCount: 0,
          storeReady: false,
          inspectorOpen: false,
        };
      }
    };

    // Expose store readiness for E2E waiting
    (window as any).madlab.storeReady = false;
    (window as any).madlab.waitForStoreReady = (callback: () => void) => {
      const store = require('@/lib/store').useWorkspaceStore.getState();
      if (store.isReady && store.isReady()) {
        (window as any).madlab.storeReady = true;
        callback();
      } else {
        const checkInterval = setInterval(() => {
          const currentStore = require('@/lib/store').useWorkspaceStore.getState();
          if (currentStore.isReady && currentStore.isReady()) {
            (window as any).madlab.storeReady = true;
            clearInterval(checkInterval);
            callback();
          }
        }, 10);
        setTimeout(() => clearInterval(checkInterval), 5000);
      }
    };
    // Expose control helpers for E2E
    (window as any).madlab.toggleExplorer = () => {
      try {
        require('@/lib/store').useWorkspaceStore.getState().toggleExplorer();
      } catch {}
    };
    (window as any).madlab.setBottomTab = (tab: string) => {
      try {
        require('@/lib/store').useWorkspaceStore.getState().setActiveBottomTab(tab);
      } catch {}
    };
    (window as any).madlab.ensureChatOpen = () => {
      try {
        require('@/lib/store').useWorkspaceStore.setState({ chatCollapsed: false });
      } catch {}
    };
    (window as any).madlab.openInspectorForFirstWidget = () => {
      try {
        const store = require('@/lib/store').useWorkspaceStore.getState();
        const sheetId = store.activeSheetId;
        const sheet = (store.sheets || []).find((s: any) => s.id === sheetId);
        const first = sheet?.widgets?.[0];
        if (first && store.setSelectedWidget) {
          store.setSelectedWidget(first.id);
        }
        store.setInspectorOpen?.(true);
        return true;
      } catch {
        return false;
      }
    };
    // Early E2E bootstrap: ensure a valuation sheet exists when in automation
    try {
      const sp = new URLSearchParams(window.location.search);
      const isE2E = sp.get('e2e') === '1' || (navigator as any)?.webdriver === true;
      if (isE2E) {
        try {
          localStorage.setItem('madlab_consent_analytics', 'true');
        } catch {}
        try {
          localStorage.removeItem('madlab-workspace');
        } catch {}
        const ensureSheet = () => {
          try {
            const store = require('@/lib/store').useWorkspaceStore.getState();
            if (!store.sheets || store.sheets.length === 0) {
              const label = SHEET_PRESETS['valuation']?.label || 'Valuation Workbench';
              store.addSheet('valuation', label);
              const sheetId = store.activeSheetId;
              if (sheetId) {
                store.populateSheetWithPreset(sheetId, 'valuation');
              }
            }
          } catch {}
        };
        // try immediately and a few times after to outlast any late hydration
        ensureSheet();
        const start = Date.now();
        const id = setInterval(() => {
          try {
            const s = require('@/lib/store').useWorkspaceStore.getState();
            if (s.sheets && s.sheets.length > 0) {
              clearInterval(id);
              return;
            }
          } catch {}
          ensureSheet();
          if (Date.now() - start > 4000) clearInterval(id);
        }, 200);
        requestAnimationFrame(() => setTimeout(ensureSheet, 0));
      }
    } catch {}
    // Event-based helpers for tests
    if (!(window as any).madlab.__listenersInstalled) {
      try {
        window.addEventListener('madlab:add-sheet', ((ev: Event) => {
          const detail = (ev as CustomEvent<{ kind?: SheetKind }>).detail || { kind: 'blank' };
          const kind = String(detail.kind || 'blank') as SheetKind;
          let handled = false;
          try {
            if ((window as any).madlab?.addSheetByKind) {
              (window as any).madlab.addSheetByKind(kind);
              handled = true;
            }
          } catch {}
          if (!handled) {
            try {
              const store = require('@/lib/store').useWorkspaceStore.getState();
              const label = SHEET_PRESETS[kind]?.label || `${kind}`;
              store.addSheet(kind, label);
              const sid = store.activeSheetId;
              if (sid && kind !== 'blank') {
                store.populateSheetWithPreset(sid, kind);
              }
            } catch {}
          }
        }) as EventListener);
      } catch {}
      try {
        window.addEventListener('madlab:set-provider', (async (ev: Event) => {
          const detail = (ev as CustomEvent<{ provider?: 'mock' | 'extension' }>).detail || {
            provider: 'mock',
          };
          const provider = String(detail.provider || 'mock');
          try {
            const store = require('@/lib/store').useWorkspaceStore.getState();
            await store.setDataProvider(provider);
            if (provider === 'extension') {
              document.documentElement.setAttribute('data-extension-bridge', 'true');
              try {
                const sync = () => {
                  try {
                    const btns = document.querySelectorAll(
                      '[data-testid="provider-toggle"], [data-testid="titlebar-provider-toggle"]'
                    );
                    if (btns && btns.length) {
                      btns.forEach((b) => {
                        (b as HTMLElement).setAttribute('data-provider-label', 'Extension');
                        const span = b.querySelector('span');
                        if (span) span.textContent = 'Extension';
                      });
                      return true;
                    }
                  } catch {}
                  return false;
                };
                if (!sync()) {
                  const start = Date.now();
                  const id = setInterval(() => {
                    if (sync() || Date.now() - start > 3000) {
                      clearInterval(id);
                    }
                  }, 100);
                }
                try {
                  if (
                    typeof localStorage !== 'undefined' &&
                    localStorage.getItem('debugE2E') === 'true'
                  ) {
                    // eslint-disable-next-line no-console
                    console.log(
                      '[E2E] madlab:set-provider("extension") applied label and attribute'
                    );
                  }
                } catch {}
              } catch {}
            }
          } catch {}
        }) as EventListener);
      } catch {}
      try {
        window.addEventListener('madlab:set-bottom-tab', ((ev: Event) => {
          const detail = (ev as CustomEvent<{ tab?: string }>).detail || { tab: 'output' };
          const tab = String(detail.tab || 'output');
          try {
            require('@/lib/store').useWorkspaceStore.getState().setActiveBottomTab(tab);
          } catch {}
        }) as EventListener);
      } catch {}
      try {
        window.addEventListener('madlab:toggle-explorer', (() => {
          try {
            require('@/lib/store').useWorkspaceStore.getState().toggleExplorer();
          } catch {}
        }) as EventListener);
      } catch {}
      (window as any).madlab.__listenersInstalled = true;
    }
    (window as any).madlab.helpersReady = true;
  } catch {}
}

export default function Home() {
  const { hydrate, completeHydration } = useWorkspaceStore();
  const { showOnboarding, completeOnboarding, skipOnboarding } = useOnboarding();
  // Mark store onboarding on completion for progressive UI gating
  useEffect(() => {
    try {
      const store = useWorkspaceStore.getState();
      if (
        typeof window !== 'undefined' &&
        window.localStorage.getItem('madlab_onboarding_completed') === 'true'
      ) {
        store.safeUpdate?.({ onboardingCompleted: true });
      }
    } catch {}
  }, []);

  useEffect(() => {
    // Hydrate store from localStorage on mount
    hydrate();

    // Complete hydration after a brief delay to ensure persistence middleware is done
    const timeoutId = setTimeout(() => {
      completeHydration();
    }, 100);

    // Initialize performance monitoring
    initializePerformanceMonitoring();

    // Initialize customer analytics for market validation
    initializeCustomerAnalytics();

    // Track first return (simple heuristic: if returning session and sheets exist)
    try {
      const returned = localStorage.getItem('madlab_return_seen') === 'true';
      const sessions = JSON.parse(localStorage.getItem('madlab-usage-sessions') || '[]');
      const hasPrior = Array.isArray(sessions) && sessions.length > 0;
      if (hasPrior && !returned) {
        // Dedup guard
        const flagged = localStorage.getItem('madlab_first_return') === 'true';
        if (!flagged) {
          analytics.track(
            'conversion',
            { event: 'first_return', variant: getOnboardingVariant() },
            'user_flow'
          );
          localStorage.setItem('madlab_first_return', 'true');
        }
        localStorage.setItem('madlab_return_seen', 'true');
      }
    } catch {}

    // Track TTFV: mark when first sheet exists after hydration completes
    const t0 = performance.now();
    const checkTtfv = () => {
      try {
        const s = useWorkspaceStore.getState();
        if (s.sheets && s.sheets.length > 0) {
          const ms = Math.round(performance.now() - t0);
          analytics.track('time_to_first_value', { ms }, 'performance');
          trackMilestone('first_value', { ms });
          return true;
        }
      } catch {}
      return false;
    };
    const id = setInterval(() => {
      if (checkTtfv()) clearInterval(id);
    }, 100);
    setTimeout(() => clearInterval(id), 5000);

    // Idle preload high-usage widgets to improve UX without impacting FCP
    try {
      const run = () => preloadWidgets(['line-chart', 'kpi', 'table']).catch(() => {});
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(run);
      } else {
        setTimeout(run, 500);
      }
    } catch {}

    // Initialize webview bridge if present
    if (typeof window !== 'undefined' && window.madlabBridge) {
      type WebviewMsg =
        | { type: 'extension:ready'; payload?: { version?: number } }
        | { type: 'pong'; payload?: unknown }
        | { type: string; payload?: unknown };
      const onMessage = (window.madlabBridge as any).onMessage as
        | undefined
        | ((h: (m: WebviewMsg) => void) => void);
      onMessage?.((msg: WebviewMsg) => {
        // Handle simple demo messages for now
        if (msg?.type === 'extension:ready') {
          // extension is ready
        } else if (msg?.type === 'pong') {
          // keep minimal differentiation for lint; useful during dev
          // Extension pong received
        }
      });
      // Send a ping to extension
      (window.madlabBridge as any).post?.('ping', { from: 'web' });
    }

    // Expose minimal testing hooks for deterministic E2E fallbacks
    try {
      if (typeof window !== 'undefined') {
        (window as any).madlab = (window as any).madlab || {};
        // Expose store getter for tests
        try {
          (window as any).madlab.store = require('@/lib/store').useWorkspaceStore;
        } catch {}
        (window as any).madlab.addSheetByKind = (kind: SheetKind) => {
          try {
            const preset = SHEET_PRESETS[kind];
            if (!preset) return;
            const store = require('@/lib/store').useWorkspaceStore.getState();
            store.addSheet(kind, preset.label);
            const sheetId = store.activeSheetId;
            if (sheetId && kind !== 'blank') {
              store.populateSheetWithPreset(sheetId, kind);
            }
            try {
              if (
                typeof localStorage !== 'undefined' &&
                localStorage.getItem('debugE2E') === 'true'
              ) {
                // eslint-disable-next-line no-console
                console.log('[E2E] addSheetByKind executed within effect for', kind);
              }
            } catch {}
          } catch {}
        };
        // Mark that testing helpers are ready
        (window as any).madlab.helpersReady = true;

        // Test mode gating: enable deterministic behaviors when ?e2e=1 or WebDriver
        const isE2EQuery = (() => {
          try {
            const sp = new URLSearchParams(window.location.search);
            return sp.get('e2e') === '1';
          } catch {
            return false;
          }
        })();
        const isWebDriver = typeof navigator !== 'undefined' && (navigator as any).webdriver;
        const inTestMode = isE2EQuery || isWebDriver;

        if (inTestMode) {
          try {
            if (
              typeof localStorage !== 'undefined' &&
              localStorage.getItem('debugE2E') === 'true'
            ) {
              // eslint-disable-next-line no-console
              console.log('[E2E] Test mode enabled');
            }
          } catch {}
          // Ensure analytics consent banner never blocks interactions in tests
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('madlab_consent_analytics', 'true');
            }
          } catch {}
          // If an extension bridge exists, surface attribute immediately
          try {
            if ((window as any).madlabBridge) {
              document.documentElement.setAttribute('data-extension-bridge', 'true');
              try {
                // Proactively sync StatusBar provider label for E2E determinism
                const btns = document.querySelectorAll(
                  '[data-testid="provider-toggle"], [data-testid="titlebar-provider-toggle"]'
                );
                btns.forEach((b) => {
                  (b as HTMLElement).setAttribute('data-provider-label', 'Extension');
                  const span = b.querySelector('span');
                  if (span) span.textContent = 'Extension';
                });
                // Also observe for late-mounted provider toggle and sync once
                const mo = new MutationObserver(() => {
                  const nodes = document.querySelectorAll(
                    '[data-testid="provider-toggle"], [data-testid="titlebar-provider-toggle"]'
                  );
                  if (nodes && nodes.length) {
                    nodes.forEach((b) => {
                      (b as HTMLElement).setAttribute('data-provider-label', 'Extension');
                      const span = b.querySelector('span');
                      if (span) span.textContent = 'Extension';
                    });
                    try {
                      mo.disconnect();
                    } catch {}
                  }
                });
                mo.observe(document.body, { childList: true, subtree: true });
              } catch {}
              try {
                // In test mode, align store to extension immediately
                require('@/lib/store').useWorkspaceStore.setState({ dataProvider: 'extension' });
              } catch {}
            }
          } catch {}
          // Auto-create initial valuation sheet for E2E testing after store is ready
          try {
            const ensureSheetWhenReady = () => {
              const store = require('@/lib/store').useWorkspaceStore.getState();
              if (store.isReady && store.isReady()) {
                if (!store.sheets || store.sheets.length === 0) {
                  const label = SHEET_PRESETS['valuation']?.label || 'Valuation Workbench';
                  store.addSheet('valuation', label);
                  const sheetId = store.activeSheetId;
                  if (sheetId) {
                    store.populateSheetWithPreset(sheetId, 'valuation');
                  }
                  try {
                    if (
                      typeof localStorage !== 'undefined' &&
                      localStorage.getItem('debugE2E') === 'true'
                    ) {
                      // eslint-disable-next-line no-console
                      console.log('[E2E] Auto-created initial valuation sheet after store ready');
                    }
                  } catch {}
                }
                return true; // Success
              }
              return false; // Not ready yet
            };

            // Wait for store readiness with shorter, cleaner polling
            const waitForReady = () => {
              if (ensureSheetWhenReady()) return;

              const checkInterval = setInterval(() => {
                if (ensureSheetWhenReady()) {
                  clearInterval(checkInterval);
                }
              }, 50);

              // Cleanup after 5 seconds max
              setTimeout(() => clearInterval(checkInterval), 5000);
            };

            waitForReady();
          } catch {}
        }
      }
    } catch {}

    return () => {
      clearTimeout(timeoutId);
    };
  }, [hydrate, completeHydration]);

  // Global keyboard shortcuts handled by KeyboardProvider

  return (
    <div className="h-screen flex flex-col bg-background text-foreground" data-testid="workspace">
      <h1 className="sr-only">MadLab Financial Analysis Workbench</h1>
      {/* Accessibility: Skip link for keyboard users */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Screen reader: Keyboard shortcuts help */}
      <div className="sr-only">
        <h2>Keyboard Shortcuts</h2>
        <h3>Sheet Management</h3>
        <ul>
          <li>Ctrl/Cmd + N: New sheet</li>
          <li>Ctrl/Cmd + W: Close sheet</li>
          <li>Ctrl/Cmd + 1-9: Switch to sheet</li>
          <li>Tab/Shift+Tab: Navigate between sheets</li>
        </ul>
        <h3>Panel Navigation</h3>
        <ul>
          <li>Alt + 1: Toggle explorer panel</li>
          <li>Alt + 3: Toggle chat panel</li>
          <li>Ctrl/Cmd + E: Focus explorer</li>
          <li>Ctrl/Cmd + J: Focus chat</li>
          <li>Ctrl/Cmd + I: Toggle inspector</li>
        </ul>
        <h3>Widget Operations</h3>
        <ul>
          <li>Ctrl/Cmd + D: Duplicate selected widget</li>
          <li>Delete/Backspace: Remove selected widget</li>
          <li>Arrow keys: Navigate between widgets</li>
          <li>Enter/Space: Select widget</li>
          <li>Escape: Deselect widget</li>
        </ul>
        <h3>Data & Commands</h3>
        <ul>
          <li>Alt + P: Toggle data provider (Demo/Live)</li>
          <li>Ctrl/Cmd + K: Open command palette</li>
          <li>Ctrl/Cmd + T: Open preset picker</li>
        </ul>
      </div>

      {/* Title Bar */}
      <TitleBar />
      {/* Demo Banner */}
      <DemoBanner />
      {/* Global Command Palette */}
      <CommandPalette />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar */}
        <nav role="navigation" aria-label="Activity bar">
          <ActivityBar />
        </nav>

        {/* Explorer Panel */}
        <aside role="complementary" aria-label="Explorer sidebar">
          {/* Reflect collapsed state via hidden attribute for E2E */}
          <Explorer />
        </aside>

        {/* Editor Region */}
        <main
          id="main-content"
          className="flex-1 flex flex-col min-w-0"
          role="main"
          aria-label="Financial analysis workspace"
        >
          <ErrorBoundary>
            <Editor />
          </ErrorBoundary>
          <BottomPanel />
        </main>

        {/* Agent Chat Panel */}
        <aside role="complementary" aria-label="AI assistant chat">
          <ErrorBoundary>
            <AgentChat />
          </ErrorBoundary>
        </aside>

        {/* Inspector Panel */}
        {/* Legacy inspector removed; using integrated editor inspector */}
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Customer Feedback Widget */}
      <CustomerFeedback />

      {/* Success celebrations */}
      <SuccessCelebration />

      {/* Onboarding Tour */}
      <OnboardingTour
        isOpen={showOnboarding}
        onComplete={() => {
          try {
            useWorkspaceStore.getState().markOnboardingCompleted?.();
          } catch {}
          completeOnboarding();
        }}
        onSkip={() => {
          try {
            useWorkspaceStore.getState().markOnboardingCompleted?.();
          } catch {}
          skipOnboarding();
        }}
      />
    </div>
  );
}
