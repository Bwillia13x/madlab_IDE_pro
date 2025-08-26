'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Play, RotateCcw, Download, Zap, AlertCircle, TrendingUp, 
  TrendingDown, DollarSign, BarChart3, Target, Settings, Save, Loader2 
} from 'lucide-react';
import { WidgetWrapper } from '@/components/ui/WidgetWrapper';
import { useWorkspaceStore } from '@/lib/store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EnhancedBacktestRunnerProps {
  widget: {
    id: string;
    type: string;
    title: string;
    description?: string;
    category?: string;
  };
  sheetId: string;
}

interface Strategy {
  id: string;
  name: string;
  description: string;
  type: 'momentum' | 'mean-reversion' | 'arbitrage' | 'custom';
  symbols: string[];
  parameters: Record<string, number>;
  category: string;
  complexity: 'beginner' | 'intermediate' | 'advanced';
}

interface BacktestResult {
  id: string;
  strategyId: string;
  strategyName: string;
  symbol: string;
  startDate: string;
  endDate: string;
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
  parameters: Record<string, number>;
  timestamp: Date;
  status: 'completed' | 'running' | 'failed';
}

const STRATEGIES: Strategy[] = [
  {
    id: 'ma-crossover',
    name: 'Moving Average Crossover',
    description: 'Buy when short MA crosses above long MA, sell when below',
    type: 'momentum',
    symbols: ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA'],
    parameters: { shortMA: 20, longMA: 50, lookback: 252 },
    category: 'Trend Following',
    complexity: 'beginner'
  },
  {
    id: 'rsi-mean-reversion',
    name: 'RSI Mean Reversion',
    description: 'Buy oversold (RSI < 30), sell overbought (RSI > 70)',
    type: 'mean-reversion',
    symbols: ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL'],
    parameters: { rsiPeriod: 14, oversold: 30, overbought: 70, lookback: 252 },
    category: 'Mean Reversion',
    complexity: 'beginner'
  },
  {
    id: 'volatility-breakout',
    name: 'Volatility Breakout',
    description: 'Enter positions when volatility exceeds historical average',
    type: 'momentum',
    symbols: ['VIX', 'SPY', 'QQQ'],
    parameters: { volPeriod: 20, volThreshold: 1.5, lookback: 252 },
    category: 'Volatility',
    complexity: 'intermediate'
  },
  {
    id: 'dual-momentum',
    name: 'Dual Momentum',
    description: 'Rank assets by relative and absolute momentum',
    type: 'momentum',
    symbols: ['SPY', 'QQQ', 'IWM', 'EFA', 'EEM'],
    parameters: { momentumPeriod: 12, rebalancePeriod: 1, lookback: 252 },
    category: 'Multi-Asset',
    complexity: 'intermediate'
  },
  {
    id: 'pairs-trading',
    name: 'Pairs Trading',
    description: 'Trade relative value between correlated assets',
    type: 'arbitrage',
    symbols: ['AAPL-MSFT', 'SPY-QQQ', 'XLE-XLF'],
    parameters: { correlationThreshold: 0.8, zScoreThreshold: 2.0, lookback: 252 },
    category: 'Statistical Arbitrage',
    complexity: 'advanced'
  }
];

const COLORS = {
  positive: '#10b981',
  negative: '#ef4444',
  neutral: '#6b7280',
  primary: '#3b82f6',
  secondary: '#8b5cf6'
};

export function EnhancedBacktestRunner({ widget, sheetId }: EnhancedBacktestRunnerProps) {
  const { globalSymbol, globalTimeframe } = useWorkspaceStore();
  const [selectedStrategy, setSelectedStrategy] = useState<string>('ma-crossover');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('AAPL');
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [customParameters, setCustomParameters] = useState<Record<string, number>>({});
  const [results, setResults] = useState<BacktestResult[]>([]);
  const [currentResult, setCurrentResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const cacheRef = useRef<Map<string, { at: number; result: BacktestResult }>>(new Map());

  // Auto-populate symbol from global context
  useEffect(() => {
    if (globalSymbol && !selectedSymbol) {
      setSelectedSymbol(globalSymbol);
    }
  }, [globalSymbol, selectedSymbol]);

  const currentStrategy = useMemo(() => 
    STRATEGIES.find(s => s.id === selectedStrategy), [selectedStrategy]
  );

  const availableSymbols = useMemo(() => 
    currentStrategy?.symbols || [], [currentStrategy]
  );

  const allParameters = useMemo(() => ({
    ...currentStrategy?.parameters,
    ...customParameters
  }), [currentStrategy, customParameters]);

  const runBacktest = async () => {
    if (!currentStrategy || !selectedSymbol) return;

    setIsRunning(true);
    setError(null);
    setProgress(0);

    try {
      // Simulate backtest progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + Math.random() * 20, 90));
      }, 200);

      // Simulate backtest execution
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));

      clearInterval(progressInterval);
      setProgress(100);

      // Generate mock results
      const result: BacktestResult = {
        id: `backtest_${Date.now()}`,
        strategyId: currentStrategy.id,
        strategyName: currentStrategy.name,
        symbol: selectedSymbol,
        startDate: '2023-01-01',
        endDate: '2024-01-01',
        totalReturn: Math.random() * 40 - 10, // -10% to +30%
        annualizedReturn: Math.random() * 20 - 5,
        sharpeRatio: Math.random() * 2 + 0.5,
        maxDrawdown: -(Math.random() * 20 + 5),
        volatility: Math.random() * 20 + 10,
        winRate: Math.random() * 30 + 45,
        profitFactor: Math.random() * 1 + 0.5,
        trades: Math.floor(Math.random() * 200 + 50),
        equity: Array.from({ length: 252 }, (_, i) => 100 + (i * (Math.random() * 0.5 - 0.1))),
        drawdown: Array.from({ length: 252 }, () => -(Math.random() * 15)),
        dates: Array.from({ length: 252 }, (_, i) => new Date(2023, 0, i + 1).toLocaleDateString()),
        parameters: allParameters,
        timestamp: new Date(),
        status: 'completed'
      };

      setCurrentResult(result);
      setResults(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results
      
      // Cache result
      const cacheKey = `${currentStrategy.id}_${selectedSymbol}_${JSON.stringify(allParameters)}`;
      cacheRef.current.set(cacheKey, { at: Date.now(), result });

      toast.success(`Backtest completed for ${selectedSymbol}`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backtest failed');
      toast.error('Backtest failed');
    } finally {
      setIsRunning(false);
      setProgress(0);
    }
  };

  const resetBacktest = () => {
    setCurrentResult(null);
    setError(null);
    setProgress(0);
    setCustomParameters({});
  };

  const exportResults = () => {
    if (!currentResult) return;
    
    const dataStr = JSON.stringify(currentResult, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backtest_${currentResult.symbol}_${currentResult.strategyId}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Results exported successfully');
  };

  const renderParameterControl = (key: string, value: number) => {
    const min = Math.max(1, Math.floor(value * 0.5));
    const max = Math.floor(value * 2);
    
    return (
      <div key={key} className="space-y-2">
        <Label className="text-xs font-medium capitalize">
          {key.replace(/([A-Z])/g, ' $1').trim()}
        </Label>
        <div className="flex items-center space-x-2">
          <Slider
            value={[allParameters[key] || value]}
            onValueChange={([newValue]) => 
              setCustomParameters(prev => ({ ...prev, [key]: newValue }))
            }
            min={min}
            max={max}
            step={1}
            className="flex-1"
          />
          <Input
            value={allParameters[key] || value}
            onChange={(e) => {
              const numValue = Number(e.target.value);
              if (!isNaN(numValue)) {
                setCustomParameters(prev => ({ ...prev, [key]: numValue }));
              }
            }}
            className="w-20 text-xs"
            min={min}
            max={max}
          />
        </div>
      </div>
    );
  };

  const renderResultsOverview = () => {
    if (!currentResult) return null;

    const metrics = [
      { label: 'Total Return', value: currentResult.totalReturn, format: 'percent', color: currentResult.totalReturn >= 0 ? 'positive' : 'negative' },
      { label: 'Annualized', value: currentResult.annualizedReturn, format: 'percent', color: currentResult.annualizedReturn >= 0 ? 'positive' : 'negative' },
      { label: 'Sharpe Ratio', value: currentResult.sharpeRatio, format: 'number', color: currentResult.sharpeRatio >= 1 ? 'positive' : 'neutral' },
      { label: 'Max Drawdown', value: currentResult.maxDrawdown, format: 'percent', color: 'negative' },
      { label: 'Volatility', value: currentResult.volatility, format: 'percent', color: 'neutral' },
      { label: 'Win Rate', value: currentResult.winRate, format: 'percent', color: currentResult.winRate >= 50 ? 'positive' : 'neutral' },
      { label: 'Profit Factor', value: currentResult.profitFactor, format: 'number', color: currentResult.profitFactor >= 1 ? 'positive' : 'negative' },
      { label: 'Total Trades', value: currentResult.trades, format: 'number', color: 'neutral' }
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map(({ label, value, format, color }) => (
          <div key={label} className="text-center p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={cn("text-lg font-semibold", {
              'text-green-600': color === 'positive',
              'text-red-600': color === 'negative',
              'text-gray-600': color === 'neutral'
            })}>
              {format === 'percent' ? `${value.toFixed(2)}%` : 
               format === 'number' ? value.toFixed(2) : value}
            </p>
          </div>
        ))}
      </div>
    );
  };

  const renderEquityChart = () => {
    if (!currentResult) return null;

    const data = currentResult.equity.map((value, index) => ({
      date: currentResult.dates[index],
      equity: value,
      drawdown: currentResult.drawdown[index]
    }));

    return (
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Equity Curve</h4>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area 
                type="monotone" 
                dataKey="equity" 
                stroke={COLORS.primary} 
                fill={COLORS.primary} 
                fillOpacity={0.3} 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-2">Drawdown</h4>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area 
                type="monotone" 
                dataKey="drawdown" 
                stroke={COLORS.negative} 
                fill={COLORS.negative} 
                fillOpacity={0.3} 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <WidgetWrapper
      widget={widget}
      showActions={true}
      onRefresh={resetBacktest}
      skeletonVariant="chart"
      skeletonHeight={400}
    >
      <div className="p-4 space-y-4">
        {/* Strategy Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Strategy</Label>
          <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STRATEGIES.map(strategy => (
                <SelectItem key={strategy.id} value={strategy.id}>
                  <div className="flex items-center space-x-2">
                    <span>{strategy.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {strategy.complexity}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {currentStrategy && (
            <div className="text-xs text-muted-foreground">
              {currentStrategy.description}
            </div>
          )}
        </div>

        {/* Symbol Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Symbol</Label>
          <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableSymbols.map(symbol => (
                <SelectItem key={symbol} value={symbol}>
                  {symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Parameters */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Parameters</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="h-6 px-2"
            >
              <Settings className="h-3 w-3 mr-1" />
              {showAdvanced ? 'Hide' : 'Show'} Advanced
            </Button>
          </div>
          
          {showAdvanced && currentStrategy && (
            <div className="space-y-4 p-3 bg-muted rounded-lg">
              {Object.entries(currentStrategy.parameters).map(([key, value]) => 
                renderParameterControl(key, value)
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex space-x-2">
          <Button
            onClick={runBacktest}
            disabled={isRunning || !currentStrategy}
            className="flex-1"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Backtest
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={resetBacktest}
            disabled={isRunning}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          
          {currentResult && (
            <Button
              variant="outline"
              onClick={exportResults}
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>

        {/* Progress */}
        {isRunning && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Running backtest...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Results */}
        {currentResult && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="charts">Charts</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-4">
              {renderResultsOverview()}
            </TabsContent>
            
            <TabsContent value="charts" className="mt-4">
              {renderEquityChart()}
            </TabsContent>
            
            <TabsContent value="history" className="mt-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Recent Backtests</h4>
                {results.slice(0, 5).map((result) => (
                  <div key={result.id} className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{result.strategyName}</p>
                        <p className="text-xs text-muted-foreground">
                          {result.symbol} • {result.timestamp.toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={result.totalReturn >= 0 ? 'default' : 'destructive'}>
                        {result.totalReturn >= 0 ? '+' : ''}{result.totalReturn.toFixed(2)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </WidgetWrapper>
  );
}
