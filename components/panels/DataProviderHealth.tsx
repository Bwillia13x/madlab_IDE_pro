'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useWorkspaceStore } from '@/lib/store';
import { dataProviderRegistry } from '@/lib/data/providers';
import { getConnectionStatuses } from '@/lib/data/connections';
import { useStreamingStats } from '@/lib/streaming/hooks';
import { getStreamingLatencySummary } from '@/lib/performance/client-metrics';
import { DataProviderSettings } from '@/components/panels/DataProviderSettings';

type Health = { status: 'unknown' | 'healthy' | 'degraded' | 'down'; latency?: number };

interface DataProviderHealthProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DataProviderHealth({ open, onOpenChange }: DataProviderHealthProps) {
  const providerId = (useWorkspaceStore((s) => s.dataProvider) || '').replace(':loading', '');
  const [health, setHealth] = useState<Health>({ status: 'unknown' });
  const [checking, setChecking] = useState(false);
  const streaming = useStreamingStats();
  const streamMode = (useWorkspaceStore.getState() as any).streamMode || 'auto';
  const pollMs = Number((useWorkspaceStore.getState() as any).pollingIntervalMs || 1000);
  const [serverMetrics, setServerMetrics] = useState<any | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const meta = useMemo(() => {
    try {
      const statuses = getConnectionStatuses();
      const s = statuses.find((x) => x.id === providerId);
      return s
        ? { lastCheck: s.lastHealthCheck, errorCount: s.errorCount, connected: s.connected }
        : null;
    } catch {
      return null;
    }
  }, [providerId, open]);

  async function runHealthCheck() {
    try {
      setChecking(true);
      const active = dataProviderRegistry.getActive();
      const hc = await (active?.healthCheck?.() ||
        Promise.resolve({ status: 'healthy' as const, latency: 0 }));
      setHealth({ status: (hc?.status as Health['status']) || 'unknown', latency: hc?.latency });
    } catch {
      setHealth({ status: 'unknown' });
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (open) {
      runHealthCheck();
      // Fetch server metrics snapshot
      fetch('/api/metrics', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then(setServerMetrics)
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const switchProvider = async () => {
    const toggle = providerId.toLowerCase().includes('extension') ? 'mock' : 'extension';
    await useWorkspaceStore.getState().setDataProvider(toggle);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Data Provider Health</DialogTitle>
          <DialogDescription>Connection status and quick actions</DialogDescription>
        </DialogHeader>
        <div className="px-1 py-2 text-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Current provider</span>
            <span className="font-medium">{providerId || 'unknown'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Availability</span>
            <span className="font-medium">{health.status}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Latency</span>
            <span className="font-medium">
              {typeof health.latency === 'number' ? `${Math.round(health.latency)} ms` : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Last check</span>
            <span className="font-medium">
              {meta?.lastCheck ? new Date(meta.lastCheck).toLocaleString() : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Error count</span>
            <span className="font-medium">
              {typeof meta?.errorCount === 'number' ? meta.errorCount : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Streaming</span>
            <span className="font-medium">
              {streaming.connectionState} • {streaming.subscriptions} subs • mode:{' '}
              {String(streamMode)} • poll: {pollMs}ms
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Stream p50</span>
            <span className="font-medium">
              {(() => {
                const s = getStreamingLatencySummary();
                return s.count ? `${Math.round(s.p50)} ms` : '—';
              })()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Server req p50</span>
            <span className="font-medium">
              {(() => {
                try {
                  const t = serverMetrics?.timers?.find((x: any) => x.name === 'market:GET');
                  return t ? `${Math.round(t.p50)} ms` : '—';
                } catch {
                  return '—';
                }
              })()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Server mem</span>
            <span className="font-medium">
              {(() => {
                try {
                  const m = serverMetrics?.memory;
                  return m?.heapUsed ? `${Math.round(m.heapUsed / (1024 * 1024))} MB` : '—';
                } catch {
                  return '—';
                }
              })()}
            </span>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button size="sm" className="h-8" variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button size="sm" className="h-8" variant="outline" onClick={switchProvider}>
            Switch Provider
          </Button>
          <Button size="sm" className="h-8" onClick={runHealthCheck} disabled={checking}>
            {checking ? 'Checking…' : 'Retry Check'}
          </Button>
          <Button size="sm" className="h-8" variant="ghost" onClick={() => setSettingsOpen(true)}>
            Open Settings
          </Button>
        </div>
      </DialogContent>
      <DataProviderSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
    </Dialog>
  );
}
