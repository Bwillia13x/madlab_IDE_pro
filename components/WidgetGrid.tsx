'use client';

import { useState, useEffect } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Activity, 
  Settings,
  X,
  Edit,
  Maximize2,
  Minimize2
} from 'lucide-react';
import type { Widget } from '@/lib/store';
import { getWidgetComponent } from '@/lib/widgets/registry';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface WidgetGridProps {
  widgets: Widget[];
  onWidgetRemove?: (widgetId: string) => void;
  onWidgetUpdate?: (widgetId: string, updates: Partial<Widget>) => void;
}

export function WidgetGrid({ 
  widgets, 
  onWidgetRemove, 
  onWidgetUpdate 
}: WidgetGridProps) {
  const [editingWidget, setEditingWidget] = useState<string | null>(null);
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null);
  const [loadedComponents, setLoadedComponents] = useState<Record<string, React.ComponentType<any>>>({});

  // Load widget components
  useEffect(() => {
    const loadComponents = async () => {
      const newLoadedComponents: Record<string, React.ComponentType<any>> = {};
      
      for (const widget of widgets) {
        if (!loadedComponents[widget.type]) {
          try {
            const component = await getWidgetComponent(widget.type);
            if (component) {
              newLoadedComponents[widget.type] = component;
            }
          } catch (error) {
            console.warn(`Failed to load component for widget type: ${widget.type}`, error);
          }
        }
      }
      
      if (Object.keys(newLoadedComponents).length > 0) {
        setLoadedComponents(prev => ({ ...prev, ...newLoadedComponents }));
      }
    };

    loadComponents();
  }, [widgets, loadedComponents]);

  // Convert widgets to grid layout format
  const layouts = {
    lg: widgets.map(widget => ({
      i: widget.id,
      x: widget.layout?.x || 0,
      y: widget.layout?.y || 0,
      w: widget.layout?.w || 6,
      h: widget.layout?.h || 8,
      minW: 4,
      minH: 4,
    })),
    md: widgets.map(widget => ({
      i: widget.id,
      x: widget.layout?.x || 0,
      y: widget.layout?.y || 0,
      w: Math.min(widget.layout?.w || 6, 8),
      h: Math.min(widget.layout?.h || 8, 10),
      minW: 3,
      minH: 3,
    })),
    sm: widgets.map(widget => ({
      i: widget.id,
      x: 0,
      y: 0,
      w: 12,
      h: 8,
      minW: 12,
      minH: 6,
    })),
    xs: widgets.map(widget => ({
      i: widget.id,
      x: 0,
      y: 0,
      w: 12,
      h: 8,
      minW: 12,
      minH: 6,
    })),
  };

  // Handle layout change
  const handleLayoutChange = (currentLayout: any, allLayouts: any) => {
    // Update widget layouts in store
    currentLayout.forEach((item: any) => {
      const widget = widgets.find(w => w.id === item.i);
      if (widget && onWidgetUpdate) {
        onWidgetUpdate(widget.id, {
          layout: {
            i: item.i,
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h,
          },
        });
      }
    });
  };

  // Render widget content
  const renderWidget = (widget: Widget) => {
    const WidgetComponent = loadedComponents[widget.type];
    
    if (!WidgetComponent) {
      return (
        <div className="text-center text-muted-foreground py-8">
          <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Loading widget "{widget.type}"...</p>
        </div>
      );
    }

    return (
      <WidgetComponent
        widget={widget}
        sheetId="desktop-sheet"
        onTitleChange={(title: string) => onWidgetUpdate?.(widget.id, { title })}
      />
    );
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'portfolio':
        return TrendingUp;
      case 'charting':
        return BarChart3;
      case 'analytics':
        return Activity;
      case 'settings':
        return Settings;
      default:
        return BarChart3;
    }
  };

  if (widgets.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          No widgets yet
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Add some widgets to get started with your financial analysis dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Widget Grid */}
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
        rowHeight={60}
        onLayoutChange={handleLayoutChange}
        isDraggable={true}
        isResizable={true}
        margin={[16, 16]}
        containerPadding={[16, 16]}
      >
        {widgets.map((widget) => {
          const CategoryIcon = getCategoryIcon(widget.category || 'overview');
          const isExpanded = expandedWidget === widget.id;
          
          return (
            <div key={widget.id} className="relative group">
              {/* Widget Header */}
              <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between bg-background/80 backdrop-blur rounded-t-lg p-2 border-b">
                <div className="flex items-center gap-2">
                  <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {widget.title}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {widget.category || 'overview'}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Expand/Collapse */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedWidget(isExpanded ? null : widget.id)}
                    className="h-6 w-6 p-0"
                    title={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isExpanded ? (
                      <Minimize2 className="h-3 w-3" />
                    ) : (
                      <Maximize2 className="h-3 w-3" />
                    )}
                  </Button>
                  
                  {/* Edit */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingWidget(editingWidget === widget.id ? null : widget.id)}
                    className="h-6 w-6 p-0"
                    title="Edit widget"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  
                  {/* Remove */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onWidgetRemove?.(widget.id)}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    title="Remove widget"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {/* Widget Content */}
              <div className="pt-12">
                {renderWidget(widget)}
              </div>
            </div>
          );
        })}
      </ResponsiveGridLayout>
      
      {/* Grid Info */}
      <div className="text-center text-xs text-muted-foreground">
        <p>💡 <strong>Grid Controls:</strong></p>
        <p>• Drag widgets to reposition • Resize by dragging corners • Hover for widget actions</p>
      </div>
    </div>
  );
}