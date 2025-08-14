"use client";

import { useState, useMemo, useCallback } from 'react';
import { 
  ComposedChart,
  Line,
  Bar,
  XAxis, 
  YAxis, 
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { ChartContainer } from '@/components/ui/ChartContainer';
import { Download, ZoomIn, ZoomOut, RotateCcw, TrendingUp, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import type { Widget } from '@/lib/store';
import { usePrices, useDataCache } from '@/lib/data/hooks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import type { PriceRange } from '@/lib/data/providers';
import { exportPriceData } from '@/lib/data/export';
import { analytics } from '@/lib/analytics';

interface CandlestickChartProps {
  widget: Widget;
  onTitleChange?: (title: string) => void;
  symbol?: string;
}

const RANGES: PriceRange[] = ['1D','5D','1M','3M','6M','1Y','2Y','5Y'];

interface ChartState {
  zoomLevel: number;
  showVolume: boolean;
  showBollingerBands: boolean;
  showRSI: boolean;
  selectedIndicators: string[];
}

// Custom candlestick component
interface CandlePayload { open: number; high: number; low: number; close: number }
const Candlestick = ({ payload, x, y, width, height }: { payload: CandlePayload; x: number; y: number; width: number; height: number }) => {
  if (!payload) return null;
  
  const { open, high, low, close } = payload;
  const isGreen = close > open;
  const color = isGreen ? '#10b981' : '#ef4444';
  const bodyHeight = Math.abs(close - open);
  const bodyY = Math.min(open, close);
  
  // Scale factors (simplified for demo)
  const priceRange = high - low;
  const pixelPerPrice = height / priceRange;
  
  const candleBodyHeight = bodyHeight * pixelPerPrice;
  const candleBodyY = y + (high - bodyY) * pixelPerPrice;
  const wickTop = y + (high - high) * pixelPerPrice;
  const wickBottom = y + (high - low) * pixelPerPrice;
  
  return (
    <g>
      {/* High-Low wick */}
      <line
        x1={x + width / 2}
        y1={wickTop}
        x2={x + width / 2}
        y2={wickBottom}
        stroke={color}
        strokeWidth={1}
      />
      {/* Open-Close body */}
      <rect
        x={x + width * 0.2}
        y={candleBodyY}
        width={width * 0.6}
        height={Math.max(candleBodyHeight, 1)}
        fill={isGreen ? 'transparent' : color}
        stroke={color}
        strokeWidth={1}
      />
    </g>
  );
};

export function CandlestickChart({ widget: _widget, symbol }: Readonly<CandlestickChartProps>) {
  const [range, setRange] = useState<PriceRange>('1M');
  const actualSymbol = symbol || 'AAPL';
  const { data, loading, error } = usePrices(actualSymbol, range);
  const { clearCache } = useDataCache();
  
  const [chartState, setChartState] = useState<ChartState>({
    zoomLevel: 1,
    showVolume: true,
    showBollingerBands: false,
    showRSI: false,
    selectedIndicators: [],
  });

  // Process OHLC data with technical indicators
  const processedData = useMemo(() => {
    if (!data) return [];
    
    return data.map((point, index) => {
      const prevClose = index > 0 ? data[index - 1].close : point.close;
      const change = point.close - prevClose;
      const changePercent = (change / prevClose) * 100;
      
      // Simple moving averages
      const sma20 = index >= 19 ? 
        data.slice(index - 19, index + 1).reduce((sum, p) => sum + p.close, 0) / 20 : null;
      const sma50 = index >= 49 ? 
        data.slice(index - 49, index + 1).reduce((sum, p) => sum + p.close, 0) / 50 : null;
      
      // Bollinger Bands (simplified)
      let upperBand = null;
      let lowerBand = null;
      if (sma20) {
        const variance = data.slice(index - 19, index + 1)
          .reduce((sum, p) => sum + Math.pow(p.close - sma20, 2), 0) / 20;
        const stdDev = Math.sqrt(variance);
        upperBand = sma20 + (stdDev * 2);
        lowerBand = sma20 - (stdDev * 2);
      }
      
      // RSI (simplified 14-period)
      let rsi = null;
      if (index >= 13) {
        const gains = [];
        const losses = [];
        
        for (let i = index - 13; i <= index; i++) {
          const dailyChange = i > 0 ? data[i].close - data[i - 1].close : 0;
          if (dailyChange > 0) {
            gains.push(dailyChange);
            losses.push(0);
          } else {
            gains.push(0);
            losses.push(Math.abs(dailyChange));
          }
        }
        
        const avgGain = gains.reduce((sum, g) => sum + g, 0) / 14;
        const avgLoss = losses.reduce((sum, l) => sum + l, 0) / 14;
        
        if (avgLoss !== 0) {
          const rs = avgGain / avgLoss;
          rsi = 100 - (100 / (1 + rs));
        }
      }
      
      return {
        ...point,
        index,
        change,
        changePercent,
        sma20,
        sma50,
        upperBand,
        lowerBand,
        rsi,
        volume: Math.floor(Math.random() * 1000000), // Mock volume data
      };
    });
  }, [data]);

  // Handle zoom
  const handleZoom = useCallback((direction: 'in' | 'out' | 'reset') => {
    setChartState(prev => {
      let newZoom = prev.zoomLevel;
      
      if (direction === 'in') {
        newZoom = Math.min(prev.zoomLevel * 1.5, 5);
      } else if (direction === 'out') {
        newZoom = Math.max(prev.zoomLevel / 1.5, 0.1);
      } else {
        newZoom = 1;
      }
      
      analytics.track('candlestick_zoom', {
        direction,
        zoom_level: newZoom,
        symbol: actualSymbol,
      }, 'feature_usage');
      
      return { ...prev, zoomLevel: newZoom };
    });
  }, [actualSymbol]);

  // Toggle indicators
  const toggleIndicator = useCallback((indicator: string) => {
    setChartState(prev => {
      const newState = { ...prev };
      
      switch (indicator) {
        case 'volume':
          newState.showVolume = !prev.showVolume;
          break;
        case 'bollinger':
          newState.showBollingerBands = !prev.showBollingerBands;
          break;
        case 'rsi':
          newState.showRSI = !prev.showRSI;
          break;
      }
      
      analytics.track('candlestick_toggle_indicator', {
        indicator,
        enabled: newState[`show${indicator.charAt(0).toUpperCase() + indicator.slice(1)}` as keyof ChartState],
      }, 'feature_usage');
      
      return newState;
    });
  }, []);

  // Custom tooltip
  interface TooltipEntry { payload: any; value: number; }
  const CustomTooltip = useCallback(({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    
    return (
      <div className="bg-card border border-border rounded p-3 shadow-lg min-w-[200px]">
        <p className="font-medium text-sm mb-2">{label}</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Open:</span>
              <span className="font-mono">${data.close.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">High:</span>
              <span className="font-mono">${data.close.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Low:</span>
              <span className="font-mono">${data.close.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Close:</span>
              <span className="font-mono">${data.close.toFixed(2)}</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Change:</span>
              <span className={`font-mono ${data.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {data.change >= 0 ? '+' : ''}${data.change.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Change%:</span>
              <span className={`font-mono ${data.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {data.changePercent >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%
              </span>
            </div>
            {data.volume && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Volume:</span>
                <span className="font-mono text-blue-500">{data.volume.toLocaleString()}</span>
              </div>
            )}
            {data.rsi && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">RSI:</span>
                <span className="font-mono text-purple-500">{data.rsi.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-border">
        <div className="text-xs font-medium">{actualSymbol} Candlestick</div>
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

          {/* Indicator toggles */}
          <Button
            size="sm"
            variant={chartState.showVolume ? "default" : "ghost"}
            className="h-6 w-6 p-0"
            onClick={() => toggleIndicator('volume')}
            title="Toggle Volume"
          >
            <BarChart3 className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant={chartState.showBollingerBands ? "default" : "ghost"}
            className="h-6 px-2 text-xs"
            onClick={() => toggleIndicator('bollinger')}
            title="Toggle Bollinger Bands"
          >
            BB
          </Button>
          <Button
            size="sm"
            variant={chartState.showRSI ? "default" : "ghost"}
            className="h-6 px-2 text-xs"
            onClick={() => toggleIndicator('rsi')}
            title="Toggle RSI"
          >
            RSI
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
            onClick={() => setRange(r)}
          >
            {r}
          </Button>
        ))}
      </div>

      {error && (
        <div className="text-xs text-red-400 px-2 py-1" role="status">{String(error)}</div>
      )}

      {/* Chart area */}
      <div 
        className="flex-1 relative"
        role="img"
        aria-label={`Candlestick chart for ${actualSymbol}`}
        data-testid="candlestick-chart"
      >
        <ChartContainer minHeight={220}>
          <ComposedChart data={processedData || []}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              domain={['dataMin * 0.95', 'dataMax * 1.05']}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `$${value.toFixed(2)}`}
            />
            <YAxis 
              yAxisId="volume"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            {/* Bollinger Bands */}
            {chartState.showBollingerBands && (
              <>
                <Line 
                  type="monotone" 
                  dataKey="upperBand" 
                  stroke="hsl(var(--purple-400))"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  dot={false}
                  connectNulls={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="lowerBand" 
                  stroke="hsl(var(--purple-400))"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  dot={false}
                  connectNulls={false}
                />
              </>
            )}
            
            {/* Moving averages */}
            <Line 
              type="monotone" 
              dataKey="sma20" 
              stroke="hsl(var(--blue-500))"
              strokeWidth={1}
              dot={false}
              connectNulls={false}
            />
            <Line 
              type="monotone" 
              dataKey="sma50" 
              stroke="hsl(var(--orange-500))"
              strokeWidth={1}
              dot={false}
              connectNulls={false}
            />
            
            {/* Volume bars (if enabled) */}
            {chartState.showVolume && (
              <Bar
                dataKey="volume"
                yAxisId="volume"
                fill="hsl(var(--muted))"
                opacity={0.3}
              />
            )}
            
            {/* RSI reference lines */}
            {chartState.showRSI && (
              <>
                <ReferenceLine y={70} stroke="hsl(var(--red-500))" strokeDasharray="2 2" />
                <ReferenceLine y={30} stroke="hsl(var(--green-500))" strokeDasharray="2 2" />
              </>
            )}
            
            {/* Main candlestick bars approximation using Bar chart */}
            <Bar dataKey="close" fill="#8884d8" opacity={0.0} />
          </ComposedChart>
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

      {loading && (
        <div className="text-xs text-muted-foreground px-2 py-1" role="status" aria-live="polite">
          Loading candlestick data…
        </div>
      )}
    </div>
  );
}