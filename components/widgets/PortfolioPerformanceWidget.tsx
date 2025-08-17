'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import type { Widget } from '@/lib/store';

interface PortfolioPerformanceWidgetProps {
  widget: Widget;
  sheetId: string;
}

interface PortfolioHolding {
  symbol: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  sector: string;
  addedAt: Date;
  notes?: string;
}

interface PerformanceData {
  date: string;
  value: number;
  change: number;
}

const MOCK_SECTOR_DATA = {
  'Technology': { color: '#3b82f6', weight: 0.45 },
  'Healthcare': { color: '#10b981', weight: 0.20 },
  'Financial Services': { color: '#f59e0b', weight: 0.15 },
  'Consumer Cyclical': { color: '#ef4444', weight: 0.10 },
  'Energy': { color: '#8b5cf6', weight: 0.10 },
};

const MOCK_PERFORMANCE_DATA: PerformanceData[] = [
  { date: 'Jan', value: 100000, change: 0 },
  { date: 'Feb', value: 102500, change: 2.5 },
  { date: 'Mar', value: 101200, change: -1.3 },
  { date: 'Apr', value: 104800, change: 3.6 },
  { date: 'May', value: 107200, change: 2.3 },
  { date: 'Jun', value: 109800, change: 2.4 },
  { date: 'Jul', value: 112400, change: 2.4 },
  { date: 'Aug', value: 115200, change: 2.5 },
];

export function PortfolioPerformanceWidget({ widget }: Readonly<PortfolioPerformanceWidgetProps>) {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [newSymbol, setNewSymbol] = useState('');
  const [newShares, setNewShares] = useState('');
  const [newAvgPrice, setNewAvgPrice] = useState('');
  const [newSector, setNewSector] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Load portfolio from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('madlab_portfolio');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHoldings(parsed.map((item: any) => ({
          ...item,
          addedAt: new Date(item.addedAt)
        })));
      } catch (e) {
        console.error('Failed to load portfolio:', e);
      }
    } else {
      // Seed with sample portfolio
      const samplePortfolio: PortfolioHolding[] = [
        { symbol: 'AAPL', shares: 100, avgPrice: 150.00, currentPrice: 175.43, sector: 'Technology', addedAt: new Date(), notes: 'Core position' },
        { symbol: 'MSFT', shares: 50, avgPrice: 300.00, currentPrice: 338.11, sector: 'Technology', addedAt: new Date(), notes: 'Cloud leader' },
        { symbol: 'NVDA', shares: 25, avgPrice: 400.00, currentPrice: 485.09, sector: 'Technology', addedAt: new Date(), notes: 'AI momentum' },
        { symbol: 'JPM', shares: 75, avgPrice: 140.00, currentPrice: 145.67, sector: 'Financial Services', addedAt: new Date(), notes: 'Banking exposure' },
        { symbol: 'XOM', shares: 60, avgPrice: 80.00, currentPrice: 82.34, sector: 'Energy', addedAt: new Date(), notes: 'Energy hedge' },
      ];
      setHoldings(samplePortfolio);
      localStorage.setItem('madlab_portfolio', JSON.stringify(samplePortfolio));
    }
  }, []);

  // Save portfolio to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('madlab_portfolio', JSON.stringify(holdings));
  }, [holdings]);

  const addHolding = () => {
    const symbol = newSymbol.trim().toUpperCase();
    const shares = parseFloat(newShares);
    const avgPrice = parseFloat(newAvgPrice);
    const sector = newSector.trim();

    if (!symbol || isNaN(shares) || isNaN(avgPrice) || !sector) return;

    if (holdings.some(h => h.symbol === symbol)) {
      // Already exists
      return;
    }

    const newHolding: PortfolioHolding = {
      symbol,
      shares,
      avgPrice,
      currentPrice: avgPrice, // Start with avg price, will be updated by mock data
      sector,
      addedAt: new Date(),
      notes: newNotes.trim() || undefined
    };

    setHoldings(prev => [...prev, newHolding]);
    setNewSymbol('');
    setNewShares('');
    setNewAvgPrice('');
    setNewSector('');
    setNewNotes('');
  };

  const removeHolding = (symbol: string) => {
    setHoldings(prev => prev.filter(h => h.symbol !== symbol));
  };

  const calculatePortfolioMetrics = () => {
    if (holdings.length === 0) return null;

    const totalCost = holdings.reduce((sum, h) => sum + (h.shares * h.avgPrice), 0);
    const totalValue = holdings.reduce((sum, h) => sum + (h.shares * h.currentPrice), 0);
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = (totalGainLoss / totalCost) * 100;

    const sectorAllocation = holdings.reduce((acc, h) => {
      const value = h.shares * h.currentPrice;
      acc[h.sector] = (acc[h.sector] || 0) + value;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalCost,
      totalValue,
      totalGainLoss,
      totalGainLossPercent,
      sectorAllocation
    };
  };

  const formatCurrency = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const getChangeIcon = (change: number) => {
    return change >= 0 ? 
      <TrendingUp className="w-3 h-3 text-green-600" /> : 
      <TrendingDown className="w-3 h-3 text-red-600" />;
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const metrics = calculatePortfolioMetrics();

  // Prepare pie chart data
  const pieData = metrics ? Object.entries(metrics.sectorAllocation).map(([sector, value]) => ({
    name: sector,
    value,
    color: MOCK_SECTOR_DATA[sector as keyof typeof MOCK_SECTOR_DATA]?.color || '#6b7280'
  })) : [];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Portfolio Performance
          <Badge variant="secondary" className="ml-auto">{holdings.length} holdings</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new holding */}
        <div className="grid grid-cols-5 gap-2">
          <Input
            placeholder="Symbol"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            className="h-8 text-xs"
          />
          <Input
            placeholder="Shares"
            type="number"
            value={newShares}
            onChange={(e) => setNewShares(e.target.value)}
            className="h-8 text-xs"
          />
          <Input
            placeholder="Avg Price"
            type="number"
            step="0.01"
            value={newAvgPrice}
            onChange={(e) => setNewAvgPrice(e.target.value)}
            className="h-8 text-xs"
          />
          <Input
            placeholder="Sector"
            value={newSector}
            onChange={(e) => setNewSector(e.target.value)}
            className="h-8 text-xs"
          />
          <Button onClick={addHolding} size="sm" className="h-8 text-xs">
            <Plus className="w-3 h-3 mr-1" />
            Add
          </Button>
        </div>

        {/* Portfolio Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="holdings">Holdings</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            {metrics && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-muted/30 rounded">
                    <div className="text-xs text-muted-foreground">Total Value</div>
                    <div className="text-lg font-semibold">{formatCurrency(metrics.totalValue)}</div>
                  </div>
                  <div className="p-3 bg-muted/30 rounded">
                    <div className="text-xs text-muted-foreground">Total Cost</div>
                    <div className="text-lg font-semibold">{formatCurrency(metrics.totalCost)}</div>
                  </div>
                  <div className="p-3 bg-muted/30 rounded">
                    <div className="text-xs text-muted-foreground">Total P&L</div>
                    <div className={`text-lg font-semibold ${getChangeColor(metrics.totalGainLoss)}`}>
                      {getChangeIcon(metrics.totalGainLoss)}
                      {formatCurrency(metrics.totalGainLoss)} ({metrics.totalGainLossPercent.toFixed(2)}%)
                    </div>
                  </div>
                </div>

                {/* Sector Allocation Chart */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">Sector Allocation</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [formatCurrency(value), 'Value']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="holdings" className="mt-4">
            {holdings.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Symbol</TableHead>
                      <TableHead className="text-xs">Shares</TableHead>
                      <TableHead className="text-xs">Avg Price</TableHead>
                      <TableHead className="text-xs">Current</TableHead>
                      <TableHead className="text-xs">Market Value</TableHead>
                      <TableHead className="text-xs">P&L</TableHead>
                      <TableHead className="text-xs">Sector</TableHead>
                      <TableHead className="text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holdings.map((holding) => {
                      const marketValue = holding.shares * holding.currentPrice;
                      const costBasis = holding.shares * holding.avgPrice;
                      const gainLoss = marketValue - costBasis;
                      const gainLossPercent = (gainLoss / costBasis) * 100;

                      return (
                        <TableRow key={holding.symbol} className="hover:bg-muted/50">
                          <TableCell className="font-medium text-xs">{holding.symbol}</TableCell>
                          <TableCell className="text-xs">{holding.shares.toLocaleString()}</TableCell>
                          <TableCell className="text-xs">${holding.avgPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-xs">${holding.currentPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-xs">{formatCurrency(marketValue)}</TableCell>
                          <TableCell className="text-xs">
                            <div className={`flex items-center gap-1 ${getChangeColor(gainLoss)}`}>
                              {getChangeIcon(gainLoss)}
                              {formatCurrency(gainLoss)} ({gainLossPercent.toFixed(2)}%)
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="text-xs">{holding.sector}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeHolding(holding.symbol)}
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No holdings yet. Add some above to get started.
              </div>
            )}
          </TabsContent>

          <TabsContent value="performance" className="mt-4">
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Portfolio Performance (YTD)</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={MOCK_PERFORMANCE_DATA}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis fontSize={10} tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Portfolio Value']}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
