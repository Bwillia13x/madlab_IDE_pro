'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Widget } from '@/lib/store';
import { Search, Filter, Download, Eye, TrendingUp, TrendingDown } from 'lucide-react';

interface ScreenerWidgetProps {
  widget: Widget;
  sheetId: string;
}

interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  pe: number;
  sector: string;
}

const MOCK_STOCKS: StockData[] = [
  { symbol: 'AAPL', price: 175.43, change: 2.15, changePercent: 1.24, volume: 45678900, marketCap: 2750000000000, pe: 28.5, sector: 'Technology' },
  { symbol: 'MSFT', price: 338.11, change: -1.23, changePercent: -0.36, volume: 23456700, marketCap: 2510000000000, pe: 32.1, sector: 'Technology' },
  { symbol: 'GOOGL', price: 142.56, change: 0.89, changePercent: 0.63, volume: 34567800, marketCap: 1790000000000, pe: 25.8, sector: 'Technology' },
  { symbol: 'AMZN', price: 145.24, change: 3.45, changePercent: 2.43, volume: 56789000, marketCap: 1510000000000, pe: 45.2, sector: 'Consumer Cyclical' },
  { symbol: 'TSLA', price: 248.50, change: -5.67, changePercent: -2.23, volume: 78901200, marketCap: 789000000000, pe: 67.3, sector: 'Automotive' },
  { symbol: 'NVDA', price: 485.09, change: 12.34, changePercent: 2.61, volume: 45678900, marketCap: 1198000000000, pe: 89.2, sector: 'Technology' },
  { symbol: 'META', price: 334.92, change: 4.56, changePercent: 1.38, volume: 23456700, marketCap: 851000000000, pe: 23.4, sector: 'Technology' },
  { symbol: 'BRK.A', price: 523000, change: 1500, changePercent: 0.29, volume: 1234, marketCap: 745000000000, pe: 8.9, sector: 'Financial Services' },
];

const SECTORS = ['Technology', 'Healthcare', 'Financial Services', 'Consumer Cyclical', 'Energy', 'Industrials', 'Consumer Defensive', 'Real Estate', 'Utilities', 'Communication Services'];

export function ScreenerWidget({ widget: _widget }: Readonly<ScreenerWidgetProps>) {
  const [filters, setFilters] = useState({
    search: '',
    sector: '',
    minPrice: '',
    maxPrice: '',
    minMarketCap: '',
    maxPE: '',
    minVolume: '',
  });

  const [activeTab, setActiveTab] = useState('results');
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const filteredStocks = useMemo(() => {
    return MOCK_STOCKS.filter(stock => {
      if (filters.search && !stock.symbol.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.sector && stock.sector !== filters.sector) return false;
      if (filters.minPrice && stock.price < parseFloat(filters.minPrice)) return false;
      if (filters.maxPrice && stock.price > parseFloat(filters.maxPrice)) return false;
      if (filters.minMarketCap && stock.marketCap < parseFloat(filters.minMarketCap) * 1e9) return false;
      if (filters.maxPE && stock.pe > parseFloat(filters.maxPE)) return false;
      if (filters.minVolume && stock.volume < parseFloat(filters.minVolume) * 1e6) return false;
      return true;
    });
  }, [filters]);

  const clearFilters = () => {
    setFilters({
      search: '',
      sector: '',
      minPrice: '',
      maxPrice: '',
      minMarketCap: '',
      maxPE: '',
      minVolume: '',
    });
  };

  const formatCurrency = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toFixed(0)}`;
  };

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    return value.toLocaleString();
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Search className="w-4 h-4" />
          Stock Screener
          <Badge variant="secondary" className="ml-auto">{filteredStocks.length} results</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label htmlFor="search" className="text-xs">Symbol</Label>
            <Input
              id="search"
              placeholder="AAPL, MSFT..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="h-8 text-xs"
            />
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="sector" className="text-xs">Sector</Label>
            <Select value={filters.sector} onValueChange={(value) => setFilters(prev => ({ ...prev, sector: value }))}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All Sectors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Sectors</SelectItem>
                {SECTORS.map(sector => (
                  <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="minPrice" className="text-xs">Min Price</Label>
            <Input
              id="minPrice"
              type="number"
              placeholder="0"
              value={filters.minPrice}
              onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="maxPrice" className="text-xs">Max Price</Label>
            <Input
              id="maxPrice"
              type="number"
              placeholder="1000"
              value={filters.maxPrice}
              onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="minMarketCap" className="text-xs">Min Market Cap (B)</Label>
            <Input
              id="minMarketCap"
              type="number"
              placeholder="1"
              value={filters.minMarketCap}
              onChange={(e) => setFilters(prev => ({ ...prev, minMarketCap: e.target.value }))}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="maxPE" className="text-xs">Max P/E</Label>
            <Input
              id="maxPE"
              type="number"
              placeholder="50"
              value={filters.maxPE}
              onChange={(e) => setFilters(prev => ({ ...prev, maxPE: e.target.value }))}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="minVolume" className="text-xs">Min Volume (M)</Label>
            <Input
              id="minVolume"
              type="number"
              placeholder="10"
              value={filters.minVolume}
              onChange={(e) => setFilters(prev => ({ ...prev, minVolume: e.target.value }))}
              className="h-8 text-xs"
            />
          </div>

          <div className="flex items-end gap-2">
            <Button onClick={clearFilters} variant="outline" size="sm" className="h-8 text-xs">
              <Filter className="w-3 h-3 mr-1" />
              Clear
            </Button>
            <Button size="sm" className="h-8 text-xs">
              <Download className="w-3 h-3 mr-1" />
              Export
            </Button>
          </div>
        </div>

        {/* Results Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="results">Results ({filteredStocks.length})</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="mt-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Symbol</TableHead>
                    <TableHead className="text-xs">Price</TableHead>
                    <TableHead className="text-xs">Change</TableHead>
                    <TableHead className="text-xs">Volume</TableHead>
                    <TableHead className="text-xs">Market Cap</TableHead>
                    <TableHead className="text-xs">P/E</TableHead>
                    <TableHead className="text-xs">Sector</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStocks.map((stock) => (
                    <TableRow key={stock.symbol} className="hover:bg-muted/50">
                      <TableCell className="font-medium text-xs">{stock.symbol}</TableCell>
                      <TableCell className="text-xs">${stock.price.toFixed(2)}</TableCell>
                      <TableCell className="text-xs">
                        <div className={`flex items-center gap-1 ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {stock.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{formatVolume(stock.volume)}</TableCell>
                      <TableCell className="text-xs">{formatCurrency(stock.marketCap)}</TableCell>
                      <TableCell className="text-xs">{stock.pe.toFixed(1)}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-xs">{stock.sector}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedStock(stock.symbol);
                            setActiveTab('preview');
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            {selectedStock ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Preview: {selectedStock}</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('results')}
                    className="h-6 text-xs"
                  >
                    Back to Results
                  </Button>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="text-sm text-muted-foreground">
                    Chart preview would go here for {selectedStock}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Integration with charting widgets coming soon
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Select a stock from results to preview
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}