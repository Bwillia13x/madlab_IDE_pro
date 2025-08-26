'use client';

import { useCallback } from 'react';
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout';
import { WidgetTile } from './WidgetTile';
import { useWorkspaceStore, type Sheet } from '@/lib/store';
import { cn } from '@/lib/utils';

// Make GridLayout responsive
const ResponsiveGridLayout = WidthProvider(Responsive);

interface GridCanvasProps {
  sheet: Sheet;
}

export function GridCanvas({ sheet }: GridCanvasProps) {
  const { updateLayout, selectedWidgetId, setSelectedWidget, addWidget } = useWorkspaceStore();

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
      className="h-full w-full bg-[#1e1e1e] p-4 overflow-hidden"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('application/x-madlab-widget')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }
      }}
      onDrop={(e) => {
        try {
          const raw = e.dataTransfer.getData('application/x-madlab-widget');
          if (!raw) return;
          const payload = JSON.parse(raw) as {
            type: string;
            title: string;
            config?: Record<string, unknown>;
          };
          // Basic default placement: top-left 6x4; grid recalculates to avoid overlap
          addWidget(sheet.id, {
            type: payload.type,
            title: payload.title,
            layout: { i: '', x: 0, y: 0, w: 6, h: 4 },
            props: payload.config || {},
          });
        } catch {
          // ignore
        }
      }}
    >
      {sheet.widgets.length === 0 ? (
        <div className="flex items-center justify-center h-full text-[#969696]">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">Empty Sheet</h3>
            <p className="text-sm">Add widgets to get started with your analysis</p>
          </div>
        </div>
      ) : (
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={60}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".drag-handle"
          resizeHandles={['se']}
          margin={[8, 8]}
          containerPadding={[0, 0]}
        >
          {sheet.widgets.map((widget) => {
            const selected = selectedWidgetId === widget.id;
            return (
              <div
                key={widget.id}
                role="button"
                className={cn('outline-0', selected && 'ring-1 ring-[#007acc] ring-offset-0')}
                onClick={() => setSelectedWidget(widget.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedWidget(widget.id);
                }}
                tabIndex={0}
                aria-label={`Select widget ${widget.title}`}
                data-widget-id={widget.id}
              >
                <WidgetTile widget={widget} sheetId={sheet.id} />
              </div>
            );
          })}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
