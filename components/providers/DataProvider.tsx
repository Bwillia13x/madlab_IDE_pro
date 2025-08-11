'use client';

import { useEffect, useMemo, useState } from 'react';
import { initializeDataProviders } from '@/lib/data/init';
import { useWorkspaceStore } from '@/lib/store';
import { setDataProvider } from '@/lib/data/providers';

interface DataProviderProps {
  children: React.ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const [initialized, setInitialized] = useState(false);
  const dataProvider = useWorkspaceStore((state) => state.dataProvider);

  // Initialize providers on mount
  useEffect(() => {
    initializeDataProviders()
      .then(() => setInitialized(true))
      .catch((error) => {
        console.error('Failed to initialize data providers:', error);
        setInitialized(true); // Still allow app to load
      });
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
    if (dataProvider !== 'mock') return null;
    return (
      <div
        role="status"
        aria-live="polite"
        className="w-full bg-amber-500/20 text-amber-900 dark:text-amber-100 border border-amber-500/40 px-3 py-2 text-sm text-center"
        data-testid="demo-banner"
      >
        Demo mode: synthetic data
      </div>
    );
  }, [initialized, dataProvider]);

  // Don't render children until providers are initialized
  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing data providers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {banner}
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
