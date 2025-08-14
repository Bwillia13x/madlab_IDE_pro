/**
 * Core slice
 * Initialization lifecycle + import/export helpers (no behavior changes)
 */
import { exportWorkspaceJson } from '@/lib/io/export';
import { parseWorkspaceImport, coerceToWorkspaceState } from '@/lib/io/import';
import analytics from '@/lib/analytics';
import { getOnboardingVariant } from '@/lib/analytics/experiments';

export function createCoreSlice(set: any, get: any): Record<string, unknown> {
  return {
    // Import/export helpers
    exportWorkspace: () => {
      const data = exportWorkspaceJson(get());
      try { (get() as any).celebrate('Workspace exported'); } catch {}
      // Mark learning milestone for interactive tutorial progression
      try {
        const s = get() as any;
        if (!s.learningProgress?.exportedWorkspace) {
          s.safeUpdate?.({ learningProgress: { ...s.learningProgress, exportedWorkspace: true } });
        }
      } catch {}
      try {
        if (typeof window !== 'undefined' && window.localStorage.getItem('madlab_first_export') !== 'true') {
          analytics.track('conversion', { event: 'first_export', variant: getOnboardingVariant() }, 'user_flow');
          window.localStorage.setItem('madlab_first_export', 'true');
        }
      } catch {}
      return data as string;
    },

    importWorkspace: (data: unknown) => {
      try {
        const parsed = parseWorkspaceImport(data);
        const coerced = coerceToWorkspaceState(parsed);
        set({
          ...coerced,
          selectedWidgetId: undefined,
          inspectorOpen: false,
        });
        return true;
      } catch (e) {
        console.error('Failed to import workspace', e);
        return false;
      }
    },

    // Initialization state management
    setInitializationPhase: (phase: 'loading' | 'hydrating' | 'ready') => {
      set({ _initializationPhase: phase });
    },

    completeHydration: () => {
      set({
        _hydrationComplete: true,
        _initializationPhase: 'ready',
      });
    },

    isReady: () => {
      const state = get();
      return Boolean((state as any)._hydrationComplete) && (state as any)._initializationPhase === 'ready';
    },

    safeUpdate: (update: Record<string, unknown>) => {
      const state = get() as any;
      if (state._initializationPhase === 'ready') {
        set(update);
      } else {
        console.warn('Attempted state update during initialization phase:', state._initializationPhase);
      }
    },

    // Persistence methods (middleware handles I/O; keep API for compatibility)
    persist: () => {
      // no-op (zustand persist middleware auto-saves)
    },

    hydrate: () => {
      // mark phase for determinism in tests; actual hydration handled by middleware
      set({ _initializationPhase: 'hydrating' });
    },
  };
}


