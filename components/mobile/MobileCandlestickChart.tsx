'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  RefreshCw, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  Camera, 
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { Widget } from '@/lib/store';
import type { PriceRange } from '@/lib/data/provider.types';

interface MobileCandlestickChartProps {
  widget: Widget;
  sheetId: string;
  onTitleChange?: (title: string) => void;
}

export function MobileCandlestickChart({ 
  widget, 
  sheetId: _sheetId, 
  onTitleChange: _onTitleChange 
}: MobileCandlestickChartProps) {
  const [timeRange, setTimeRange] = useState<PriceRange>('1M');
  const [showVolume, setShowVolume] = useState(true);
  const [showSMAs, setShowSMAs] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [zoomLevel] = useState(1);

  const symbol = (widget.props?.symbol as string) || 'AAPL';

  // Mock data for demonstration
  const mockPriceData = {
    latestPrice: 175.50,
    priceChange: 2.50,
    priceChangePercent: 1.44,
  };

  const formatPrice = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  return (
    <Card className="mobile-widget">
      <CardHeader className="mobile-widget-header">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="mobile-card-title flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {widget.title}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-lg font-semibold">{formatPrice(mockPriceData.latestPrice)}</span>
              <div className={`flex items-center gap-1 text-sm ${mockPriceData.priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {mockPriceData.priceChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {formatPrice(Math.abs(mockPriceData.priceChange))} ({mockPriceData.priceChangePercent.toFixed(2)}%)
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowControls(!showControls)} 
              className="h-8 w-8 p-0"
              title="Toggle Controls"
            >
              {showControls ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
            <Badge variant="outline" className="text-xs">
              {Math.round(zoomLevel * 100)}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="mobile-widget-content space-y-3">
        {/* Mobile Chart Controls */}
        {showControls && (
          <div className="mobile-chart-controls space-y-3">
            {/* Basic Controls */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="mobile-show-volume"
                  checked={showVolume}
                  onCheckedChange={setShowVolume}
                />
                <Label htmlFor="mobile-show-volume" className="text-xs">Volume</Label>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  id="mobile-show-smas"
                  checked={showSMAs}
                  onCheckedChange={setShowSMAs}
                />
                <Label htmlFor="mobile-show-smas" className="text-xs">SMAs</Label>
              </div>
            </div>
            
            {/* Time Range and Refresh */}
            <div className="grid grid-cols-2 gap-2">
              <Select value={timeRange} onValueChange={(value: PriceRange) => setTimeRange(value)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1D">1D</SelectItem>
                  <SelectItem value="5D">5D</SelectItem>
                  <SelectItem value="1M">1M</SelectItem>
                  <SelectItem value="3M">3M</SelectItem>
                  <SelectItem value="6M">6M</SelectItem>
                  <SelectItem value="1Y">1Y</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
            
            {/* Zoom Controls */}
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <ZoomOut className="h-3 w-3 mr-1" />
                Zoom Out
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <ZoomIn className="h-3 w-3 mr-1" />
                Zoom In
              </Button>
            </div>
            
            {/* Advanced Controls Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedControls(!showAdvancedControls)}
              className="h-8 text-xs w-full"
            >
              {showAdvancedControls ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
              Advanced Controls
            </Button>
            
            {/* Advanced Controls */}
            {showAdvancedControls && (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Camera className="h-3 w-3 mr-1" />
                  Screenshot
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              </div>
            )}
          </div>
        )}
        
        {/* Mobile Chart Placeholder */}
        <div className="mobile-chart-container border rounded-lg overflow-hidden flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="h-16 w-16 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">Mobile Candlestick Chart</p>
            <p className="text-xs">Touch-optimized D3.js chart</p>
            <p className="text-xs mt-1">Symbol: {symbol}</p>
          </div>
        </div>
        
        {/* Mobile Chart Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Bullish</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Bearish</span>
          </div>
          {showSMAs && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span>SMA 20</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                <span>SMA 50</span>
              </div>
            </>
          )}
        </div>
        
        {/* Touch Gesture Instructions */}
        <div className="text-xs text-muted-foreground text-center p-2 bg-muted/20 rounded">
          <p>💡 <strong>Touch Controls:</strong></p>
          <p>• Swipe left/right to toggle controls</p>
          <p>• Swipe up/down for advanced options</p>
          <p>• Pinch to zoom • Tap for tooltips</p>
        </div>
      </CardContent>
    </Card>
  );
}