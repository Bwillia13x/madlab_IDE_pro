'use client';

import { useEffect, useMemo, useState } from 'react';
import { initializeProviders } from '@/lib/data/init';
import { useWorkspaceStore } from '@/lib/store';
import { setDataProvider } from '@/lib/data/providers';

interface DataProviderProps {
  children: React.ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  // Default to initialized to avoid SSR hydration waits in E2E/dev
  const [initialized, setInitialized] = useState(true);
  const dataProvider = useWorkspaceStore((state) => state.dataProvider);

  // Initialize providers on mount
  useEffect(() => {
    (async () => {
      try {
        initializeProviders();
        // Automatically select extension provider if bridge is available at boot
        try {
          const bridgeAvailable = typeof window !== 'undefined' && !!(window as any).madlabBridge && typeof (window as any).madlabBridge.request === 'function';
          // Expose bridge presence to the DOM for other components/tests
          try {
            if (typeof document !== 'undefined') {
              if (bridgeAvailable) {
                document.documentElement.setAttribute('data-extension-bridge', 'true');
              } else {
                document.documentElement.removeAttribute('data-extension-bridge');
              }
            }
          } catch {}
          if (bridgeAvailable) {
            // Proactively register extension provider if not already
            try {
              const { dataProviderRegistry, registerDataProvider } = await import('@/lib/data/providers');
              if (!dataProviderRegistry.getProvider('extension')) {
                const { extensionProvider } = await import('@/lib/data/providers/ExtensionBridgeProvider');
                registerDataProvider('extension', extensionProvider);
              }
            } catch {}
            // Do not auto-switch; leave toggle interaction to tests/UI
          }
        } catch {}
        // already initialized true by default; no-op
      } catch (error) {
        console.error('Failed to initialize data providers:', error);
        // keep initialized true to avoid blocking UI
      }
    })();
  }, []);

  // Sync store state with provider registry
  useEffect(() => {
    if (initialized && dataProvider) {
      try {
        setDataProvider(dataProvider);
      } catch (error) {
        console.warn('Failed to set data provider:', error);
      }
    }
  }, [initialized, dataProvider]);

  const banner = useMemo(() => {
    if (!initialized) return null;
    const isMock = (dataProvider || '').toLowerCase() === 'mock';
    if (!isMock) return null;
    return (
      <div
        role="status"
        aria-live="polite"
        className="w-full bg-amber-500/20 text-amber-900 dark:text-amber-100 border border-amber-500/40 px-3 py-2 text-sm text-center"
      >
        Demo mode: synthetic data. Connect to extension for live data.
      </div>
    );
  }, [initialized, dataProvider]);

  // Don't render children until providers are initialized
  // Always render children; provider init happens synchronously on import and in effect

  return (
    <div className="min-h-screen flex flex-col">
      {banner}
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
