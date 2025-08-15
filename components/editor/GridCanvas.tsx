'use client';

import { useCallback, useEffect, useState } from 'react';
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout';
import { WidgetTile } from './WidgetTile';
import { useWorkspaceStore, type Sheet } from '@/lib/store';
import { EmptyState } from '@/components/ui/empty-state';
// import { useRouter } from 'next/navigation';
import { measureWidgetRender } from '@/lib/performance/monitor';
import { Plus, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
// import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Make GridLayout responsive
const ResponsiveGridLayout = WidthProvider(Responsive);

interface GridCanvasProps {
  sheet: Sheet;
}

function EmptySheetState() {
  // const router = useRouter();
  const store = useWorkspaceStore();
  return (
    <EmptyState
      icon={BarChart3}
      title="Empty Sheet"
      description="Add widgets to start building your financial analysis dashboard"
      className="h-full"
    >
      <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span>Click + to add widgets, or press</span>
          <kbd className="px-2 py-1 text-xs bg-muted rounded">⌘K</kbd>
          <span>to open commands</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Button size="sm" onClick={() => store.addSheet('valuation', 'Valuation Workbench')}>
            Load Valuation Demo
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.dispatchEvent(new Event('madlab:open-command-palette'))}
          >
            Browse Widgets
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              try {
                localStorage.removeItem('madlab_onboarding_completed');
                window.location.reload();
              } catch {}
            }}
          >
            Start Tutorial
          </Button>
        </div>
      </div>
    </EmptyState>
  );
}

export function GridCanvas({ sheet }: GridCanvasProps) {
  const {
    updateLayout,
    selectedWidgetId,
    setSelectedWidget,
    activeSheetId,
    duplicateWidget,
    removeWidget,
  } = useWorkspaceStore();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const handleLayoutChange = useCallback(
    (layout: Layout[]) => {
      updateLayout(sheet.id, layout);
    },
    [sheet.id, updateLayout]
  );

  const layouts = {
    lg: sheet.widgets.map((w) => ({ ...w.layout, i: w.id })),
    md: sheet.widgets.map((w) => ({ ...w.layout, i: w.id })),
    sm: sheet.widgets.map((w) => ({ ...w.layout, i: w.id })),
    xs: sheet.widgets.map((w) => ({ ...w.layout, i: w.id })),
    xxs: sheet.widgets.map((w) => ({ ...w.layout, i: w.id })),
  };

  return (
    <div
      role="grid"
      aria-label="Widget grid"
      aria-describedby="grid-instructions"
      className="h-full w-full bg-background p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setSelectedWidget(undefined);
        }
      }}
    >
      <div id="grid-instructions" className="sr-only">
        Use arrow keys to navigate widgets, Enter to select, Delete to remove, Ctrl+D to duplicate
      </div>
      {/* Keyboard shortcuts scoped to editor area */}
      <EditorKeybinds
        onDuplicate={() => {
          if (!selectedWidgetId || !activeSheetId) return;
          duplicateWidget(activeSheetId, selectedWidgetId);
        }}
        onRemove={() => {
          if (!selectedWidgetId || !activeSheetId) return;
          setConfirmDeleteOpen(true);
        }}
        onClear={() => setSelectedWidget(undefined)}
      />
      {/* Confirm delete dialog */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Widget</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this widget? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              data-testid="confirm-delete-ok"
              onClick={() => {
                if (!selectedWidgetId || !activeSheetId) return;
                removeWidget(activeSheetId, selectedWidgetId);
                setConfirmDeleteOpen(false);
              }}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {sheet.widgets.length === 0 ? (
        <EmptySheetState />
      ) : (
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={44}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".drag-handle"
          resizeHandles={['se']}
          margin={[8, 8]}
          containerPadding={[0, 0]}
        >
          {sheet.widgets.map((widget) => (
            <div
              key={widget.id}
              role="gridcell"
              aria-label={`${widget.title} widget`}
              aria-selected={selectedWidgetId === widget.id}
              tabIndex={selectedWidgetId === widget.id ? 0 : -1}
              data-testid={`widget-tile-${widget.id}`}
              data-widget-header="true"
              data-testid-header
              data-widget-id={widget.id}
              data-selected={selectedWidgetId === widget.id ? 'true' : 'false'}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedWidget(widget.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedWidget(widget.id);
                }
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                  e.preventDefault();
                  const idx = sheet.widgets.findIndex((w) => w.id === widget.id);
                  let nextIdx = idx;
                  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    nextIdx = (idx + 1) % sheet.widgets.length;
                  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    nextIdx = idx === 0 ? sheet.widgets.length - 1 : idx - 1;
                  }
                  const nextId = sheet.widgets[nextIdx]?.id;
                  if (nextId) {
                    setSelectedWidget(nextId);
                    const el = document.querySelector(
                      `[data-testid="widget-tile-${nextId}"]`
                    ) as HTMLElement | null;
                    el?.focus();
                  }
                }
              }}
            >
              {measureWidgetRender(`${widget.type}-${widget.id}`, () => (
                <WidgetTile widget={widget} sheetId={sheet.id} />
              ))}
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}

function EditorKeybinds({
  onDuplicate,
  onRemove,
  onClear,
}: {
  onDuplicate: () => void;
  onRemove: () => void;
  onClear: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip when typing in inputs/textarea/contenteditable
      const target = e.target as HTMLElement | null;
      const tag = (target?.tagName || '').toLowerCase();
      const editing =
        tag === 'input' ||
        tag === 'textarea' ||
        (target as Element & { isContentEditable?: boolean })?.isContentEditable;
      if (editing) {
        // Still allow Esc to clear selection
        if (e.key === 'Escape') {
          e.preventDefault();
          onClear();
        }
        return;
      }
      // Duplicate selected: Cmd/Ctrl + D
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        onDuplicate();
        return;
      }
      // Remove selected: Delete/Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onRemove();
        return;
      }
      // Clear selection: Esc
      if (e.key === 'Escape') {
        e.preventDefault();
        onClear();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onDuplicate, onRemove, onClear]);
  return null;
}
