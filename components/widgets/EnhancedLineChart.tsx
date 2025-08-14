"use client";

import { useState, useRef, useMemo, useCallback } from 'react';
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip,
  Brush,
  ReferenceLine,
  CartesianGrid 
} from 'recharts';
import { ChartContainer } from '@/components/ui/ChartContainer';
import { Download, ZoomIn, ZoomOut, RotateCcw, Target, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import type { Widget } from '@/lib/store';
import { usePrices, useDataCache } from '@/lib/data/hooks';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import type { PriceRange } from '@/lib/data/providers';
import { exportPriceData } from '@/lib/data/export';
import { analytics } from '@/lib/analytics';

interface EnhancedLineChartProps {
  widget: Widget;
  onTitleChange?: (title: string) => void;
  symbol?: string;
}

const RANGES: PriceRange[] = ['1D','5D','1M','3M','6M','1Y','2Y','5Y'];

interface ChartState {
  zoomLevel: number;
  crosshairPosition: { x: number; y: number } | null;
  selectedDataPoint: any | null;
  brushRange: [number, number] | null;
  showGrid: boolean;
  showTrendLine: boolean;
}

export function EnhancedLineChart({ widget: _widget, symbol }: Readonly<EnhancedLineChartProps>) {
  const [range, setRange] = useState<PriceRange>('6M');
  const actualSymbol = symbol || 'AAPL';
  const { data, loading, error } = usePrices(actualSymbol, range);
  const { clearCache } = useDataCache();
  
  const [chartState, setChartState] = useState<ChartState>({
    zoomLevel: 1,
    crosshairPosition: null,
    selectedDataPoint: null,
    brushRange: null,
    showGrid: true,
    showTrendLine: false,
  });

  const chartRef = useRef<any>(null);

  // Process data for enhanced features
  const processedData = useMemo(() => {
    if (!data) return [];
    
    return data.map((point, index) => ({
      ...point,
      index,
      ma20: index >= 19 ? data.slice(index - 19, index + 1).reduce((sum, p) => sum + p.close, 0) / 20 : null,
      volatility: index >= 1 ? Math.abs((point.close - data[index - 1].close) / data[index - 1].close) * 100 : 0,
    }));
  }, [data]);

  // Calculate trend line
  const trendLineData = useMemo(() => {
    if (!processedData.length) return [];
    
    const n = processedData.length;
    const sumX = processedData.reduce((sum, _, i) => sum + i, 0);
    const sumY = processedData.reduce((sum, point) => sum + point.close, 0);
    const sumXY = processedData.reduce((sum, point, i) => sum + i * point.close, 0);
    const sumX2 = processedData.reduce((sum, _, i) => sum + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return processedData.map((point, index) => ({
      ...point,
      trendValue: slope * index + intercept,
    }));
  }, [processedData]);

  // Handle zoom
  const handleZoom = useCallback((direction: 'in' | 'out' | 'reset') => {
    setChartState(prev => {
      let newZoom = prev.zoomLevel;
      
      if (direction === 'in') {
        newZoom = Math.min(prev.zoomLevel * 1.5, 10);
      } else if (direction === 'out') {
        newZoom = Math.max(prev.zoomLevel / 1.5, 0.1);
      } else {
        newZoom = 1;
      }
      
      analytics.track('chart_zoom', {
        direction,
        zoom_level: newZoom,
        symbol: actualSymbol,
      }, 'feature_usage');
      
      return { ...prev, zoomLevel: newZoom };
    });
  }, [actualSymbol]);

  // Handle brush selection
  const handleBrushChange = useCallback((brushData: any) => {
    if (brushData && brushData.startIndex !== undefined && brushData.endIndex !== undefined) {
      setChartState(prev => ({
        ...prev,
        brushRange: [brushData.startIndex, brushData.endIndex],
      }));
      
      analytics.track('chart_brush_selection', {
        start_index: brushData.startIndex,
        end_index: brushData.endIndex,
        symbol: actualSymbol,
      }, 'feature_usage');
    }
  }, [actualSymbol]);

  // Handle mouse move for crosshair
  const handleMouseMove = useCallback((event: any) => {
    if (event && event.activePayload && event.activePayload[0]) {
      const dataPoint = event.activePayload[0].payload;
      setChartState(prev => ({
        ...prev,
        crosshairPosition: { x: event.activeLabel, y: event.activePayload[0].value },
        selectedDataPoint: dataPoint,
      }));
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setChartState(prev => ({
      ...prev,
      crosshairPosition: null,
      selectedDataPoint: null,
    }));
  }, []);

  // Toggle features
  const toggleGrid = useCallback(() => {
    setChartState(prev => {
      const newShowGrid = !prev.showGrid;
      analytics.track('chart_toggle_grid', { enabled: newShowGrid }, 'feature_usage');
      return { ...prev, showGrid: newShowGrid };
    });
  }, []);

  const toggleTrendLine = useCallback(() => {
    setChartState(prev => {
      const newShowTrend = !prev.showTrendLine;
      analytics.track('chart_toggle_trend', { enabled: newShowTrend }, 'feature_usage');
      return { ...prev, showTrendLine: newShowTrend };
    });
  }, []);

  // Handle export with enhanced data
  const handleExport = useCallback(() => {
    if (!processedData || processedData.length === 0) {
      toast.error('No price data available to export');
      return;
    }

    try {
      const exportData = processedData.map(point => ({
        date: point.date,
        open: point.close,
        high: point.close,
        low: point.close,
        close: point.close,
        volume: 0,
        ma20: point.ma20 || undefined,
        volatility: point.volatility,
      }));

      exportPriceData(exportData.map(p => ({
        ...p,
        date: p.date instanceof Date ? p.date.toISOString().split('T')[0] : (p as any).date,
      })), actualSymbol, {
        filename: `${actualSymbol}_${range}_enhanced_${new Date().toISOString().split('T')[0]}.csv`
      });
      
      toast.success(`Enhanced price data for ${actualSymbol} (${range}) exported successfully`);
      
      analytics.track('chart_data_exported', {
        symbol: actualSymbol,
        range,
        data_points: exportData.length,
        includes_indicators: true,
      }, 'export_action');
    } catch (err) {
      toast.error(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [processedData, actualSymbol, range]);

  // Custom tooltip component
  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    
    return (
      <div className="bg-card border border-border rounded p-3 shadow-lg">
        <p className="font-medium text-sm mb-1">{label}</p>
        <div className="space-y-1">
          <div className="flex justify-between items-center gap-4">
            <span className="text-xs text-muted-foreground">Price:</span>
            <span className="text-sm font-mono">${data.close.toFixed(2)}</span>
          </div>
          {data.ma20 && (
            <div className="flex justify-between items-center gap-4">
              <span className="text-xs text-muted-foreground">MA20:</span>
              <span className="text-sm font-mono text-blue-500">${data.ma20.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center gap-4">
            <span className="text-xs text-muted-foreground">Volatility:</span>
            <span className="text-sm font-mono text-orange-500">{data.volatility.toFixed(2)}%</span>
          </div>
        </div>
      </div>
    );
  }, []);

  return (
    <div className="h-full flex flex-col group">
      {/* Header with controls */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-border">
        <div className="text-xs font-medium">{actualSymbol}</div>
        {chartState.selectedDataPoint && (
          <Badge variant="outline" className="text-xs">
            ${chartState.selectedDataPoint.close.toFixed(2)}
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-1 opacity-60 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200">
          {/* Zoom controls */}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => handleZoom('in')}
            title="Zoom In"
          >
            <ZoomIn className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => handleZoom('out')}
            title="Zoom Out"
          >
            <ZoomOut className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => handleZoom('reset')}
            title="Reset Zoom"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          
          {/* Feature toggles */}
          <Button
            size="sm"
            variant={chartState.showGrid ? "default" : "ghost"}
            className="h-6 w-6 p-0"
            onClick={toggleGrid}
            title="Toggle Grid"
          >
            <Target className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant={chartState.showTrendLine ? "default" : "ghost"}
            className="h-6 w-6 p-0"
            onClick={toggleTrendLine}
            title="Toggle Trend Line"
          >
            <TrendingUp className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Range selector */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border">
        {RANGES.map((r) => (
          <Button
            key={r}
            size="sm"
            variant={r === range ? 'default' : 'ghost'}
            className="h-6 px-2 text-xs"
            data-testid={`enhanced-line-range-${r}`}
            onClick={() => setRange(r)}
          >
            {r}
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-1 opacity-60 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200">
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-xs"
            data-testid="enhanced-line-export"
            onClick={handleExport}
            title="Export Enhanced Data"
            disabled={!processedData || processedData.length === 0 || loading}
          >
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-xs"
            data-testid="enhanced-line-refresh"
            onClick={() => clearCache()}
            title="Refresh"
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-400 px-2 py-1" role="status">{String(error)}</div>
      )}

      {/* Chart area */}
      <div 
        className="flex-1 relative"
        role="img"
        aria-label={`Enhanced line chart for ${actualSymbol}`}
        data-testid="enhanced-line-chart"
      >
        <ChartContainer minHeight={220}>
          <RechartsLineChart 
            ref={chartRef}
            data={chartState.showTrendLine ? trendLineData : processedData}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {chartState.showGrid && (
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            )}
            
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              scale="point"
              padding={{ left: 10, right: 10 }}
            />
            <YAxis 
              domain={['dataMin', 'dataMax']}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `$${value.toFixed(2)}`}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            {/* Main price line */}
            <Line 
              type="monotone" 
              dataKey="close" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
            />
            
            {/* Moving average line */}
            <Line 
              type="monotone" 
              dataKey="ma20" 
              stroke="hsl(var(--blue-500))"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
              connectNulls={false}
            />
            
            {/* Trend line */}
            {chartState.showTrendLine && (
              <Line 
                type="linear" 
                dataKey="trendValue" 
                stroke="hsl(var(--orange-500))"
                strokeWidth={1}
                dot={false}
              />
            )}
            
            {/* Crosshair reference lines */}
            {chartState.crosshairPosition && (
              <>
                <ReferenceLine 
                  x={chartState.crosshairPosition.x} 
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="2 2"
                  opacity={0.5}
                />
                <ReferenceLine 
                  y={chartState.crosshairPosition.y} 
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="2 2"
                  opacity={0.5}
                />
              </>
            )}
            
            {/* Zoom brush */}
            {chartState.zoomLevel > 1 && (
              <Brush
                dataKey="date"
                height={30}
                onChange={handleBrushChange}
                fill="hsl(var(--muted))"
                stroke="hsl(var(--border))"
              />
            )}
          </RechartsLineChart>
        </ChartContainer>
        
        {/* Zoom level indicator */}
        {chartState.zoomLevel !== 1 && (
          <div className="absolute top-2 right-2">
            <Badge variant="outline" className="text-xs">
              {chartState.zoomLevel.toFixed(1)}x
            </Badge>
          </div>
        )}
      </div>

      {loading && !processedData && (
        <div className="text-xs text-muted-foreground px-2 py-1" role="status" aria-live="polite">
          Loading enhanced chart data…
        </div>
      )}
    </div>
  );
}