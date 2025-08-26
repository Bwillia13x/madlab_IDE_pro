import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dataProcessor } from '@/lib/visualization/dataProcessor';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react';

interface InteractiveChartProps {
  initialSymbol?: string;
  chartType?: 'line' | 'area' | 'bar' | 'candle';
  showVolume?: boolean;
  enableZoom?: boolean;
  enableExport?: boolean;
  className?: string;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  initialSymbol = 'AAPL',
  chartType = 'line',
  showVolume = false,
  enableZoom = true,
  enableExport = true,
  className = ''
}) => {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [currentChartType, setCurrentChartType] = useState(chartType);
  const [volumeEnabled, setVolumeEnabled] = useState(showVolume);
  const [isLoading, setIsLoading] = useState(false);

  // Load data when component mounts or symbol changes
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const query = {
          symbol,
          timeframe: '1M',
          indicators: volumeEnabled ? ['volume_sma'] : []
        };

        await dataProcessor.processData(query, []);
      } catch (error) {
        console.error('Failed to load chart data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [symbol, volumeEnabled]);

  const handleSymbolChange = (value: string) => {
    setSymbol(value);
    setIsLoading(true);
    // Simulate data loading
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleZoomIn = () => {
    console.log('Zoom in');
  };

  const handleZoomOut = () => {
    console.log('Zoom out');
  };

  const handleReset = () => {
    console.log('Reset zoom');
  };

  const handleExport = () => {
    console.log('Export chart');
  };

  return (
    <Card className={`h-full flex flex-col ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BarChart3 data-testid="bar-chart-icon" />
            Interactive Chart
            {isLoading && (
              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors border-transparent bg-secondary text-secondary-foreground">
                Loading...
              </div>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {enableZoom && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomIn}
                  aria-label="Zoom in"
                  title="Zoom In"
                >
                  <ZoomIn data-testid="zoom-in-icon" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomOut}
                  aria-label="Zoom out"
                  title="Zoom Out"
                >
                  <ZoomOut data-testid="zoom-out-icon" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  aria-label="Reset zoom"
                  title="Reset Zoom"
                >
                  <RotateCcw data-testid="reset-icon" />
                </Button>
              </>
            )}
            {enableExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                aria-label="Export as PNG"
                title="Export as PNG"
              >
                <Download data-testid="download-icon" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <label className="font-medium text-[11px]">Symbol</label>
            <Input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="AAPL"
              className="h-7 w-[80px] text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSymbolChange(symbol)}
              disabled={isLoading}
              aria-label="Load chart data"
              className="h-7 px-2 text-xs"
            >
              Load
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <label className="font-medium text-[11px]">Chart Type</label>
            <Select value={currentChartType} onValueChange={(value: any) => setCurrentChartType(value)}>
              <SelectTrigger className="h-7 w-[100px] text-xs" aria-label="Chart type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line</SelectItem>
                <SelectItem value="area">Area</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
                <SelectItem value="candle">Candle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="font-medium text-[11px]">Timeframe</label>
            <Select defaultValue="1M">
              <SelectTrigger className="h-7 w-[80px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1D">1D</SelectItem>
                <SelectItem value="1W">1W</SelectItem>
                <SelectItem value="1M">1M</SelectItem>
                <SelectItem value="3M">3M</SelectItem>
                <SelectItem value="1Y">1Y</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="font-medium text-[11px]">Volume</label>
            <Switch
              checked={volumeEnabled}
              onCheckedChange={setVolumeEnabled}
              aria-label="Toggle volume"
            />
          </div>
        </div>

        {/* Chart Placeholder */}
        <div className="flex-1 border rounded-md flex items-center justify-center bg-muted/10">
          <div className="text-center text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Chart Visualization</p>
            <p className="text-xs text-muted-foreground/70">
              {symbol} - {currentChartType.toUpperCase()} - {isLoading ? 'Loading...' : 'Ready'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" className="text-xs">
            Reset
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            Export
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
