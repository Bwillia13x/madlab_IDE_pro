'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Zap } from 'lucide-react';
import { useWorkspaceStore } from '@/lib/store';
import { useKpis } from '@/lib/data/hooks';
import type { Widget } from '@/lib/store';

interface OptionsDashboardWidgetProps {
  widget: Widget;
  sheetId: string;
}

interface OptionContract {
  symbol: string;
  strike: number;
  expiry: string;
  type: 'call' | 'put';
  bid: number;
  ask: number;
  last: number;
  volume: number;
  openInterest: number;
  impliedVol: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

interface PnLData {
  price: number;
  pnl: number;
}

const MOCK_OPTIONS_DATA: OptionContract[] = [
  // AAPL calls
  { symbol: 'AAPL', strike: 170, expiry: '2024-12-20', type: 'call', bid: 8.50, ask: 8.65, last: 8.60, volume: 1250, openInterest: 3450, impliedVol: 0.28, delta: 0.65, gamma: 0.023, theta: -0.045, vega: 0.156 },
  { symbol: 'AAPL', strike: 175, expiry: '2024-12-20', type: 'call', bid: 4.20, ask: 4.35, last: 4.30, volume: 890, openInterest: 2890, impliedVol: 0.30, delta: 0.45, gamma: 0.028, theta: -0.052, vega: 0.178 },
  { symbol: 'AAPL', strike: 180, expiry: '2024-12-20', type: 'call', bid: 1.15, ask: 1.25, last: 1.20, volume: 567, openInterest: 1560, impliedVol: 0.32, delta: 0.25, gamma: 0.025, theta: -0.048, vega: 0.142 },
  
  // AAPL puts
  { symbol: 'AAPL', strike: 170, expiry: '2024-12-20', type: 'put', bid: 2.80, ask: 2.95, last: 2.90, volume: 432, openInterest: 1230, impliedVol: 0.29, delta: -0.35, gamma: 0.023, theta: -0.043, vega: 0.158 },
  { symbol: 'AAPL', strike: 175, expiry: '2024-12-20', type: 'put', bid: 4.10, ask: 4.25, last: 4.20, volume: 678, openInterest: 1890, impliedVol: 0.31, delta: -0.55, gamma: 0.028, theta: -0.050, vega: 0.180 },
  { symbol: 'AAPL', strike: 180, expiry: '2024-12-20', type: 'put', bid: 6.20, ask: 6.35, last: 6.30, volume: 345, openInterest: 980, impliedVol: 0.33, delta: -0.75, gamma: 0.025, theta: -0.046, vega: 0.144 },
];

const MOCK_PNL_DATA: PnLData[] = [
  { price: 160, pnl: -1500 },
  { price: 165, pnl: -800 },
  { price: 170, pnl: -200 },
  { price: 175, pnl: 300 },
  { price: 180, pnl: 800 },
  { price: 185, pnl: 1300 },
  { price: 190, pnl: 1800 },
];

export function OptionsDashboardWidget({ widget: _widget }: Readonly<OptionsDashboardWidgetProps>) {
  const globalSymbol = useWorkspaceStore((s) => s.globalSymbol);
  const symbols = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'SPY'];
  const initial = symbols.includes(globalSymbol) ? globalSymbol : 'AAPL';
  const [selectedSymbol, setSelectedSymbol] = useState(initial);
  const [selectedExpiry, setSelectedExpiry] = useState('2024-12-20');
  const [activeTab, setActiveTab] = useState('chain');
  const [positionSize, setPositionSize] = useState('100');
  const { data: kpi } = useKpis(selectedSymbol);
  const [currentPrice, setCurrentPrice] = useState(kpi ? kpi.price.toFixed(2) : '175.43');
  // keep current price in sync with KPI changes unless user has edited
  const [touched, setTouched] = useState(false);
  if (kpi && !touched && currentPrice !== kpi.price.toFixed(2)) {
    setCurrentPrice(kpi.price.toFixed(2));
  }

  const expiries = ['2024-12-20', '2025-01-17', '2025-02-21'];

  const filteredOptions = MOCK_OPTIONS_DATA.filter(
    option => option.symbol === selectedSymbol && option.expiry === selectedExpiry
  );

  const calls = filteredOptions.filter(option => option.type === 'call');
  const puts = filteredOptions.filter(option => option.type === 'put');

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getGreeksColor = (value: number, isPositive: boolean) => {
    if (Math.abs(value) < 0.001) return 'text-muted-foreground';
    return isPositive ? 'text-green-600' : 'text-red-600';
  };

  const calculatePositionMetrics = () => {
    const size = parseInt(positionSize) || 0;
    const price = parseFloat(currentPrice) || 0;
    
    if (size === 0 || price === 0) return null;

    // Mock position in AAPL 175 call
    const option = calls.find(c => c.strike === 175);
    if (!option) return null;

    const midPrice = (option.bid + option.ask) / 2;
    const positionValue = size * midPrice * 100; // 100 shares per contract
    const deltaExposure = size * option.delta * 100;
    const gammaExposure = size * option.gamma * 100;
    const thetaExposure = size * option.theta * 100;
    const vegaExposure = size * option.vega * 100;

    return {
      positionValue,
      deltaExposure,
      gammaExposure,
      thetaExposure,
      vegaExposure,
      impliedVol: option.impliedVol
    };
  };

  const positionMetrics = calculatePositionMetrics();

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Options Dashboard
          <Badge variant="secondary" className="ml-auto">{selectedSymbol}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="grid grid-cols-4 gap-2">
          <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {symbols.map(symbol => (
                <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedExpiry} onValueChange={setSelectedExpiry}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {expiries.map(expiry => (
                <SelectItem key={expiry} value={expiry}>{expiry}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Position Size"
            value={positionSize}
            onChange={(e) => setPositionSize(e.target.value)}
            className="h-8 text-xs"
          />

          <Input
            placeholder="Current Price"
            value={currentPrice}
            onChange={(e) => { setTouched(true); setCurrentPrice(e.target.value); }}
            className="h-8 text-xs"
          />
        </div>

        {/* Position Summary */}
        {positionMetrics && (
          <div className="grid grid-cols-6 gap-2 p-3 bg-muted/30 rounded">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Position Value</div>
              <div className="text-sm font-medium">{formatCurrency(positionMetrics.positionValue)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Delta</div>
              <div className={`text-sm font-medium ${getGreeksColor(positionMetrics.deltaExposure, positionMetrics.deltaExposure > 0)}`}>
                {formatCurrency(positionMetrics.deltaExposure)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Gamma</div>
              <div className={`text-sm font-medium ${getGreeksColor(positionMetrics.gammaExposure, positionMetrics.gammaExposure > 0)}`}>
                {formatCurrency(positionMetrics.gammaExposure)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Theta</div>
              <div className={`text-sm font-medium ${getGreeksColor(positionMetrics.thetaExposure, positionMetrics.thetaExposure > 0)}`}>
                {formatCurrency(positionMetrics.thetaExposure)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Vega</div>
              <div className={`text-sm font-medium ${getGreeksColor(positionMetrics.vegaExposure, positionMetrics.vegaExposure > 0)}`}>
                {formatCurrency(positionMetrics.vegaExposure)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">IV</div>
              <div className="text-sm font-medium">{formatPercentage(positionMetrics.impliedVol)}</div>
            </div>
          </div>
        )}

        {/* Options Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chain">Options Chain</TabsTrigger>
            <TabsTrigger value="greeks">Greeks</TabsTrigger>
            <TabsTrigger value="pnl">P&L Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="chain" className="mt-4">
            <div className="space-y-4">
              {/* Calls */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Calls</h4>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Strike</TableHead>
                        <TableHead className="text-xs">Bid</TableHead>
                        <TableHead className="text-xs">Ask</TableHead>
                        <TableHead className="text-xs">Last</TableHead>
                        <TableHead className="text-xs">Volume</TableHead>
                        <TableHead className="text-xs">OI</TableHead>
                        <TableHead className="text-xs">IV</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calls.map((option) => (
                        <TableRow key={`${option.strike}-call`} className="hover:bg-muted/50">
                          <TableCell className="font-medium text-xs">{option.strike}</TableCell>
                          <TableCell className="text-xs">{option.bid.toFixed(2)}</TableCell>
                          <TableCell className="text-xs">{option.ask.toFixed(2)}</TableCell>
                          <TableCell className="text-xs">{option.last.toFixed(2)}</TableCell>
                          <TableCell className="text-xs">{option.volume.toLocaleString()}</TableCell>
                          <TableCell className="text-xs">{option.openInterest.toLocaleString()}</TableCell>
                          <TableCell className="text-xs">{formatPercentage(option.impliedVol)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Puts */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Puts</h4>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Strike</TableHead>
                        <TableHead className="text-xs">Bid</TableHead>
                        <TableHead className="text-xs">Ask</TableHead>
                        <TableHead className="text-xs">Last</TableHead>
                        <TableHead className="text-xs">Volume</TableHead>
                        <TableHead className="text-xs">OI</TableHead>
                        <TableHead className="text-xs">IV</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {puts.map((option) => (
                        <TableRow key={`${option.strike}-put`} className="hover:bg-muted/50">
                          <TableCell className="font-medium text-xs">{option.strike}</TableCell>
                          <TableCell className="text-xs">{option.bid.toFixed(2)}</TableCell>
                          <TableCell className="text-xs">{option.ask.toFixed(2)}</TableCell>
                          <TableCell className="text-xs">{option.last.toFixed(2)}</TableCell>
                          <TableCell className="text-xs">{option.volume.toLocaleString()}</TableCell>
                          <TableCell className="text-xs">{option.openInterest.toLocaleString()}</TableCell>
                          <TableCell className="text-xs">{formatPercentage(option.impliedVol)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="greeks" className="mt-4">
            <div className="space-y-4">
              {/* Calls Greeks */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Calls - Greeks</h4>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Strike</TableHead>
                        <TableHead className="text-xs">Delta</TableHead>
                        <TableHead className="text-xs">Gamma</TableHead>
                        <TableHead className="text-xs">Theta</TableHead>
                        <TableHead className="text-xs">Vega</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calls.map((option) => (
                        <TableRow key={`${option.strike}-call-greeks`} className="hover:bg-muted/50">
                          <TableCell className="font-medium text-xs">{option.strike}</TableCell>
                          <TableCell className={`text-xs ${getGreeksColor(option.delta, option.delta > 0)}`}>
                            {option.delta.toFixed(3)}
                          </TableCell>
                          <TableCell className={`text-xs ${getGreeksColor(option.gamma, option.gamma > 0)}`}>
                            {option.gamma.toFixed(3)}
                          </TableCell>
                          <TableCell className={`text-xs ${getGreeksColor(option.theta, option.theta > 0)}`}>
                            {option.theta.toFixed(3)}
                          </TableCell>
                          <TableCell className={`text-xs ${getGreeksColor(option.vega, option.vega > 0)}`}>
                            {option.vega.toFixed(3)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Puts Greeks */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Puts - Greeks</h4>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Strike</TableHead>
                        <TableHead className="text-xs">Delta</TableHead>
                        <TableHead className="text-xs">Gamma</TableHead>
                        <TableHead className="text-xs">Theta</TableHead>
                        <TableHead className="text-xs">Vega</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {puts.map((option) => (
                        <TableRow key={`${option.strike}-put-greeks`} className="hover:bg-muted/50">
                          <TableCell className="font-medium text-xs">{option.strike}</TableCell>
                          <TableCell className={`text-xs ${getGreeksColor(option.delta, option.delta > 0)}`}>
                            {option.delta.toFixed(3)}
                          </TableCell>
                          <TableCell className={`text-xs ${getGreeksColor(option.gamma, option.gamma > 0)}`}>
                            {option.gamma.toFixed(3)}
                          </TableCell>
                          <TableCell className={`text-xs ${getGreeksColor(option.theta, option.theta > 0)}`}>
                            {option.theta.toFixed(3)}
                          </TableCell>
                          <TableCell className={`text-xs ${getGreeksColor(option.vega, option.vega > 0)}`}>
                            {option.vega.toFixed(3)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pnl" className="mt-4">
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">P&L Profile (AAPL 175 Call)</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={MOCK_PNL_DATA}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="price" fontSize={10} />
                  <YAxis fontSize={10} tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'P&L']}
                    labelFormatter={(label) => `Price: $${label}`}
                  />
                  <Line type="monotone" dataKey="pnl" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                </LineChart>
              </ResponsiveContainer>
              <div className="text-xs text-muted-foreground text-center mt-2">
                Breakeven: $175.00 • Max Loss: $1,500 • Max Gain: Unlimited
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
