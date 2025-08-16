'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PieChart, BarChart3, TrendingUp, TrendingDown, DollarSign, Activity, RefreshCw, Download, Camera } from 'lucide-react';
import type { Widget } from '@/lib/store';
import { useRealtimePrices } from '@/lib/data/useRealtimeData';
import * as d3 from 'd3';

interface PortfolioAsset {
  symbol: string;
  shares: number;
  avgPrice: number;
  currentPrice?: number;
  marketValue?: number;
  totalReturn?: number;
  totalReturnPercent?: number;
  dayChange?: number;
  dayChangePercent?: number;
  sector?: string;
  allocation?: number;
}

interface PortfolioAllocationChartsProps {
  widget: Widget;
  sheetId: string;
  onTitleChange?: (title: string) => void;
}

interface ChartDimensions {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
}

export function PortfolioAllocationCharts({ widget, sheetId, onTitleChange }: PortfolioAllocationChartsProps) {
  const [chartType, setChartType] = useState<'pie' | 'treemap' | 'bar' | 'donut'>('pie');
  const [showPerformance, setShowPerformance] = useState(true);
  const [showSectors, setShowSectors] = useState(false);
  const [isChartReady, setIsChartReady] = useState(false);
  
  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  // Sample portfolio data
  const [assets, setAssets] = useState<PortfolioAsset[]>([
    { symbol: 'AAPL', shares: 100, avgPrice: 150.00, sector: 'Technology' },
    { symbol: 'MSFT', shares: 50, avgPrice: 300.00, sector: 'Technology' },
    { symbol: 'GOOGL', shares: 25, avgPrice: 2800.00, sector: 'Technology' },
    { symbol: 'JPM', shares: 75, avgPrice: 150.00, sector: 'Financial' },
    { symbol: 'JNJ', shares: 60, avgPrice: 160.00, sector: 'Healthcare' },
    { symbol: 'XOM', shares: 40, avgPrice: 100.00, sector: 'Energy' },
    { symbol: 'PG', shares: 80, avgPrice: 140.00, sector: 'Consumer' },
    { symbol: 'V', shares: 30, avgPrice: 250.00, sector: 'Financial' },
  ]);

  const symbols = assets.map(asset => asset.symbol);
  const { prices, isConnected, isRunning, start, stop } = useRealtimePrices(symbols, 5000);

  // Start real-time updates when component mounts
  useEffect(() => {
    start();
    return () => stop();
  }, [start, stop]);

  // Update asset prices with real-time data
  useEffect(() => {
    if (prices.length === 0) return;

    setAssets(prev => prev.map(asset => {
      const latestPrice = prices.find(p => p.symbol === asset.symbol);
      if (!latestPrice) return asset;

      const currentPrice = latestPrice.price;
      const marketValue = asset.shares * currentPrice;
      const totalReturn = marketValue - (asset.shares * asset.avgPrice);
      const totalReturnPercent = ((currentPrice - asset.avgPrice) / asset.avgPrice) * 100;

      return {
        ...asset,
        currentPrice,
        marketValue,
        totalReturn,
        totalReturnPercent,
      };
    }));
  }, [prices]);

  // Chart dimensions
  const chartDimensions: ChartDimensions = useMemo(() => ({
    width: 800,
    height: 500,
    margin: { top: 20, right: 30, bottom: 60, left: 60 }
  }), []);

  // Calculate portfolio statistics
  const portfolioStats = useMemo(() => {
    let totalCost = 0;
    let totalMarketValue = 0;
    let totalReturn = 0;
    let totalDayChange = 0;

    assets.forEach(asset => {
      const cost = asset.shares * asset.avgPrice;
      totalCost += cost;

      if (asset.marketValue) {
        totalMarketValue += asset.marketValue;
        totalReturn += asset.totalReturn || 0;
      }

      if (asset.dayChange) {
        totalDayChange += asset.dayChange;
      }
    });

    const totalReturnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;
    const dayChangePercent = totalMarketValue > 0 ? (totalDayChange / totalMarketValue) * 100 : 0;

    // Calculate allocation percentages
    const assetsWithAllocation = assets.map(asset => ({
      ...asset,
      allocation: asset.marketValue ? (asset.marketValue / totalMarketValue) * 100 : 0,
    }));

    // Group by sector
    const sectorData = assetsWithAllocation.reduce((acc, asset) => {
      const sector = asset.sector || 'Other';
      if (!acc[sector]) {
        acc[sector] = { totalValue: 0, assets: [], allocation: 0 };
      }
      acc[sector].totalValue += asset.marketValue || 0;
      acc[sector].assets.push(asset);
      return acc;
    }, {} as Record<string, { totalValue: number; assets: PortfolioAsset[]; allocation: number }>);

    // Calculate sector allocations
    Object.keys(sectorData).forEach(sector => {
      sectorData[sector].allocation = (sectorData[sector].totalValue / totalMarketValue) * 100;
    });

    return {
      totalCost,
      totalMarketValue,
      totalReturn,
      totalReturnPercent,
      dayChangePercent,
      assetsWithAllocation,
      sectorData,
    };
  }, [assets]);

  // D3 Chart rendering
  const renderChart = useCallback(() => {
    if (!chartRef.current || !svgRef.current || !portfolioStats) return;

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

    switch (chartType) {
      case 'pie':
        renderPieChart(g, chartWidth, chartHeight);
        break;
      case 'donut':
        renderDonutChart(g, chartWidth, chartHeight);
        break;
      case 'treemap':
        renderTreemapChart(g, chartWidth, chartHeight);
        break;
      case 'bar':
        renderBarChart(g, chartWidth, chartHeight);
        break;
    }

    setIsChartReady(true);
  }, [chartType, portfolioStats, chartDimensions]);

  const renderPieChart = (g: d3.Selection<SVGGElement, unknown, null, undefined>, width: number, height: number) => {
    const radius = Math.min(width, height) / 2;
    const centerX = width / 2;
    const centerY = height / 2;

    const pie = d3.pie<PortfolioAsset>()
      .value(d => d.allocation || 0)
      .sort(null);

    const arc = d3.arc<d3.PieArcDatum<PortfolioAsset>>()
      .innerRadius(0)
      .outerRadius(radius);

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Create pie chart
    const pieGroup = g.append('g')
      .attr('transform', `translate(${centerX},${centerY})`);

    const slices = pieGroup.selectAll('.slice')
      .data(pie(portfolioStats.assetsWithAllocation))
      .enter()
      .append('g')
      .attr('class', 'slice');

    slices.append('path')
      .attr('d', arc)
      .attr('fill', (d, i) => colorScale(i.toString()))
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('stroke-width', 4)
          .attr('stroke', '#000');
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('stroke-width', 2)
          .attr('stroke', 'white');
      });

    // Add labels
    slices.append('text')
      .attr('transform', d => `translate(${arc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', 'white')
      .text(d => `${d.data.symbol}\n${d.data.allocation?.toFixed(1)}%`);

    // Add legend
    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width + 10}, 0)`);

    const legendItems = legend.selectAll('.legend-item')
      .data(portfolioStats.assetsWithAllocation)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${i * 20})`);

    legendItems.append('rect')
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', (d, i) => colorScale(i.toString()));

    legendItems.append('text')
      .attr('x', 20)
      .attr('y', 12)
      .style('font-size', '12px')
      .text(d => `${d.symbol}: ${d.allocation?.toFixed(1)}%`);
  };

  const renderDonutChart = (g: d3.Selection<SVGGElement, unknown, null, undefined>, width: number, height: number) => {
    const radius = Math.min(width, height) / 2;
    const centerX = width / 2;
    const centerY = height / 2;
    const innerRadius = radius * 0.4;

    const pie = d3.pie<PortfolioAsset>()
      .value(d => d.allocation || 0)
      .sort(null);

    const arc = d3.arc<d3.PieArcDatum<PortfolioAsset>>()
      .innerRadius(innerRadius)
      .outerRadius(radius);

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Create donut chart
    const donutGroup = g.append('g')
      .attr('transform', `translate(${centerX},${centerY})`);

    const slices = donutGroup.selectAll('.slice')
      .data(pie(portfolioStats.assetsWithAllocation))
      .enter()
      .append('g')
      .attr('class', 'slice');

    slices.append('path')
      .attr('d', arc)
      .attr('fill', (d, i) => colorScale(i.toString()))
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    // Add center text
    donutGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.5em')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text('Portfolio');

    donutGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.5em')
      .style('font-size', '14px')
      .text(`${portfolioStats.totalReturnPercent.toFixed(1)}%`);
  };

  const renderTreemapChart = (g: d3.Selection<SVGGElement, unknown, null, undefined>, width: number, height: number) => {
    const treemap = d3.treemap<any>()
      .size([width, height])
      .padding(1)
      .round(true);

    const root = d3.hierarchy({ children: portfolioStats.assetsWithAllocation })
      .sum(d => (d as any).allocation || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    treemap(root as any);

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    const nodes = g.selectAll('.node')
      .data(root.leaves())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${(d as any).x0},${(d as any).y0})`);

    nodes.append('rect')
      .attr('width', d => (d as any).x1 - (d as any).x0)
      .attr('height', d => (d as any).y1 - (d as any).y0)
      .attr('fill', (d, i) => colorScale(i.toString()))
      .attr('stroke', 'white')
      .attr('stroke-width', 1);

    nodes.append('text')
      .attr('x', 5)
      .attr('y', 15)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', 'white')
      .text(d => (d.data as any).symbol);

    nodes.append('text')
      .attr('x', 5)
      .attr('y', 30)
      .style('font-size', '10px')
      .style('fill', 'white')
      .text(d => `${(d.data as any).allocation?.toFixed(1)}%`);
  };

  const renderBarChart = (g: d3.Selection<SVGGElement, unknown, null, undefined>, width: number, height: number) => {
    const xScale = d3.scaleBand()
      .domain(portfolioStats.assetsWithAllocation.map(d => d.symbol))
      .range([0, width])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(portfolioStats.assetsWithAllocation, d => d.allocation || 0) as number])
      .range([height, 0]);

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Add bars
    g.selectAll('.bar')
      .data(portfolioStats.assetsWithAllocation)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.symbol) || 0)
      .attr('y', d => yScale(d.allocation || 0))
      .attr('width', xScale.bandwidth())
      .attr('height', d => height - yScale(d.allocation || 0))
      .attr('fill', (d, i) => colorScale(i.toString()))
      .attr('stroke', 'white')
      .attr('stroke-width', 1);

    // Add X axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .style('font-size', '12px');

    // Add Y axis
    g.append('g')
      .call(d3.axisLeft(yScale).tickFormat(d => `${d}%`))
      .style('font-size', '12px');

    // Add value labels on bars
    g.selectAll('.bar-label')
      .data(portfolioStats.assetsWithAllocation)
      .enter()
      .append('text')
      .attr('class', 'bar-label')
      .attr('x', d => (xScale(d.symbol) || 0) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d.allocation || 0) - 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .text(d => `${d.allocation?.toFixed(1)}%`);
  };

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

  const handleDownloadChart = () => {
    if (!svgRef.current) return;
    
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `portfolio-allocation-${chartType}.svg`;
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
          downloadLink.download = `portfolio-allocation-${chartType}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          URL.revokeObjectURL(url);
        }
      });
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (!portfolioStats) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading portfolio data...</p>
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
              <PieChart className="h-4 w-4" />
              {widget.title}
            </CardTitle>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">
                  {formatCurrency(portfolioStats.totalMarketValue)}
                </span>
                <div className={`flex items-center gap-1 text-sm ${portfolioStats.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {portfolioStats.totalReturn >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {formatCurrency(Math.abs(portfolioStats.totalReturn))} ({formatPercent(portfolioStats.totalReturnPercent)})
                </div>
              </div>
              <span className="text-sm text-muted-foreground">• Portfolio</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleScreenshot} className="h-8 w-8 p-0" title="Screenshot">
              <Camera className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadChart} className="h-8 w-8 p-0" title="Download SVG">
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Chart Controls */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Label>Chart Type:</Label>
            <Select value={chartType} onValueChange={(value: 'pie' | 'treemap' | 'bar' | 'donut') => setChartType(value)}>
              <SelectTrigger className="w-24 h-7">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pie">Pie Chart</SelectItem>
                <SelectItem value="donut">Donut Chart</SelectItem>
                <SelectItem value="treemap">Treemap</SelectItem>
                <SelectItem value="bar">Bar Chart</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              id="show-performance"
              checked={showPerformance}
              onCheckedChange={setShowPerformance}
            />
            <Label htmlFor="show-performance">Performance</Label>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              id="show-sectors"
              checked={showSectors}
              onCheckedChange={setShowSectors}
            />
            <Label htmlFor="show-sectors">Sectors</Label>
          </div>
        </div>
        
        {/* Portfolio Summary */}
        <div className="grid grid-cols-4 gap-4 text-xs">
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="text-muted-foreground">Total Cost</div>
            <div className="font-medium">{formatCurrency(portfolioStats.totalCost)}</div>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="text-muted-foreground">Market Value</div>
            <div className="font-medium">{formatCurrency(portfolioStats.totalMarketValue)}</div>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="text-muted-foreground">Total Return</div>
            <div className={`font-medium ${portfolioStats.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(Math.abs(portfolioStats.totalReturn))} ({formatPercent(portfolioStats.totalReturnPercent)})
            </div>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="text-muted-foreground">Assets</div>
            <div className="font-medium">{portfolioStats.assetsWithAllocation.length}</div>
          </div>
        </div>

        {/* Sector Breakdown */}
        {showSectors && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Sector Allocation</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(portfolioStats.sectorData).map(([sector, data]) => (
                <div key={sector} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <span className="font-medium">{sector}</span>
                  <span>{data.allocation.toFixed(1)}%</span>
                </div>
              ))}
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
                <PieChart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Loading chart...</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Real-time Status */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Status: {isRunning ? 'Live' : 'Stopped'}</span>
            <span>Connection: {isConnected ? 'Connected' : 'Disconnected'}</span>
            <span>Chart Type: {chartType}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
              {isConnected ? 'Live Data' : 'Offline'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}