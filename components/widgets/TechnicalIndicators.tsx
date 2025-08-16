'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Activity, RefreshCw, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import type { Widget } from '@/lib/store';
import { usePrices } from '@/lib/data/hooks';
import type { PriceRange } from '@/lib/data/provider.types';

interface TechnicalIndicatorsProps {
  widget: Widget;
  sheetId: string;
  onTitleChange?: (title: string) => void;
}

interface IndicatorValue {
  value: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: 'strong' | 'moderate' | 'weak';
}

interface TechnicalMetrics {
  rsi: IndicatorValue;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
    signalType: 'bullish' | 'bearish' | 'neutral';
  };
  stochastic: {
    k: number;
    d: number;
    signal: 'bullish' | 'bearish' | 'neutral';
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    current: number;
    position: 'above' | 'below' | 'between';
    signal: 'bullish' | 'bearish' | 'neutral';
  };
  support: number;
  resistance: number;
}

export function TechnicalIndicators({ widget, sheetId, onTitleChange }: TechnicalIndicatorsProps) {
  const [timeRange, setTimeRange] = useState<PriceRange>('3M');
  const [showRSI, setShowRSI] = useState(true);
  const [showMACD, setShowMACD] = useState(true);
  const [showStochastic, setShowStochastic] = useState(true);
  const [showBollingerBands, setShowBollingerBands] = useState(true);
  
  const symbol = (widget.props?.symbol as string) || 'AAPL';
  const { data: priceData, loading, error, refetch } = usePrices(symbol, timeRange);

  // Calculate RSI (Relative Strength Index)
  const calculateRSI = (prices: number[], period: number = 14): number => {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  };

  // Calculate MACD (Moving Average Convergence Divergence)
  const calculateMACD = (prices: number[]): { macd: number; signal: number; histogram: number } => {
    if (prices.length < 26) return { macd: 0, signal: 0, histogram: 0 };
    
    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);
    const macd = ema12 - ema26;
    const signal = calculateEMA([macd], 9);
    const histogram = macd - signal;
    
    return { macd, signal, histogram };
  };

  // Calculate EMA (Exponential Moving Average)
  const calculateEMA = (prices: number[], period: number): number => {
    if (prices.length === 0) return 0;
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  };

  // Calculate Stochastic Oscillator
  const calculateStochastic = (prices: number[], period: number = 14): { k: number; d: number } => {
    if (prices.length < period) return { k: 50, d: 50 };
    
    const currentPrice = prices[0];
    const highestHigh = Math.max(...prices.slice(0, period));
    const lowestLow = Math.min(...prices.slice(0, period));
    
    const k = ((currentPrice - lowestLow) / (highestHigh - lowestLow)) * 100;
    const d = calculateEMA([k], 3);
    
    return { k, d };
  };

  // Calculate Bollinger Bands
  const calculateBollingerBands = (prices: number[], period: number = 20): { upper: number; middle: number; lower: number } => {
    if (prices.length < period) return { upper: 0, middle: 0, lower: 0 };
    
    const sma = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    const variance = prices.slice(0, period).reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    
    return {
      upper: sma + (2 * stdDev),
      middle: sma,
      lower: sma - (2 * stdDev),
    };
  };

  // Calculate Support and Resistance levels
  const calculateSupportResistance = (prices: number[]): { support: number; resistance: number } => {
    if (prices.length < 20) return { support: 0, resistance: 0 };
    
    const recentPrices = prices.slice(0, 20);
    const support = Math.min(...recentPrices) * 0.995; // 0.5% below lowest
    const resistance = Math.max(...recentPrices) * 1.005; // 0.5% above highest
    
    return { support, resistance };
  };

  // Calculate all technical indicators
  const technicalMetrics = useMemo((): TechnicalMetrics | null => {
    if (!priceData || priceData.length === 0) return null;
    
    const prices = priceData.map(p => p.close);
    const currentPrice = prices[0];
    
    // RSI
    const rsiValue = calculateRSI(prices);
    const rsi: IndicatorValue = {
      value: rsiValue,
      signal: rsiValue > 70 ? 'bearish' : rsiValue < 30 ? 'bullish' : 'neutral',
      strength: Math.abs(rsiValue - 50) > 20 ? 'strong' : Math.abs(rsiValue - 50) > 10 ? 'moderate' : 'weak',
    };
    
    // MACD
    const macdData = calculateMACD(prices);
    const macdSignal = macdData.histogram > 0 ? 'bullish' : macdData.histogram < 0 ? 'bearish' : 'neutral';
    
    // Stochastic
    const stochasticData = calculateStochastic(prices);
    const stochasticSignal = stochasticData.k > 80 ? 'bearish' : stochasticData.k < 20 ? 'bullish' : 'neutral';
    
    // Bollinger Bands
    const bbData = calculateBollingerBands(prices);
    const bbPosition = currentPrice > bbData.upper ? 'above' : currentPrice < bbData.lower ? 'below' : 'between';
    const bbSignal = bbPosition === 'below' ? 'bullish' : bbPosition === 'above' ? 'bearish' : 'neutral';
    
    // Support and Resistance
    const { support, resistance } = calculateSupportResistance(prices);
    
    return {
      rsi,
      macd: { ...macdData, signalType: macdSignal },
      stochastic: { ...stochasticData, signal: stochasticSignal },
      bollingerBands: { ...bbData, current: currentPrice, position: bbPosition, signal: bbSignal },
      support,
      resistance,
    };
  }, [priceData]);

  const handleRefresh = () => {
    refetch();
  };

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'bullish': return 'text-green-600';
      case 'bearish': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'bullish': return <TrendingUp className="h-3 w-3" />;
      case 'bearish': return <TrendingDown className="h-3 w-3" />;
      default: return <AlertTriangle className="h-3 w-3" />;
    }
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'strong': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading technical indicators...</p>
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
            <div className="flex items-center gap-4 mt-2">
              <span className="text-sm text-muted-foreground">{symbol}</span>
              <span className="text-sm text-muted-foreground">• {timeRange}</span>
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
                <SelectItem value="1M">1M</SelectItem>
                <SelectItem value="3M">3M</SelectItem>
                <SelectItem value="6M">6M</SelectItem>
                <SelectItem value="1Y">1Y</SelectItem>
                <SelectItem value="2Y">2Y</SelectItem>
              </SelectContent>
            </Select>
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
          
          <div className="flex items-center gap-2">
            <Switch
              id="show-stochastic"
              checked={showStochastic}
              onCheckedChange={setShowStochastic}
            />
            <Label htmlFor="show-stochastic">Stochastic</Label>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              id="show-bb"
              checked={showBollingerBands}
              onCheckedChange={setShowBollingerBands}
            />
            <Label htmlFor="show-bb">Bollinger Bands</Label>
          </div>
        </div>

        {/* Technical Indicators Display */}
        {technicalMetrics && (
          <div className="grid grid-cols-2 gap-4">
            {/* RSI */}
            {showRSI && (
              <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">RSI (14)</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getSignalColor(technicalMetrics.rsi.signal)}`}>
                      {technicalMetrics.rsi.value.toFixed(2)}
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      {getSignalIcon(technicalMetrics.rsi.signal)}
                      <span className={`text-sm ${getSignalColor(technicalMetrics.rsi.signal)}`}>
                        {technicalMetrics.rsi.signal.toUpperCase()}
                      </span>
                    </div>
                    <Badge className={`mt-2 ${getStrengthColor(technicalMetrics.rsi.strength)}`}>
                      {technicalMetrics.rsi.strength.toUpperCase()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* MACD */}
            {showMACD && (
              <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">MACD</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span>MACD:</span>
                      <span className="font-mono">{technicalMetrics.macd.macd.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Signal:</span>
                      <span className="font-mono">{technicalMetrics.macd.signal.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Histogram:</span>
                      <span className="font-mono">{technicalMetrics.macd.histogram.toFixed(4)}</span>
                    </div>
                                         <div className="flex items-center justify-center gap-2 mt-2">
                       {getSignalIcon(technicalMetrics.macd.signalType)}
                       <span className={`text-sm ${getSignalColor(technicalMetrics.macd.signalType)}`}>
                         {technicalMetrics.macd.signalType.toUpperCase()}
                       </span>
                     </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stochastic */}
            {showStochastic && (
              <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Stochastic</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span>%K:</span>
                      <span className="font-mono">{technicalMetrics.stochastic.k.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>%D:</span>
                      <span className="font-mono">{technicalMetrics.stochastic.d.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      {getSignalIcon(technicalMetrics.stochastic.signal)}
                      <span className={`text-sm ${getSignalColor(technicalMetrics.stochastic.signal)}`}>
                        {technicalMetrics.stochastic.signal.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bollinger Bands */}
            {showBollingerBands && (
              <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Bollinger Bands</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span>Upper:</span>
                      <span className="font-mono">${technicalMetrics.bollingerBands.upper.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Middle:</span>
                      <span className="font-mono">${technicalMetrics.bollingerBands.middle.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Lower:</span>
                      <span className="font-mono">${technicalMetrics.bollingerBands.lower.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      {getSignalIcon(technicalMetrics.bollingerBands.signal)}
                      <span className={`text-sm ${getSignalColor(technicalMetrics.bollingerBands.signal)}`}>
                        {technicalMetrics.bollingerBands.signal.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Support and Resistance */}
        {technicalMetrics && (
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Support Level</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-center">
                  <div className="text-xl font-bold text-green-600">
                    ${technicalMetrics.support.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Price support level
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Resistance Level</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-center">
                  <div className="text-xl font-bold text-red-600">
                    ${technicalMetrics.resistance.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Price resistance level
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Chart Placeholder */}
        <div className="border rounded-lg p-4 bg-muted/20">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Technical Indicators Chart</p>
            <p className="text-xs">Interactive chart visualization will be implemented</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}