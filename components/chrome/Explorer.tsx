'use client';

import { 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Folder, 
  Database,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/lib/store';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

const MOCK_EXPLORER_DATA: { data: TreeItem[]; models: TreeItem[] } = {
  data: [
  { id: '1', name: 'market_data.csv', type: 'file', icon: FileText },
  { id: '2', name: 'portfolio.json', type: 'file', icon: FileText },
  { id: '3', name: 'earnings', type: 'folder', icon: Folder, children: [
      { id: '3-1', name: 'Q1_2024.xlsx', type: 'file', icon: FileText },
      { id: '3-2', name: 'Q2_2024.xlsx', type: 'file', icon: FileText },
    ]},
  { id: '4', name: 'indices', type: 'folder', icon: Folder, children: [
      { id: '4-1', name: 'SPX.csv', type: 'file', icon: FileText },
      { id: '4-2', name: 'NDX.csv', type: 'file', icon: FileText },
    ]},
  ],
  models: [
  { id: '5', name: 'dcf_model.py', type: 'file', icon: FileText },
  { id: '6', name: 'monte_carlo.ipynb', type: 'file', icon: FileText },
  { id: '7', name: 'risk_models', type: 'folder', icon: Folder, children: [
      { id: '7-1', name: 'var_model.py', type: 'file', icon: FileText },
      { id: '7-2', name: 'stress_test.py', type: 'file', icon: FileText },
    ]},
  ]
};

type TreeItem = {
  id: string;
  name: string;
  type: 'file' | 'folder';
  icon: React.ComponentType<{ className?: string }>;
  children?: TreeItem[];
};

interface ExplorerItemProps {
  readonly item: TreeItem;
  readonly level: number;
}

function ExplorerItem({ item, level }: ExplorerItemProps) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (hasChildren) {
        setExpanded(!expanded);
      }
    } else if (e.key === 'ArrowRight' && hasChildren && !expanded) {
      e.preventDefault();
      setExpanded(true);
    } else if (e.key === 'ArrowLeft' && hasChildren && expanded) {
      e.preventDefault();
      setExpanded(false);
    }
  };

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "w-full h-6 justify-start px-1 py-0 font-normal text-xs text-foreground hover:bg-accent focus:bg-accent focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-secondary",
          `pl-${level * 4 + 1}`
        )}
        onClick={() => hasChildren && setExpanded(!expanded)}
        onKeyDown={handleKeyDown}
        data-testid={`explorer-item-${item.type}`}
        aria-label={`${item.type}:${item.name}`}
        aria-expanded={hasChildren ? expanded : undefined}
        tabIndex={0}
      >
        {hasChildren && (
          <div className="w-4 flex justify-center">
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </div>
        )}
        <item.icon className="h-3 w-3 mr-1" />
        <span className="truncate" data-testid="explorer-item-name">{item.name}</span>
      </Button>

    {expanded && hasChildren && item.children && (
        <div>
      {item.children.map((child: TreeItem) => (
            <ExplorerItem key={child.id} item={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Explorer() {
  const { explorerCollapsed, explorerWidth, setExplorerWidth } = useWorkspaceStore();
  // Ensure toggle works across renders by not memoizing collapsed renders. No change required.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseMove = useCallback((e: MouseEvent) => {
    const delta = e.clientX - startX.current;
    const next = Math.max(200, Math.min(600, startWidth.current + delta));
    setExplorerWidth(next);
  }, [setExplorerWidth]);

  const onMouseUp = useCallback(() => {
    setIsResizing(false);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }, [onMouseMove]);

  const onMouseDownHandle = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = containerRef.current?.getBoundingClientRect().width || explorerWidth;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [explorerWidth, onMouseMove, onMouseUp]);
  const [dataExpanded, setDataExpanded] = useState(true);
  const [modelsExpanded, setModelsExpanded] = useState(true);

  // Ensure the hidden attribute reflects state immediately for E2E determinism
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (explorerCollapsed) {
      el.setAttribute('hidden', '');
      el.setAttribute('aria-hidden', 'true');
    } else {
      el.removeAttribute('hidden');
      el.setAttribute('aria-hidden', 'false');
    }
  }, [explorerCollapsed]);

  return (
    <div
      ref={containerRef}
      className={cn("relative bg-secondary border-r border-border flex flex-col select-none group", isResizing && "cursor-col-resize")}
      style={{ width: Math.max(200, Math.min(600, explorerWidth)) }}
      data-testid="explorer-panel"
      hidden={explorerCollapsed}
      aria-hidden={explorerCollapsed ? 'true' : 'false'}
    >
      {/* Header */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-border">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          EXPLORER
        </span>
        {/* Subtle section toggles appear on hover/focus for progressive disclosure */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-secondary"
            onClick={() => setDataExpanded((v) => !v)}
            aria-pressed={dataExpanded}
            aria-label="Toggle Data section"
          >
            Data
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-secondary"
            onClick={() => setModelsExpanded((v) => !v)}
            aria-pressed={modelsExpanded}
            aria-label="Toggle Models section"
          >
            Models
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-1">
          {/* Data Section */}
          <div className="mb-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-6 justify-start px-1 py-0 font-medium text-xs text-foreground hover:bg-accent focus:bg-accent focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-secondary"
              onClick={() => setDataExpanded(!dataExpanded)}
            >
              {dataExpanded ? (
                <ChevronDown className="h-3 w-3 mr-1" />
              ) : (
                <ChevronRight className="h-3 w-3 mr-1" />
              )}
              <Database className="h-3 w-3 mr-1" />
              <span className="uppercase tracking-wider">Data</span>
            </Button>

            {dataExpanded && (
              <div className="mt-1">
                {MOCK_EXPLORER_DATA.data.map((item) => (
                  <ExplorerItem key={item.id} item={item} level={1} />
                ))}
              </div>
            )}
          </div>

          {/* Models Section */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-6 justify-start px-1 py-0 font-medium text-xs text-foreground hover:bg-accent focus:bg-accent focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-secondary"
              onClick={() => setModelsExpanded(!modelsExpanded)}
            >
              {modelsExpanded ? (
                <ChevronDown className="h-3 w-3 mr-1" />
              ) : (
                <ChevronRight className="h-3 w-3 mr-1" />
              )}
              <TrendingUp className="h-3 w-3 mr-1" />
              <span className="uppercase tracking-wider">Models</span>
            </Button>

            {modelsExpanded && (
              <div className="mt-1">
                {MOCK_EXPLORER_DATA.models.map((item) => (
                  <ExplorerItem key={item.id} item={item} level={1} />
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Resize handle - reveal subtly on hover/focus to reduce visual noise */}
      <div
        onMouseDown={onMouseDownHandle}
        data-testid="explorer-resize-handle"
        className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-accent/50 active:bg-accent opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200"
        aria-label="Resize Explorer"
        role="separator"
        onKeyDown={(e) => {
          // Keyboard nudge: arrow left/right to adjust width
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            const delta = e.key === 'ArrowLeft' ? -10 : 10;
            const next = Math.max(200, Math.min(600, explorerWidth + delta));
            setExplorerWidth(next);
          }
        }}
        tabIndex={0}
      />
    </div>
  );
}

// TODO: Implement real file system integration
// - Connect to actual data sources (databases, APIs, file systems)
// - Add file upload/download functionality
// - Implement file type detection and appropriate icons
// - Add context menus for file operations (rename, delete, etc.)
// - Support for different data source types (CSV, JSON, Parquet, etc.)
// - Integration with cloud storage providers (AWS S3, Google Drive, etc.)