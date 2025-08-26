'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import type { Widget } from '@/lib/store';
import { usePeerKpis } from '@/lib/data/hooks';
import { usePositionsLedger } from '@/lib/trading/positions';
import { useWorkspaceStore } from '@/lib/store';

interface PortfolioPerformanceWidgetProps {
  widget: Widget;
  sheetId: string;
}

interface PerformanceData {
  date: string;
  value: number;
  change: number;
}

const SECTOR_COLORS: Record<string, string> = {
  'Technology': '#3b82f6',
  'Healthcare': '#10b981',
  'Financial Services': '#f59e0b',
  'Consumer Cyclical': '#ef4444',
  'Energy': '#8b5cf6',
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

export function PortfolioPerformanceWidget({ widget: _widget }: Readonly<PortfolioPerformanceWidgetProps>) {
  const [activeTab, setActiveTab] = useState('overview');
  const { cash, positions, hydrateFromStore, markSymbol } = usePositionsLedger();

  // Hydrate from persisted store on mount
  useEffect(() => {
    hydrateFromStore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const symbols = useMemo(() => Object.keys(positions), [positions]);
  const { data: kpisMap } = usePeerKpis(symbols);

  // Update marks based on KPI price
  useEffect(() => {
    if (!kpisMap) return;
    for (const sym of Object.keys(kpisMap)) {
      const px = kpisMap[sym]?.price;
      if (typeof px === 'number' && !Number.isNaN(px)) {
        markSymbol(sym, px);
      }
    }
  }, [kpisMap, markSymbol]);

  const metrics = useMemo(() => {
    const positionList = Object.values(positions);
    const totalMarketValue = positionList.reduce((sum, p) => sum + p.marketValue, 0);
    const totalValue = totalMarketValue + cash;
    const dayPnl = positionList.reduce((sum, p) => {
      const k = kpisMap?.[p.symbol];
      if (!k) return sum;
      const changePerShare = k.change ?? 0;
      return sum + changePerShare * p.quantity;
    }, 0);
    const priorValue = totalValue - dayPnl;
    const dayPct = priorValue !== 0 ? (dayPnl / priorValue) * 100 : 0;

    // Sector allocation (best effort; if sector unknown, bucket as Other)
    const sectorAllocation: Record<string, number> = {};
    for (const p of positionList) {
      const sector = inferSector(p.symbol);
      sectorAllocation[sector] = (sectorAllocation[sector] || 0) + Math.abs(p.marketValue);
    }

    return {
      cash,
      totalMarketValue,
      totalValue,
      dayPnl,
      dayPct,
      sectorAllocation,
      positions: positionList,
    };
  }, [positions, cash, kpisMap]);

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

  const pieData = Object.entries(metrics.sectorAllocation).map(([sector, value]) => ({
    name: sector,
    value,
    color: SECTOR_COLORS[sector] || '#6b7280'
  }));

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Portfolio Performance
          <Badge variant="secondary" className="ml-auto">{metrics.positions.length} positions</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Portfolio Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="holdings">Holdings</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            {(
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-muted/30 rounded">
                    <div className="text-xs text-muted-foreground">Total Value</div>
                    <div className="text-lg font-semibold">{formatCurrency(metrics.totalValue)}</div>
                  </div>
                  <div className="p-3 bg-muted/30 rounded">
                    <div className="text-xs text-muted-foreground">Cash</div>
                    <div className="text-lg font-semibold">{formatCurrency(metrics.cash)}</div>
                  </div>
                  <div className="p-3 bg-muted/30 rounded">
                    <div className="text-xs text-muted-foreground">Day P&L</div>
                    <div className={`text-lg font-semibold ${getChangeColor(metrics.dayPnl)}`}>
                      {getChangeIcon(metrics.dayPnl)}
                      {formatCurrency(metrics.dayPnl)} ({metrics.dayPct.toFixed(2)}%)
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
            {metrics.positions.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Symbol</TableHead>
                      <TableHead className="text-xs">Quantity</TableHead>
                      <TableHead className="text-xs">Avg Price</TableHead>
                      <TableHead className="text-xs">Last</TableHead>
                      <TableHead className="text-xs">Market Value</TableHead>
                      <TableHead className="text-xs">P&L</TableHead>
                      <TableHead className="text-xs">Side</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.positions.map((pos) => {
                      const gainLoss = pos.unrealizedPnL + pos.realizedPnL;
                      const costBasis = Math.abs(pos.quantity) * pos.averagePrice;
                      const gainLossPercent = costBasis !== 0 ? (gainLoss / costBasis) * 100 : 0;
                      return (
                        <TableRow key={pos.symbol} className="hover:bg-muted/50">
                          <TableCell className="font-medium text-xs">{pos.symbol}</TableCell>
                          <TableCell className="text-xs">{pos.quantity.toLocaleString()}</TableCell>
                          <TableCell className="text-xs">${pos.averagePrice.toFixed(2)}</TableCell>
                          <TableCell className="text-xs">${pos.marketPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-xs">{formatCurrency(pos.marketValue)}</TableCell>
                          <TableCell className="text-xs">
                            <div className={`flex items-center gap-1 ${getChangeColor(gainLoss)}`}>
                              {getChangeIcon(gainLoss)}
                              {formatCurrency(gainLoss)} ({gainLossPercent.toFixed(2)}%)
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="text-xs">{pos.side.toUpperCase()}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No positions yet. Submit an order in the Paper Trading Console to get started.
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

function inferSector(_symbol: string): string {
  // Placeholder sector inference; real implementation would query fundamentals
  return 'Technology';
}
