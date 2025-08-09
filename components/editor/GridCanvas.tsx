'use client';

import { useCallback } from 'react';
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout';
import { WidgetTile } from './WidgetTile';
import { useWorkspaceStore, type Sheet } from '@/lib/store';

// Make GridLayout responsive
const ResponsiveGridLayout = WidthProvider(Responsive);

interface GridCanvasProps {
  sheet: Sheet;
}

export function GridCanvas({ sheet }: GridCanvasProps) {
  const { updateLayout } = useWorkspaceStore();

  const handleLayoutChange = useCallback((layout: Layout[]) => {
    updateLayout(sheet.id, layout);
  }, [sheet.id, updateLayout]);

  const layouts = {
    lg: sheet.widgets.map(w => ({ ...w.layout, i: w.id })),
    md: sheet.widgets.map(w => ({ ...w.layout, i: w.id })),
    sm: sheet.widgets.map(w => ({ ...w.layout, i: w.id })),
    xs: sheet.widgets.map(w => ({ ...w.layout, i: w.id })),
    xxs: sheet.widgets.map(w => ({ ...w.layout, i: w.id }))
  };

  return (
    <div className="h-full w-full bg-[#1e1e1e] p-4">
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
          {sheet.widgets.map((widget) => (
            <div key={widget.id} className="react-grid-item">
              <WidgetTile widget={widget} sheetId={sheet.id} />
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}

// TODO: Implement advanced grid features
// - Custom breakpoints based on widget types
// - Auto-layout algorithms for optimal widget placement
// - Grid snapping and alignment guides
// - Widget grouping and containers
// - Export/import grid layouts
// - Template-based layouts for common analysis patterns