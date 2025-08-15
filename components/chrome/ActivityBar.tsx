'use client';

import { Search, GitBranch, Play, Package, Settings, MessageSquare, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/lib/store';
import { useState, lazy, Suspense } from 'react';

// Lazy load SettingsPanel for better performance
const SettingsPanel = lazy(() =>
  import('@/components/panels/SettingsPanel').then((module) => ({ default: module.SettingsPanel }))
);

const ACTIVITY_ITEMS = [
  { id: 'explorer', icon: Folder, label: 'Explorer', active: true },
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'git', icon: GitBranch, label: 'Source Control' },
  { id: 'debug', icon: Play, label: 'Run and Debug' },
  { id: 'extensions', icon: Package, label: 'Extensions' },
];

export function ActivityBar() {
  const { toggleExplorer, setActiveBottomTab } = useWorkspaceStore();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div
      className="w-12 bg-secondary border-r border-border flex flex-col group"
      data-testid="activity-bar"
    >
      <TooltipProvider>
        <div className="flex flex-col">
          {ACTIVITY_ITEMS.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'w-12 h-12 p-0 rounded-none border-l-2 border-transparent hover:bg-accent transition-opacity duration-200 focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-secondary',
                    item.active && 'border-l-primary bg-accent',
                    // Progressive disclosure: fade in non-primary actions on hover/focus
                    !item.active &&
                      'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100'
                  )}
                  aria-label={item.label}
                  data-testid={item.id === 'explorer' ? 'activity-explorer' : undefined}
                  onClick={() => {
                    if (item.id === 'explorer') {
                      toggleExplorer();
                    }
                    if (item.id === 'extensions') {
                      // Focus bottom panel Problems tab to stabilize E2E
                      setActiveBottomTab('problems');
                    }
                  }}
                >
                  <item.icon className="h-5 w-5 text-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{item.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Bottom section */}
        <div className="flex flex-col mt-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-12 h-12 p-0 rounded-none border-l-2 border-transparent hover:bg-accent transition-opacity duration-200 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-secondary"
                data-testid="activity-chat"
                aria-label="Agent Chat"
              >
                <MessageSquare className="h-5 w-5 text-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Agent Chat</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-12 h-12 p-0 rounded-none border-l-2 border-transparent hover:bg-accent transition-opacity duration-200 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-secondary"
                data-testid="activity-settings"
                aria-label="Settings"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="h-5 w-5 text-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Settings</p>
            </TooltipContent>
          </Tooltip>
          <Suspense
            fallback={
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading settings...
              </div>
            }
          >
            <SettingsPanel open={settingsOpen} onOpenChange={setSettingsOpen} />
          </Suspense>
        </div>
      </TooltipProvider>
    </div>
  );
}
