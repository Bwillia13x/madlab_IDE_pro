'use client';

import { 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Folder, 
  FolderOpen,
  Database,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/lib/store';
import { useState } from 'react';

const MOCK_EXPLORER_DATA = {
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

interface ExplorerItemProps {
  item: any;
  level: number;
}

function ExplorerItem({ item, level }: ExplorerItemProps) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "w-full h-6 justify-start px-1 py-0 font-normal text-xs text-[#cccccc] hover:bg-[#2a2d2e]",
          `pl-${level * 4 + 1}`
        )}
        onClick={() => hasChildren && setExpanded(!expanded)}
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
        <span className="truncate">{item.name}</span>
      </Button>

      {expanded && hasChildren && (
        <div>
          {item.children.map((child: any) => (
            <ExplorerItem key={child.id} item={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Explorer() {
  const { explorerCollapsed } = useWorkspaceStore();
  const [dataExpanded, setDataExpanded] = useState(true);
  const [modelsExpanded, setModelsExpanded] = useState(true);

  if (explorerCollapsed) return null;

  return (
    <div className="w-60 bg-[#252526] border-r border-[#2d2d30] flex flex-col">
      {/* Header */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-[#2d2d30]">
        <span className="text-xs font-medium text-[#cccccc] uppercase tracking-wider">
          Explorer
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-1">
          {/* Data Section */}
          <div className="mb-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-6 justify-start px-1 py-0 font-medium text-xs text-[#cccccc] hover:bg-[#2a2d2e]"
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
              className="w-full h-6 justify-start px-1 py-0 font-medium text-xs text-[#cccccc] hover:bg-[#2a2d2e]"
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