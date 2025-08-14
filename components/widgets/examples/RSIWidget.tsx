'use client';

import React from 'react';
import { WidgetTemplate, FinancialData, createConfigSchema, useWidgetData } from '@/lib/sdk/widget-sdk';
import { ChartContainer } from '@/components/ui/ChartContainer';
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import type { WidgetProps, WidgetDefinition } from '@/lib/widgets/schema';
import { createWidgetSchema } from '@/lib/widgets/schema';
import { z } from 'zod';

// Configuration schema for RSI widget
const RSIConfigSchema = createWidgetSchema(
  z.object({
    symbol: z.string().default('AAPL').describe('Stock symbol to analyze'),
    period: z.number().int().min(5).max(50).default(14).describe('RSI calculation period'),
    overboughtLevel: z.number().min(50).max(100).default(70).describe('Overbought threshold'),
    oversoldLevel: z.number().min(0).max(50).default(30).describe('Oversold threshold'),
    showChart: z.boolean().default(true).describe('Show RSI chart'),
    alertsEnabled: z.boolean().default(true).describe('Enable RSI alerts'),
  })
);

type RSIConfig = z.infer<typeof RSIConfigSchema>;

interface RSIData {
  date: string;
  price: number;
  rsi: number;
}

interface PricePoint {
  date: string;
  value: number;
  volume?: number;
}

function RSIWidget({ config, onConfigChange }: WidgetProps) {
  const cfg = config as RSIConfig;
  
  // Mock data - in real implementation, this would fetch from data providers
  const mockPriceData: PricePoint[] = React.useMemo(() => {
    const data: PricePoint[] = [];
    let price = 150;
    const now = Date.now();
    
    for (let i = 60; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      price += (Math.random() - 0.5) * 10;
      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.max(price, 100),
        volume: Math.floor(Math.random() * 1000000) + 500000,
      });
    }
    
    return data;
  }, [cfg.symbol]);

  // Calculate RSI from price data
  const rsiData: RSIData[] = React.useMemo(() => {
    if (mockPriceData.length < cfg.period + 1) return [];
    
    const prices = mockPriceData.map(d => d.value);
    const rsiValues = FinancialData.calculateRSI(prices, cfg.period);
    
    return mockPriceData.slice(cfg.period).map((point, index) => ({
      date: point.date,
      price: point.value,
      rsi: rsiValues[index] || 50,
    }));
  }, [mockPriceData, cfg.period]);

  const currentRSI = rsiData[rsiData.length - 1]?.rsi || 50;
  const currentPrice = rsiData[rsiData.length - 1]?.price || 0;

  // Determine RSI signal
  const getSignal = (rsi: number) => {
    if (rsi >= cfg.overboughtLevel) return { type: 'overbought', color: 'text-red-600', icon: TrendingDown };
    if (rsi <= cfg.oversoldLevel) return { type: 'oversold', color: 'text-green-600', icon: TrendingUp };
    return { type: 'neutral', color: 'text-blue-600', icon: AlertTriangle };
  };

  const signal = getSignal(currentRSI);
  const SignalIcon = signal.icon;

  const updateConfig = (updates: Partial<RSIConfig>) => {
    onConfigChange?.({ ...cfg, ...updates });
  };

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Header with key metrics */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{cfg.symbol} RSI Analysis</h3>
          <p className="text-sm text-muted-foreground">
            {cfg.period}-period Relative Strength Index
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">
            {FinancialData.formatCurrency(currentPrice)}
          </div>
          <div className={`flex items-center gap-1 text-sm ${signal.color}`}>
            <SignalIcon className="h-4 w-4" />
            RSI: {currentRSI.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Configuration controls */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Symbol</span>
          <input
            type="text"
            value={cfg.symbol}
            onChange={(e) => updateConfig({ symbol: e.target.value.toUpperCase() })}
            className="w-full bg-background border border-border rounded px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Period</span>
          <input
            type="number"
            value={cfg.period}
            onChange={(e) => updateConfig({ period: parseInt(e.target.value) || 14 })}
            min={5}
            max={50}
            className="w-full bg-background border border-border rounded px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Overbought</span>
          <input
            type="number"
            value={cfg.overboughtLevel}
            onChange={(e) => updateConfig({ overboughtLevel: parseFloat(e.target.value) || 70 })}
            min={50}
            max={100}
            className="w-full bg-background border border-border rounded px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Oversold</span>
          <input
            type="number"
            value={cfg.oversoldLevel}
            onChange={(e) => updateConfig({ oversoldLevel: parseFloat(e.target.value) || 30 })}
            min={0}
            max={50}
            className="w-full bg-background border border-border rounded px-2 py-1"
          />
        </label>
      </div>

      {/* RSI Signal Badge */}
      <div className="flex items-center gap-2">
        <Badge 
          variant={signal.type === 'neutral' ? 'secondary' : 'default'}
          className={`${signal.color} border-current`}
        >
          <SignalIcon className="h-3 w-3 mr-1" />
          {signal.type === 'overbought' ? 'OVERBOUGHT' : 
           signal.type === 'oversold' ? 'OVERSOLD' : 'NEUTRAL'}
        </Badge>
        
        {cfg.alertsEnabled && signal.type !== 'neutral' && (
          <div className="text-xs text-muted-foreground">
            Alert: RSI {signal.type === 'overbought' ? 'above' : 'below'} threshold
          </div>
        )}
      </div>

      {/* RSI Chart */}
      {cfg.showChart && rsiData.length > 0 && (
        <div className="flex-1 min-h-0">
          <ChartContainer minHeight={180}>
            <LineChart data={rsiData}>
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis 
                domain={[0, 100]}
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value: number, name: string) => [
                  name === 'rsi' ? value.toFixed(1) : FinancialData.formatCurrency(value),
                  name === 'rsi' ? 'RSI' : 'Price'
                ]}
              />
              
              {/* RSI reference lines */}
              <ReferenceLine 
                y={cfg.overboughtLevel} 
                stroke="#ef4444" 
                strokeDasharray="3 3" 
                strokeWidth={1}
              />
              <ReferenceLine 
                y={cfg.oversoldLevel} 
                stroke="#10b981" 
                strokeDasharray="3 3" 
                strokeWidth={1}
              />
              <ReferenceLine 
                y={50} 
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={1}
                opacity={0.5}
              />
              
              {/* RSI line */}
              <Line 
                type="monotone" 
                dataKey="rsi" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
            </LineChart>
          </ChartContainer>
        </div>
      )}

      {/* RSI interpretation */}
      <div className="text-xs text-muted-foreground space-y-1">
        <div>RSI interpretation:</div>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-red-600">
            &gt;{cfg.overboughtLevel}: Potentially overbought
          </div>
          <div className="text-blue-600">
            {cfg.oversoldLevel}-{cfg.overboughtLevel}: Neutral zone
          </div>
          <div className="text-green-600">
            &lt;{cfg.oversoldLevel}: Potentially oversold
          </div>
        </div>
      </div>
    </div>
  );
}

// Widget definition for registration
export const RSIWidgetDefinition: WidgetDefinition = {
  meta: {
    type: 'rsi-analysis',
    name: 'RSI Analysis',
    description: 'Relative Strength Index technical indicator with configurable parameters',
    category: 'analysis',
    version: '1',
    tags: ['technical', 'indicators', 'rsi', 'momentum'],
    configSchema: RSIConfigSchema,
    defaultConfig: {
      symbol: 'AAPL',
      period: 14,
      overboughtLevel: 70,
      oversoldLevel: 30,
      showChart: true,
      alertsEnabled: true,
    },
    defaultSize: { w: 6, h: 4 },
    capabilities: {
      resizable: true,
      configurable: true,
      dataBinding: false,
      exportable: false,
      realTimeData: false,
    },
  },
  runtime: {
    component: RSIWidget as React.ComponentType<WidgetProps>,
  },
};

// Export for use in other components
export default RSIWidget;