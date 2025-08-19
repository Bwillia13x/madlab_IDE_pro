'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Play, RotateCcw, Download, Zap } from 'lucide-react';
import type { Widget } from '@/lib/store';

interface BacktestingFrameworkWidgetProps {
  widget: Widget;
  sheetId: string;
  onTitleChange?: (newTitle: string) => void;
}

interface Strategy {
  id: string;
  name: string;
  description: string;
  type: 'momentum' | 'mean-reversion' | 'arbitrage' | 'custom';
  symbols: string[];
  parameters: Record<string, number>;
}

interface BacktestResult {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  winRate: number;
  profitFactor: number;
  trades: number;
  equity: number[];
  drawdown: number[];
  dates: string[];
}

const MOCK_STRATEGIES: Strategy[] = [
  {
    id: '1',
    name: 'Moving Average Crossover',
    description: 'Buy when short MA crosses above long MA, sell when below',
    type: 'momentum',
    symbols: ['SPY', 'QQQ'],
    parameters: { shortMA: 20, longMA: 50, lookback: 252 }
  },
  {
    id: '2',
    name: 'Mean Reversion (RSI)',
    description: 'Buy oversold (RSI < 30), sell overbought (RSI > 70)',
    type: 'mean-reversion',
    symbols: ['AAPL', 'MSFT', 'NVDA'],
    parameters: { rsiPeriod: 14, oversold: 30, overbought: 70, lookback: 252 }
  },
  {
    id: '3',
    name: 'Volatility Breakout',
    description: 'Enter positions when volatility exceeds historical average',
    type: 'momentum',
    symbols: ['VIX', 'SPY'],
    parameters: { volPeriod: 20, volThreshold: 1.5, lookback: 252 }
  }
];

const MOCK_BACKTEST_RESULT: BacktestResult = {
  totalReturn: 23.45,
  annualizedReturn: 8.67,
  sharpeRatio: 1.23,
  maxDrawdown: -12.34,
  volatility: 15.67,
  winRate: 58.9,
  profitFactor: 1.45,
  trades: 156,
  equity: [100, 102.3, 105.1, 103.8, 107.2, 110.5, 108.9, 112.3, 115.6, 113.2, 116.8, 120.1, 118.5, 121.9, 123.45],
  drawdown: [0, -1.2, 0, -2.1, 0, -1.4, -2.8, 0, -1.1, -3.2, 0, -1.8, -2.5, 0, -1.2],
  dates: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
};

export function BacktestingFrameworkWidget({ widget: _widget, onTitleChange: _onTitleChange }: Readonly<BacktestingFrameworkWidgetProps>) {
  const [selectedStrategy, setSelectedStrategy] = useState<string>('1');
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [customParameters, setCustomParameters] = useState<Record<string, number>>({});

  const currentStrategy = MOCK_STRATEGIES.find(s => s.id === selectedStrategy);
  const results = MOCK_BACKTEST_RESULT;

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  const getReturnColor = (value: number) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getMetricColor = (metric: string, value: number) => {
    switch (metric) {
      case 'sharpeRatio':
        return value > 1 ? 'text-green-600' : value > 0.5 ? 'text-yellow-600' : 'text-red-600';
      case 'winRate':
        return value > 60 ? 'text-green-600' : value > 50 ? 'text-yellow-600' : 'text-red-600';
      case 'profitFactor':
        return value > 1.5 ? 'text-green-600' : value > 1.2 ? 'text-yellow-600' : 'text-red-600';
      default:
        return 'text-foreground';
    }
  };

  const runBacktest = () => {
    setIsRunning(true);
    setTimeout(() => setIsRunning(false), 2000);
  };

  const resetBacktest = () => {
    setCustomParameters({});
  };

  const updateParameter = (key: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setCustomParameters(prev => ({ ...prev, [key]: numValue }));
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Backtesting Framework
          <Badge variant="secondary" className="ml-auto">{currentStrategy?.name}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Strategy Selection & Controls */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
              <SelectTrigger className="h-8 text-xs w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOCK_STRATEGIES.map(strategy => (
                  <SelectItem key={strategy.id} value={strategy.id}>
                    {strategy.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              onClick={runBacktest} 
              disabled={isRunning}
              size="sm" 
              className="h-8 text-xs"
            >
              {isRunning ? (
                <>
                  <RotateCcw className="w-3 h-3 mr-1 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 mr-1" />
                  Run Backtest
                </>
              )}
            </Button>

            <Button onClick={resetBacktest} variant="outline" size="sm" className="h-8 text-xs">
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          </div>

          {currentStrategy && (
            <div className="p-3 bg-muted/30 rounded text-xs">
              <div className="font-medium mb-1">{currentStrategy.description}</div>
              <div className="flex gap-4 text-muted-foreground">
                <span>Type: <Badge variant="outline" className="text-xs">{currentStrategy.type}</Badge></span>
                <span>Symbols: {currentStrategy.symbols.join(', ')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Strategy Parameters */}
        {currentStrategy && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Strategy Parameters</h4>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(currentStrategy.parameters).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs text-muted-foreground">{key}</label>
                  <Input
                    type="number"
                    value={customParameters[key] || value}
                    onChange={(e) => updateParameter(key, e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
            <TabsTrigger value="trades">Trade Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-3 bg-muted/30 rounded text-center">
                <div className="text-xs text-muted-foreground">Total Return</div>
                <div className={`text-lg font-semibold ${getReturnColor(results.totalReturn)}`}>
                  {formatPercentage(results.totalReturn)}
                </div>
              </div>
              <div className="p-3 bg-muted/30 rounded text-center">
                <div className="text-xs text-muted-foreground">Annualized</div>
                <div className={`text-lg font-semibold ${getReturnColor(results.annualizedReturn)}`}>
                  {formatPercentage(results.annualizedReturn)}
                </div>
              </div>
              <div className="p-3 bg-muted/30 rounded text-center">
                <div className="text-xs text-muted-foreground">Sharpe Ratio</div>
                <div className={`text-lg font-semibold ${getMetricColor('sharpeRatio', results.sharpeRatio)}`}>
                  {results.sharpeRatio.toFixed(2)}
                </div>
              </div>
              <div className="p-3 bg-muted/30 rounded text-center">
                <div className="text-xs text-muted-foreground">Max Drawdown</div>
                <div className={`text-lg font-semibold ${getReturnColor(results.maxDrawdown)}`}>
                  {formatPercentage(results.maxDrawdown)}
                </div>
              </div>
            </div>

            {/* Equity Curve */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Equity Curve</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={results.equity.map((value, index) => ({ date: results.dates[index], equity: value }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis fontSize={10} tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Equity']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Line type="monotone" dataKey="equity" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Performance Metrics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Volatility:</span>
                    <span className="font-medium">{formatPercentage(results.volatility)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Win Rate:</span>
                    <span className={`font-medium ${getMetricColor('winRate', results.winRate)}`}>
                      {formatPercentage(results.winRate)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Profit Factor:</span>
                    <span className={`font-medium ${getMetricColor('profitFactor', results.profitFactor)}`}>
                      {results.profitFactor.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Total Trades:</span>
                    <span className="font-medium">{results.trades}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Drawdown Analysis</h4>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={results.drawdown.map((value, index) => ({ date: results.dates[index], drawdown: value }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={10} />
                    <YAxis fontSize={10} tickFormatter={(value) => formatPercentage(value)} />
                    <Tooltip 
                      formatter={(value: number) => [formatPercentage(value), 'Drawdown']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Bar dataKey="drawdown" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="risk" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Risk Metrics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Value at Risk (95%):</span>
                    <span className="font-medium text-red-600">-8.45%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Expected Shortfall:</span>
                    <span className="font-medium text-red-600">-12.34%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Calmar Ratio:</span>
                    <span className="font-medium text-green-600">0.70</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Sortino Ratio:</span>
                    <span className="font-medium text-green-600">1.45</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Monte Carlo Simulation</h4>
                <div className="p-3 bg-muted/30 rounded text-center">
                  <div className="text-xs text-muted-foreground mb-1">95% Confidence Interval</div>
                  <div className="text-sm font-medium">-5.2% to +18.7%</div>
                  <div className="text-xs text-muted-foreground mt-1">Based on 10,000 simulations</div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="trades" className="mt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-muted-foreground">Recent Trades</h4>
                <Button variant="outline" size="sm" className="h-6 text-xs">
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </Button>
              </div>
              
              <div className="text-center py-8 text-sm text-muted-foreground">
                Trade log would display here with entry/exit prices, P&L, and timestamps
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Mock data for demonstration • Real backtesting requires historical price data
        </div>
      </CardContent>
    </Card>
  );
}
