'use client';

import { MoreHorizontal, X, GripVertical, Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';
import { useWorkspaceStore, type Widget } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { VirtualizedWidget } from '@/components/ui/VirtualizedWidget';
import { getSchemaWidget, type WidgetRegistryEntryV2 } from '@/lib/widgets/registry';
import React, { Suspense, memo, useMemo } from 'react';
import type { WidgetProps as SchemaWidgetProps } from '@/lib/widgets/schema';
import { LazyWidget } from '@/components/widgets/LazyWidget';
import { Loader2 } from 'lucide-react';
import { useWidgetTracking } from '@/lib/analytics/hooks';
import analytics from '@/lib/analytics';
import { getOnboardingVariant } from '@/lib/analytics/experiments';
// ...existing code...

// Widget components rendered only via registry moving forward

interface WidgetTileProps {
  widget: Widget;
  sheetId: string;
}

// Widget components are now handled via registry

// Loading fallback for widgets
function WidgetLoadingFallback() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center text-xs text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin mb-2" />
      <span>Loading widget...</span>
    </div>
  );
}

// Lazy widget renderer component with performance optimizations
interface LazyWidgetRendererProps {
  widget: Widget;
  schemaEntry: WidgetRegistryEntryV2 | undefined;
  SchemaComponent: ((props: SchemaWidgetProps) => JSX.Element) | undefined;
  sheetId: string;
  selected: boolean;
  updateWidget: (sheetId: string, update: Partial<Widget> & { id: string }) => void;
}

const LazyWidgetRenderer = memo(function LazyWidgetRenderer({
  widget,
  schemaEntry,
  SchemaComponent,
  sheetId,
  selected,
  updateWidget,
}: LazyWidgetRendererProps) {
  if (SchemaComponent) {
    // Use existing schema component with suspense wrapper for performance
    return (
      <Suspense fallback={<WidgetLoadingFallback />}>
        <SchemaComponent
          id={widget.id}
          config={
            (widget.props as any) || (schemaEntry ? schemaEntry.definition.meta.defaultConfig : {})
          }
          isSelected={selected}
          onConfigChange={(config) => {
            updateWidget(sheetId, { id: widget.id, props: config as Record<string, unknown> });
            try {
              const s = useWorkspaceStore.getState();
              if (!s.learningProgress.configuredWidget) {
                s.safeUpdate?.({
                  learningProgress: { ...s.learningProgress, configuredWidget: true },
                });
                s.celebrate?.('Widget configured');
                try {
                  if (
                    typeof localStorage !== 'undefined' &&
                    localStorage.getItem('madlab_first_configure') !== 'true'
                  ) {
                    analytics.track(
                      'conversion',
                      { event: 'first_configure', variant: getOnboardingVariant() },
                      'user_flow'
                    );
                    localStorage.setItem('madlab_first_configure', 'true');
                  }
                } catch {}
              }
            } catch {}
          }}
          onError={(err) => {
            /* Widget error handling */
          }}
        />
      </Suspense>
    );
  }

  // Fall back to lazy widget for unknown types
  return (
    <LazyWidget
      type={widget.type}
      id={widget.id}
      config={(widget.props as any) || {}}
      isSelected={selected}
      onConfigChange={(config) =>
        updateWidget(sheetId, { id: widget.id, props: config as Record<string, unknown> })
      }
      onError={(err) => {
        /* Widget error handling */
      }}
      fallback={<WidgetLoadingFallback />}
    />
  );
});

export const WidgetTile = memo(function WidgetTile({ widget, sheetId }: WidgetTileProps) {
  const { removeWidget, updateWidget, setSelectedWidget, selectedWidgetId, setInspectorOpen } =
    useWorkspaceStore();

  // Analytics tracking
  const { trackInteraction, trackConfigChange } = useWidgetTracking(widget.type, widget.id);

  // Memoize expensive schema lookups
  const { schemaEntry, SchemaComponent } = useMemo(() => {
    const entry = getSchemaWidget(widget.type);
    const component = entry?.definition?.runtime?.component as
      | ((props: SchemaWidgetProps) => JSX.Element)
      | undefined;
    return { schemaEntry: entry, SchemaComponent: component };
  }, [widget.type]);

  // Memoize symbol extraction
  const currentSymbol = useMemo(() => {
    const propsObj = widget.props as Record<string, unknown> | undefined;
    return typeof propsObj?.['symbol'] === 'string' ? (propsObj['symbol'] as string) : '';
  }, [widget.props]);

  // Memoize event handlers to prevent unnecessary re-renders
  const handleRemove = useMemo(
    () => () => {
      trackInteraction('removed', { sheet_id: sheetId });
      removeWidget(sheetId, widget.id);
    },
    [trackInteraction, sheetId, removeWidget, widget.id]
  );

  // Title change handler (kept for potential future use)
  const handleTitleChange = useMemo(
    () => (newTitle: string) => {
      trackConfigChange({ title: newTitle });
      updateWidget(sheetId, { id: widget.id, title: newTitle });
    },
    [trackConfigChange, updateWidget, sheetId, widget.id]
  );

  const handleSymbolChange = useMemo(
    () => (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value || '';
      const sym = raw.toUpperCase().slice(0, 12);
      updateWidget(sheetId, {
        id: widget.id,
        props: { ...(widget.props || {}), symbol: sym },
      });
    },
    [updateWidget, sheetId, widget.id, widget.props]
  );

  const handleConfigureClick = useMemo(
    () => () => {
      trackInteraction('configure_opened', { via: 'button' });
      setSelectedWidget(widget.id);
      setInspectorOpen(true);
    },
    [trackInteraction, setSelectedWidget, setInspectorOpen, widget.id]
  );

  const selected = selectedWidgetId === widget.id;
  const content = (
    <Card
      className={`w-full h-full bg-background border-border transition-all duration-200 group ${
        selected
          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg border-primary/50'
          : 'hover:border-primary/50 hover:shadow-md'
      }`}
      data-testid={`widget-tile-${widget.id}`}
      data-selected={selected ? 'true' : 'false'}
      onClick={(e) => {
        // don't toggle when clicking inside inputs
        const target = e.target as HTMLElement;
        if (['input', 'textarea', 'button'].includes((target.tagName || '').toLowerCase())) return;
        e.stopPropagation();
        setSelectedWidget(widget.id);
      }}
    >
      {/* Selection indicator overlay */}
      {selected && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-0 h-0 border-l-[8px] border-l-primary border-t-[8px] border-t-primary" />
          <div className="absolute top-0 right-0 w-0 h-0 border-r-[8px] border-r-primary border-t-[8px] border-t-primary" />
          <div className="absolute bottom-0 left-0 w-0 h-0 border-l-[8px] border-l-primary border-b-[8px] border-b-primary" />
          <div className="absolute bottom-0 right-0 w-0 h-0 border-r-[8px] border-r-primary border-b-[8px] border-b-primary" />
        </div>
      )}

      {/* Header */}
      <div
        className="flex items-center justify-between p-2 border-b border-border relative"
        data-testid="widget-header"
      >
        <div className="flex items-center gap-2">
          <div className="drag-handle cursor-move opacity-100">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-sm font-medium text-foreground truncate">{widget.title}</span>
          {/* Symbol input */}
          <div
            className="ml-2 flex items-center gap-1"
            title="Enter a ticker symbol (e.g., AAPL). Press Configure to see more options."
            aria-label="Symbol input help"
          >
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Sym</span>
            <Input
              value={currentSymbol}
              placeholder="ACME"
              data-testid="widget-symbol-input"
              onChange={handleSymbolChange}
              className="h-6 px-2 py-0 text-xs w-[84px] bg-input border-border text-foreground"
            />
          </div>
        </div>

        {/* Contextual actions: hidden until hover or selection for minimalist clarity */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Plus className="h-3 w-3 text-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  /* Add action 1 */
                }}
              >
                Add action 1
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  /* Add action 2 */
                }}
              >
                Add action 2
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="More horizontal"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                data-testid="widget-menu"
              >
                <MoreHorizontal className="h-3 w-3 text-foreground" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  trackInteraction('configure_opened', { via: 'menu' });
                  setSelectedWidget(widget.id);
                  setInspectorOpen(true);
                }}
                data-testid="widget-configure"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configure
              </DropdownMenuItem>
              <DropdownMenuItem
                data-testid="widget-duplicate"
                onClick={() => {
                  trackInteraction('duplicated', { sheet_id: sheetId });
                  useWorkspaceStore.getState().duplicateWidget(sheetId, widget.id);
                }}
              >
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleRemove} className="text-destructive">
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            aria-label="Configure widget"
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            data-testid="widget-configure"
            onClick={handleConfigureClick}
          >
            <Settings className="w-4 h-4 mr-1" />
            Configure
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-destructive/20"
            onClick={handleRemove}
          >
            <X className="h-3 w-3 text-foreground" />
          </Button>
        </div>
      </div>

      {/* Content - Virtualized for Performance */}
      <div className="flex-1 p-2 overflow-hidden">
        <VirtualizedWidget
          widgetId={widget.id}
          widgetType={widget.type}
          className="h-full w-full"
          priority={selected ? 'high' : 'normal'}
          fallback={<WidgetLoadingFallback />}
        >
          <LazyWidgetRenderer
            widget={widget}
            schemaEntry={schemaEntry}
            SchemaComponent={SchemaComponent}
            sheetId={sheetId}
            selected={selected}
            updateWidget={updateWidget}
          />
        </VirtualizedWidget>
      </div>
    </Card>
  );

  // Simple error boundary to protect grid from crashing widgets
  class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean }
  > {
    constructor(props: any) {
      super(props);
      this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
      return { hasError: true };
    }
    render() {
      if (this.state.hasError) {
        return (
          <Card className="w-full h-full bg-card/50 border-destructive">
            <div className="flex items-center justify-center h-full text-destructive">
              Widget failed to render
            </div>
          </Card>
        );
      }
      return this.props.children as any;
    }
  }

  return <ErrorBoundary>{content}</ErrorBoundary>;
});
