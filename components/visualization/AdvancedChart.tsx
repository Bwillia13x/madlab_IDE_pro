'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BarChart3,
  TrendingUp,
  Activity,
  AlertTriangle,
  RefreshCw,
  Settings,
  RotateCcw,
  Download,
  Zap,
  Layers,
  Eye
} from 'lucide-react';
import { VisualizationEngine, ChartSeries, DataPoint, InteractionEvent } from '@/lib/visualization/core';
import { dataProcessor } from '@/lib/visualization/dataProcessor';
import type { WidgetProps } from '@/lib/widgets/schema';

interface AdvancedChartProps extends WidgetProps {
  initialSymbol?: string;
  enable3D?: boolean;
  enableAnimations?: boolean;
  showPerformance?: boolean;
  chartMode?: '3d-surface' | 'network' | 'heatmap' | 'multi-axis' | 'correlation';
}

export function AdvancedChart({
  widget,
  initialSymbol = 'AAPL',
  enable3D = true,
  enableAnimations = true,
  showPerformance = false,
  chartMode = '3d-surface'
}: AdvancedChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<VisualizationEngine | null>(null);
  const animationFrameRef = useRef<number>();

  // Chart state
  const [engine, setEngine] = useState<VisualizationEngine | null>(null);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState(chartMode);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    renderTime: 0,
    fps: 0,
    memoryUsage: 0
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Enhanced data generation for 3D and complex visualizations
  const generate3DData = useCallback((symbol: string): DataPoint[] => {
    const data: DataPoint[] = [];
    const basePrice = 100 + Math.random() * 50;

    // Generate option chain data for 3D surface
    for (let strike = 80; strike <= 120; strike += 2) {
      for (let days = 30; days <= 180; days += 15) {
        const timeValue = Math.max(0, basePrice - strike);
        const volatility = 0.2 + Math.random() * 0.3;
        const timeDecay = Math.exp(-days / 365);

        data.push({
          timestamp: new Date(),
          x: strike,
          y: days,
          z: timeValue * volatility * timeDecay * (1 + Math.random() * 0.2),
          strike,
          daysToExpiration: days,
          value: timeValue * volatility * timeDecay * (1 + Math.random() * 0.2),
          symbol,
          color: timeValue > 0 ? '#00ff00' : '#ff4444'
        });
      }
    }

    return data;
  }, []);

  const generateCorrelationData = useCallback((symbols: string[] = ['AAPL', 'MSFT', 'GOOGL', 'TSLA']): DataPoint[] => {
    const data: DataPoint[] = [];
    const correlations = symbols.map(() => symbols.map(() => Math.random() * 2 - 1));

    symbols.forEach((symbol1, i) => {
      symbols.forEach((symbol2, j) => {
        if (i !== j) {
          data.push({
            x: i,
            y: j,
            value: correlations[i][j],
            correlation: correlations[i][j],
            symbol1,
            symbol2,
            color: correlations[i][j] > 0 ? '#00ff00' : '#ff4444',
            strength: Math.abs(correlations[i][j])
          });
        }
      });
    });

    return data;
  }, []);

  const generateNetworkData = useCallback((symbols: string[] = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA']): DataPoint[] => {
    const data: DataPoint[] = [];

    symbols.forEach((symbol, i) => {
      // Add nodes
      data.push({
        id: symbol,
        x: Math.cos(i * 2 * Math.PI / symbols.length) * 100,
        y: Math.sin(i * 2 * Math.PI / symbols.length) * 100,
        symbol,
        type: 'node',
        size: 20 + Math.random() * 10
      });

      // Add edges (connections)
      symbols.forEach((targetSymbol, j) => {
        if (i !== j && Math.random() > 0.6) {
          data.push({
            source: symbol,
            target: targetSymbol,
            x: Math.cos(i * 2 * Math.PI / symbols.length) * 100,
            y: Math.sin(i * 2 * Math.PI / symbols.length) * 100,
            x2: Math.cos(j * 2 * Math.PI / symbols.length) * 100,
            y2: Math.sin(j * 2 * Math.PI / symbols.length) * 100,
            type: 'edge',
            strength: Math.random(),
            color: Math.random() > 0.5 ? '#00ff00' : '#ff4444'
          });
        }
      });
    });

    return data;
  }, []);

  // Load chart data based on mode
  const loadChartData = useCallback(async (mode: string, symbol: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      engine?.clearSeries();

      switch (mode) {
        case '3d-surface':
          const surfaceData = generate3DData(symbol);
          const surfaceSeries: ChartSeries = {
            id: 'surface',
            name: 'Option Surface',
            data: surfaceData,
            type: 'scatter',
            color: '#7DC8F7',
            interactive: true,
            style: {
              pointSize: 3,
              showSurface: true,
              enable3D: enable3D
            }
          };
          engine?.addSeries(surfaceSeries);
          break;

        case 'correlation':
          const correlationData = generateCorrelationData([symbol, 'MSFT', 'GOOGL', 'TSLA']);
          const correlationSeries: ChartSeries = {
            id: 'correlation',
            name: 'Correlation Matrix',
            data: correlationData,
            type: 'heatmap',
            interactive: true
          };
          engine?.addSeries(correlationSeries);
          break;

        case 'network':
          const networkData = generateNetworkData([symbol, 'MSFT', 'GOOGL', 'TSLA', 'NVDA']);
          const networkSeries: ChartSeries = {
            id: 'network',
            name: 'Market Network',
            data: networkData,
            type: 'network',
            interactive: true
          };
          engine?.addSeries(networkSeries);
          break;

        default:
          // Fallback to regular price data
          const priceData = await dataProcessor.processData({
            symbol,
            timeframe: '1M',
            indicators: ['sma', 'rsi']
          }, generate3DData(symbol).slice(0, 100));

          priceData.series.forEach(series => {
            engine?.addSeries(series);
          });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
      setError(errorMessage);
      console.error('Failed to load advanced chart data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [engine, generate3DData, generateCorrelationData, generateNetworkData, enable3D]);

  // Initialize engine with advanced configuration
  useEffect(() => {
    if (!canvasRef.current || engineRef.current) return;

    const visualizationEngine = new VisualizationEngine({
      width: 800,
      height: 500,
      theme: 'dark',
      animation: enableAnimations,
      responsive: true,
      interactive: true,
      margin: { top: 20, right: 20, bottom: 40, left: 40 }
    });

    engineRef.current = visualizationEngine;
    setEngine(visualizationEngine);

    try {
      visualizationEngine.initialize(canvasRef.current);

      // Enhanced interaction handlers
      visualizationEngine.addInteractionHandler('click', handleInteraction);
      visualizationEngine.addInteractionHandler('hover', handleInteraction);
      visualizationEngine.addInteractionHandler('zoom', handleInteraction);

      // Performance monitoring
      if (showPerformance) {
        startPerformanceMonitoring(visualizationEngine);
      }

    } catch (error) {
      console.error('Failed to initialize advanced visualization engine:', error);
      setError('Failed to initialize visualization engine');
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      visualizationEngine.destroy();
      engineRef.current = null;
    };
  }, [enableAnimations, showPerformance]);

  // Performance monitoring
  const startPerformanceMonitoring = useCallback((engine: VisualizationEngine) => {
    let lastTime = performance.now();
    let frames = 0;

    const monitor = () => {
      frames++;
      const currentTime = performance.now();

      if (currentTime - lastTime >= 1000) {
        const fps = Math.round(frames / ((currentTime - lastTime) / 1000));

        // Estimate memory usage (simplified)
        const memoryUsage = Math.round(Math.random() * 50 + 20); // Mock value

        setPerformanceMetrics({
          renderTime: Math.round(1000 / fps),
          fps,
          memoryUsage
        });

        frames = 0;
        lastTime = currentTime;
      }

      animationFrameRef.current = requestAnimationFrame(monitor);
    };

    monitor();
  }, []);

  // Load data when mode or symbol changes
  useEffect(() => {
    if (engine) {
      loadChartData(currentMode, symbol);
    }
  }, [engine, currentMode, symbol, loadChartData]);

  const handleInteraction = useCallback((event: InteractionEvent) => {
    console.log('Advanced chart interaction:', event);
  }, []);

  const handleModeChange = (newMode: string) => {
    setCurrentMode(newMode as typeof currentMode);
  };

  const handleExport = () => {
    if (!engine) return;

    const imageData = engine.exportAsImage('png');
    if (imageData) {
      const link = document.createElement('a');
      link.href = imageData;
      link.download = `${symbol}_${currentMode}_chart.png`;
      link.click();
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <Card className={`h-full ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Advanced Chart
            {isLoading && <Badge variant="secondary">Loading...</Badge>}
          </CardTitle>

          <div className="flex items-center gap-2">
            <Select value={currentMode} onValueChange={handleModeChange}>
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3d-surface">3D Surface</SelectItem>
                <SelectItem value="correlation">Correlation</SelectItem>
                <SelectItem value="network">Network</SelectItem>
                <SelectItem value="multi-axis">Multi-Axis</SelectItem>
              </SelectContent>
            </Select>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleFullscreen}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle Fullscreen</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    className="h-8 w-8 p-0"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export Chart</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Performance Metrics */}
        {showPerformance && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>FPS: {performanceMetrics.fps}</span>
            <span>Render: {performanceMetrics.renderTime}ms</span>
            <span>Memory: {performanceMetrics.memoryUsage}MB</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Error Display */}
        {error && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadChartData(currentMode, symbol)}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Chart Canvas */}
        <div className="flex-1 relative bg-muted/10 rounded-md border border-border overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-full block"
            style={{ cursor: 'crosshair' }}
          />

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 animate-spin" />
                <span>Loading {currentMode} visualization...</span>
              </div>
            </div>
          )}

          {!isLoading && !error && engine && (
            <div className="absolute top-2 left-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
              {symbol} • {currentMode} • Advanced Mode
            </div>
          )}
        </div>

        {/* Chart Controls */}
        <div className="flex items-center justify-between text-xs border-t border-border pt-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-[11px]">Symbol</Label>
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="h-6 px-2 text-xs bg-background border border-border rounded"
                placeholder="AAPL"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={enable3D}
                onChange={() => {}}
                className="scale-75"
              />
              <Label className="text-[11px]">3D Mode</Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={enableAnimations}
                onChange={() => {}}
                className="scale-75"
              />
              <Label className="text-[11px]">Animations</Label>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {currentMode.toUpperCase()}
            </Badge>
            {enable3D && <Badge variant="secondary" className="text-xs">3D</Badge>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
