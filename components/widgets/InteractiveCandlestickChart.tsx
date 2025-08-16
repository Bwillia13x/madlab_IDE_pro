'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, BarChart3, Activity, RefreshCw, ZoomIn, ZoomOut, RotateCcw, Download, Camera } from 'lucide-react';
import type { Widget } from '@/lib/store';
import { usePrices } from '@/lib/data/hooks';
import type { PriceRange } from '@/lib/data/provider.types';
import * as d3 from 'd3';

interface InteractiveCandlestickChartProps {
  widget: Widget;
  sheetId: string;
  onTitleChange?: (title: string) => void;
}

interface CandlestickData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma20?: number;
  sma50?: number;
  upperBand?: number;
  lowerBand?: number;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
}

export function InteractiveCandlestickChart({ widget, sheetId, onTitleChange }: InteractiveCandlestickChartProps) {
  const [timeRange, setTimeRange] = useState<PriceRange>('1M');
  const [showVolume, setShowVolume] = useState(true);
  const [showSMAs, setShowSMAs] = useState(false);
  const [showBollingerBands, setShowBollingerBands] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isChartReady, setIsChartReady] = useState(false);
  
  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  const symbol = (widget.props?.symbol as string) || 'AAPL';
  const { data: priceData, loading, error, refetch } = usePrices(symbol, timeRange);

  // Chart dimensions
  const chartDimensions = useMemo(() => ({
    width: 800,
    height: 500,
    margin: { top: 20, right: 30, bottom: 80, left: 60 }
  }), []);

  // Process data for candlestick charting
  const chartData: CandlestickData[] = useMemo(() => {
    if (!priceData || priceData.length === 0) return [];
    
    return priceData.map(point => ({
      date: point.date,
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
      volume: point.volume,
    }));
  }, [priceData]);

  // Calculate technical indicators
  const enhancedData = useMemo(() => {
    if (!showSMAs && !showBollingerBands && !showRSI && !showMACD) return chartData;
    
    return chartData.map((point, index) => {
      let enhanced = { ...point };
      
      // Calculate SMA 20
      if (showSMAs && index >= 19) {
        const sum20 = chartData.slice(index - 19, index + 1).reduce((acc, p) => acc + p.close, 0);
        enhanced.sma20 = sum20 / 20;
      }
      
      // Calculate SMA 50
      if (showSMAs && index >= 49) {
        const sum50 = chartData.slice(index - 49, index + 1).reduce((acc, p) => acc + p.close, 0);
        enhanced.sma50 = sum50 / 50;
      }
      
      // Calculate Bollinger Bands
      if (showBollingerBands && index >= 49) {
        const prices = chartData.slice(index - 49, index + 1).map(p => p.close);
        const sma = enhanced.sma50!;
        const variance = prices.reduce((acc, price) => acc + Math.pow(price - sma, 2), 0) / 50;
        const stdDev = Math.sqrt(variance);
        enhanced.upperBand = sma + (2 * stdDev);
        enhanced.lowerBand = sma - (2 * stdDev);
      }
      
      // Calculate RSI
      if (showRSI && index >= 14) {
        const gains = chartData.slice(index - 14, index + 1).map(p => Math.max(0, p.close - (chartData[index - 14]?.close || p.close)));
        const losses = chartData.slice(index - 14, index + 1).map(p => Math.max(0, (chartData[index - 14]?.close || p.close) - p.close));
        const avgGain = gains.reduce((sum, gain) => sum + gain, 0) / 14;
        const avgLoss = losses.reduce((sum, loss) => sum + loss, 0) / 14;
        enhanced.rsi = 100 - (100 / (1 + (avgGain / avgLoss)));
      }
      
      // Calculate MACD
      if (showMACD && index >= 26) {
        const ema12 = calculateEMA(chartData.slice(0, index + 1).map(p => p.close), 12);
        const ema26 = calculateEMA(chartData.slice(0, index + 1).map(p => p.close), 26);
        enhanced.macd = ema12 - ema26;
        enhanced.macdSignal = calculateEMA(chartData.slice(0, index + 1).map(p => p.close), 9);
        enhanced.macdHistogram = enhanced.macd - enhanced.macdSignal;
      }
      
      return enhanced;
    });
  }, [chartData, showSMAs, showBollingerBands, showRSI, showMACD]);

  // Helper function to calculate EMA
  const calculateEMA = (prices: number[], period: number): number => {
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  };

  // D3 Chart rendering
  const renderChart = useCallback(() => {
    if (!chartRef.current || !svgRef.current || enhancedData.length === 0) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    const { width, height, margin } = chartDimensions;
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(enhancedData, d => d.date) as [Date, Date])
      .range([0, chartWidth]);

    const yScale = d3.scaleLinear()
      .domain([
        d3.min(enhancedData, d => d.low) as number * 0.99,
        d3.max(enhancedData, d => d.high) as number * 1.01
      ])
      .range([chartHeight, 0]);

    const volumeScale = d3.scaleLinear()
      .domain([0, d3.max(enhancedData, d => d.volume) as number])
      .range([0, chartHeight * 0.15]);

    // Axes
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d3.timeFormat('%b %d'))
      .ticks(8);

    const yAxis = d3.axisLeft(yScale)
      .tickFormat(d => `$${d.toFixed(2)}`);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale).tickSize(-chartHeight).tickFormat(() => ''))
      .style('stroke', '#e5e7eb')
      .style('stroke-opacity', 0.3);

    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale).tickSize(-chartWidth).tickFormat(() => ''))
      .style('stroke', '#e5e7eb')
      .style('stroke-opacity', 0.3);

    // Axes
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(xAxis)
      .style('font-size', '12px');

    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .style('font-size', '12px');

    // Bollinger Bands area
    if (showBollingerBands) {
      const bbArea = d3.area<CandlestickData>()
        .x(d => xScale(d.date))
        .y0(d => d.upperBand ? yScale(d.upperBand) : 0)
        .y1(d => d.lowerBand ? yScale(d.lowerBand) : 0)
        .defined(d => d.upperBand !== undefined && d.lowerBand !== undefined);

      g.append('path')
        .datum(enhancedData)
        .attr('class', 'bb-area')
        .attr('d', bbArea)
        .attr('fill', '#3b82f6')
        .attr('opacity', 0.1);
    }

    // Candlesticks
    const candlesticks = g.selectAll('.candlestick')
      .data(enhancedData)
      .enter()
      .append('g')
      .attr('class', 'candlestick');

    // High-low line
    candlesticks.append('line')
      .attr('x1', d => xScale(d.date))
      .attr('x2', d => xScale(d.date))
      .attr('y1', d => yScale(d.high))
      .attr('y2', d => yScale(d.low))
      .attr('stroke', d => d.close > d.open ? '#10b981' : '#ef4444')
      .attr('stroke-width', 1.5);

    // Open-close rectangle
    candlesticks.append('rect')
      .attr('x', d => xScale(d.date) - 4)
      .attr('y', d => yScale(Math.max(d.open, d.close)))
      .attr('width', 8)
      .attr('height', d => Math.abs(yScale(d.open) - yScale(d.close)))
      .attr('fill', d => d.close > d.open ? '#10b981' : '#ef4444')
      .attr('stroke', d => d.close > d.open ? '#10b981' : '#ef4444')
      .attr('stroke-width', 1);

    // Moving averages
    if (showSMAs) {
      // SMA 20
      const sma20Line = d3.line<CandlestickData>()
        .x(d => xScale(d.date))
        .y(d => d.sma20 ? yScale(d.sma20) : 0)
        .defined(d => d.sma20 !== undefined);

      g.append('path')
        .datum(enhancedData)
        .attr('class', 'sma-line')
        .attr('d', sma20Line)
        .attr('fill', 'none')
        .attr('stroke', '#f59e0b')
        .attr('stroke-width', 2);

      // SMA 50
      const sma50Line = d3.line<CandlestickData>()
        .x(d => xScale(d.date))
        .y(d => d.sma50 ? yScale(d.sma50) : 0)
        .defined(d => d.sma50 !== undefined);

      g.append('path')
        .datum(enhancedData)
        .attr('class', 'sma-line')
        .attr('d', sma50Line)
        .attr('fill', 'none')
        .attr('stroke', '#ef4444')
        .attr('stroke-width', 2);
    }

    // Bollinger Bands lines
    if (showBollingerBands) {
      const upperBandLine = d3.line<CandlestickData>()
        .x(d => xScale(d.date))
        .y(d => d.upperBand ? yScale(d.upperBand) : 0)
        .defined(d => d.upperBand !== undefined);

      const lowerBandLine = d3.line<CandlestickData>()
        .x(d => xScale(d.date))
        .y(d => d.lowerBand ? yScale(d.lowerBand) : 0)
        .defined(d => d.lowerBand !== undefined);

      g.append('path')
        .datum(enhancedData)
        .attr('class', 'bb-line')
        .attr('d', upperBandLine)
        .attr('fill', 'none')
        .attr('stroke', '#3b82f6')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '5,5');

      g.append('path')
        .datum(enhancedData)
        .attr('class', 'bb-line')
        .attr('d', lowerBandLine)
        .attr('fill', 'none')
        .attr('stroke', '#3b82f6')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '5,5');
    }

    // Volume bars
    if (showVolume) {
      const volumeG = g.append('g')
        .attr('class', 'volume')
        .attr('transform', `translate(0,${chartHeight + 20})`);

      volumeG.selectAll('.volume-bar')
        .data(enhancedData)
        .enter()
        .append('rect')
        .attr('x', d => xScale(d.date) - 3)
        .attr('y', d => chartHeight + 20 - volumeScale(d.volume))
        .attr('width', 6)
        .attr('height', d => volumeScale(d.volume))
        .attr('fill', d => d.close > d.open ? '#10b981' : '#ef4444')
        .attr('opacity', 0.6);
    }

    // Tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'chart-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.9)')
      .style('color', 'white')
      .style('padding', '12px')
      .style('border-radius', '8px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', 1000)
      .style('box-shadow', '0 4px 6px rgba(0, 0, 0, 0.1)');

    // Mouse events
    g.selectAll('.candlestick')
      .on('mouseover', function(event, d) {
        tooltip.transition()
          .duration(200)
          .style('opacity', 0.95);
        
        const tooltipContent = `
          <div style="font-weight: bold; margin-bottom: 8px;">
            ${d.date.toLocaleDateString()} ${d.date.toLocaleTimeString()}
          </div>
          <div style="margin-bottom: 4px;">Open: $${d.open.toFixed(2)}</div>
          <div style="margin-bottom: 4px;">High: $${d.high.toFixed(2)}</div>
          <div style="margin-bottom: 4px;">Low: $${d.low.toFixed(2)}</div>
          <div style="margin-bottom: 4px;">Close: $${d.close.toFixed(2)}</div>
          <div style="margin-bottom: 4px;">Volume: ${d.volume.toLocaleString()}</div>
          ${d.sma20 ? `<div style="margin-bottom: 4px;">SMA 20: $${d.sma20.toFixed(2)}</div>` : ''}
          ${d.sma50 ? `<div style="margin-bottom: 4px;">SMA 50: $${d.sma50.toFixed(2)}</div>` : ''}
          ${d.upperBand ? `<div style="margin-bottom: 4px;">Upper BB: $${d.upperBand.toFixed(2)}</div>` : ''}
          ${d.lowerBand ? `<div style="margin-bottom: 4px;">Lower BB: $${d.lowerBand.toFixed(2)}</div>` : ''}
          ${d.rsi ? `<div style="margin-bottom: 4px;">RSI: ${d.rsi.toFixed(2)}</div>` : ''}
          ${d.macd ? `<div style="margin-bottom: 4px;">MACD: ${d.macd.toFixed(2)}</div>` : ''}
        `;
        
        tooltip.html(tooltipContent)
          .style('left', (event.pageX + 15) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function() {
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
      });

    // Zoom functionality
    const zoom = d3.zoom()
      .scaleExtent([0.5, 5])
      .on('zoom', (event) => {
        const newXScale = event.transform.rescaleX(xScale);
        const newYScale = event.transform.rescaleY(yScale);
        
        // Update axes
        g.select('.x-axis').call(d3.axisBottom(newXScale));
        g.select('.y-axis').call(d3.axisLeft(newYScale));
        
        // Update grid
        g.selectAll('.grid').each(function() {
          const grid = d3.select(this);
          if (grid.attr('transform')?.includes('translate(0,')) {
            grid.call(d3.axisBottom(newXScale).tickSize(-chartHeight).tickFormat(() => ''));
          } else {
            grid.call(d3.axisLeft(newYScale).tickSize(-chartWidth).tickFormat(() => ''));
          }
        });
        
        // Update candlesticks
        g.selectAll('.candlestick line')
          .attr('x1', d => newXScale(d.date))
          .attr('x2', d => newXScale(d.date));
        
        g.selectAll('.candlestick rect')
          .attr('x', d => newXScale(d.date) - 4);
        
        // Update volume bars
        if (showVolume) {
          g.selectAll('.volume-bar')
            .attr('x', d => newXScale(d.date) - 3);
        }
        
        // Update moving averages and Bollinger Bands
        if (showSMAs) {
          g.selectAll('.sma-line').each(function() {
            const line = d3.select(this);
            const newLine = d3.line<CandlestickData>()
              .x(d => newXScale(d.date))
              .y(d => d.sma20 ? newYScale(d.sma20) : 0)
              .defined(d => d.sma20 !== undefined);
            line.attr('d', newLine);
          });
        }
        
        if (showBollingerBands) {
          g.selectAll('.bb-line').each(function() {
            const line = d3.select(this);
            const newLine = d3.line<CandlestickData>()
              .x(d => newXScale(d.date))
              .y(d => d.upperBand ? newYScale(d.upperBand) : 0)
              .defined(d => d.upperBand !== undefined);
            line.attr('d', newLine);
          });
        }
        
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom);
    setIsChartReady(true);

  }, [enhancedData, showVolume, showSMAs, showBollingerBands, chartDimensions]);

  // Render chart when data or settings change
  useEffect(() => {
    renderChart();
  }, [renderChart]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (chartContainerRef.current) {
        const containerWidth = chartContainerRef.current.clientWidth;
        chartDimensions.width = containerWidth - 40;
        renderChart();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [chartDimensions, renderChart]);

  const handleRefresh = () => {
    refetch();
  };

  const handleZoomIn = () => {
    if (svgRef.current) {
      const zoom = d3.zoomTransform(svgRef.current);
      d3.select(svgRef.current).transition().call(
        d3.zoom().transform,
        zoom.scale(zoom.k * 1.5)
      );
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current) {
      const zoom = d3.zoomTransform(svgRef.current);
      d3.select(svgRef.current).transition().call(
        d3.zoom().transform,
        zoom.scale(zoom.k / 1.5)
      );
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current) {
      d3.select(svgRef.current).transition().call(
        d3.zoom().transform,
        d3.zoomIdentity
      );
    }
  };

  const handleDownloadChart = () => {
    if (!svgRef.current) return;
    
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `${symbol}-candlestick-chart.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

  const handleScreenshot = () => {
    if (!svgRef.current) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const img = new Image();
    
    img.onload = () => {
      canvas.width = chartDimensions.width;
      canvas.height = chartDimensions.height;
      ctx?.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const downloadLink = document.createElement('a');
          downloadLink.href = url;
          downloadLink.download = `${symbol}-candlestick-chart.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          URL.revokeObjectURL(url);
        }
      });
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const formatPrice = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  // Calculate price statistics
  const priceStats = useMemo(() => {
    if (chartData.length === 0) return null;
    
    const prices = chartData.map(p => p.close);
    const volumes = chartData.map(p => p.volume);
    
    const latestPrice = prices[0];
    const previousPrice = prices[1] || latestPrice;
    const priceChange = latestPrice - previousPrice;
    const priceChangePercent = (priceChange / previousPrice) * 100;
    
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const avgVolume = volumes.reduce((acc, vol) => acc + vol, 0) / volumes.length;
    
    return {
      latestPrice,
      priceChange,
      priceChangePercent,
      high,
      low,
      avgVolume,
    };
  }, [chartData]);

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading candlestick data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <Activity className="h-8 w-8 mx-auto mb-2 text-destructive" />
            <p className="text-sm text-destructive">Failed to load data</p>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!priceData || priceData.length === 0) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No data available</p>
            <p className="text-xs text-muted-foreground">Try setting a symbol</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {widget.title}
            </CardTitle>
            {priceStats && (
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">{formatPrice(priceStats.latestPrice)}</span>
                  <div className={`flex items-center gap-1 text-sm ${priceStats.priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {priceStats.priceChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {formatPrice(Math.abs(priceStats.priceChange))} ({priceStats.priceChangePercent.toFixed(2)}%)
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">• {symbol}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleScreenshot} className="h-8 w-8 p-0" title="Screenshot">
              <Camera className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadChart} className="h-8 w-8 p-0" title="Download SVG">
              <Download className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetZoom} className="h-8 w-8 p-0" title="Reset Zoom">
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomOut} className="h-8 w-8 p-0" title="Zoom Out">
              <ZoomOut className="h-3 w-3" />
            </Button>
            <Badge variant="outline" className="text-xs">
              {Math.round(zoomLevel * 100)}%
            </Badge>
            <Button variant="outline" size="sm" onClick={handleZoomIn} className="h-8 w-8 p-0" title="Zoom In">
              <ZoomIn className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="h-8 w-8 p-0" title="Refresh">
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Chart Controls */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Label>Time Range:</Label>
            <Select value={timeRange} onValueChange={(value: PriceRange) => setTimeRange(value)}>
              <SelectTrigger className="w-20 h-7">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1D">1D</SelectItem>
                <SelectItem value="5D">5D</SelectItem>
                <SelectItem value="1M">1M</SelectItem>
                <SelectItem value="3M">3M</SelectItem>
                <SelectItem value="6M">6M</SelectItem>
                <SelectItem value="1Y">1Y</SelectItem>
                <SelectItem value="2Y">2Y</SelectItem>
                <SelectItem value="5Y">5Y</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              id="show-volume"
              checked={showVolume}
              onCheckedChange={setShowVolume}
            />
            <Label htmlFor="show-volume">Volume</Label>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              id="show-smas"
              checked={showSMAs}
              onCheckedChange={setShowSMAs}
            />
            <Label htmlFor="show-smas">SMAs</Label>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              id="show-bb"
              checked={showBollingerBands}
              onCheckedChange={setShowBollingerBands}
              disabled={!showSMAs}
            />
            <Label htmlFor="show-bb">Bollinger Bands</Label>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              id="show-rsi"
              checked={showRSI}
              onCheckedChange={setShowRSI}
            />
            <Label htmlFor="show-rsi">RSI</Label>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              id="show-macd"
              checked={showMACD}
              onCheckedChange={setShowMACD}
            />
            <Label htmlFor="show-macd">MACD</Label>
          </div>
        </div>
        
        {/* Price Statistics */}
        {priceStats && (
          <div className="grid grid-cols-4 gap-4 text-xs">
            <div className="text-center p-2 bg-muted/50 rounded">
              <div className="text-muted-foreground">High</div>
              <div className="font-medium">{formatPrice(priceStats.high)}</div>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded">
              <div className="text-muted-foreground">Low</div>
              <div className="font-medium">{formatPrice(priceStats.low)}</div>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded">
              <div className="text-muted-foreground">Range</div>
              <div className="font-medium">{formatPrice(priceStats.high - priceStats.low)}</div>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded">
              <div className="text-muted-foreground">Avg Volume</div>
              <div className="font-medium">{priceStats.avgVolume.toLocaleString()}</div>
            </div>
          </div>
        )}
        
        {/* Interactive Chart */}
        <div ref={chartContainerRef} className="border rounded-lg p-4 bg-muted/20 overflow-hidden">
          <div ref={chartRef} className="w-full">
            <svg ref={svgRef} className="w-full h-full"></svg>
          </div>
          {!isChartReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
              <div className="text-center text-muted-foreground">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Loading chart...</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Chart Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Bullish (Close > Open)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Bearish (Close < Open)</span>
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
          {showBollingerBands && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded border-2 border-dashed"></div>
                <span>Bollinger Bands</span>
              </div>
            </>
          )}
          {showRSI && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                <span>RSI</span>
              </div>
            </>
          )}
          {showMACD && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-500 rounded"></div>
                <span>MACD</span>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}