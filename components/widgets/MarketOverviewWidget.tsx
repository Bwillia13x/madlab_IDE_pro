'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Widget } from '@/lib/store';

interface MarketOverviewWidgetProps {
  widget: Widget;
  sheetId: string;
}

interface IndexData {
  name: string;
  symbol: string;
  value: number;
  change: number;
  changePercent: number;
}

interface SectorData {
  name: string;
  change: number;
  changePercent: number;
  volume: number;
}

const MAJOR_INDICES: IndexData[] = [
  { name: 'S&P 500', symbol: 'SPX', value: 4567.89, change: 23.45, changePercent: 0.52 },
  { name: 'NASDAQ', symbol: 'NDX', value: 14234.56, change: -12.34, changePercent: -0.09 },
  { name: 'DOW', symbol: 'DJI', value: 34567.89, change: 123.45, changePercent: 0.36 },
  { name: 'RUSSELL 2000', symbol: 'RUT', value: 1890.12, change: -8.76, changePercent: -0.46 },
];

const SECTOR_PERFORMANCE: SectorData[] = [
  { name: 'Technology', change: 1.2, changePercent: 0.85, volume: 1250000000 },
  { name: 'Healthcare', change: -0.8, changePercent: -0.45, volume: 890000000 },
  { name: 'Financial Services', change: 0.5, changePercent: 0.32, volume: 1100000000 },
  { name: 'Consumer Cyclical', change: 1.8, changePercent: 1.25, volume: 750000000 },
  { name: 'Energy', change: -1.2, changePercent: -0.95, volume: 650000000 },
  { name: 'Industrials', change: 0.3, changePercent: 0.18, volume: 820000000 },
  { name: 'Consumer Defensive', change: 0.1, changePercent: 0.08, volume: 450000000 },
  { name: 'Real Estate', change: -0.4, changePercent: -0.28, volume: 380000000 },
];

const MARKET_BREADTH = {
  advancing: 2345,
  declining: 1876,
  unchanged: 234,
  newHighs: 89,
  newLows: 23,
  upVolume: 12500000000,
  downVolume: 8900000000,
};

export function MarketOverviewWidget({ widget }: Readonly<MarketOverviewWidgetProps>) {
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

  const formatVolume = (value: number) => {
    if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    return value.toLocaleString();
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Market Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Major Indices */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Major Indices</h4>
          <div className="grid grid-cols-2 gap-2">
            {MAJOR_INDICES.map((index) => (
              <div key={index.symbol} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                <div>
                  <div className="text-xs font-medium">{index.name}</div>
                  <div className="text-xs text-muted-foreground">{index.symbol}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium">{index.value.toLocaleString()}</div>
                  <div className={`text-xs flex items-center gap-1 ${getChangeColor(index.changePercent)}`}>
                    {getChangeIcon(index.changePercent)}
                    {index.change > 0 ? '+' : ''}{index.change.toFixed(2)} ({index.changePercent.toFixed(2)}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sector Performance */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Sector Performance</h4>
          <div className="space-y-1">
            {SECTOR_PERFORMANCE.slice(0, 6).map((sector) => (
              <div key={sector.name} className="flex items-center justify-between p-1">
                <div className="text-xs">{sector.name}</div>
                <div className="flex items-center gap-2">
                  <div className={`text-xs ${getChangeColor(sector.changePercent)}`}>
                    {sector.changePercent > 0 ? '+' : ''}{sector.changePercent.toFixed(2)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatVolume(sector.volume)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Market Breadth */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Market Breadth</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Advancing:</span>
                <span className="text-green-600 font-medium">{MARKET_BREADTH.advancing.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Declining:</span>
                <span className="text-red-600 font-medium">{MARKET_BREADTH.declining.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Unchanged:</span>
                <span className="text-muted-foreground">{MARKET_BREADTH.unchanged.toLocaleString()}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>New Highs:</span>
                <span className="text-green-600 font-medium">{MARKET_BREADTH.newHighs}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>New Lows:</span>
                <span className="text-red-600 font-medium">{MARKET_BREADTH.newLows}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Adv/Dec Ratio:</span>
                <span className="font-medium">{(MARKET_BREADTH.advancing / MARKET_BREADTH.declining).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Volume Analysis */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Volume Analysis</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Up Volume:</span>
              <span className="text-green-600">{formatVolume(MARKET_BREADTH.upVolume)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Down Volume:</span>
              <span className="text-red-600">{formatVolume(MARKET_BREADTH.downVolume)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Up/Down Ratio:</span>
              <span className="font-medium">{(MARKET_BREADTH.upVolume / MARKET_BREADTH.downVolume).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Data updates every 15 minutes • Mock data for demonstration
        </div>
      </CardContent>
    </Card>
  );
}


