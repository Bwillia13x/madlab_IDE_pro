'use client';

import { Plus, BarChart3, TrendingUp, PieChart, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Widget } from '@/lib/store';

interface BlankTileProps {
  widget: Widget;
  onTitleChange?: (title: string) => void;
}

const WIDGET_SUGGESTIONS = [
  { type: 'line-chart', icon: TrendingUp, label: 'Line Chart' },
  { type: 'bar-chart', icon: BarChart3, label: 'Bar Chart' },
  { type: 'pie-chart', icon: PieChart, label: 'Pie Chart' },
  { type: 'kpi-card', icon: Activity, label: 'KPI Card' },
];

export function BlankTile({ widget }: BlankTileProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center space-y-4">
      <div className="text-center">
        <Plus className="h-12 w-12 text-[#969696] mx-auto mb-2" />
        <h3 className="text-lg font-medium text-[#cccccc] mb-1">Add a Widget</h3>
        <p className="text-sm text-[#969696]">Choose from our collection of financial analysis tools</p>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {WIDGET_SUGGESTIONS.map((suggestion) => (
          <Card key={suggestion.type} className="bg-[#2d2d30] border-[#3e3e42] hover:border-[#007acc] cursor-pointer transition-colors">
            <CardContent className="p-3 text-center">
              <suggestion.icon className="h-6 w-6 text-[#007acc] mx-auto mb-1" />
              <span className="text-xs text-[#cccccc]">{suggestion.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Button 
        variant="outline" 
        className="bg-[#2d2d30] border-[#3e3e42] text-[#cccccc] hover:border-[#007acc]"
      >
        Browse All Widgets
      </Button>
    </div>
  );
}

// TODO: Enhanced widget selection
// - Widget marketplace with categories
// - Preview functionality for widgets
// - Custom widget templates
// - Widget import/export capabilities
// - Community-contributed widgets
// - Widget configuration wizard