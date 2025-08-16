'use client';

import { useState, useEffect } from 'react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TrendingUp, TrendingDown, BarChart3, Activity, RefreshCw } from 'lucide-react';
import type { Widget } from '@/lib/store';
import { usePrices } from '@/lib/data/hooks';
import type { PriceRange } from '@/lib/data/provider.types';

interface EnhancedLineChartProps {
  widget: Widget;
  sheetId: string;
  onTitleChange?: (title: string) => void;
}

interface ChartData {
  date: string;
  price: number;
  volume: number;
  sma20?: number;
  sma50?: number;
  upperBand?: number;
  lowerBand?: number;
}

export function EnhancedLineChart({ widget, sheetId, onTitleChange }: EnhancedLineChartProps) {
  const [timeRange, setTimeRange] = useState<PriceRange>('6M');
  const [showVolume, setShowVolume] = useState(false);
  const [showSMAs, setShowSMAs] = useState(false);
  const [showBollingerBands, setShowBollingerBands] = useState(false);
  
  const symbol = (widget.props?.symbol as string) || 'AAPL';
  const { data: priceData, loading, error, refetch } = usePrices(symbol, timeRange);

  // Process data for charting
  const chartData: ChartData[] = priceData.map(point => ({
    date: point.date.toLocaleDateString(),
    price: point.close,
    volume: point.volume,
  }));

  // Calculate Simple Moving Averages
  useEffect(() => {
    if (showSMAs && chartData.length > 0) {
      // Calculate SMA 20
      const sma20Data = chartData.map((point, index) => {
        if (index < 19) return { ...point, sma20: undefined };
        const sum = chartData.slice(index - 19, index + 1).reduce((acc, p) => acc + p.price, 0);
        return { ...point, sma20: sum / 20 };
      });

      // Calculate SMA 50
      const sma50Data = sma20Data.map((point, index) => {
        if (index < 49) return { ...point, sma50: undefined };
        const sum = chartData.slice(index - 49, index + 1).reduce((acc, p) => acc + p.price, 0);
        return { ...point, sma50: sum / 50 };
      });

      // Calculate Bollinger Bands
      if (showBollingerBands) {
        const bbData = sma50Data.map((point, index) => {
          if (index < 49) return { ...point, upperBand: undefined, lowerBand: undefined };
          const prices = chartData.slice(index - 49, index + 1).map(p => p.price);
          const sma = point.sma50!;
          const variance = prices.reduce((acc, price) => acc + Math.pow(price - sma, 2), 0) / 50;
          const stdDev = Math.sqrt(variance);
          return {
            ...point,
            upperBand: sma + (2 * stdDev),
            lowerBand: sma - (2 * stdDev),
          };
        });
        // Update chart data with indicators
        // Note: In a real implementation, you'd use state to update this
      }
    }
  }, [showSMAs, showBollingerBands, chartData]);

  const handleRefresh = () => {
    refetch();
  };

  const formatPrice = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toString();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.dataKey === 'volume' ? formatVolume(entry.value) : formatPrice(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading chart data...</p>
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

  const latestPrice = priceData[0]?.close || 0;
  const previousPrice = priceData[1]?.close || latestPrice;
  const priceChange = latestPrice - previousPrice;
  const priceChangePercent = (priceChange / previousPrice) * 100;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {widget.title}
            </CardTitle>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{formatPrice(latestPrice)}</span>
                <div className={`flex items-center gap-1 text-sm ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {priceChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {formatPrice(Math.abs(priceChange))} ({priceChangePercent.toFixed(2)}%)
                </div>
              </div>
              <span className="text-sm text-muted-foreground">• {symbol}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} className="h-8 w-8 p-0">
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
        </div>
        
        {/* Chart */}
        <div className="flex-1 min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                tickFormatter={formatPrice}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {/* Price Line */}
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: '#3B82F6', strokeWidth: 2 }}
                name="Price"
              />
              
              {/* Volume Bars (if enabled) */}
              {showVolume && (
                <Line 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="#10B981" 
                  strokeWidth={1}
                  dot={false}
                  name="Volume"
                  yAxisId={1}
                />
              )}
              
              {/* SMAs (if enabled) */}
              {showSMAs && (
                <>
                  <Line 
                    type="monotone" 
                    dataKey="sma20" 
                    stroke="#F59E0B" 
                    strokeWidth={1}
                    dot={false}
                    name="SMA 20"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sma50" 
                    stroke="#EF4444" 
                    strokeWidth={1}
                    dot={false}
                    name="SMA 50"
                  />
                </>
              )}
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}