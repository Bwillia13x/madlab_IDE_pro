'use client';

import { useEffect } from 'react';
import { useWorkspaceStore } from '@/lib/store';
import { getURLState, syncURLWithStore, updateURLState } from '@/lib/utils/urlPersistence';

/**
 * Component that syncs URL parameters with workspace store state.
 * Enables shareable deep-links and URL persistence.
 */
export function URLPersistenceSync() {
  const {
    dataProvider,
    globalSymbol,
    activeSheetId,
    theme,
    setDataProvider,
    setGlobalSymbol,
    setActiveSheet,
    setTheme,
  } = useWorkspaceStore();

  // Sync URL state to store on mount
  useEffect(() => {
    const urlState = getURLState();
    if (Object.keys(urlState).length > 0) {
      syncURLWithStore(
        urlState,
        setDataProvider,
        setGlobalSymbol,
        setActiveSheet,
        setTheme
      );
    }
  }, [setDataProvider, setGlobalSymbol, setActiveSheet, setTheme]);

  // Sync store state to URL when it changes
  useEffect(() => {
    updateURLState({
      provider: dataProvider,
      symbol: globalSymbol,
      sheet: activeSheetId,
      theme,
    });
  }, [dataProvider, globalSymbol, activeSheetId, theme]);

  // This component doesn't render anything
  return null;
}
