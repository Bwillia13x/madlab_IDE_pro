'use client';

import { useState } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkspaceStore } from '@/lib/store';

const MOCK_OUTPUT_LOGS = [
  { time: '10:34:21', level: 'info', message: 'Portfolio loaded successfully' },
  { time: '10:34:22', level: 'info', message: 'Calculating risk metrics...' },
  { time: '10:34:23', level: 'warn', message: 'Missing data for 2 securities' },
  { time: '10:34:24', level: 'info', message: 'VaR calculation completed' },
  { time: '10:34:25', level: 'error', message: 'Failed to connect to data provider' },
];

const MOCK_PROBLEMS = [
  { type: 'error', file: 'dcf_model.py', line: 45, message: 'Division by zero in discount rate calculation' },
  { type: 'warning', file: 'portfolio.json', line: 12, message: 'Deprecated security identifier format' },
];

export function BottomPanel() {
  const { 
    bottomPanelCollapsed, 
    bottomPanelHeight, 
    activeBottomTab, 
    setActiveBottomTab, 
    toggleBottomPanel 
  } = useWorkspaceStore();
  
  const [isMaximized, setIsMaximized] = useState(false);

  if (bottomPanelCollapsed) {
    return (
      <div className="h-6 bg-[#2d2d30] border-t border-[#2d2d30] flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-xs text-[#969696]">
          <span>Output</span>
          <span>•</span>
          <span>Problems (2)</span>
          <span>•</span>
          <span>Terminal</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0"
          onClick={toggleBottomPanel}
        >
          <Maximize2 className="h-3 w-3 text-[#cccccc]" />
        </Button>
      </div>
    );
  }

  const panelHeight = isMaximized ? '60vh' : `${bottomPanelHeight}px`;

  return (
    <div 
      className="bg-[#252526] border-t border-[#2d2d30] flex flex-col"
      style={{ height: panelHeight, minHeight: '120px' }}
    >
      {/* Header */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-[#2d2d30]">
        <Tabs value={activeBottomTab} onValueChange={setActiveBottomTab} className="flex-1">
          <TabsList className="bg-transparent h-full p-0 gap-0">
            <TabsTrigger 
              value="output" 
              className="bg-transparent text-[#cccccc] data-[state=active]:bg-[#1e1e1e] data-[state=active]:text-[#cccccc] rounded-none px-3 h-full"
            >
              Output
            </TabsTrigger>
            <TabsTrigger 
              value="problems" 
              className="bg-transparent text-[#cccccc] data-[state=active]:bg-[#1e1e1e] data-[state=active]:text-[#cccccc] rounded-none px-3 h-full"
            >
              Problems ({MOCK_PROBLEMS.length})
            </TabsTrigger>
            <TabsTrigger 
              value="terminal" 
              className="bg-transparent text-[#cccccc] data-[state=active]:bg-[#1e1e1e] data-[state=active]:text-[#cccccc] rounded-none px-3 h-full"
            >
              Terminal
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setIsMaximized(!isMaximized)}
          >
            {isMaximized ? (
              <Minimize2 className="h-3 w-3 text-[#cccccc]" />
            ) : (
              <Maximize2 className="h-3 w-3 text-[#cccccc]" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={toggleBottomPanel}
          >
            <X className="h-3 w-3 text-[#cccccc]" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <Tabs value={activeBottomTab} className="flex-1 flex flex-col">
        <TabsContent value="output" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-2 font-mono text-xs">
              {MOCK_OUTPUT_LOGS.map((log, index) => (
                <div key={index} className="flex items-start gap-2 mb-1">
                  <span className="text-[#969696] flex-shrink-0">[{log.time}]</span>
                  <span className={`flex-shrink-0 ${
                    log.level === 'error' ? 'text-red-400' : 
                    log.level === 'warn' ? 'text-yellow-400' : 
                    'text-[#cccccc]'
                  }`}>
                    {log.level.toUpperCase()}
                  </span>
                  <span className="text-[#cccccc]">{log.message}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="problems" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-2">
              {MOCK_PROBLEMS.map((problem, index) => (
                <div key={index} className="flex items-start gap-2 mb-2 p-2 hover:bg-[#2a2d2e] cursor-pointer">
                  <div className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 ${
                    problem.type === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                  }`} />
                  <div className="flex-1">
                    <div className="text-sm text-[#cccccc]">{problem.message}</div>
                    <div className="text-xs text-[#969696]">
                      {problem.file}:{problem.line}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="terminal" className="flex-1 mt-0">
          <div className="h-full bg-[#1e1e1e] p-2 font-mono text-sm">
            <div className="text-[#cccccc]">
              <div className="text-green-400">madlab@workbench:~$ </div>
              <div className="mt-2 text-[#969696]">
                Terminal ready. Type commands to interact with your financial models.
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// TODO: Enhanced bottom panel features
// - Real-time log streaming
// - Interactive terminal with command execution
// - Problem quick-fix suggestions
// - Log filtering and search
// - Export logs and debugging information
// - Integration with development tools and debuggers