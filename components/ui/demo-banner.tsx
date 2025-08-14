'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X, Database, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspaceStore } from '@/lib/store';
import { dataProviderRegistry } from '@/lib/data/providers';
import { SHEET_PRESETS, type SheetKind } from '@/lib/presets';
import { toast } from 'sonner';

export function DemoBanner() {
  const { dataProvider, setDataProvider } = useWorkspaceStore();
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [canSwitch, setCanSwitch] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if live data provider is available
    const available = dataProviderRegistry.listAvailable();
    setCanSwitch(available.length > 1);

    // Offer a quick value-first demo start if workspace is empty
    try {
      const store = useWorkspaceStore.getState();
      if ((!Array.isArray(store.sheets) || store.sheets.length === 0) && typeof window !== 'undefined') {
        // Only auto-seed if user hasn't completed onboarding
        const completed = window.localStorage.getItem('madlab_onboarding_completed') === 'true';
        if (!completed) {
          const label = SHEET_PRESETS['valuation']?.label || 'Valuation Workbench';
          store.addSheet('valuation' as SheetKind, label);
          const sheetId = store.activeSheetId;
          if (sheetId) {
            store.populateSheetWithPreset(sheetId, 'valuation' as SheetKind);
          }
          try { toast.message('Loaded demo valuation to get you started'); } catch {}
        }
      }
    } catch {}
  }, []);

  if (!mounted || dismissed) {
    return null;
  }

  const isDemo = dataProvider === 'mock' || !dataProvider?.toLowerCase().includes('extension');

  if (!isDemo) {
    return null;
  }

  const handleSwitchToLive = async () => {
    if (!canSwitch) return;
    
    const available = dataProviderRegistry.listAvailable();
    const liveProvider = available.find(p => p.includes('extension') || p.includes('bridge'));
    
    if (liveProvider) {
      try {
        await setDataProvider(liveProvider);
      } catch (error) {
        console.warn('Failed to switch to live data provider:', error);
      }
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="demo-banner"
      className="bg-yellow-50 dark:bg-yellow-950/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-2 pointer-events-none"
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <Database className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
              Demo Mode Active
            </span>
            <span className="text-sm text-yellow-700 dark:text-yellow-300">
              Displaying synthetic financial data for demonstration. 
              <span className="hidden sm:inline"> All prices, volumes, and metrics are simulated.</span>
              {/* Keep this exact sentence for E2E test stability */}
              <span className="block">Demo mode: synthetic data. Connect to extension for live data.</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {canSwitch && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSwitchToLive}
              className="h-7 px-3 text-xs border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-100 dark:hover:bg-yellow-900/50"
              title="Switch to live market data"
              aria-label="Switch to live market data"
            >
              <Globe className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Switch to </span>Live Data
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="h-6 w-6 p-0 text-yellow-700 hover:text-yellow-900 dark:text-yellow-300 dark:hover:text-yellow-100"
            title="Dismiss this banner"
            aria-label="Dismiss demo mode banner"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}