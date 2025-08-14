'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { analytics } from '@/lib/analytics';
import { useWorkspaceStore } from '@/lib/store';
import { usePathname } from 'next/navigation';
import { ConsentBanner } from '@/components/ui/consent-banner';

interface AnalyticsContextType {
  isEnabled: boolean;
  sessionId: string;
  userId?: string;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const isTestEnv = process.env.NODE_ENV === 'test';
  const isAutomation = typeof window !== 'undefined' && (() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      return sp.get('e2e') === '1' || ((navigator as any)?.webdriver === true);
    } catch {
      return (typeof navigator !== 'undefined' && (navigator as any)?.webdriver === true);
    }
  })();
  const [contextState, setContextState] = useState<AnalyticsContextType>({
    isEnabled: false,
    sessionId: '',
    userId: undefined,
  });
  const [hasConsent, setHasConsent] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    // In automation/E2E, suppress banner entirely by treating consent as decided
    if (isAutomation) return true;
    try { return localStorage.getItem('madlab_consent_analytics') === 'true'; } catch { return false; }
  });

  const pathname = usePathname();
  const { sheets, activeSheetId, dataProvider } = useWorkspaceStore();

  // Initialize analytics when consent is present (skip during tests and E2E automation)
  useEffect(() => {
    if (isTestEnv || isAutomation) {
      analytics.setEnabled(false);
      setContextState((prev) => ({ ...prev, isEnabled: false }));
      return;
    }
    analytics.setEnabled(hasConsent);
    const stats = analytics.getStats();
    setContextState({
      isEnabled: stats.isEnabled,
      sessionId: stats.sessionId,
      userId: stats.userId,
    });

    // Track initial session start
    analytics.track('session_started', {
      user_agent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      referrer: document.referrer,
    }, 'user_flow');

    // Track initial workspace state
    analytics.track('workspace_initialized', {
      sheet_count: sheets.length,
      active_sheet: activeSheetId,
      data_provider: dataProvider,
      total_widgets: sheets.reduce((sum, sheet) => sum + sheet.widgets.length, 0),
    }, 'user_flow');

    return () => {
      analytics.destroy();
    };
  }, [hasConsent, isTestEnv]);

  // Track route changes
  useEffect(() => {
    analytics.track('page_view', {
      page_path: pathname,
      timestamp: Date.now(),
    }, 'navigation');
  }, [pathname]);

  // Track workspace state changes
  useEffect(() => {
    analytics.track('workspace_state_changed', {
      sheet_count: sheets.length,
      active_sheet: activeSheetId,
      data_provider: dataProvider,
      total_widgets: sheets.reduce((sum, sheet) => sum + sheet.widgets.length, 0),
    }, 'user_flow');
  }, [sheets.length, activeSheetId, dataProvider]);

  // Track data provider changes
  useEffect(() => {
    if (dataProvider) {
      analytics.track('data_provider_changed', {
        provider: dataProvider,
        timestamp: Date.now(),
      }, 'feature_usage');
    }
  }, [dataProvider]);

  return (
    <AnalyticsContext.Provider value={contextState}>
      {/* Hide consent banner in automation/E2E and test envs */}
      {!hasConsent && !isTestEnv && !isAutomation && (
        <ConsentBanner
          onAccept={() => {
            try { localStorage.setItem('madlab_consent_analytics', 'true'); } catch {}
            setHasConsent(true);
          }}
          onDecline={() => {
            try { localStorage.setItem('madlab_consent_analytics', 'false'); } catch {}
            setHasConsent(false);
          }}
        />
      )}
      {children}
    </AnalyticsContext.Provider>
  );
}