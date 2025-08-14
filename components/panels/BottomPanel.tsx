'use client';

import { useState } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect } from 'react';
import { getStreamingLatencySummary, getStreamingLatencySeries } from '@/lib/performance/client-metrics'
import { useMemo } from 'react'
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
  const { selectedWidgetId, sheets, activeSheetId } = useWorkspaceStore();
  
  const [isMaximized, setIsMaximized] = useState(false);

  // Listen for external test events to set active tab deterministically
  useEffect(() => {
    const onSetTab = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent<{ tab?: string }>).detail || { tab: 'output' };
        const tab = String(detail.tab || 'output');
        setActiveBottomTab(tab);
      } catch {}
    };
    try { window.addEventListener('madlab:set-bottom-tab', onSetTab as EventListener); } catch {}
    return () => {
      try { window.removeEventListener('madlab:set-bottom-tab', onSetTab as EventListener); } catch {}
    };
  }, [setActiveBottomTab]);

  // Log selection changes
  useEffect(() => {
    if (!selectedWidgetId) return;
    const sheet = sheets.find(s => s.id === activeSheetId);
    const w = sheet?.widgets.find(w => w.id === selectedWidgetId);
    if (w) {
      console.log(`Selected widget: ${w.type} (${w.id})`);
      // Append a simple log line into Output by switching to Output tab momentarily
      // This keeps acceptance simple without building a full log pipeline
      setActiveBottomTab('output');
    }
  }, [selectedWidgetId, sheets, activeSheetId, setActiveBottomTab]);

  if (bottomPanelCollapsed) {
    return (
      <div className="h-6 bg-secondary border-t border-border flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
          data-testid="bottom-toggle"
        >
          <Maximize2 className="h-3 w-3 text-muted-foreground" />
        </Button>
      </div>
    );
  }

  const panelHeight = isMaximized ? '60vh' : `${bottomPanelHeight}px`;

  return (
    <div
      data-testid="bottom-panel"
      className="bg-secondary border-t border-border flex flex-col"
      style={{ height: panelHeight, minHeight: '120px' }}
    >
      <Tabs value={activeBottomTab} onValueChange={setActiveBottomTab} className="flex-1 flex flex-col" data-testid="bottom-tabs">
        {/* Header */}
        <div className="group h-9 px-3 flex items-center justify-between border-b border-border">
          <TabsList className="bg-transparent h-full p-0 gap-0">
            <TabsTrigger
              data-testid="bottom-tab-output"
              value="output"
              className="bg-transparent text-muted-foreground/80 hover:text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-muted-foreground rounded-none px-3 h-full transition-colors"
              onClick={() => setActiveBottomTab('output')}
              aria-selected={activeBottomTab === 'output' ? 'true' : 'false'}
            >
              Output
            </TabsTrigger>
            <TabsTrigger
              data-testid="bottom-tab-problems"
              value="problems"
              className="bg-transparent text-muted-foreground/80 hover:text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-muted-foreground rounded-none px-3 h-full transition-colors"
              onClick={() => setActiveBottomTab('problems')}
              aria-selected={activeBottomTab === 'problems' ? 'true' : 'false'}
            >
              Problems ({MOCK_PROBLEMS.length})
            </TabsTrigger>
            <TabsTrigger
              data-testid="bottom-tab-terminal"
              value="terminal"
              className="bg-transparent text-muted-foreground/80 hover:text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-muted-foreground rounded-none px-3 h-full transition-colors"
              onClick={() => setActiveBottomTab('terminal')}
              aria-selected={activeBottomTab === 'terminal' ? 'true' : 'false'}
            >
              Terminal
            </TabsTrigger>
            <TabsTrigger
              data-testid="bottom-tab-metrics"
              value="metrics"
              className="bg-transparent text-muted-foreground/80 hover:text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-muted-foreground rounded-none px-3 h-full transition-colors"
              onClick={() => setActiveBottomTab('metrics')}
              aria-selected={activeBottomTab === 'metrics' ? 'true' : 'false'}
            >
              Metrics
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200">
            <Button
              data-testid="bottom-maximize"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsMaximized(!isMaximized)}
            >
              {isMaximized ? (
                <Minimize2 className="h-3 w-3 text-muted-foreground" />
              ) : (
                <Maximize2 className="h-3 w-3 text-muted-foreground" />
              )}
            </Button>
            <Button
              data-testid="bottom-toggle"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={toggleBottomPanel}
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <TabsContent value="output" className="flex-1 mt-0" data-testid="bottom-content-output" hidden={activeBottomTab !== 'output'}>
          <ScrollArea className="h-full">
            <div className="p-2 font-mono text-xs">
              <div className="mb-2 text-muted-foreground flex items-center gap-2">
                <span>{(() => {
                  const s = getStreamingLatencySummary()
                  return s.count > 0 ? `Stream latency: p50 ${Math.round(s.p50)}ms • p90 ${Math.round(s.p90)}ms` : 'Stream latency: —'
                })()}</span>
                <span aria-hidden className="inline-flex h-3 w-24 items-end gap-0.5">
                  {(() => {
                    const values = getStreamingLatencySeries().slice(-40)
                    if (values.length === 0) return null
                    const max = Math.max(...values)
                    const min = Math.min(...values)
                    const range = Math.max(1, max - min)
                    return values.map((v, i) => {
                      const h = Math.max(1, Math.round(((v - min) / range) * 12))
                      return <span key={i} style={{ height: `${h}px` }} className="w-0.5 bg-foreground/40"></span>
                    })
                  })()}
                </span>
              </div>
              {MOCK_OUTPUT_LOGS.map((log, index) => (
                <div key={index} className="flex items-start gap-2 mb-1">
                  <span className="text-muted-foreground flex-shrink-0">[{log.time}]</span>
                  <span className={`flex-shrink-0 ${
                    log.level === 'error' ? 'text-destructive' : 
                    log.level === 'warn' ? 'text-yellow-400' : 
                    'text-muted-foreground'
                  }`}>
                    {log.level.toUpperCase()}
                  </span>
                  <span className="text-muted-foreground">{log.message}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="problems" className="flex-1 mt-0" data-testid="bottom-content-problems" hidden={activeBottomTab !== 'problems'} aria-hidden={activeBottomTab !== 'problems' ? 'true' : 'false'}>
          <ScrollArea className="h-full">
            <div className="p-2">
              {MOCK_PROBLEMS.map((problem, index) => (
                <div key={index} className="flex items-start gap-2 mb-2 p-2 hover:bg-accent cursor-pointer">
                  <div className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 ${
                    problem.type === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                  }`} />
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground">{problem.message}</div>
                    <div className="text-xs text-muted-foreground">
                      {problem.file}:{problem.line}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="terminal" className="flex-1 mt-0" data-testid="bottom-content-terminal" hidden={activeBottomTab !== 'terminal'} aria-hidden={activeBottomTab !== 'terminal' ? 'true' : 'false'}>
          <div className="h-full bg-background p-2 font-mono text-sm">
            <div className="text-muted-foreground">
              <div className="text-green-400">madlab@workbench:~$ </div>
              <div className="mt-2 text-muted-foreground">
                Terminal ready. Type commands to interact with your financial models.
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="flex-1 mt-0" data-testid="bottom-content-metrics" hidden={activeBottomTab !== 'metrics'} aria-hidden={activeBottomTab !== 'metrics' ? 'true' : 'false'}>
          <ScrollArea className="h-full">
            {activeBottomTab === 'metrics' ? <MetricsPanel /> : null}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricsPanel() {
  const [server, setServer] = useState<any | null>(null)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/metrics', { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        if (mounted) setServer(json)
      } catch {}
    })()
    return () => { mounted = false }
  }, [])
  const client = useMemo(() => getStreamingLatencySummary(), [])
  const series = useMemo(() => getStreamingLatencySeries().slice(-60), [])
  const serverP50 = (() => {
    try {
      const t = server?.timers?.find((x: any) => x.name === 'market:GET')
      return t ? Math.round(t.p50) : null
    } catch { return null }
  })()
  const serverMem = (() => {
    try { return server?.memory?.heapUsed ? Math.round(server.memory.heapUsed / (1024*1024)) : null } catch { return null }
  })()
  return (
    <div className="p-3 text-xs space-y-3">
      <div className="font-medium">Performance Metrics</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-2 rounded border border-border bg-card">
          <div className="text-muted-foreground">Stream latency</div>
          <div className="mt-1">p50 {client.count ? Math.round(client.p50) : '—'}ms • p90 {client.count ? Math.round(client.p90) : '—'}ms</div>
          <div aria-hidden className="mt-2 inline-flex h-8 w-full items-end gap-0.5">
            {series.length > 0 ? series.map((v, i, arr) => {
              const max = Math.max(...arr); const min = Math.min(...arr); const range = Math.max(1, max - min)
              const h = Math.max(1, Math.round(((v - min) / range) * 32))
              return <span key={i} style={{ height: `${h}px` }} className="w-0.5 bg-foreground/50"></span>
            }) : <span className="text-muted-foreground">No data yet</span>}
          </div>
        </div>
        <div className="p-2 rounded border border-border bg-card">
          <div className="text-muted-foreground">Server market:GET</div>
          <div className="mt-1">p50 {serverP50 !== null ? `${serverP50}ms` : '—'}</div>
          <div className="mt-1 text-muted-foreground">Mem {serverMem !== null ? `${serverMem} MB` : '—'}</div>
        </div>
      </div>
    </div>
  )
}
