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
import dynamic from 'next/dynamic';
import { getSchemaWidget } from '@/lib/widgets/registry';
import { registerCoreWidgets } from '@/lib/widgets/coreWidgets';
import type { WidgetProps as SchemaWidgetProps } from '@/lib/widgets/schema';
// ...existing code...

// Widget components rendered only via registry moving forward

interface WidgetTileProps {
  widget: Widget;
  sheetId: string;
}

const WIDGET_COMPONENTS: Record<string, never> = {};

export function WidgetTile({ widget, sheetId }: WidgetTileProps) {
  // Ensure core widgets are registered once
  registerCoreWidgets();
  const { removeWidget, updateWidget, setSelectedWidget, selectedWidgetId, setInspectorOpen } =
    useWorkspaceStore();

  // Prefer schema-based registry if available for this type
  const schemaEntry = getSchemaWidget(widget.type);
  const SchemaComponent = schemaEntry?.definition.runtime.component as
    | ((props: SchemaWidgetProps) => JSX.Element)
    | undefined;

  const WidgetComponent = WIDGET_COMPONENTS[widget.type as keyof typeof WIDGET_COMPONENTS];
  const propsObj = widget.props as Record<string, unknown> | undefined;
  const currentSymbol =
    typeof propsObj?.['symbol'] === 'string' ? (propsObj['symbol'] as string) : '';

  const handleRemove = () => {
    removeWidget(sheetId, widget.id);
  };

  const handleTitleChange = (newTitle: string) => {
    updateWidget(sheetId, { id: widget.id, title: newTitle });
  };

  // Always render Card wrapper so tests can find widget tiles by testid
  const selected = selectedWidgetId === widget.id;
  return (
    <Card
      className={`w-full h-full bg-background border-border transition-colors group ${selected ? 'ring-1 ring-primary' : 'hover:border-primary/50'}`}
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
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="drag-handle cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-sm font-medium text-foreground truncate">{widget.title}</span>
          {/* Symbol input */}
          <div className="ml-2 flex items-center gap-1">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Sym</span>
            <Input
              value={currentSymbol}
              placeholder="ACME"
              onChange={(e) => {
                const raw = e.target.value || '';
                const sym = raw.toUpperCase().slice(0, 12);
                updateWidget(sheetId, {
                  id: widget.id,
                  props: { ...(widget.props || {}), symbol: sym },
                });
              }}
              className="h-6 px-2 py-0 text-xs w-[84px] bg-input border-border text-foreground"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Placeholder "+" dropdown for future actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Plus className="h-3 w-3 text-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => console.log('Add action 1')}>
                Add action 1
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => console.log('Add action 2')}>
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
                onClick={() => useWorkspaceStore.getState().duplicateWidget(sheetId, widget.id)}
              >
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleRemove} className="text-destructive">
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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

      {/* Content */}
      <div className="flex-1 p-2 overflow-hidden">
        {SchemaComponent ? (
          <SchemaComponent
            id={widget.id}
            config={(widget.props as any) || schemaEntry!.definition.meta.defaultConfig}
            isSelected={selected}
            onConfigChange={(config) =>
              updateWidget(sheetId, { id: widget.id, props: config as Record<string, unknown> })
            }
            onError={(err) => console.warn('Widget error', widget.type, err)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
            Unknown widget: {widget.type}
          </div>
        )}
      </div>
    </Card>
  );
}
