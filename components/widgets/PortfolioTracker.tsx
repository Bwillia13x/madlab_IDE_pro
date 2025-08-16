'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Activity, RefreshCw } from 'lucide-react';
import type { Widget } from '@/lib/store';
import { useKpis } from '@/lib/data/hooks';

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
}

interface PortfolioTrackerProps {
  widget: Widget;
  sheetId: string;
  onTitleChange?: (title: string) => void;
}

export function PortfolioTracker({ widget, sheetId, onTitleChange }: PortfolioTrackerProps) {
  const [assets, setAssets] = useState<PortfolioAsset[]>([
    { symbol: 'AAPL', shares: 100, avgPrice: 150.00 },
    { symbol: 'MSFT', shares: 50, avgPrice: 300.00 },
    { symbol: 'GOOGL', shares: 25, avgPrice: 2800.00 },
  ]);
  const [newSymbol, setNewSymbol] = useState('');
  const [newShares, setNewShares] = useState('');
  const [newAvgPrice, setNewAvgPrice] = useState('');

  // Fetch real-time data for all assets
  const assetData = assets.map(asset => {
    const { data, loading, error } = useKpis(asset.symbol);
    return { asset, data, loading, error };
  });

  // Calculate portfolio statistics
  const portfolioStats = useMemo(() => {
    let totalCost = 0;
    let totalMarketValue = 0;
    let totalDayChange = 0;
    let totalReturn = 0;

    assets.forEach((asset, index) => {
      const data = assetData[index]?.data;
      if (data) {
        const cost = asset.shares * asset.avgPrice;
        const marketValue = asset.shares * data.price;
        const dayChange = asset.shares * data.change;
        const totalReturnForAsset = marketValue - cost;

        totalCost += cost;
        totalMarketValue += marketValue;
        totalDayChange += dayChange;
        totalReturn += totalReturnForAsset;
      }
    });

    const totalReturnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;
    const dayChangePercent = totalMarketValue > 0 ? (totalDayChange / totalMarketValue) * 100 : 0;

    return {
      totalCost,
      totalMarketValue,
      totalDayChange,
      totalReturn,
      totalReturnPercent,
      dayChangePercent,
    };
  }, [assets, assetData]);

  // Enhanced assets with real-time data
  const enhancedAssets = useMemo(() => {
    return assets.map((asset, index) => {
      const data = assetData[index]?.data;
      if (!data) return asset;

      const currentPrice = data.price;
      const marketValue = asset.shares * currentPrice;
      const totalReturn = marketValue - (asset.shares * asset.avgPrice);
      const totalReturnPercent = ((currentPrice - asset.avgPrice) / asset.avgPrice) * 100;
      const dayChange = asset.shares * data.change;
      const dayChangePercent = data.changePercent;

      return {
        ...asset,
        currentPrice,
        marketValue,
        totalReturn,
        totalReturnPercent,
        dayChange,
        dayChangePercent,
      };
    });
  }, [assets, assetData]);

  const handleAddAsset = () => {
    if (!newSymbol || !newShares || !newAvgPrice) return;

    const symbol = newSymbol.toUpperCase().trim();
    const shares = parseFloat(newShares);
    const avgPrice = parseFloat(newAvgPrice);

    if (isNaN(shares) || isNaN(avgPrice) || shares <= 0 || avgPrice <= 0) return;

    // Check if asset already exists
    if (assets.some(asset => asset.symbol === symbol)) {
      alert('Asset already exists in portfolio');
      return;
    }

    const newAsset: PortfolioAsset = { symbol, shares, avgPrice };
    setAssets(prev => [...prev, newAsset]);

    // Clear form
    setNewSymbol('');
    setNewShares('');
    setNewAvgPrice('');
  };

  const handleRemoveAsset = (symbol: string) => {
    setAssets(prev => prev.filter(asset => asset.symbol !== symbol));
  };

  const handleUpdateShares = (symbol: string, newShares: number) => {
    setAssets(prev => prev.map(asset => 
      asset.symbol === symbol ? { ...asset, shares: newShares } : asset
    ));
  };

  const handleUpdateAvgPrice = (symbol: string, newAvgPrice: number) => {
    setAssets(prev => prev.map(asset => 
      asset.symbol === symbol ? { ...asset, avgPrice: newAvgPrice } : asset
    ));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatShares = (value: number) => {
    return value.toLocaleString();
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {widget.title}
            </CardTitle>
            {portfolioStats && (
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
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 px-2">
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Portfolio Summary */}
        {portfolioStats && (
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
              <div className="text-muted-foreground">Day Change</div>
              <div className={`font-medium ${portfolioStats.totalDayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(Math.abs(portfolioStats.totalDayChange))} ({formatPercent(portfolioStats.dayChangePercent)})
              </div>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded">
              <div className="text-muted-foreground">Total Return</div>
              <div className={`font-medium ${portfolioStats.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(Math.abs(portfolioStats.totalReturn))} ({formatPercent(portfolioStats.totalReturnPercent)})
              </div>
            </div>
          </div>
        )}

        {/* Add Asset Form */}
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label htmlFor="symbol" className="text-xs">Symbol</Label>
                <Input
                  id="symbol"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  placeholder="AAPL"
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="shares" className="text-xs">Shares</Label>
                <Input
                  id="shares"
                  type="number"
                  value={newShares}
                  onChange={(e) => setNewShares(e.target.value)}
                  placeholder="100"
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="avgPrice" className="text-xs">Avg Price</Label>
                <Input
                  id="avgPrice"
                  type="number"
                  step="0.01"
                  value={newAvgPrice}
                  onChange={(e) => setNewAvgPrice(e.target.value)}
                  placeholder="150.00"
                  className="mt-1"
                />
              </div>
              <Button onClick={handleAddAsset} size="sm" className="mb-0.5">
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Assets Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Symbol</TableHead>
                <TableHead className="text-xs">Shares</TableHead>
                <TableHead className="text-xs">Avg Price</TableHead>
                <TableHead className="text-xs">Current</TableHead>
                <TableHead className="text-xs">Market Value</TableHead>
                <TableHead className="text-xs">Day Change</TableHead>
                <TableHead className="text-xs">Total Return</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enhancedAssets.map((asset) => (
                <TableRow key={asset.symbol}>
                  <TableCell className="font-medium text-xs">{asset.symbol}</TableCell>
                  <TableCell className="text-xs">
                    <Input
                      type="number"
                      value={asset.shares}
                      onChange={(e) => handleUpdateShares(asset.symbol, parseFloat(e.target.value) || 0)}
                      className="h-6 w-16 text-xs"
                    />
                  </TableCell>
                  <TableCell className="text-xs">
                    <Input
                      type="number"
                      step="0.01"
                      value={asset.avgPrice}
                      onChange={(e) => handleUpdateAvgPrice(asset.symbol, parseFloat(e.target.value) || 0)}
                      className="h-6 w-20 text-xs"
                    />
                  </TableCell>
                  <TableCell className="text-xs">
                    {asset.currentPrice ? formatCurrency(asset.currentPrice) : '—'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {asset.marketValue ? formatCurrency(asset.marketValue) : '—'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {asset.dayChange !== undefined ? (
                      <div className={`flex items-center gap-1 ${asset.dayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {asset.dayChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {formatCurrency(Math.abs(asset.dayChange))} ({formatPercent(asset.dayChangePercent || 0)})
                      </div>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {asset.totalReturn !== undefined ? (
                      <div className={`flex items-center gap-1 ${asset.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {asset.totalReturn >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {formatCurrency(Math.abs(asset.totalReturn))} ({formatPercent(asset.totalReturnPercent || 0)})
                      </div>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAsset(asset.symbol)}
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Portfolio Allocation Chart Placeholder */}
        <div className="border rounded-lg p-4 bg-muted/20">
          <div className="text-center text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Portfolio Allocation Chart</p>
            <p className="text-xs">Pie chart visualization will be implemented</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}