'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'dark' | 'light';
};

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
  resolvedTheme: 'dark',
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'madlab-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(storageKey) as Theme | null;
      return stored || defaultTheme;
    }
    return defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';

      root.classList.add(systemTheme);
      root.setAttribute('data-theme', systemTheme);
      setResolvedTheme(systemTheme);
      return;
    }

    root.classList.add(theme);
    root.setAttribute('data-theme', theme);
    setResolvedTheme(theme);
  }, [theme]);

  useEffect(() => {
    // Listen for system theme changes when using system theme
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e: MediaQueryListEvent) => {
        const systemTheme = e.matches ? 'dark' : 'light';
        const root = window.document.documentElement;
        
        root.classList.remove('light', 'dark');
        root.classList.add(systemTheme);
        root.setAttribute('data-theme', systemTheme);
        setResolvedTheme(systemTheme);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  // If running inside the extension webview, sync to host theme via bridge
  useEffect(() => {
    try {
      const w = window as any;
      const hasBridge = typeof w !== 'undefined' && !!w.madlabBridge && typeof w.madlabBridge.request === 'function';
      if (!hasBridge) return;

      const applyTheme = (host: 'dark' | 'light' | 'high-contrast') => {
        const mapped: Theme = host === 'light' ? 'light' : 'dark';
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(mapped);
        root.setAttribute('data-theme', mapped);
        setResolvedTheme(mapped);
      };

      // request current host theme once
      w.madlabBridge.request('theme:get', {}).then((res: any) => {
        const host = (res?.theme || res?.payload?.theme || 'dark') as 'dark' | 'light' | 'high-contrast';
        applyTheme(host);
      }).catch(() => {});

      // subscribe to theme:data messages pushed by extension on ready or change
      const onMessage = (msg: any) => {
        if (msg?.type === 'theme:data' && msg?.payload?.theme) {
          applyTheme(msg.payload.theme);
        }
      };
      const off = w.madlabBridge.onMessage?.(onMessage);
      return () => {
        try { off && (off as any)(); } catch {}
        // no-op
      };
    } catch {}
  }, []);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, theme);
      }
      setTheme(theme);
    },
    resolvedTheme,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};