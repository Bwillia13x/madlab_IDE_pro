'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Layout,
  RotateCcw,
  Play,
  Palette,
  FileText,
  MessageSquare,
  Grid3X3,
  Filter,
  PlusCircle,
  Store,
  Settings2,
  Undo2,
  Redo2,
  Smartphone,
  RefreshCw,
  Link as LinkIcon,
  Clock,
  Share2,
  LogIn,
  LogOut,
  Users,
  Brain,
  TrendingUp,
  BarChart3,
  Activity,
  Package,
  Database,
  Zap,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useWorkspaceStore } from '@/lib/store';
import { setDataProvider } from '@/lib/data/providers';
import { useTheme } from 'next-themes';
import {
  saveActiveSheetLayout,
  restoreActiveSheetLayout,
  resetActiveSheetLayout,
} from '@/lib/ui/layoutPersistence';
import { toast } from 'sonner';
import { useDataCache } from '@/lib/data/hooks';
import { createShareableLink } from '@/lib/utils/urlPersistence';

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
  const [searchQuery, setSearchQuery] = useState('');
  const {
    sheets,
    activeSheetId,
    setActiveSheet,
    setTheme,
    theme,
    addMessage,
    addSheet,
    setGlobalSymbol,
    applyGlobalSymbolToAllWidgets,
    saveTemplate,
    getTemplates,
    createSheetFromTemplate,
    undoLayout,
    redoLayout,
    globalTimeframe,
    setGlobalTimeframe,
    toggleExplorer,
    toggleChat,
    globalSymbol,
    dataProvider,
  } = useWorkspaceStore();
  const { setTheme: setNextTheme } = useTheme();
  const { clearCache, clearSymbolCache } = useDataCache();

  // Handler functions
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
    const currentSheet = sheets.find((s) => s.id === activeSheetId);
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

  const handleShareLink = () => {
    try {
      const shareableLink = createShareableLink({
        provider: dataProvider,
        symbol: globalSymbol,
        sheet: activeSheetId,
        theme,
      });
      navigator.clipboard.writeText(shareableLink);
      toast.success('Shareable link copied to clipboard');
      addMessage(`Shareable link copied: ${shareableLink}`, 'agent');
    } catch (error) {
      toast.error('Failed to generate share link');
      console.error('Share link generation failed:', error);
    }
    setOpen(false);
  };

  // Command definitions
  const commands: CommandAction[] = [
    // Navigation
    ...sheets.map((sheet) => ({
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
    // Docs UI (flag-gated)
    ...(String(process.env.NEXT_PUBLIC_FEATURE_DOCS || '').toLowerCase() === 'true'
      ? [
          {
            id: 'open-docs',
            name: 'Open Docs',
            icon: FileText,
            group: 'Navigation',
            action: () => {
              try {
                window.location.href = '/docs';
              } finally {
                setOpen(false);
              }
            },
          },
          {
            id: 'regenerate-docs',
            name: 'Regenerate Docs (dev only)',
            icon: RefreshCw,
            group: 'Actions',
            action: async () => {
              try {
                const resp = await fetch('/api/docs/generate', { method: 'POST' });
                if (resp.ok) {
                  toast.success('Docs regenerated');
                } else {
                  const t = await resp.text();
                  toast.error(`Failed: ${t || resp.status}`);
                }
              } catch {
                toast.error('Docs generation error');
              }
              setOpen(false);
            },
          },
        ]
      : []),
    // Advanced AI toggle
    {
      id: 'toggle-advanced-ai',
      name: 'Toggle Advanced AI Insights',
      icon: Brain,
      group: 'Appearance',
      action: () => {
        try {
          const current = localStorage.getItem('madlab_feature_adv_ai') === 'true';
          localStorage.setItem('madlab_feature_adv_ai', current ? 'false' : 'true');
          window.dispatchEvent(new Event('madlab:adv-ai-changed'));
          toast.success(`Advanced AI ${current ? 'disabled' : 'enabled'}`);
        } catch {
          toast.error('Failed to toggle Advanced AI');
        }
        setOpen(false);
      },
    },
    // Marketplace Launch admin actions (flagged)
    ...(String(process.env.NEXT_PUBLIC_FEATURE_MARKETPLACE_LAUNCH || '').toLowerCase() === 'true' &&
    String(process.env.NEXT_PUBLIC_MARKETPLACE_ADMIN || '').toLowerCase() === 'true'
      ? [
          {
            id: 'marketplace-open',
            name: 'Open Marketplace (Creators/Campaigns)',
            icon: Store,
            group: 'Marketplace',
            action: () => {
              window.dispatchEvent(new Event('madlab:open-marketplace'));
              setOpen(false);
            },
          },
          {
            id: 'marketplace-create-campaign',
            name: 'Marketplace: Create Campaign',
            icon: Store,
            group: 'Marketplace',
            action: async () => {
              try {
                const name = window.prompt('Campaign name?') || '';
                if (!name) return;
                const description = window.prompt('Description?') || '';
                const budget = parseFloat(window.prompt('Budget? (number)') || '0') || 0;
                const { marketplaceLaunch } = await import('@/lib/marketplace/launchInstance');
                await marketplaceLaunch.createCampaign({
                  name,
                  description,
                  startDate: new Date(),
                  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                  targetAudience: ['all'],
                  channels: ['in-app'],
                  budget,
                });
                toast.success('Campaign created');
              } catch {
                toast.error('Failed to create campaign');
              }
              setOpen(false);
            },
          },
          {
            id: 'marketplace-activate-latest',
            name: 'Marketplace: Activate Latest Campaign',
            icon: Store,
            group: 'Marketplace',
            action: async () => {
              try {
                const { marketplaceLaunch } = await import('@/lib/marketplace/launchInstance');
                const all = await marketplaceLaunch.getAllCampaigns();
                const latest = all[all.length - 1];
                if (!latest) {
                  toast.error('No campaigns');
                  setOpen(false);
                  return;
                }
                await marketplaceLaunch.updateCampaignStatus(latest.id, 'active');
                toast.success(`Activated: ${latest.name}`);
              } catch {
                toast.error('Failed to activate');
              }
              setOpen(false);
            },
          },
          {
            id: 'marketplace-pause-latest',
            name: 'Marketplace: Pause Latest Campaign',
            icon: Store,
            group: 'Marketplace',
            action: async () => {
              try {
                const { marketplaceLaunch } = await import('@/lib/marketplace/launchInstance');
                const all = await marketplaceLaunch.getAllCampaigns();
                const latest = all[all.length - 1];
                if (!latest) {
                  toast.error('No campaigns');
                  setOpen(false);
                  return;
                }
                await marketplaceLaunch.updateCampaignStatus(latest.id, 'paused');
                toast.success(`Paused: ${latest.name}`);
              } catch {
                toast.error('Failed to pause');
              }
              setOpen(false);
            },
          },
        ]
      : []),
    // Collaboration
    ...(String(process.env.NEXT_PUBLIC_FEATURE_COLLAB || '').toLowerCase() === 'true'
      ? [
          {
            id: 'open-collaboration',
            name: 'Open Collaboration',
            icon: Users,
            group: 'Navigation',
            action: () => {
              window.location.href = '/collaboration';
              setOpen(false);
            },
          },
        ]
      : []),
    // Open Telemetry Dashboard
    {
      id: 'open-telemetry',
      name: 'Open Telemetry Dashboard',
      icon: Activity,
      group: 'Navigation',
      action: () => {
        try {
          window.dispatchEvent(new Event('madlab:open-telemetry'));
        } finally {
          setOpen(false);
        }
      },
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
    {
      id: 'undo-layout',
      name: 'Undo layout change',
      shortcut: '⌘Z',
      icon: Undo2,
      group: 'Layout',
      action: () => {
        if (activeSheetId) undoLayout(activeSheetId);
        setOpen(false);
      },
    },
    {
      id: 'redo-layout',
      name: 'Redo layout change',
      shortcut: '⇧⌘Z',
      icon: Redo2,
      group: 'Layout',
      action: () => {
        if (activeSheetId) redoLayout(activeSheetId);
        setOpen(false);
      },
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
    // Reveal hidden routes
    {
      id: 'open-widgets-page',
      name: 'Open Widgets Page',
      icon: Grid3X3,
      group: 'Navigation',
      action: () => {
        window.location.href = '/widgets';
        setOpen(false);
      },
    },
    {
      id: 'open-options-page',
      name: 'Open Options Page',
      icon: Filter,
      group: 'Navigation',
      action: () => {
        window.location.href = '/options';
        setOpen(false);
      },
    },
    {
      id: 'open-advanced-charting',
      name: 'Open Advanced Charting',
      icon: TrendingUp,
      group: 'Navigation',
      action: () => {
        window.location.href = '/advanced-charting';
        setOpen(false);
      },
    },
    {
      id: 'open-market-page',
      name: 'Open Market Page',
      icon: BarChart3,
      group: 'Navigation',
      action: () => {
        window.location.href = '/market';
        setOpen(false);
      },
    },
    {
      id: 'open-watchlist-page',
      name: 'Open Watchlist Page',
      icon: FileText,
      group: 'Navigation',
      action: () => {
        window.location.href = '/watchlist';
        setOpen(false);
      },
    },
    {
      id: 'open-presets-page',
      name: 'Open Presets Page',
      icon: FileText,
      group: 'Navigation',
      action: () => {
        window.location.href = '/presets';
        setOpen(false);
      },
    },
    // Provider switching
    {
      id: 'provider-mock',
      name: 'Switch provider: Mock',
      icon: Store,
      group: 'Providers',
      action: async () => {
        await setDataProvider('mock');
        toast.success('Provider: mock');
        setOpen(false);
      },
    },
    {
      id: 'provider-alpha',
      name: 'Switch provider: Alpha Vantage',
      icon: Store,
      group: 'Providers',
      action: async () => {
        await setDataProvider('alpha-vantage');
        toast.success('Provider: alpha-vantage');
        setOpen(false);
      },
    },
    {
      id: 'provider-polygon',
      name: 'Switch provider: Polygon',
      icon: Store,
      group: 'Providers',
      action: async () => {
        await setDataProvider('polygon');
        toast.success('Provider: polygon');
        setOpen(false);
      },
    },
    {
      id: 'provider-alpaca',
      name: 'Switch provider: Alpaca',
      icon: Store,
      group: 'Providers',
      action: async () => {
        await setDataProvider('alpaca');
        toast.success('Provider: alpaca');
        setOpen(false);
      },
    },
    {
      id: 'provider-ibkr',
      name: 'Switch provider: IBKR',
      icon: Store,
      group: 'Providers',
      action: async () => {
        await setDataProvider('ibkr');
        toast.success('Provider: ibkr');
        setOpen(false);
      },
    },
    {
      id: 'provider-clear-credentials',
      name: 'Clear provider credentials (all)',
      icon: Store,
      group: 'Providers',
      action: async () => {
        try {
          localStorage.removeItem('madlab_alpha-vantage_apikey');
          localStorage.removeItem('madlab_polygon_apikey');
          localStorage.removeItem('madlab_alpaca_apikey');
          localStorage.removeItem('madlab_alpaca_secret');
          localStorage.removeItem('madlab_ib_host');
          localStorage.removeItem('madlab_ib_port');
          localStorage.removeItem('madlab_ib_clientId');
          toast.success('Cleared provider credentials');
        } catch {}
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
      id: 'open-settings',
      name: 'Open Settings',
      icon: Settings2,
      group: 'Navigation',
      action: handleOpenSettings,
    },
    {
      id: 'open-mobile',
      name: 'Open Mobile View',
      icon: Smartphone,
      group: 'Navigation',
      action: () => {
        try {
          window.open('/mobile', '_blank');
        } catch {}
        setOpen(false);
      },
    },
    // New Paper Trading sheet
    {
      id: 'new-paper-trading-sheet',
      name: 'New Sheet: Paper Trading',
      icon: PlusCircle,
      group: 'Actions',
      action: () => {
        addSheet('portfolio', 'Paper Trading');
        const sheetId = useWorkspaceStore.getState().activeSheetId;
        if (!sheetId) {
          setOpen(false);
          return;
        }
        // Clear auto preset widgets
        const state = useWorkspaceStore.getState();
        const cleared = state.sheets.map((s) => (s.id === sheetId ? { ...s, widgets: [] } : s));
        useWorkspaceStore.setState({ sheets: cleared });
        // Add helpful set
        useWorkspaceStore.getState().addWidget(sheetId, {
          type: 'paper-trading-console',
          title: 'Paper Trading',
          layout: { i: '', x: 0, y: 0, w: 6, h: 6 },
        });
        useWorkspaceStore.getState().addWidget(sheetId, {
          type: 'watchlist',
          title: 'Watchlist',
          layout: { i: '', x: 6, y: 0, w: 6, h: 6 },
        });
        useWorkspaceStore.getState().addWidget(sheetId, {
          type: 'candlestick-chart',
          title: 'Candlestick',
          layout: { i: '', x: 0, y: 6, w: 12, h: 8 },
          props: { symbol: useWorkspaceStore.getState().globalSymbol },
        });
        toast.success('Created Paper Trading sheet');
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
    // Data & Cache
    {
      id: 'refresh-data-active',
      name: 'Refresh data (active symbol)',
      icon: RefreshCw,
      group: 'Data',
      action: () => {
        try {
          if (globalSymbol) clearSymbolCache(globalSymbol);
        } catch {}
        setGlobalTimeframe(globalTimeframe);
        toast.success('Refreshing data…');
        setOpen(false);
      },
    },
    {
      id: 'clear-data-cache',
      name: 'Clear data cache (all)',
      icon: RefreshCw,
      group: 'Data',
      action: () => {
        clearCache();
        toast.success('Cleared data cache');
        setOpen(false);
      },
    },
    // Timeframe shortcuts
    ...(['1D', '1M', '3M', '6M', '1Y'] as const).map((tf) => ({
      id: `timeframe-${tf}`,
      name: `Timeframe: ${tf}`,
      icon: Clock,
      group: 'Navigation',
      action: () => {
        setGlobalTimeframe(tf);
        setOpen(false);
      },
    })),
    // Toggle panels
    {
      id: 'toggle-explorer',
      name: 'Toggle Explorer panel',
      icon: Search,
      group: 'Navigation',
      action: () => {
        toggleExplorer();
        setOpen(false);
      },
    },
    {
      id: 'toggle-agent-chat',
      name: 'Toggle Agent chat',
      icon: MessageSquare,
      group: 'Navigation',
      action: () => {
        toggleChat();
        setOpen(false);
      },
    },
    // Copy link to active sheet
    {
      id: 'copy-sheet-link',
      name: 'Copy link to active sheet',
      icon: LinkIcon,
      group: 'Actions',
      action: () => {
        const id = useWorkspaceStore.getState().activeSheetId;
        if (!id) {
          toast.error('No active sheet');
          setOpen(false);
          return;
        }
        try {
          const url = new URL(window.location.href);
          url.searchParams.set('sheet', id);
          navigator.clipboard.writeText(url.toString());
          toast.success('Sheet link copied to clipboard');
        } catch {
          toast.error('Failed to copy link');
        }
        setOpen(false);
      },
    },
    // Apply symbol to all widgets (overwrite)
    {
      id: 'apply-symbol-all',
      name: 'Apply current symbol to all widgets (overwrite)',
      icon: Search,
      group: 'Actions',
      action: () => {
        applyGlobalSymbolToAllWidgets(undefined, { onlyEmpty: false });
        toast.success('Applied symbol to all widgets');
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
    // Share link
    {
      id: 'share-link',
      name: 'Share current sheet',
      icon: Share2,
      group: 'Actions',
      action: handleShareLink,
    },
    // Auth (feature-flagged)
    ...(String(process.env.NEXT_PUBLIC_FEATURE_AUTH || '').toLowerCase() === 'true'
      ? [
          {
            id: 'auth-login',
            name: 'Login (email/password)',
            icon: LogIn,
            group: 'Auth',
            action: async () => {
              try {
                const email = window.prompt('Email:', 'user@madlab.com') || '';
                const password = window.prompt('Password:', 'password') || '';
                if (!email || !password) {
                  setOpen(false);
                  return;
                }
                const resp = await fetch('/api/auth/login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email, password }),
                });
                if (!resp.ok) {
                  toast.error('Login failed');
                } else {
                  const data = await resp.json();
                  try {
                    localStorage.setItem('madlab_auth_token', data?.token?.accessToken || '');
                  } catch {}
                  toast.success('Logged in');
                }
              } catch {
                toast.error('Login error');
              }
              setOpen(false);
            },
          },
          {
            id: 'auth-logout',
            name: 'Logout',
            icon: LogOut,
            group: 'Auth',
            action: async () => {
              try {
                const token = localStorage.getItem('madlab_auth_token') || '';
                await fetch('/api/auth/logout', {
                  method: 'POST',
                  headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                });
                try {
                  localStorage.removeItem('madlab_auth_token');
                } catch {}
                toast.success('Logged out');
              } catch {
                toast.error('Logout error');
              }
              setOpen(false);
            },
          },
        ]
      : []),
  ];

  // Enhanced search with fuzzy matching
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return commands;

    const query = searchQuery.toLowerCase().trim();
    const results: CommandAction[] = [];
    const scoredResults: Array<CommandAction & { score: number }> = [];

    // Score each command
    commands.forEach((command) => {
      let score = 0;
      const name = command.name.toLowerCase();
      const group = command.group.toLowerCase();

      // Exact match gets highest score
      if (name === query) score = 100;
      else if (name.includes(query)) score = 75;
      else if (group.includes(query)) score = 50;
      // Fuzzy character matching
      else {
        const chars = query.split('');
        let matches = 0;
        let lastIndex = -1;

        for (const char of chars) {
          const index = name.indexOf(char, lastIndex + 1);
          if (index > lastIndex) {
            matches++;
            lastIndex = index;
          }
        }

        if (matches === chars.length) {
          score = Math.max(25, (matches / name.length) * 40);
        }
      }

      if (score > 0) {
        scoredResults.push({ ...command, score });
      }
    });

    // Sort by score and return top results
    return scoredResults
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(({ score, ...command }) => command);
  }, [searchQuery]);

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

  // Dynamically add commands for saved templates
  try {
    const templates = getTemplates();
    templates.forEach((t) => {
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

  const groupedCommands = commands.reduce(
    (acc, command) => {
      if (!acc[command.group]) {
        acc[command.group] = [];
      }
      acc[command.group].push(command);
      return acc;
    },
    {} as Record<string, CommandAction[]>
  );

  // Group search results by category
  const groupedSearchResults = useMemo(() => {
    return searchResults.reduce(
      (acc, command) => {
        if (!acc[command.group]) {
          acc[command.group] = [];
        }
        acc[command.group].push(command);
        return acc;
      },
      {} as Record<string, CommandAction[]>
    );
  }, [searchResults]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Type a command... (try: 'valuation', 'save layout', 'toggle theme')"
        className="h-12"
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList className="max-h-96">
        <CommandEmpty>
          {searchQuery
            ? `No results found for "${searchQuery}"`
            : 'Type a command to get started...'}
        </CommandEmpty>
        {Object.entries(groupedSearchResults).map(([groupName, groupCommands]) => (
          <CommandGroup key={groupName} heading={groupName}>
            {groupCommands.map((command) => (
              <CommandItem
                key={command.id}
                onSelect={() => {
                  command.action();
                  setSearchQuery('');
                }}
                className="flex items-center gap-3 p-3"
              >
                {command.icon && <command.icon className="h-4 w-4 text-muted-foreground" />}
                <div className="flex-1">
                  <div className="font-medium">{command.name}</div>
                  {command.shortcut && (
                    <div className="text-xs text-muted-foreground">{command.shortcut}</div>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}

        {/* Quick suggestions when no query */}
        {!searchQuery && (
          <CommandGroup heading="Quick Suggestions">
            <CommandItem
              onSelect={() => {
                window.dispatchEvent(new CustomEvent('madlab:open-widget-gallery'));
                setOpen(false);
              }}
              className="flex items-center gap-3 p-3"
            >
              <Package className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <div className="font-medium">Add Widget</div>
                <div className="text-xs text-muted-foreground">Browse and add widgets</div>
              </div>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                window.dispatchEvent(new CustomEvent('madlab:open-settings'));
                setOpen(false);
              }}
              className="flex items-center gap-3 p-3"
            >
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <div className="font-medium">Settings</div>
                <div className="text-xs text-muted-foreground">
                  Configure providers and preferences
                </div>
              </div>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                addSheet('blank', 'New Sheet');
                setOpen(false);
              }}
              className="flex items-center gap-3 p-3"
            >
              <PlusCircle className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <div className="font-medium">New Sheet</div>
                <div className="text-xs text-muted-foreground">Create a blank analysis sheet</div>
              </div>
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
