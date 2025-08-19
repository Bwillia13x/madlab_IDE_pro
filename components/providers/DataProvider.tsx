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
  const [isInitializing, setIsInitializing] = useState(true);
  const dataProvider = useWorkspaceStore((state) => state.dataProvider);

  // Initialize providers in background without blocking UI render
  useEffect(() => {
    let mounted = true;
    
    const initProviders = async () => {
      try {
        await initializeDataProviders();
        if (mounted) {
          setInitialized(true);
          setIsInitializing(false);
        }
      } catch (error) {
        console.error('Failed to initialize data providers:', error);
        if (mounted) {
          setInitialized(true); // Still allow app to load
          setIsInitializing(false);
        }
      }
    };

    // Start initialization immediately but don't block render
    initProviders();

    return () => {
      mounted = false;
    };
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
      >
        Demo mode: synthetic data
      </div>
    );
  }, [initialized, dataProvider]);

  // Show loading indicator in a non-blocking way
  const loadingIndicator = isInitializing ? (
    <div className="fixed top-4 right-4 z-50 bg-blue-500 text-white px-3 py-2 rounded-md shadow-lg text-sm">
      <div className="flex items-center gap-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        <span>Initializing...</span>
      </div>
    </div>
  ) : null;

  // Render children immediately - don't block on data provider initialization
  return (
    <div className="min-h-screen flex flex-col">
      {loadingIndicator}
      {banner}
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
