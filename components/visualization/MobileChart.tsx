import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Settings,
  RotateCcw,
  Download,
  BarChart3,
  Smartphone
} from 'lucide-react';

interface MobileChartProps {
  compactMode?: boolean;
  showQuickActions?: boolean;
  enableTouchGestures?: boolean;
  className?: string;
}

export const MobileChart: React.FC<MobileChartProps> = ({
  compactMode = false,
  showQuickActions = false,
  enableTouchGestures = false,
  className = ''
}) => {
  const [touchGesturesEnabled, setTouchGesturesEnabled] = useState(enableTouchGestures);

  const handleReset = () => {
    console.log('Reset chart');
  };

  const handleExport = () => {
    console.log('Export chart');
  };

  const handleSettings = () => {
    console.log('Open settings');
  };

  if (compactMode) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="flex items-center gap-2 text-sm">
          <BarChart3 className="h-4 w-4" />
          <span>Chart</span>
        </div>
      </div>
    );
  }

  return (
    <Card className={`h-full flex flex-col ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Smartphone />
            Mobile Chart
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSettings}
              aria-label="Settings"
              title="Settings"
            >
              <Settings />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              aria-label="Reset"
              title="Reset"
            >
              <RotateCcw />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              aria-label="Export"
              title="Export"
            >
              <Download />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Mobile Chart Placeholder */}
        <div className="flex-1 border rounded-md flex items-center justify-center bg-muted/10">
          <div className="text-center text-muted-foreground">
            <Smartphone className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Mobile Chart</p>
            <p className="text-xs text-muted-foreground/70">
              Touch gestures: {touchGesturesEnabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
        </div>

        {/* Mobile-specific controls */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Touch Gestures</label>
            <Switch
              checked={touchGesturesEnabled}
              onCheckedChange={setTouchGesturesEnabled}
              aria-label="Enable touch gestures"
            />
          </div>

          {showQuickActions && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" className="text-xs flex-1">
                Reset
              </Button>
              <Button variant="outline" size="sm" className="text-xs flex-1">
                Export
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
