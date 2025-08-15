'use client';

import { useTheme } from '@/components/providers/theme-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sun, Moon, Monitor, Palette } from 'lucide-react';
import { useEffect } from 'react';

export function ThemeSwitcher() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Keyboard shortcuts for theme switching
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + K, T for theme toggle
      if ((event.metaKey || event.ctrlKey) && event.key === 'k' && event.shiftKey) {
        event.preventDefault();
        const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
        const currentIndex = themes.indexOf(theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        setTheme(themes[nextIndex]);
      }

      // Alt + 1 for light theme
      if (event.altKey && event.key === '1') {
        event.preventDefault();
        setTheme('light');
      }

      // Alt + 2 for dark theme
      if (event.altKey && event.key === '2') {
        event.preventDefault();
        setTheme('dark');
      }

      // Alt + 3 for system theme
      if (event.altKey && event.key === '3') {
        event.preventDefault();
        setTheme('system');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [theme, setTheme]);

  const getThemeIcon = () => {
    switch (resolvedTheme) {
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'dark':
        return <Moon className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          {getThemeIcon()}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
          <span className="ml-auto text-xs text-muted-foreground">Alt+1</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
          <span className="ml-auto text-xs text-muted-foreground">Alt+2</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          <span>System</span>
          <span className="ml-auto text-xs text-muted-foreground">Alt+3</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
            const currentIndex = themes.indexOf(theme);
            const nextIndex = (currentIndex + 1) % themes.length;
            setTheme(themes[nextIndex]);
          }}
        >
          <Palette className="mr-2 h-4 w-4" />
          <span>Toggle Theme</span>
          <span className="ml-auto text-xs text-muted-foreground">⌘K⇧T</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
