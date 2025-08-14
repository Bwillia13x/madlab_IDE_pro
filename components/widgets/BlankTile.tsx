'use client';

import { Plus, BarChart3, TrendingUp, PieChart, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { WidgetProps, WidgetDefinition } from '@/lib/widgets/schema';
import { createWidgetSchema, CommonSchemas } from '@/lib/widgets/schema';
import { z } from 'zod';

// Configuration schema for BlankTile
const BlankTileConfigSchema = createWidgetSchema(z.object({
  showSuggestions: z.boolean().default(true).describe('Show widget suggestions'),
  suggestionCount: z.number().min(2).max(8).default(4).describe('Number of suggestions to show'),
  enableBrowseButton: z.boolean().default(true).describe('Show browse all widgets button'),
}));

type BlankTileConfig = z.infer<typeof BlankTileConfigSchema>;

const WIDGET_SUGGESTIONS = [
  { type: 'line-chart', icon: TrendingUp, label: 'Line Chart' },
  { type: 'bar-chart', icon: BarChart3, label: 'Bar Chart' },
  { type: 'pie-chart', icon: PieChart, label: 'Pie Chart' },
  { type: 'kpi-card', icon: Activity, label: 'KPI Card' },
];

function BlankTileComponent({ config }: WidgetProps) {
  const typedConfig = config as BlankTileConfig;
  const suggestions = WIDGET_SUGGESTIONS.slice(0, typedConfig.suggestionCount);

  return (
    <div className="h-full flex flex-col items-center justify-center space-y-4">
      <div className="text-center">
        <Plus className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
        <h3 className="text-lg font-medium text-muted-foreground mb-1">
          {typedConfig.title || 'Add a Widget'}
        </h3>
        <p className="text-sm text-muted-foreground">Choose from our collection of financial analysis tools</p>
      </div>
      
      {typedConfig.showSuggestions && (
        <div className="grid grid-cols-2 gap-3">
          {suggestions.map((suggestion) => (
            <Card key={suggestion.type} className="bg-card border-border hover:border-primary cursor-pointer transition-colors">
              <CardContent className="p-3 text-center">
                <suggestion.icon className="h-6 w-6 text-primary mx-auto mb-1" />
                <span className="text-xs text-muted-foreground">{suggestion.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {typedConfig.enableBrowseButton && (
        <Button 
          variant="outline" 
          className="bg-card border-border text-muted-foreground hover:border-primary"
        >
          Browse All Widgets
        </Button>
      )}
    </div>
  );
}

// Widget definition conforming to the SDK
export const BlankTileDefinition: WidgetDefinition = {
  meta: {
    type: 'blank-tile',
    name: 'Blank Tile',
    description: 'A placeholder widget for adding new content',
    category: 'utility',
    version: '1.0.0',
    configSchema: BlankTileConfigSchema,
    defaultConfig: {
      title: 'Add a Widget',
      showSuggestions: true,
      suggestionCount: 4,
      enableBrowseButton: true,
    },
    defaultSize: { w: 4, h: 3 },
    capabilities: {
      resizable: true,
      configurable: true,
      dataBinding: false,
      exportable: false,
      realTimeData: false,
    },
    tags: ['utility', 'placeholder'],
    icon: Plus as any,
  },
  runtime: {
    component: BlankTileComponent,
  },
};

// Export the component for backward compatibility
export function BlankTile(props: any) {
  return <BlankTileComponent {...props} />;
}

// TODO: Enhanced widget selection
// - Widget marketplace with categories
// - Preview functionality for widgets
// - Custom widget templates
// - Widget import/export capabilities
// - Community-contributed widgets
// - Widget configuration wizard