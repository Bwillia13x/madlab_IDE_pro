'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useWorkspaceStore } from '@/lib/store'

interface SettingsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsPanel({ open, onOpenChange }: SettingsPanelProps) {
  const {
    streamMode,
    pollingIntervalMs,
    cacheTtlMs,
    cacheMaxEntries,
    setStreamMode,
    setPollingIntervalMs,
    setCacheTtlMs,
    setCacheMaxEntries,
  } = useWorkspaceStore() as any

  const [local, setLocal] = useState({
    streamMode: (streamMode as 'auto'|'websocket'|'polling') || 'auto',
    pollingIntervalMs: Number(pollingIntervalMs || 1000),
    cacheTtlMs: Number(cacheTtlMs || 300_000),
    cacheMaxEntries: Number(cacheMaxEntries || 100),
  })

  useEffect(() => {
    setLocal({
      streamMode: streamMode || 'auto',
      pollingIntervalMs: Number(pollingIntervalMs || 1000),
      cacheTtlMs: Number(cacheTtlMs || 300_000),
      cacheMaxEntries: Number(cacheMaxEntries || 100),
    })
  }, [streamMode, pollingIntervalMs, cacheTtlMs, cacheMaxEntries])

  const apply = () => {
    setStreamMode(local.streamMode)
    setPollingIntervalMs(local.pollingIntervalMs)
    setCacheTtlMs(local.cacheTtlMs)
    setCacheMaxEntries(local.cacheMaxEntries)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Control streaming mode and cache behavior</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 text-sm">
          <label className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Streaming mode</span>
            <select
              className="bg-background border border-border rounded px-2 py-1 h-[30px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={local.streamMode}
              onChange={(e) => setLocal(l => ({ ...l, streamMode: e.target.value as any }))}
            >
              <option value="auto">Auto</option>
              <option value="websocket">WebSocket</option>
              <option value="polling">Polling</option>
            </select>
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Polling interval (ms)</span>
            <input
              type="number"
              className="bg-background border border-border rounded px-2 py-1 w-28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={local.pollingIntervalMs}
              onChange={(e) => setLocal(l => ({ ...l, pollingIntervalMs: Number(e.target.value) || 1000 }))}
              min={500}
              step={100}
            />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Cache TTL (ms)</span>
            <input
              type="number"
              className="bg-background border border-border rounded px-2 py-1 w-28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={local.cacheTtlMs}
              onChange={(e) => setLocal(l => ({ ...l, cacheTtlMs: Number(e.target.value) || 300000 }))}
              min={10000}
              step={1000}
            />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Cache max entries</span>
            <input
              type="number"
              className="bg-background border border-border rounded px-2 py-1 w-28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={local.cacheMaxEntries}
              onChange={(e) => setLocal(l => ({ ...l, cacheMaxEntries: Number(e.target.value) || 100 }))}
              min={10}
              step={10}
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button className="h-8 px-3 rounded border border-border hover:bg-accent transition-colors" onClick={() => onOpenChange(false)}>Close</button>
            <button className="h-8 px-3 rounded border border-border hover:bg-accent transition-colors" onClick={apply}>Apply</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


