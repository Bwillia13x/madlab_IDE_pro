'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useWorkspaceStore } from '@/lib/store';
import { SHEET_PRESETS, type SheetKind } from '@/lib/presets';
import { Clock, Play } from 'lucide-react';

export function ContinueCallout() {
  const [show, setShow] = useState(false);
  const sheets = useWorkspaceStore((s) => s.sheets);
  const setActiveSheet = useWorkspaceStore((s) => s.setActiveSheet);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('madlab_recent_sheet_id');
      const hasPrior = !!stored || (Array.isArray(sheets) && sheets.length > 0);
      setShow(hasPrior);
    } catch {}
  }, [sheets?.length]);

  // Compute lightweight values without hooks to avoid conditional Hook calls
  const recentTitle = (() => {
    try {
      const id = typeof window !== 'undefined' ? localStorage.getItem('madlab_recent_sheet_id') : null;
      const s = sheets?.find((x) => x.id === id);
      return s?.title || null;
    } catch { return null; }
  })();
  const lastTemplateName = (() => {
    try { return typeof window !== 'undefined' ? (localStorage.getItem('madlab_recent_template') || '') : ''; } catch { return ''; }
  })();

  if (!show) return null;

  return (
    <div role="status" aria-live="polite" className="mx-3 my-2 px-3 py-2 rounded border border-border bg-muted/30 text-xs flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Clock className="h-3.5 w-3.5" />
        <span>Continue where you left off{recentTitle ? `: ${recentTitle}` : ''}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2"
          onClick={() => {
            try {
              const id = localStorage.getItem('madlab_recent_sheet_id');
              const s = useWorkspaceStore.getState();
              const fallback = s.sheets?.[0]?.id;
              const target = id || fallback;
              if (target) s.setActiveSheet(target);
            } catch {}
          }}
        >
          <Play className="h-3 w-3 mr-1" /> Open last sheet
        </Button>
        {lastTemplateName && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2"
            onClick={() => {
              try { useWorkspaceStore.getState().createSheetFromTemplate(lastTemplateName); } catch {}
            }}
          >
            New from last template: {lastTemplateName}
          </Button>
        )}
      </div>
    </div>
  );
}

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center',
        className
      )}
    >
      {Icon && (
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}