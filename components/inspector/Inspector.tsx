'use client';

import { useWorkspaceStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import AutoForm from '@/lib/ui/AutoForm';
import { z } from 'zod';
import { getSchemaWidget as getSchemaWidgetV2 } from '@/lib/widgets/registry';
import { X } from 'lucide-react';

export function Inspector() {
  const { inspectorOpen, setInspectorOpen, selectedWidgetId, sheets, updateWidget } =
    useWorkspaceStore();

  if (!inspectorOpen || !selectedWidgetId) {
    return null;
  }

  const owningSheet = sheets.find((s) => s.widgets.some((w) => w.id === selectedWidgetId));
  const widget = owningSheet?.widgets.find((w) => w.id === selectedWidgetId);
  const props = (widget?.props as Record<string, unknown> | undefined) || {};

  return (
    <div
      role="dialog"
      aria-label="Widget inspector"
      aria-describedby="inspector-description"
      className="w-80 bg-vscode-panel border-l border-vscode-border flex flex-col"
      data-testid="inspector"
    >
      <div data-testid="inspector-panel">
      <div className="group h-9 px-3 flex items-center justify-between border-b border-vscode-border">
        <span className="text-xs font-medium text-vscode-foreground uppercase tracking-wider">
          Inspector
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-60 group-hover:opacity-100 transition-opacity"
          onClick={() => setInspectorOpen(false)}
          aria-label="Close inspector"
          data-testid="inspector-toggle"
        >
          <X className="h-3 w-3 text-vscode-foreground" />
        </Button>
      </div>
      <div id="inspector-description" className="sr-only">
        Configure the selected widget's properties and settings
      </div>
      <div className="p-4 space-y-4">
        <div>
          <label htmlFor="inspector-title-input" className="text-xs text-muted-foreground">
            Title
          </label>
          <Input
            id="inspector-title-input"
            data-testid="inspector-title"
            placeholder="Widget Title"
            aria-label="Widget title"
            value={(widget?.title ?? '') as string}
            onChange={(e) => {
              if (!owningSheet || !widget) return;
              updateWidget(owningSheet.id, { id: widget.id, title: e.target.value });
            }}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Properties</label>
          {(() => {
            const entry = widget ? getSchemaWidgetV2(widget.type) : undefined;
            const schema = (entry?.definition.meta.configSchema as z.ZodTypeAny | undefined) ?? z.object({ symbol: z.string().optional() });
            return (
              <AutoForm
                schema={schema}
                value={props}
                onChange={(next) => {
                  if (!owningSheet || !widget) return;
                  const safe = { ...next } as Record<string, unknown>;
                  if (typeof safe.symbol === 'string') {
                    safe.symbol = (safe.symbol as string).toUpperCase().slice(0, 12);
                  }
                  updateWidget(owningSheet.id, { id: widget.id, props: safe });
                }}
              />
            );
          })()}
        </div>
        <div>
          <label htmlFor="inspector-props-json" className="text-xs text-muted-foreground">
            Props (JSON)
          </label>
          <Textarea
            id="inspector-props-json"
            data-testid="inspector-props"
            placeholder='{ "symbol": "AAPL" }'
            aria-label="Widget properties in JSON format"
            rows={8}
            value={JSON.stringify(props, null, 2)}
            onChange={(e) => {
              try {
                const next = JSON.parse(e.target.value);
                if (!owningSheet || !widget) return;
                updateWidget(owningSheet.id, { id: widget.id, props: next });
              } catch {
                // ignore invalid JSON while typing
              }
            }}
          />
        </div>
      </div>
      </div>
    </div>
  );
}
