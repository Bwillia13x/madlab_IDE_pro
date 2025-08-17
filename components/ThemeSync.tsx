'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useWorkspaceStore } from '@/lib/store';

export function ThemeSync() {
  const theme = useWorkspaceStore((s) => s.theme);
  const { setTheme } = useTheme();

  useEffect(() => {
    // Map store theme to next-themes values
    // next-themes expects a class name; we use custom classes for Malibu variants
    if (theme === 'malibu-sunrise') {
      setTheme('malibu-sunrise');
      return;
    }
    if (theme === 'malibu-sunset') {
      setTheme('malibu-sunset');
      return;
    }
    setTheme(theme);
  }, [theme, setTheme]);

  useEffect(() => {
    // Ensure the theme class is present on <html> for CSS variables
    const root = document.documentElement;
    root.classList.remove('malibu-sunrise', 'malibu-sunset', 'light', 'dark');
    // Always add the base theme class
    root.classList.add(theme);
    // Ensure Tailwind dark: variants still apply for malibu-sunset
    if (theme === 'malibu-sunset' || theme === 'dark') {
      root.classList.add('dark');
    }
  }, [theme]);

  return null;
}



