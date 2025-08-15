'use client';

import React from 'react';
import { HelpCircle, Keyboard } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function KeyboardHelp() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // H or Shift + ? (which is Shift + /)
      const key = e.key.toLowerCase();
      const isQuestion = e.shiftKey && key === '/';
      if (key === 'h' || isQuestion) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Keyboard help"
          aria-haspopup="dialog"
          aria-controls="keyboard-help-popover"
          className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-accent"
          title="Keyboard help (H or Shift+?)"
          data-testid="keyboard-help-trigger"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        id="keyboard-help-popover"
        side="bottom"
        align="end"
        className="w-80"
        aria-label="Keyboard help"
      >
        <div className="text-sm">
          <div className="flex items-center gap-2 font-medium mb-1">
            <Keyboard className="h-4 w-4" /> Keyboard shortcuts
          </div>
          <ul className="space-y-1 text-muted-foreground">
            <li>
              <span className="font-mono">⌘K</span> Open Command Palette
            </li>
            <li>
              <span className="font-mono">Alt+1</span> Toggle Explorer
            </li>
            <li>
              <span className="font-mono">Alt+3</span> Toggle Chat
            </li>
            <li>
              <span className="font-mono">⌘D</span> Duplicate widget
            </li>
            <li>
              <span className="font-mono">Delete</span> Remove widget
            </li>
            <li>
              <span className="font-mono">H</span> or <span className="font-mono">Shift+?</span>{' '}
              Show help
            </li>
          </ul>
          <div className="mt-2 text-xs text-muted-foreground">
            Tip: Use Tab to move focus and Enter/Space to activate controls.
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
