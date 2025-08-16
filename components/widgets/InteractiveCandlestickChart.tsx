'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import type { Widget } from '@/lib/store';

interface InteractiveCandlestickChartProps {
  widget: Widget;
  sheetId: string;
  onTitleChange?: (title: string) => void;
}

export function InteractiveCandlestickChart({ widget, sheetId, onTitleChange }: InteractiveCandlestickChartProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          {widget.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Interactive Candlestick Chart</p>
          <p className="text-xs">D3.js charting will be implemented</p>
        </div>
      </CardContent>
    </Card>
  );
}