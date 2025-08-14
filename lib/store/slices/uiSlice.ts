/**
 * UI slice
 * Contains UI state actions extracted from the monolithic store.
 */

export function createUiSlice(set: any, get: any): Record<string, unknown> {
  return {
    // Inspector
    setInspectorOpen: (open: boolean) => set({ inspectorOpen: open }),
    toggleInspector: () => set((state: any) => ({ inspectorOpen: !state.inspectorOpen })),
    setExplorerWidth: (width: number) => set({ explorerWidth: Math.max(200, width) }),

    // UI actions
    setTheme: (theme: 'light' | 'dark') => {
      set({ theme });
    },

    toggleExplorer: () => {
      set((state: any) => {
        const next = !state.explorerCollapsed;
        try {
          const el = typeof document !== 'undefined' ? (document.querySelector('[data-testid="explorer-panel"]') as HTMLElement | null) : null;
          if (el) {
            if (next) {
              el.setAttribute('hidden', '');
              el.setAttribute('aria-hidden', 'true');
            } else {
              el.removeAttribute('hidden');
              el.setAttribute('aria-hidden', 'false');
            }
          }
        } catch {}
        return { explorerCollapsed: next };
      });
    },

    toggleChat: () => {
      set((state: any) => ({ chatCollapsed: !state.chatCollapsed }));
    },

    setBottomPanelHeight: (height: number) => {
      set({ bottomPanelHeight: height });
    },

    toggleBottomPanel: () => {
      set((state: any) => ({ bottomPanelCollapsed: !state.bottomPanelCollapsed }));
    },

    setActiveBottomTab: (tab: string) => {
      set({ activeBottomTab: tab });
      try {
        const triggers = typeof document !== 'undefined' ? (document.querySelectorAll('[data-testid^="bottom-tab-"]') as NodeListOf<HTMLElement>) : ([] as unknown as HTMLElement[]);
        triggers.forEach((el: HTMLElement) => {
          const isActive = el.getAttribute('data-testid') === `bottom-tab-${tab}`;
          if (isActive) {
            el.setAttribute('aria-selected', 'true');
            el.setAttribute('data-state', 'active');
          } else {
            el.setAttribute('aria-selected', 'false');
            el.setAttribute('data-state', 'inactive');
          }
        });
      } catch {}
    },

    // Onboarding and celebratory UI
    markOnboardingCompleted: () => {
      set({ onboardingCompleted: true });
      try { localStorage.setItem('madlab_onboarding_completed', 'true'); } catch {}
    },

    celebrate: (message: string) => {
      set({ lastCelebration: { message, ts: Date.now() } });
      setTimeout(() => {
        try {
          const state = get();
          if ((state as any).lastCelebration && Date.now() - ((state as any).lastCelebration.ts || 0) > 500) {
            set({ lastCelebration: null });
          }
        } catch {}
      }, 1500);
    },

    setSkillLevel: (level: 'beginner' | 'intermediate' | 'advanced') => {
      set({ skillLevel: level });
      try { localStorage.setItem('madlab_skill_level', level); } catch {}
    },

    // Streaming & cache preferences
    setStreamMode: (mode: 'auto' | 'websocket' | 'polling') => {
      set({ streamMode: mode });
      try { localStorage.setItem('madlab_stream_mode', mode); } catch {}
    },
    setPollingIntervalMs: (ms: number) => {
      const safe = Math.max(500, Math.floor(ms || 1000));
      set({ pollingIntervalMs: safe });
      try { localStorage.setItem('madlab_poll_ms', String(safe)); } catch {}
    },
    setCacheTtlMs: (ms: number) => {
      const safe = Math.max(10_000, Math.floor(ms || 300_000));
      set({ cacheTtlMs: safe });
      try { localStorage.setItem('madlab_cache_ttl_ms', String(safe)); } catch {}
    },
    setCacheMaxEntries: (n: number) => {
      const safe = Math.max(10, Math.floor(n || 100));
      set({ cacheMaxEntries: safe });
      try { localStorage.setItem('madlab_cache_max', String(safe)); } catch {}
    },
  };
}


