'use client';

import { useState, useEffect } from 'react';
import { Search, Layout, RotateCcw, Play, Palette, FileText, MessageSquare, Grid3X3, Filter } from 'lucide-react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useWorkspaceStore } from '@/lib/store';

interface CommandAction {
  id: string;
  name: string;
  shortcut?: string;
  icon?: React.ComponentType<{ className?: string }>;
  group: string;
  action: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { 
    sheets, 
    setActiveSheet, 
    setTheme, 
    theme,
    addMessage 
  } = useWorkspaceStore();

  // Toggle command palette with Cmd/Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSaveLayout = () => {
    // TODO: Implement layout save
    console.log('Save layout');
    addMessage('Layout saved successfully', 'agent');
    setOpen(false);
  };

  const handleRestoreLayout = () => {
    // TODO: Implement layout restore
    console.log('Restore layout');
    addMessage('Layout restored', 'agent');
    setOpen(false);
  };

  const handleResetLayout = () => {
    // TODO: Implement layout reset
    console.log('Reset layout');
    addMessage('Layout reset to defaults', 'agent');
    setOpen(false);
  };

  const handleRunTests = () => {
    console.log('Run tests');
    addMessage('Running tests...', 'agent');
    setOpen(false);
  };

  const handleToggleTheme = () => {
    const newTheme = theme === 'malibu-sunrise' ? 'malibu-sunset' : 'malibu-sunrise';
    setTheme(newTheme);
    document.body.className = document.body.className.replace(/malibu-\w+/g, '');
    document.body.classList.add(newTheme);
    setOpen(false);
  };

  const commands: CommandAction[] = [
    // Navigation
    ...sheets.map(sheet => ({
      id: `go-to-${sheet.id}`,
      name: `Go to: ${sheet.title}`,
      shortcut: '',
      icon: FileText,
      group: 'Navigation',
      action: () => {
        setActiveSheet(sheet.id);
        setOpen(false);
      },
    })),
    
    // Layout Management
    {
      id: 'save-layout',
      name: 'Save layout',
      shortcut: '⌘S',
      icon: Layout,
      group: 'Layout',
      action: handleSaveLayout,
    },
    {
      id: 'restore-layout',
      name: 'Restore layout',
      shortcut: '',
      icon: Layout,
      group: 'Layout',
      action: handleRestoreLayout,
    },
    {
      id: 'reset-layout',
      name: 'Reset layout',
      shortcut: '',
      icon: RotateCcw,
      group: 'Layout',
      action: handleResetLayout,
    },
    
    // Actions
    {
      id: 'run-tests',
      name: 'Run Tests ▶︎',
      shortcut: '',
      icon: Play,
      group: 'Actions',
      action: handleRunTests,
    },
    {
      id: 'toggle-theme',
      name: 'Toggle theme (Sunrise/Sunset)',
      shortcut: '',
      icon: Palette,
      group: 'Appearance',
      action: handleToggleTheme,
    },
    {
      id: 'focus-agent',
      name: 'Focus Agent chat',
      shortcut: '',
      icon: MessageSquare,
      group: 'Navigation',
      action: () => {
        // TODO: Focus agent chat
        setOpen(false);
      },
    },
    {
      id: 'open-widget-gallery',
      name: 'Open Widget Gallery',
      shortcut: '',
      icon: Grid3X3,
      group: 'Navigation',
      action: () => {
        window.location.href = '/widgets';
        setOpen(false);
      },
    },
    {
      id: 'open-screener',
      name: 'Open Stock Screener',
      shortcut: '',
      icon: Search,
      group: 'Navigation',
      action: () => {
        window.location.href = '/screener';
        setOpen(false);
      },
    },
    {
      id: 'open-options-chain',
      name: 'Open Options Chain',
      shortcut: '',
      icon: Filter,
      group: 'Navigation',
      action: () => {
        window.location.href = '/options-chain';
        setOpen(false);
      },
    },
  ];

  const groupedCommands = commands.reduce((acc, command) => {
    if (!acc[command.group]) {
      acc[command.group] = [];
    }
    acc[command.group].push(command);
    return acc;
  }, {} as Record<string, CommandAction[]>);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Type a command... (try: 'valuation', 'save layout', 'toggle theme')" 
        className="h-12"
      />
      <CommandList className="max-h-96">
        <CommandEmpty>No results found.</CommandEmpty>
        {Object.entries(groupedCommands).map(([groupName, groupCommands]) => (
          <CommandGroup key={groupName} heading={groupName}>
            {groupCommands.map((command) => (
              <CommandItem
                key={command.id}
                onSelect={command.action}
                className="flex items-center gap-3 p-3"
              >
                {command.icon && (
                  <command.icon className="h-4 w-4 text-muted-foreground" />
                )}
                <div className="flex-1">
                  <div className="font-medium">{command.name}</div>
                  {command.shortcut && (
                    <div className="text-xs text-muted-foreground">
                      {command.shortcut}
                    </div>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}