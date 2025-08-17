'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Filter, Download, Plus, Trash2, Play, RotateCcw, Copy, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/components/ui/use-toast';

interface OptionData {
  strike: number;
  call: {
    price: number;
    bid: number;
    ask: number;
    mid: number;
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    iv: number;
    volume: number;
    openInterest: number;
    isITM: boolean;
  };
  put: {
    price: number;
    bid: number;
    ask: number;
    mid: number;
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    iv: number;
    volume: number;
    openInterest: number;
    isITM: boolean;
  };
}

interface Position {
  id: string;
  symbol: string;
  side: 'C' | 'P';
  strike: number;
  expiry: number;
  price: number;
  quantity: number;
}

interface UnderlyingData {
  symbol: string;
  price: number;
  iv: number;
  ivRank: number;
  beta: number;
  r: number;
}

// Mock underlying data
const MOCK_UNDERLYINGS: Record<string, UnderlyingData> = {
  'SPY': { symbol: 'SPY', price: 550, iv: 0.21, ivRank: 45, beta: 1.0, r: 0.05 },
  'NVDA': { symbol: 'NVDA', price: 1175, iv: 0.54, ivRank: 72, beta: 1.8, r: 0.05 },
  'AAPL': { symbol: 'AAPL', price: 191, iv: 0.28, ivRank: 38, beta: 1.2, r: 0.05 },
  'TSLA': { symbol: 'TSLA', price: 245, iv: 0.62, ivRank: 85, beta: 2.1, r: 0.05 },
  'AMZN': { symbol: 'AMZN', price: 145, iv: 0.35, ivRank: 55, beta: 1.4, r: 0.05 },
  'GOOGL': { symbol: 'GOOGL', price: 142, iv: 0.31, ivRank: 42, beta: 1.1, r: 0.05 },
  'META': { symbol: 'META', price: 335, iv: 0.41, ivRank: 65, beta: 1.6, r: 0.05 },
  'MSFT': { symbol: 'MSFT', price: 338, iv: 0.26, ivRank: 35, beta: 0.9, r: 0.05 },
};

const DTE_OPTIONS = [7, 14, 21, 30, 45, 60, 90, 120, 180];

// Black-Scholes calculations
function normalCDF(x: number): number {
  const a1 = 0.31938153;
  const a2 = -0.356563782;
  const a3 = 1.781477937;
  const a4 = -1.821255978;
  const a5 = 1.330274429;
  
  const L = Math.abs(x);
  const k = 1 / (1 + 0.2316419 * L);
  let w = 1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-L * L / 2) *
    (a1 * k + a2 * k ** 2 + a3 * k ** 3 + a4 * k ** 4 + a5 * k ** 5);
  
  return x < 0 ? 1 - w : w;
}

function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function blackScholes(
  S: number, // Current price
  K: number, // Strike price
  T: number, // Time to expiry (years)
  r: number, // Risk-free rate
  sigma: number, // Volatility
  isCall: boolean
) {
  const sqrtT = Math.sqrt(Math.max(T, 1/365));
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  
  const Nd1 = normalCDF(isCall ? d1 : -d1);
  const Nd2 = normalCDF(isCall ? d2 : -d2);
  
  const price = isCall
    ? S * Nd1 - K * Math.exp(-r * T) * Nd2
    : K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
    
  const delta = isCall ? normalCDF(d1) : normalCDF(d1) - 1;
  const gamma = normalPDF(d1) / (S * sigma * sqrtT);
  const vega = S * normalPDF(d1) * sqrtT * 0.01; // per 1% vol point
  const theta = (
    -(S * normalPDF(d1) * sigma) / (2 * sqrtT) -
    (isCall 
      ? r * K * Math.exp(-r * T) * normalCDF(d2)
      : -r * K * Math.exp(-r * T) * normalCDF(-d2)
    )
  ) / 365; // per day
  
  return { price, delta, gamma, theta, vega };
}

// Generate mock option chain
function generateOptionChain(
  underlying: UnderlyingData,
  dte: number,
  priceShock: number = 0,
  ivShock: number = 0,
  timeShock: number = 0
): OptionData[] {
  const S = underlying.price * (1 + priceShock / 100);
  const baseIV = Math.max(0.05, underlying.iv + ivShock / 100);
  const T = Math.max((dte - timeShock) / 365, 1/365);
  const r = underlying.r;
  
  const strikes: number[] = [];
  const strikeSpacing = S <= 50 ? 1 : S <= 100 ? 2.5 : S <= 200 ? 5 : S <= 500 ? 10 : 25;
  
  for (let k = S * 0.7; k <= S * 1.3; k += strikeSpacing) {
    strikes.push(Math.round(k / strikeSpacing) * strikeSpacing);
  }
  
  return strikes.map(strike => {
    // Apply volatility skew (puts have higher IV)
    const skew = -0.15; // negative skew
    const moneyness = strike / S;
    const callIV = Math.max(0.05, baseIV + skew * (moneyness - 1));
    const putIV = Math.max(0.05, baseIV + skew * (moneyness - 1) + 0.02);
    
    const callData = blackScholes(S, strike, T, r, callIV, true);
    const putData = blackScholes(S, strike, T, r, putIV, false);
    
    // Add bid/ask spread (roughly 1-3% of mid)
    const callBid = Math.max(0, callData.price * (0.985 - 0.01 * Math.random()));
    const callAsk = callData.price * (1.015 + 0.01 * Math.random());
    const putBid = Math.max(0, putData.price * (0.985 - 0.01 * Math.random()));
    const putAsk = putData.price * (1.015 + 0.01 * Math.random());
    
    // Generate mock volume and OI
    const seed = strike * 1000 + dte;
    const rnd = () => (Math.sin(seed * 9.97) + 1) / 2;
    const callVolume = Math.round(10 + 1000 * rnd());
    const putVolume = Math.round(10 + 800 * rnd());
    const callOI = Math.round(50 + 2000 * rnd());
    const putOI = Math.round(50 + 1500 * rnd());
    
    return {
      strike,
      call: {
        price: callData.price,
        bid: callBid,
        ask: callAsk,
        mid: (callBid + callAsk) / 2,
        delta: callData.delta,
        gamma: callData.gamma,
        theta: callData.theta,
        vega: callData.vega,
        iv: callIV,
        volume: callVolume,
        openInterest: callOI,
        isITM: strike < S,
      },
      put: {
        price: putData.price,
        bid: putBid,
        ask: putAsk,
        mid: (putBid + putAsk) / 2,
        delta: putData.delta,
        gamma: putData.gamma,
        theta: putData.theta,
        vega: putData.vega,
        iv: putIV,
        volume: putVolume,
        openInterest: putOI,
        isITM: strike > S,
      }
    };
  });
}

export default function OptionsChainPage() {
  const [symbol, setSymbol] = useState('NVDA');
  const [dte, setDte] = useState(30);
  const [showGreeks, setShowGreeks] = useState(true);
  const [shadeITM, setShadeITM] = useState(true);
  const [otmOnly, setOtmOnly] = useState(false);
  const [priceShock, setPriceShock] = useState(0);
  const [ivShock, setIvShock] = useState(0);
  const [timeShock, setTimeShock] = useState(0);
  const [positions, setPositions] = useState<Position[]>([]);
  const [theme, setTheme] = useState('malibu-sunrise');
  
  const smileCanvasRef = useRef<HTMLCanvasElement>(null);
  const termCanvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const underlying = MOCK_UNDERLYINGS[symbol];
  const adjustedPrice = underlying?.price * (1 + priceShock / 100) || 0;
  const adjustedIV = Math.max(0.05, (underlying?.iv || 0) + ivShock / 100);

  const optionChain = useMemo(() => {
    if (!underlying) return [];
    return generateOptionChain(underlying, dte, priceShock, ivShock, timeShock);
  }, [underlying, dte, priceShock, ivShock, timeShock]);

  const filteredChain = useMemo(() => {
    if (!otmOnly) return optionChain;
    return optionChain.filter(option => !option.call.isITM || !option.put.isITM);
  }, [optionChain, otmOnly]);

  // Draw volatility smile
  const drawVolatilitySmile = () => {
    const canvas = smileCanvasRef.current;
    if (!canvas || !underlying) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    
    const strikes = optionChain.map(opt => opt.strike);
    const ivs = optionChain.map(opt => opt.call.iv * 100);
    
    if (strikes.length < 2) return;
    
    const minStrike = Math.min(...strikes);
    const maxStrike = Math.max(...strikes);
    const minIV = Math.min(...ivs);
    const maxIV = Math.max(...ivs);
    
    ctx.beginPath();
    strikes.forEach((strike, i) => {
      const x = ((strike - minStrike) / (maxStrike - minStrike)) * width;
      const y = height - ((ivs[i] - minIV) / (maxIV - minIV + 1)) * height;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.strokeStyle = 'rgba(125, 200, 247, 0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Mark ATM
    const atmX = ((underlying.price - minStrike) / (maxStrike - minStrike)) * width;
    ctx.fillStyle = 'rgba(255, 126, 182, 0.8)';
    ctx.fillRect(atmX - 1, 0, 2, height);
  };

  // Draw term structure
  const drawTermStructure = () => {
    const canvas = termCanvasRef.current;
    if (!canvas || !underlying) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    
    // Mock term structure data
    const terms = [7, 14, 21, 30, 45, 60, 90, 120, 180];
    const baseIV = adjustedIV;
    const termIVs = terms.map(t => Math.max(0.05, baseIV + 0.02 * Math.log((t + 30) / 60)));
    
    const minTerm = Math.min(...terms);
    const maxTerm = Math.max(...terms);
    const minIV = Math.min(...termIVs);
    const maxIV = Math.max(...termIVs);
    
    ctx.beginPath();
    terms.forEach((term, i) => {
      const x = ((term - minTerm) / (maxTerm - minTerm)) * width;
      const y = height - ((termIVs[i] - minIV) / (maxIV - minIV + 0.01)) * height;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.strokeStyle = 'rgba(125, 200, 247, 0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Mark current DTE
    const currentX = ((dte - minTerm) / (maxTerm - minTerm)) * width;
    ctx.fillStyle = 'rgba(255, 126, 182, 0.8)';
    ctx.fillRect(currentX - 1, 0, 2, height);
  };

  useEffect(() => {
    drawVolatilitySmile();
    drawTermStructure();
  }, [optionChain, dte, underlying, adjustedIV]);

  const addPosition = (side: 'C' | 'P', strike: number, price: number) => {
    const id = `${symbol}-${side}-${strike}-${dte}-${Date.now()}`;
    const newPosition: Position = {
      id,
      symbol,
      side,
      strike,
      expiry: dte,
      price,
      quantity: 1,
    };
    setPositions(prev => [...prev, newPosition]);
    toast({ title: 'Position added', description: `${side} ${strike} @ ${price.toFixed(2)}` });
  };

  const removePosition = (id: string) => {
    setPositions(prev => prev.filter(p => p.id !== id));
  };

  const updatePositionQuantity = (id: string, quantity: number) => {
    setPositions(prev => prev.map(p => p.id === id ? { ...p, quantity } : p));
  };

  const resetScenario = () => {
    setPriceShock(0);
    setIvShock(0);
    setTimeShock(0);
  };

  const copyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('dte', dte.toString());
    url.searchParams.set('priceShock', priceShock.toString());
    url.searchParams.set('ivShock', ivShock.toString());
    url.searchParams.set('timeShock', timeShock.toString());
    
    navigator.clipboard.writeText(url.toString()).then(() => {
      toast({ title: 'Link copied', description: 'Options chain link copied to clipboard' });
    });
  };

  const netPremium = positions.reduce((sum, pos) => sum + pos.price * pos.quantity * 100, 0);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="h-14 flex items-center gap-3 px-4 border-b bg-card/50 backdrop-blur-xl">
        <div className="w-5 h-5 rounded-md bg-gradient-to-r from-primary via-accent to-secondary shadow-lg" />
        <div className="font-bold">MAD LAB — Options Chain</div>
        <Badge variant="secondary">/options-chain/{symbol.toLowerCase()}?dte={dte}</Badge>
        <div className="flex-1" />
        <Select value={theme} onValueChange={setTheme}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="malibu-sunrise">Sunrise</SelectItem>
            <SelectItem value="malibu-sunset">Sunset</SelectItem>
          </SelectContent>
        </Select>
      </header>

      <div className="flex-1 grid grid-cols-12 gap-4 p-4 min-h-0">
        {/* Left: Underlying & Filters */}
        <aside className="col-span-3 bg-card/50 border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Underlying & Filters</span>
            </div>
            <Badge variant="outline">{symbol}</Badge>
          </div>

          <div className="p-4 space-y-6 overflow-auto">
            {/* Underlying Controls */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Underlying</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Symbol</label>
                  <Select value={symbol} onValueChange={setSymbol}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(MOCK_UNDERLYINGS).map(sym => (
                        <SelectItem key={sym} value={sym}>{sym}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Expiry (DTE)</label>
                  <Select value={dte.toString()} onValueChange={(value) => setDte(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DTE_OPTIONS.map(days => (
                        <SelectItem key={days} value={days.toString()}>{days} days</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Display Options */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Display Options</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showGreeks"
                    checked={showGreeks}
                    onCheckedChange={(checked) => setShowGreeks(!!checked)}
                  />
                  <label htmlFor="showGreeks" className="text-xs">Show Greeks</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="shadeITM"
                    checked={shadeITM}
                    onCheckedChange={(checked) => setShadeITM(!!checked)}
                  />
                  <label htmlFor="shadeITM" className="text-xs">Shade ITM</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="otmOnly"
                    checked={otmOnly}
                    onCheckedChange={(checked) => setOtmOnly(!!checked)}
                  />
                  <label htmlFor="otmOnly" className="text-xs">OTM only</label>
                </div>
              </div>
            </div>

            {/* Scenario Analysis */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Scenario</h4>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>Price move (Δ%)</span>
                    <span>{priceShock.toFixed(1)}%</span>
                  </div>
                  <Slider
                    value={[priceShock]}
                    onValueChange={([value]) => setPriceShock(value)}
                    max={20}
                    min={-20}
                    step={0.5}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>IV change (vol pts)</span>
                    <span>{ivShock.toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[ivShock]}
                    onValueChange={([value]) => setIvShock(value)}
                    max={15}
                    min={-15}
                    step={0.5}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>Days forward</span>
                    <span>{timeShock}</span>
                  </div>
                  <Slider
                    value={[timeShock]}
                    onValueChange={([value]) => setTimeShock(value)}
                    max={60}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={resetScenario} className="flex-1">
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
                <Button size="sm" onClick={copyLink} className="flex-1">
                  <Copy className="h-3 w-3 mr-1" />
                  Copy Link
                </Button>
              </div>
            </div>

            {/* Snapshot */}
            {underlying && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Snapshot</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-muted-foreground">Price</div>
                    <div className="font-bold text-lg">{adjustedPrice.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Base IV (ATM)</div>
                    <div className="font-bold text-lg">{(adjustedIV * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">IV Rank</div>
                    <div className="font-bold text-lg">{underlying.ivRank}%</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Beta</div>
                    <div className="font-bold text-lg">{underlying.beta.toFixed(2)}</div>
                  </div>
                </div>

                {/* Volatility Charts */}
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">Volatility Smile</div>
                    <div className="border border-dashed rounded-lg p-2 bg-muted/20">
                      <canvas
                        ref={smileCanvasRef}
                        width={280}
                        height={90}
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">Term Structure</div>
                    <div className="border border-dashed rounded-lg p-2 bg-muted/20">
                      <canvas
                        ref={termCanvasRef}
                        width={280}
                        height={90}
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Center: Options Chain */}
        <section className="col-span-6 bg-card/50 border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Options Chain</span>
            </div>
            <Badge variant="outline">mock data</Badge>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">Calls</th>
                  {showGreeks && <th className="px-2 py-2 text-right">Δ</th>}
                  {showGreeks && <th className="px-2 py-2 text-right">Γ</th>}
                  {showGreeks && <th className="px-2 py-2 text-right">Θ</th>}
                  {showGreeks && <th className="px-2 py-2 text-right">Vega</th>}
                  <th className="px-2 py-2 text-right">IV</th>
                  <th className="px-2 py-2 text-right">Bid</th>
                  <th className="px-2 py-2 text-right">Mid</th>
                  <th className="px-2 py-2 text-right">Ask</th>
                  <th className="px-2 py-2 text-right">Vol</th>
                  <th className="px-2 py-2 text-right">OI</th>
                  <th className="px-3 py-2 text-center bg-muted/30 sticky left-1/2 transform -translate-x-1/2">Strike</th>
                  <th className="px-2 py-2 text-right">Vol</th>
                  <th className="px-2 py-2 text-right">OI</th>
                  <th className="px-2 py-2 text-right">Bid</th>
                  <th className="px-2 py-2 text-right">Mid</th>
                  <th className="px-2 py-2 text-right">Ask</th>
                  <th className="px-2 py-2 text-right">IV</th>
                  {showGreeks && <th className="px-2 py-2 text-right">Vega</th>}
                  {showGreeks && <th className="px-2 py-2 text-right">Θ</th>}
                  {showGreeks && <th className="px-2 py-2 text-right">Γ</th>}
                  {showGreeks && <th className="px-2 py-2 text-right">Δ</th>}
                  <th className="px-3 py-2 text-right">Puts</th>
                </tr>
              </thead>
              <tbody>
                {filteredChain.map((option) => (
                  <tr key={option.strike} className="border-b hover:bg-muted/20">
                    <td className={`px-3 py-2 text-left ${option.call.isITM && shadeITM ? 'bg-primary/10' : ''}`}>
                      C
                    </td>
                    {showGreeks && <td className="px-2 py-2 text-right">{option.call.delta.toFixed(3)}</td>}
                    {showGreeks && <td className="px-2 py-2 text-right">{option.call.gamma.toFixed(4)}</td>}
                    {showGreeks && <td className="px-2 py-2 text-right">{option.call.theta.toFixed(2)}</td>}
                    {showGreeks && <td className="px-2 py-2 text-right">{option.call.vega.toFixed(2)}</td>}
                    <td className="px-2 py-2 text-right">{(option.call.iv * 100).toFixed(1)}%</td>
                    <td className="px-2 py-2 text-right">{option.call.bid.toFixed(2)}</td>
                    <td 
                      className="px-2 py-2 text-right cursor-pointer hover:bg-accent/20 font-medium"
                      onClick={() => addPosition('C', option.strike, option.call.mid)}
                    >
                      {option.call.mid.toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-right">{option.call.ask.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right">{option.call.volume.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right">{option.call.openInterest.toLocaleString()}</td>
                    <td className="px-3 py-2 text-center font-bold bg-muted/30">{option.strike}</td>
                    <td className="px-2 py-2 text-right">{option.put.volume.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right">{option.put.openInterest.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right">{option.put.bid.toFixed(2)}</td>
                    <td 
                      className="px-2 py-2 text-right cursor-pointer hover:bg-accent/20 font-medium"
                      onClick={() => addPosition('P', option.strike, option.put.mid)}
                    >
                      {option.put.mid.toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-right">{option.put.ask.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right">{(option.put.iv * 100).toFixed(1)}%</td>
                    {showGreeks && <td className="px-2 py-2 text-right">{option.put.vega.toFixed(2)}</td>}
                    {showGreeks && <td className="px-2 py-2 text-right">{option.put.theta.toFixed(2)}</td>}
                    {showGreeks && <td className="px-2 py-2 text-right">{option.put.gamma.toFixed(4)}</td>}
                    {showGreeks && <td className="px-2 py-2 text-right">{option.put.delta.toFixed(3)}</td>}
                    <td className={`px-3 py-2 text-right ${option.put.isITM && shadeITM ? 'bg-primary/10' : ''}`}>
                      P
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right: Position Builder */}
        <aside className="col-span-3 bg-card/50 border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Selected Legs</span>
            </div>
            <Badge variant="outline">{positions.length}</Badge>
          </div>

          <div className="p-4 space-y-4 overflow-auto">
            {positions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No legs selected. Click a Call/Put price in the chain to add a leg.</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {positions.map((position) => (
                    <div key={position.id} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/20">
                      <div className="flex-1 text-xs">
                        <div className="font-medium">{position.symbol} {position.expiry}d {position.side} {position.strike}</div>
                        <div className="text-muted-foreground">@ {position.price.toFixed(2)}</div>
                      </div>
                      <Input
                        type="number"
                        value={position.quantity}
                        onChange={(e) => updatePositionQuantity(position.id, parseInt(e.target.value) || 0)}
                        className="w-16 h-7 text-xs text-center"
                        min="-100"
                        max="100"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePosition(position.id)}
                        className="h-7 w-7 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Position Summary */}
                <div className="border border-dashed rounded-lg p-3 bg-muted/10">
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span>Net Premium:</span>
                      <span className={`font-bold ${netPremium >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {netPremium >= 0 ? '-' : '+'}${Math.abs(netPremium).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {positions.map(p => `${p.quantity > 0 ? '+' : ''}${p.quantity} ${p.symbol} ${p.expiry}d ${p.side}${p.strike}`).join(' , ')}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            <div className="border border-dashed rounded-lg p-3 text-xs text-muted-foreground">
              <div className="font-medium mb-2">Notes</div>
              <div className="space-y-1">
                <div>• Click a <strong>Mid</strong> to add/remove a leg.</div>
                <div>• <strong>Δ/Γ/Θ/Vega</strong> update with scenario sliders.</div>
                <div>• Use <strong>Copy link</strong> to share symbol + expiry + scenario.</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}