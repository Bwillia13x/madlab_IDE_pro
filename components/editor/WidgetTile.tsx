'use client';

import { MoreHorizontal, X, GripVertical, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';
import { useWorkspaceStore, type Widget } from '@/lib/store';
// ...existing code...

// Widget components
import { KpiCard } from '@/components/widgets/KpiCard';
import { DcfBasic } from '@/components/widgets/DcfBasic';
import { LineChart } from '@/components/widgets/LineChart';
import { BarChart } from '@/components/widgets/BarChart';
import { Heatmap } from '@/components/widgets/Heatmap';
import { VarEs } from '@/components/widgets/VarEs';
import { StressScenarios } from '@/components/widgets/StressScenarios';
import { FactorExposures } from '@/components/widgets/FactorExposures';
import { CorrelationMatrix } from '@/components/widgets/CorrelationMatrix';
import { GreeksSurface } from '@/components/widgets/GreeksSurface';
import { VolCone } from '@/components/widgets/VolCone';
import { StrategyBuilder } from '@/components/widgets/StrategyBuilder';
import { PnLProfile } from '@/components/widgets/PnLProfile';
import { BlankTile } from '@/components/widgets/BlankTile';

interface WidgetTileProps {
  widget: Widget;
  sheetId: string;
}

const WIDGET_COMPONENTS = {
  'kpi-card': KpiCard,
  'dcf-basic': DcfBasic,
  'line-chart': LineChart,
  'bar-chart': BarChart,
  'heatmap': Heatmap,
  'var-es': VarEs,
  'stress-scenarios': StressScenarios,
  'factor-exposures': FactorExposures,
  'correlation-matrix': CorrelationMatrix,
  'greeks-surface': GreeksSurface,
  'vol-cone': VolCone,
  'strategy-builder': StrategyBuilder,
  'pnl-profile': PnLProfile,
  'blank-tile': BlankTile,
};

export function WidgetTile({ widget, sheetId }: WidgetTileProps) {
  const { removeWidget, updateWidget } = useWorkspaceStore();
  
  const WidgetComponent = WIDGET_COMPONENTS[widget.type as keyof typeof WIDGET_COMPONENTS];

  const handleRemove = () => {
    removeWidget(sheetId, widget.id);
  };

  const handleTitleChange = (newTitle: string) => {
    updateWidget(sheetId, { id: widget.id, title: newTitle });
  };

  if (!WidgetComponent) {
    return (
      <Card className="w-full h-full bg-card/50 border-destructive">
        <div className="flex items-center justify-center h-full text-destructive">
          Unknown widget type: {widget.type}
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full bg-[#252526] border-[#2d2d30] hover:border-[#007acc]/50 transition-colors group" data-testid={`widget-tile-${widget.id}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-[#2d2d30]">
        <div className="flex items-center gap-2">
          <div className="drag-handle cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="h-4 w-4 text-[#969696]" />
          </div>
          <span className="text-sm font-medium text-[#cccccc] truncate">
            {widget.title}
          </span>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Placeholder "+" dropdown for future actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Plus className="h-3 w-3 text-[#cccccc]" />
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
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-3 w-3 text-[#cccccc]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => console.log('Configure widget')}>
                Configure
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => console.log('Duplicate widget')}>
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
            <X className="h-3 w-3 text-[#cccccc]" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-2 overflow-hidden">
        <WidgetComponent 
          widget={widget} 
          onTitleChange={handleTitleChange}
          {...(widget.props || {})} 
        />
      </div>
    </Card>
  );
}