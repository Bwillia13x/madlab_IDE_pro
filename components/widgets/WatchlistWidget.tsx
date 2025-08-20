'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Widget } from '@/lib/store';
import { usePeerKpis } from '@/lib/data/hooks';

interface WatchlistWidgetProps {
  widget: Widget;
  sheetId: string;
}

interface WatchlistItem {
  symbol: string;
  addedAt: Date;
  notes?: string;
}

interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
}

const MOCK_STOCK_DATA: Record<string, StockData> = {
  'AAPL': { symbol: 'AAPL', price: 175.43, change: 2.15, changePercent: 1.24, volume: 45678900, marketCap: 2750000000000 },
  'MSFT': { symbol: 'MSFT', price: 338.11, change: -1.23, changePercent: -0.36, volume: 23456700, marketCap: 2510000000000 },
  'GOOGL': { symbol: 'GOOGL', price: 142.56, change: 0.89, changePercent: 0.63, volume: 34567800, marketCap: 1790000000000 },
  'AMZN': { symbol: 'AMZN', price: 145.24, change: 3.45, changePercent: 2.43, volume: 56789000, marketCap: 1510000000000 },
  'TSLA': { symbol: 'TSLA', price: 248.50, change: -5.67, changePercent: -2.23, volume: 78901200, marketCap: 789000000000 },
  'NVDA': { symbol: 'NVDA', price: 485.09, change: 12.34, changePercent: 2.61, volume: 45678900, marketCap: 1198000000000 },
  'META': { symbol: 'META', price: 334.92, change: 4.56, changePercent: 1.38, volume: 23456700, marketCap: 851000000000 },
  'BRK.A': { symbol: 'BRK.A', price: 523000, change: 1500, changePercent: 0.29, volume: 1234, marketCap: 745000000000 },
};

export function WatchlistWidget({ widget: _widget }: Readonly<WatchlistWidgetProps>) {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [newSymbol, setNewSymbol] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Load watchlist from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('madlab_watchlist');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setWatchlist(parsed.map((item: WatchlistItem) => ({
          ...item,
          addedAt: new Date(item.addedAt)
        })));
      } catch (e) {
        console.error('Failed to load watchlist:', e);
      }
    } else {
      // Seed with some default stocks
      const defaultWatchlist: WatchlistItem[] = [
        { symbol: 'AAPL', addedAt: new Date(), notes: 'Core holding' },
        { symbol: 'MSFT', addedAt: new Date(), notes: 'Cloud leader' },
        { symbol: 'NVDA', addedAt: new Date(), notes: 'AI momentum' },
      ];
      setWatchlist(defaultWatchlist);
      localStorage.setItem('madlab_watchlist', JSON.stringify(defaultWatchlist));
    }
  }, []);

  // Save watchlist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('madlab_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  const addToWatchlist = () => {
    const symbol = newSymbol.trim().toUpperCase();
    if (!symbol) return;
    
    if (watchlist.some(item => item.symbol === symbol)) {
      // Already exists
      return;
    }

    const newItem: WatchlistItem = {
      symbol,
      addedAt: new Date(),
      notes: newNotes.trim() || undefined
    };

    setWatchlist(prev => [...prev, newItem]);
    setNewSymbol('');
    setNewNotes('');
  };

  const removeFromWatchlist = (symbol: string) => {
    setWatchlist(prev => prev.filter(item => item.symbol !== symbol));
  };

  // Fetch KPI data for symbols in the watchlist (fallback to mock when missing)
  const symbols = watchlist.map((w) => w.symbol);
  const { data: peerData } = usePeerKpis(symbols);

  const getStockData = (symbol: string): StockData | null => {
    const k = peerData?.[symbol];
    if (k) {
      return {
        symbol,
        price: k.price,
        change: k.change,
        changePercent: k.changePercent,
        volume: k.volume,
        marketCap: k.marketCap,
      } as StockData;
    }
    return MOCK_STOCK_DATA[symbol] || null;
  };

  const formatCurrency = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toFixed(0)}`;
  };

  const getChangeIcon = (change: number) => {
    if (Math.abs(change) < 0.01) return <Minus className="w-3 h-3 text-muted-foreground" />;
    return change > 0 ? 
      <TrendingUp className="w-3 h-3 text-green-600" /> : 
      <TrendingDown className="w-3 h-3 text-red-600" />;
  };

  const getChangeColor = (change: number) => {
    if (Math.abs(change) < 0.01) return 'text-muted-foreground';
    return change > 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          Watchlist
          <Badge variant="secondary" className="ml-auto">{watchlist.length} stocks</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new stock */}
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1">
            <Input
              placeholder="Symbol (e.g., AAPL)"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addToWatchlist()}
              className="h-8 text-xs"
            />
          </div>
          <div className="col-span-1">
            <Input
              placeholder="Notes (optional)"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addToWatchlist()}
              className="h-8 text-xs"
            />
          </div>
          <div className="col-span-1">
            <Button onClick={addToWatchlist} size="sm" className="h-8 text-xs w-full">
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {/* Watchlist table */}
        {watchlist.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Symbol</TableHead>
                  <TableHead className="text-xs">Price</TableHead>
                  <TableHead className="text-xs">Change</TableHead>
                  <TableHead className="text-xs">Market Cap</TableHead>
                  <TableHead className="text-xs">Notes</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {watchlist.map((item) => {
                  const stockData = getStockData(item.symbol);
                  return (
                    <TableRow key={item.symbol} className="hover:bg-muted/50">
                      <TableCell className="font-medium text-xs">{item.symbol}</TableCell>
                      <TableCell className="text-xs">
                        {stockData ? `$${stockData.price.toFixed(2)}` : 'N/A'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {stockData ? (
                          <div className={`flex items-center gap-1 ${getChangeColor(stockData.changePercent)}`}>
                            {getChangeIcon(stockData.changePercent)}
                            {stockData.change.toFixed(2)} ({stockData.changePercent.toFixed(2)}%)
                          </div>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {stockData ? formatCurrency(stockData.marketCap) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-xs max-w-24 truncate" title={item.notes}>
                        {item.notes || '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromWatchlist(item.symbol)}
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
            No stocks in watchlist. Add some above to get started.
          </div>
        )}

        {/* Summary stats */}
        {watchlist.length > 0 && (
          <div className="grid grid-cols-3 gap-4 pt-2 border-t">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Gainers</div>
              <div className="text-sm font-medium text-green-600">
                {watchlist.filter(item => {
                  const data = getStockData(item.symbol);
                  return data && data.changePercent > 0;
                }).length}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Losers</div>
              <div className="text-sm font-medium text-red-600">
                {watchlist.filter(item => {
                  const data = getStockData(item.symbol);
                  return data && data.changePercent < 0;
                }).length}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Unchanged</div>
              <div className="text-sm font-medium text-muted-foreground">
                {watchlist.filter(item => {
                  const data = getStockData(item.symbol);
                  return data && Math.abs(data.changePercent) < 0.01;
                }).length}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

