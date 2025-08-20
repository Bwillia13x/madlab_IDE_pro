'use client';

import { useState, useEffect } from 'react';
import { Search, Layout, RotateCcw, Play, Palette, FileText, MessageSquare, Grid3X3, Filter, PlusCircle, Store, Settings2 } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useWorkspaceStore } from '@/lib/store';
import { useTheme } from 'next-themes';
import { saveActiveSheetLayout, restoreActiveSheetLayout, resetActiveSheetLayout } from '@/lib/ui/layoutPersistence';
import { toast } from 'sonner';

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
  const { sheets, activeSheetId, setActiveSheet, setTheme, theme, addMessage, addSheet, setGlobalSymbol, applyGlobalSymbolToAllWidgets, saveTemplate, getTemplates, createSheetFromTemplate } = useWorkspaceStore();
  const { setTheme: setNextTheme } = useTheme();

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
    const ok = saveActiveSheetLayout();
    addMessage(ok ? 'Layout saved successfully' : 'No active sheet to save', 'agent');
    toast[ok ? 'success' : 'error'](ok ? 'Layout saved' : 'No active sheet');
    setOpen(false);
  };

  const handleRestoreLayout = () => {
    const ok = restoreActiveSheetLayout();
    addMessage(ok ? 'Layout restored' : 'No saved layout found', 'agent');
    toast[ok ? 'success' : 'warning'](ok ? 'Layout restored' : 'No saved layout');
    setOpen(false);
  };

  const handleResetLayout = () => {
    const ok = resetActiveSheetLayout();
    addMessage(ok ? 'Layout reset to defaults' : 'Unable to reset layout', 'agent');
    toast[ok ? 'success' : 'error'](ok ? 'Layout reset' : 'Reset failed');
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
    setNextTheme(newTheme);
    setOpen(false);
  };

  const handleNewSheet = () => {
    addSheet('blank', 'New Sheet');
    setOpen(false);
  };

  const handleOpenMarketplace = () => {
    window.dispatchEvent(new Event('madlab:open-marketplace'));
    setOpen(false);
  };

  const handleOpenWidgetGallery = () => {
    window.dispatchEvent(new Event('madlab:open-widget-gallery'));
    setOpen(false);
  };

  const handleOpenSettings = () => {
    window.dispatchEvent(new Event('madlab:open-settings'));
    setOpen(false);
  };

  const handleSetSymbol = () => {
    const sym = window.prompt('Set global symbol (e.g., AAPL):') || '';
    if (!sym) return;
    setGlobalSymbol(sym);
    applyGlobalSymbolToAllWidgets(undefined, { onlyEmpty: true });
    addMessage(`Global symbol set to ${sym.toUpperCase()}`, 'agent');
    toast.success(`Symbol set to ${sym.toUpperCase()}`);
    setOpen(false);
  };

  // Templates: save current sheet and create from saved templates
  const handleSaveTemplate = () => {
    const currentSheet = sheets.find(s => s.id === activeSheetId);
    if (!currentSheet) {
      toast.error('No active sheet to save');
      setOpen(false);
      return;
    }
    const name = window.prompt('Template name (default: current sheet title):') || '';
    const templateName = name.trim() || currentSheet.title || 'My Template';
    const ok = saveTemplate(templateName, currentSheet.id);
    toast[ok ? 'success' : 'error'](ok ? 'Template saved' : 'Failed to save template');
    setOpen(false);
  };

  const handleCreateFromTemplate = (name: string) => {
    const ok = createSheetFromTemplate(name);
    toast[ok ? 'success' : 'error'](ok ? `Created sheet from "${name}"` : 'Template not found');
    // Deep-link to newly active sheet (store switches active on create)
    if (ok) {
      const newId = useWorkspaceStore.getState().activeSheetId;
      if (newId) {
        const url = new URL(window.location.href);
        url.searchParams.set('sheet', newId);
        window.history.replaceState({}, '', url.toString());
      }
    }
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
      id: 'new-sheet',
      name: 'New sheet',
      icon: PlusCircle,
      group: 'Actions',
      action: handleNewSheet,
    },
    {
      id: 'open-marketplace',
      name: 'Open Marketplace',
      icon: Store,
      group: 'Actions',
      action: handleOpenMarketplace,
    },
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
      id: 'set-symbol',
      name: 'Set global symbol',
      icon: Search,
      group: 'Appearance',
      action: handleSetSymbol,
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
      action: handleOpenWidgetGallery,
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
      id: 'open-settings',
      name: 'Open Settings',
      icon: Settings2,
      group: 'Navigation',
      action: handleOpenSettings,
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
    // Templates
    {
      id: 'save-template',
      name: 'Save current sheet as template',
      shortcut: '',
      icon: FileText,
      group: 'Templates',
      action: handleSaveTemplate,
    },
  ];

  // Dynamically add commands for saved templates
  try {
    const templates = getTemplates();
    templates.forEach(t => {
      commands.push({
        id: `new-from-template-${t.name}`,
        name: `New from template: ${t.name}`,
        shortcut: '',
        icon: FileText,
        group: 'Templates',
        action: () => handleCreateFromTemplate(t.name),
      });
    });
  } catch {
    // ignore
  }

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
