'use client';

import { useWorkspaceStore, Widget } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelLeftOpen, RotateCcw, CheckCircle2, Clipboard } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useMemo } from 'react';
import { z } from 'zod';
import { getSchemaWidget, validateWidgetConfig } from '@/lib/widgets/registry';
import { PropertyEditor } from '@/components/inspector/PropertyEditor';
import { toast } from 'sonner';

function WidgetProperties({ widget, sheetId }: { widget: Widget; sheetId: string }) {
  const updateWidget = useWorkspaceStore((state) => state.updateWidget);

  const { entry, schema, meta } = useMemo(() => {
    const e = getSchemaWidget(widget.type);
    const s = e?.definition.meta.configSchema ?? z.object({}).passthrough();
    const m = e?.definition.meta;
    return { entry: e, schema: s, meta: m };
  }, [widget.type]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="inspector-title">Title</Label>
        <Input
          id="inspector-title"
          data-testid="inspector-title"
          value={widget.title}
          onChange={(e) => updateWidget(sheetId, { id: widget.id, title: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="inspector-type">Type</Label>
        <Input id="inspector-type" data-testid="inspector-type" value={widget.type} disabled />
      </div>
      <div className="space-y-2">
        <Label>Properties</Label>
        <PropertyEditor
          schema={schema}
          value={widget.props ?? {}}
          title={meta?.name}
          description={meta?.description}
          onChange={(next) => {
            const safe = { ...next } as Record<string, unknown>;
            if (typeof safe.symbol === 'string') {
              safe.symbol = (safe.symbol as string).toUpperCase().slice(0, 12);
            }
            updateWidget(sheetId, { id: widget.id, props: safe });
          }}
        />
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            aria-label="Reset to defaults"
            data-testid="inspector-reset-defaults"
            onClick={() => {
              const defaults = meta?.defaultConfig ?? {};
              updateWidget(sheetId, { id: widget.id, props: defaults as Record<string, unknown> });
              toast.success('Reset to default configuration');
            }}
          >
            <RotateCcw className="h-3 w-3 mr-1" /> Reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            aria-label="Validate configuration"
            data-testid="inspector-validate"
            onClick={() => {
              const current = (widget.props ?? {}) as unknown;
              const validation = validateWidgetConfig(widget.type, current);
              if (validation.valid) {
                updateWidget(sheetId, { id: widget.id, props: validation.data as Record<string, unknown> });
                toast.success('Configuration is valid');
              } else {
                const first = validation.errors?.issues?.[0];
                const where = first?.path?.join('.') || 'config';
                const msg = first?.message || 'Invalid configuration';
                toast.error(`${where}: ${msg}`);
              }
            }}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" /> Validate
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            aria-label="Copy configuration JSON"
            data-testid="inspector-copy-json"
            onClick={async () => {
              const json = JSON.stringify(widget.props ?? {}, null, 2);
              try {
                if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                  await navigator.clipboard.writeText(json);
                } else {
                  const el = document.createElement('textarea');
                  el.value = json;
                  document.body.appendChild(el);
                  el.select();
                  document.execCommand('copy');
                  document.body.removeChild(el);
                }
                toast.success('Copied configuration to clipboard');
              } catch (e) {
                toast.error('Failed to copy configuration');
              }
            }}
          >
            <Clipboard className="h-3 w-3 mr-1" /> Copy JSON
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Inspector() {
  const {
    inspectorOpen,
    setInspectorOpen,
    selectedWidgetId,
    activeSheetId,
    sheets,
  } = useWorkspaceStore((state) => ({
    inspectorOpen: state.inspectorOpen,
    setInspectorOpen: state.setInspectorOpen,
    selectedWidgetId: state.selectedWidgetId,
    activeSheetId: state.activeSheetId,
    sheets: state.sheets,
  }));

  const activeSheet = sheets.find((s) => s.id === activeSheetId);
  const selectedWidget = activeSheet?.widgets.find((w) => w.id === selectedWidgetId);

  // Auto-open when widget selected, auto-close when cleared
  useEffect(() => {
    if (selectedWidgetId && !inspectorOpen) {
      setInspectorOpen(true);
    } else if (!selectedWidgetId && inspectorOpen) {
      setInspectorOpen(false);
    }
  }, [selectedWidgetId, inspectorOpen, setInspectorOpen]);

  return (
    <div
      className="relative border-l bg-card"
      data-testid="inspector"
      style={{ display: inspectorOpen ? 'block' : 'none', width: inspectorOpen ? 320 : undefined }}
    >
      {inspectorOpen ? (
        <div className="w-[320px]" data-testid="inspector-panel">
          <div className="flex h-12 items-center justify-between border-b px-2">
            <h3 className="font-medium">Inspector</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setInspectorOpen(false)}
              data-testid="inspector-toggle"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4">
            {selectedWidget && activeSheetId ? (
              <WidgetProperties widget={selectedWidget} sheetId={activeSheetId} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a widget to see its properties.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}