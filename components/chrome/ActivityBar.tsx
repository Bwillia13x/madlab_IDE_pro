'use client';

import { 
  FileText, 
  Search, 
  GitBranch, 
  Play, 
  Package, 
  Settings, 
  MessageSquare,
  Folder
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/lib/store';

const ACTIVITY_ITEMS = [
  { id: 'explorer', icon: Folder, label: 'Explorer', active: true },
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'git', icon: GitBranch, label: 'Source Control' },
  { id: 'debug', icon: Play, label: 'Run and Debug' },
  { id: 'extensions', icon: Package, label: 'Extensions' },
];

export function ActivityBar() {
  const { toggleExplorer, toggleChat } = useWorkspaceStore();

  return (
    <div className="w-12 bg-[#2c2c2c] border-r border-[#2d2d30] flex flex-col">
      <TooltipProvider>
        <div className="flex flex-col">
          {ACTIVITY_ITEMS.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-12 h-12 p-0 rounded-none border-l-2 border-transparent hover:bg-[#2a2d2e]",
                    item.active && "border-l-[#007acc] bg-[#37373d]"
                  )}
                  onClick={() => {
                    if (item.id === 'explorer') {
                      toggleExplorer();
                    }
                  }}
                >
                  <item.icon className="h-5 w-5 text-[#cccccc]" />
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
                className="w-12 h-12 p-0 rounded-none border-l-2 border-transparent hover:bg-[#2a2d2e]"
                onClick={toggleChat}
              >
                <MessageSquare className="h-5 w-5 text-[#cccccc]" />
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
                className="w-12 h-12 p-0 rounded-none border-l-2 border-transparent hover:bg-[#2a2d2e]"
              >
                <Settings className="h-5 w-5 text-[#cccccc]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Settings</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}