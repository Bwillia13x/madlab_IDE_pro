'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  RefreshCw, 
  Play, 
  Pause, 
  Wifi, 
  WifiOff,
  ChevronRight,
  ChevronLeft,
  Edit,
  Save,
  X
} from 'lucide-react';
import type { Widget } from '@/lib/store';
import { useRealtimePrices, useRealtimeKPIs } from '@/lib/data/useRealtimeData';

interface PortfolioAsset {
  symbol: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  dayChange: number;
  dayChangePercent: number;
  totalCost: number;
  marketValue: number;
  totalReturn: number;
  totalReturnPercent: number;
  lastUpdate: Date;
}

interface MobilePortfolioTrackerProps {
  widget: Widget;
  sheetId: string;
  onTitleChange?: (title: string) => void;
}

export function MobilePortfolioTracker({ 
  widget, 
  sheetId, 
  onTitleChange 
}: MobilePortfolioTrackerProps) {
  const [assets, setAssets] = useState<PortfolioAsset[]>([
    {
      symbol: 'AAPL',
      shares: 100,
      avgPrice: 150.00,
      currentPrice: 175.50,
      dayChange: 2.50,
      dayChangePercent: 1.44,
      totalCost: 15000.00,
      marketValue: 17550.00,
      totalReturn: 2550.00,
      totalReturnPercent: 17.00,
      lastUpdate: new Date(),
    },
    {
      symbol: 'MSFT',
      shares: 50,
      avgPrice: 300.00,
      currentPrice: 325.75,
      dayChange: -1.25,
      dayChangePercent: -0.38,
      totalCost: 15000.00,
      marketValue: 16287.50,
      totalReturn: 1287.50,
      totalReturnPercent: 8.58,
      lastUpdate: new Date(),
    },
    {
      symbol: 'GOOGL',
      shares: 25,
      avgPrice: 2800.00,
      currentPrice: 2950.00,
      dayChange: 25.00,
      dayChangePercent: 0.85,
      totalCost: 70000.00,
      marketValue: 73750.00,
      totalReturn: 3750.00,
      totalReturnPercent: 5.36,
      lastUpdate: new Date(),
    },
  ]);

  const [newAsset, setNewAsset] = useState({ symbol: '', shares: '', avgPrice: '' });
  const [editingAsset, setEditingAsset] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [currentAssetIndex, setCurrentAssetIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const symbols = assets.map(asset => asset.symbol);
  const { prices, isConnected, isRunning, start, stop, error: priceError } = useRealtimePrices(symbols, 2000);
  const { kpis, error: kpiError } = useRealtimeKPIs(symbols, 5000);

  const portfolioRef = useRef<HTMLDivElement>(null);

  // Touch gesture handling for asset navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isHorizontal = Math.abs(distanceX) > Math.abs(distanceY);
    const isLongSwipe = Math.abs(distanceX) > 100;
    
    if (isHorizontal && isLongSwipe) {
      if (distanceX > 0 && currentAssetIndex < assets.length - 1) {
        // Swipe left - next asset
        setCurrentAssetIndex(currentAssetIndex + 1);
      } else if (distanceX < 0 && currentAssetIndex > 0) {
        // Swipe right - previous asset
        setCurrentAssetIndex(currentAssetIndex - 1);
      }
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Update assets with real-time prices
  useEffect(() => {
    if (prices.length > 0) {
      setAssets(prevAssets => 
        prevAssets.map(asset => {
          const priceUpdate = prices.find(p => p.symbol === asset.symbol);
          if (priceUpdate) {
            const newPrice = priceUpdate.close; // Use 'close' instead of 'price'
            const newMarketValue = asset.shares * newPrice;
            const newTotalReturn = newMarketValue - asset.totalCost;
            const newTotalReturnPercent = (newTotalReturn / asset.totalCost) * 100;
            
            return {
              ...asset,
              currentPrice: newPrice,
              marketValue: newMarketValue,
              totalReturn: newTotalReturn,
              totalReturnPercent: newTotalReturnPercent,
              lastUpdate: new Date(),
            };
          }
          return asset;
        })
      );
    }
  }, [prices]);

  // Update assets with real-time KPIs
  useEffect(() => {
    if (kpis.length > 0) {
      setAssets(prevAssets => 
        prevAssets.map(asset => {
          const kpiUpdate = kpis.find(k => k.symbol === asset.symbol);
          if (kpiUpdate) {
            return {
              ...asset,
              dayChange: kpiUpdate.change || asset.dayChange, // Use 'change' instead of 'dayChange'
              dayChangePercent: kpiUpdate.changePercent || asset.dayChangePercent, // Use 'changePercent' instead of 'dayChangePercent'
              lastUpdate: new Date(),
            };
          }
          return asset;
        })
      );
    }
  }, [kpis]);

  // Start real-time updates
  useEffect(() => {
    start();
    return () => stop();
  }, [start, stop]);

  // Portfolio statistics
  const portfolioStats = useMemo(() => {
    let totalCost = 0;
    let totalMarketValue = 0;
    let totalDayChange = 0;
    let totalReturn = 0;
    let lastUpdate: Date | null = null;

    assets.forEach(asset => {
      totalCost += asset.totalCost;
      totalMarketValue += asset.marketValue;
      totalDayChange += asset.dayChange * asset.shares;
      totalReturn += asset.totalReturn;
      if (asset.lastUpdate && (!lastUpdate || asset.lastUpdate > lastUpdate)) {
        lastUpdate = asset.lastUpdate;
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
      lastUpdate,
    };
  }, [assets]);

  // Asset management functions
  const handleAddAsset = () => {
    if (!newAsset.symbol || !newAsset.shares || !newAsset.avgPrice) return;

    const shares = parseFloat(newAsset.shares);
    const avgPrice = parseFloat(newAsset.avgPrice);
    const totalCost = shares * avgPrice;

    const newAssetData: PortfolioAsset = {
      symbol: newAsset.symbol.toUpperCase(),
      shares,
      avgPrice,
      currentPrice: avgPrice,
      dayChange: 0,
      dayChangePercent: 0,
      totalCost,
      marketValue: totalCost,
      totalReturn: 0,
      totalReturnPercent: 0,
      lastUpdate: new Date(),
    };

    setAssets(prev => [...prev, newAssetData]);
    setNewAsset({ symbol: '', shares: '', avgPrice: '' });
    setShowAddForm(false);
  };

  const handleRemoveAsset = (symbol: string) => {
    setAssets(prev => prev.filter(asset => asset.symbol !== symbol));
    if (currentAssetIndex >= assets.length - 1) {
      setCurrentAssetIndex(Math.max(0, assets.length - 2));
    }
  };

  const handleEditAsset = (symbol: string) => {
    setEditingAsset(symbol);
  };

  const handleSaveAsset = (symbol: string, updates: Partial<PortfolioAsset>) => {
    setAssets(prev => 
      prev.map(asset => 
        asset.symbol === symbol 
          ? { ...asset, ...updates, lastUpdate: new Date() }
          : asset
      )
    );
    setEditingAsset(null);
  };

  const handleUpdateShares = (symbol: string, shares: number) => {
    const asset = assets.find(a => a.symbol === symbol);
    if (asset) {
      const totalCost = shares * asset.avgPrice;
      const marketValue = shares * asset.currentPrice;
      const totalReturn = marketValue - totalCost;
      const totalReturnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;

      handleSaveAsset(symbol, {
        shares,
        totalCost,
        marketValue,
        totalReturn,
        totalReturnPercent,
      });
    }
  };

  const handleUpdateAvgPrice = (symbol: string, avgPrice: number) => {
    const asset = assets.find(a => a.symbol === symbol);
    if (asset) {
      const totalCost = asset.shares * avgPrice;
      const totalReturn = asset.marketValue - totalCost;
      const totalReturnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;

      handleSaveAsset(symbol, {
        avgPrice,
        totalCost,
        totalReturn,
        totalReturnPercent,
      });
    }
  };

  // Utility functions
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (assets.length === 0) {
    return (
      <Card className="mobile-widget">
        <CardContent className="mobile-widget-content flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No assets in portfolio</p>
            <Button 
              onClick={() => setShowAddForm(true)} 
              className="mt-2"
              size="sm"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Asset
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentAsset = assets[currentAssetIndex];

  return (
    <Card className="mobile-widget">
      <CardHeader className="mobile-widget-header">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="mobile-card-title flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {widget.title}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">
                {currentAssetIndex + 1} of {assets.length}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentAssetIndex(Math.max(0, currentAssetIndex - 1))}
                  disabled={currentAssetIndex === 0}
                  className="h-6 w-6 p-0"
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentAssetIndex(Math.min(assets.length - 1, currentAssetIndex + 1))}
                  disabled={currentAssetIndex === assets.length - 1}
                  className="h-6 w-6 p-0"
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant={isConnected ? "default" : "destructive"}
              className="text-xs"
            >
              {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isConnected ? 'Live' : 'Offline'}
            </Badge>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
              className="h-8 w-8 p-0"
              title="Add Asset"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="mobile-widget-content space-y-4">
        {/* Portfolio Summary */}
        <div className="mobile-card bg-muted/20 p-3 rounded-lg">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="text-center">
              <div className="text-muted-foreground">Total Value</div>
              <div className="font-semibold">{formatCurrency(portfolioStats.totalMarketValue)}</div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">Total Return</div>
              <div className={`font-semibold ${portfolioStats.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(portfolioStats.totalReturn)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">Day Change</div>
              <div className={`font-semibold ${portfolioStats.totalDayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(portfolioStats.totalDayChange)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">Return %</div>
              <div className={`font-semibold ${portfolioStats.totalReturnPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercent(portfolioStats.totalReturnPercent)}
              </div>
            </div>
          </div>
        </div>

        {/* Add Asset Form */}
        {showAddForm && (
          <div className="mobile-card bg-muted/20 p-3 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Add New Asset</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="Symbol"
                value={newAsset.symbol}
                onChange={(e) => setNewAsset(prev => ({ ...prev, symbol: e.target.value }))}
                className="text-xs h-8"
              />
              <Input
                placeholder="Shares"
                type="number"
                value={newAsset.shares}
                onChange={(e) => setNewAsset(prev => ({ ...prev, shares: e.target.value }))}
                className="text-xs h-8"
              />
              <Input
                placeholder="Avg Price"
                type="number"
                step="0.01"
                value={newAsset.avgPrice}
                onChange={(e) => setNewAsset(prev => ({ ...prev, avgPrice: e.target.value }))}
                className="text-xs h-8"
              />
            </div>
            
            <Button 
              onClick={handleAddAsset} 
              className="w-full h-8 text-xs"
              disabled={!newAsset.symbol || !newAsset.shares || !newAsset.avgPrice}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Asset
            </Button>
          </div>
        )}

        {/* Current Asset Card */}
        <div 
          ref={portfolioRef}
          className="mobile-card p-4 space-y-3"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">{currentAsset.symbol}</h3>
              <p className="text-sm text-muted-foreground">
                {currentAsset.shares} shares @ {formatCurrency(currentAsset.avgPrice)}
              </p>
            </div>
            
            <div className="text-right">
              <div className="text-lg font-semibold">{formatCurrency(currentAsset.currentPrice)}</div>
              <div className={`text-sm ${currentAsset.dayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {currentAsset.dayChange >= 0 ? <TrendingUp className="h-3 w-3 inline mr-1" /> : <TrendingDown className="h-3 w-3 inline mr-1" />}
                {formatCurrency(Math.abs(currentAsset.dayChange))} ({formatPercent(currentAsset.dayChangePercent)})
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground">Market Value</div>
              <div className="font-medium">{formatCurrency(currentAsset.marketValue)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Total Return</div>
              <div className={`font-medium ${currentAsset.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(currentAsset.totalReturn)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Return %</div>
              <div className={`font-medium ${currentAsset.totalReturnPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercent(currentAsset.totalReturnPercent)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Last Update</div>
              <div className="font-medium">{formatTime(currentAsset.lastUpdate)}</div>
            </div>
          </div>

          {/* Asset Actions */}
          <div className="flex items-center gap-2 pt-2 border-t">
            {editingAsset === currentAsset.symbol ? (
              <div className="flex items-center gap-2 w-full">
                <Input
                  type="number"
                  value={currentAsset.shares}
                  onChange={(e) => handleUpdateShares(currentAsset.symbol, parseFloat(e.target.value) || 0)}
                  className="text-xs h-7 flex-1"
                />
                <Input
                  type="number"
                  step="0.01"
                  value={currentAsset.avgPrice}
                  onChange={(e) => handleUpdateAvgPrice(currentAsset.symbol, parseFloat(e.target.value) || 0)}
                  className="text-xs h-7 flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingAsset(null)}
                  className="h-7 px-2 text-xs"
                >
                  <Save className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditAsset(currentAsset.symbol)}
                  className="h-7 px-2 text-xs flex-1"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveAsset(currentAsset.symbol)}
                  className="h-7 px-2 text-xs"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Touch Instructions */}
        <div className="text-xs text-muted-foreground text-center p-2 bg-muted/20 rounded">
          <p>💡 <strong>Touch Controls:</strong></p>
          <p>• Swipe left/right to navigate assets</p>
          <p>• Use arrow buttons for precise navigation</p>
          <p>• Tap edit to modify asset details</p>
        </div>
      </CardContent>
    </Card>
  );
}