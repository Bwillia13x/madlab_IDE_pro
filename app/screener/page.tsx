'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Filter, Download, Plus, Trash2, Play, RotateCcw, HelpCircle, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/components/ui/use-toast';
import { parseQuery, applyParsedQuery, getExampleQueries } from '@/lib/utils/queryParser';

interface StockData {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  chg1d: number;
  mom3m: number;
  mcap: number;
  advusd: number;
  spreadbps: number;
  pe: number;
  ev_ebitda: number;
  fcfy: number;
  iv30: number;
  ivrank: number;
  atrp: number;
  optionable: boolean;
}

interface ScreenFilters {
  sectors: Set<string>;
  optionable: boolean;
  exUS: boolean;
  mcap: number;
  pe: number;
  ev: number;
  fcf: number;
  mom: number;
  atr: number;
  adv: number;
  spr: number;
  iv: number;
  ivr: number;
}

interface SavedScreen {
  name: string;
  filters: ScreenFilters;
}

const sectors = ['Tech', 'Fin', 'Disc', 'Stap', 'HC', 'Indu', 'Energy', 'Util', 'RE', 'Mat', 'Comm'];

const stockNames: Record<string, string> = {
  'AAPL': 'Apple', 'MSFT': 'Microsoft', 'NVDA': 'NVIDIA', 'GOOGL': 'Alphabet', 'AMZN': 'Amazon',
  'META': 'Meta Platforms', 'TSLA': 'Tesla', 'SPY': 'S&P 500 ETF', 'JPM': 'JPMorgan', 'BAC': 'Bank of America',
  'XOM': 'ExxonMobil', 'CVX': 'Chevron', 'WMT': 'Walmart', 'KO': 'Coca‑Cola', 'PEP': 'PepsiCo',
  'UNH': 'UnitedHealth', 'JNJ': 'Johnson & Johnson', 'MRK': 'Merck', 'PFE': 'Pfizer', 'T': 'AT&T',
  'VZ': 'Verizon', 'ORCL': 'Oracle', 'ADBE': 'Adobe', 'NFLX': 'Netflix', 'AMD': 'AMD',
  'AVGO': 'Broadcom', 'INTC': 'Intel', 'CSCO': 'Cisco', 'CRM': 'Salesforce', 'SHOP': 'Shopify',
  'UBER': 'Uber', 'LYFT': 'Lyft', 'NKE': 'Nike', 'DIS': 'Disney', 'CMCSA': 'Comcast',
  'BA': 'Boeing', 'CAT': 'Caterpillar', 'MMM': '3M', 'GE': 'GE', 'F': 'Ford', 'GM': 'GM',
  'V': 'Visa', 'MA': 'Mastercard', 'PYPL': 'PayPal', 'SQ': 'Block', 'MCD': 'McDonald\'s',
  'SBUX': 'Starbucks', 'COST': 'Costco', 'TGT': 'Target', 'LOW': 'Lowe\'s', 'HD': 'Home Depot'
};

// Mock data generator
function generateMockData(): StockData[] {
  let seed = 20250816;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  
  const randn = () => {
    let u = 0, v = 0;
    while (u === 0) u = rnd();
    while (v === 0) v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  return Object.keys(stockNames).map(symbol => {
    const sector = sectors[Math.floor(rnd() * sectors.length)];
    const price = 20 + rnd() * 980;
    const chg1d = randn() * 1.5;
    const mom3m = randn() * 15 + 8;
    const mcap = 5 + rnd() * 1500;
    const advusd = 5 + rnd() * 800;
    const spreadbps = 5 + rnd() * 60;
    const pe = Math.max(3, 15 + randn() * 10);
    const ev_ebitda = Math.max(3, 12 + randn() * 8);
    const fcfy = Math.max(-10, 3 + randn() * 5);
    const iv30 = Math.max(8, 20 + randn() * 15);
    const ivrank = Math.max(0, Math.min(100, 50 + randn() * 25));
    const atrp = Math.max(2, 6 + randn() * 4);
    const optionable = rnd() > 0.2;

    return {
      symbol,
      name: stockNames[symbol] || `${symbol} Corp`,
      sector,
      price: parseFloat(price.toFixed(2)),
      chg1d: parseFloat(chg1d.toFixed(2)),
      mom3m: parseFloat(mom3m.toFixed(1)),
      mcap: parseFloat(mcap.toFixed(1)),
      advusd: parseFloat(advusd.toFixed(1)),
      spreadbps: parseFloat(spreadbps.toFixed(1)),
      pe: parseFloat(pe.toFixed(1)),
      ev_ebitda: parseFloat(ev_ebitda.toFixed(1)),
      fcfy: parseFloat(fcfy.toFixed(1)),
      iv30: parseFloat(iv30.toFixed(1)),
      ivrank: parseFloat(ivrank.toFixed(0)),
      atrp: parseFloat(atrp.toFixed(1)),
      optionable
    };
  });
}

export default function ScreenerPage() {
  const [universe] = useState(() => generateMockData());
  const [filters, setFilters] = useState<ScreenFilters>({
    sectors: new Set(),
    optionable: false,
    exUS: false,
    mcap: 5,
    pe: 40,
    ev: 25,
    fcf: 3,
    mom: 0,
    atr: 8,
    adv: 25,
    spr: 20,
    iv: 20,
    ivr: 30
  });
  
  const [query, setQuery] = useState('');
  const [queryHelpVisible, setQueryHelpVisible] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'mcap', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [savedScreens, setSavedScreens] = useState<SavedScreen[]>([]);
  const [screenName, setScreenName] = useState('');
  const [selectedScreenIndex, setSelectedScreenIndex] = useState<number>(-1);
  const [theme, setTheme] = useState('malibu-sunrise');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  // Load saved screens on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('madlab_screens');
      if (saved) {
        const screens = JSON.parse(saved);
        setSavedScreens(screens);
      } else {
        // Seed with sample screens
        const samples: SavedScreen[] = [
          {
            name: 'Value + FCFY + Liquidity',
            filters: {
              sectors: new Set(),
              optionable: true,
              exUS: false,
              mcap: 10,
              pe: 20,
              ev: 15,
              fcf: 5,
              mom: -5,
              atr: 12,
              adv: 50,
              spr: 25,
              iv: 15,
              ivr: 20
            }
          },
          {
            name: 'High IV Rank (premium sellers)',
            filters: {
              sectors: new Set(),
              optionable: true,
              exUS: false,
              mcap: 5,
              pe: 60,
              ev: 40,
              fcf: -5,
              mom: -20,
              atr: 20,
              adv: 25,
              spr: 40,
              iv: 25,
              ivr: 60
            }
          }
        ];
        setSavedScreens(samples);
        localStorage.setItem('madlab_screens', JSON.stringify(samples));
      }
    } catch (e) {
      console.error('Failed to load saved screens:', e);
    }
  }, []);

  // Close query help when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (queryHelpVisible && !(event.target as Element).closest('.relative')) {
        setQueryHelpVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [queryHelpVisible]);

  // Filter stocks
  const filteredStocks = useMemo(() => {
    return universe.filter(stock => {
      if (filters.sectors.size > 0 && !filters.sectors.has(stock.sector)) return false;
      if (filters.optionable && !stock.optionable) return false;
      if (stock.mcap < filters.mcap) return false;
      if (stock.pe > filters.pe) return false;
      if (stock.ev_ebitda > filters.ev) return false;
      if (stock.fcfy < filters.fcf) return false;
      if (stock.mom3m < filters.mom) return false;
      if (stock.atrp > filters.atr) return false;
      if (stock.advusd < filters.adv) return false;
      if (stock.spreadbps > filters.spr) return false;
      if (stock.iv30 < filters.iv) return false;
      if (stock.ivrank < filters.ivr) return false;
      return true;
    });
  }, [universe, filters]);

  // Sort stocks
  const sortedStocks = useMemo(() => {
    const sorted = [...filteredStocks];
    sorted.sort((a, b) => {
      const aVal = a[sortConfig.key as keyof StockData];
      const bVal = b[sortConfig.key as keyof StockData];
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [filteredStocks, sortConfig]);

  // Paginate stocks
  const paginatedStocks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedStocks.slice(start, start + pageSize);
  }, [sortedStocks, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedStocks.length / pageSize);

  // Handle sort
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Handle sector toggle
  const toggleSector = (sector: string) => {
    setFilters(prev => {
      const newSectors = new Set(prev.sectors);
      if (newSectors.has(sector)) {
        newSectors.delete(sector);
      } else {
        newSectors.add(sector);
      }
      return { ...prev, sectors: newSectors };
    });
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      sectors: new Set(),
      optionable: false,
      exUS: false,
      mcap: 5,
      pe: 40,
      ev: 25,
      fcf: 3,
      mom: 0,
      atr: 8,
      adv: 25,
      spr: 20,
      iv: 20,
      ivr: 30
    });
    setCurrentPage(1);
  };

  // Save screen
  const saveScreen = () => {
    if (!screenName.trim()) {
      toast({ title: 'Please enter a screen name', variant: 'destructive' });
      return;
    }

    const newScreen: SavedScreen = {
      name: screenName.trim(),
      filters: { ...filters, sectors: new Set(filters.sectors) }
    };

    const updatedScreens = [...savedScreens, newScreen];
    setSavedScreens(updatedScreens);
    localStorage.setItem('madlab_screens', JSON.stringify(updatedScreens));
    setScreenName('');
    toast({ title: 'Screen saved successfully' });
  };

  // Load screen
  const loadScreen = () => {
    if (selectedScreenIndex >= 0 && savedScreens[selectedScreenIndex]) {
      const screen = savedScreens[selectedScreenIndex];
      setFilters({
        ...screen.filters,
        sectors: new Set(screen.filters.sectors)
      });
      setCurrentPage(1);
      toast({ title: `Loaded screen: ${screen.name}` });
    }
  };

  // Delete screen
  const deleteScreen = () => {
    if (selectedScreenIndex >= 0 && savedScreens[selectedScreenIndex]) {
      const screenName = savedScreens[selectedScreenIndex].name;
      const updatedScreens = savedScreens.filter((_, index) => index !== selectedScreenIndex);
      setSavedScreens(updatedScreens);
      localStorage.setItem('madlab_screens', JSON.stringify(updatedScreens));
      setSelectedScreenIndex(-1);
      toast({ title: `Deleted screen: ${screenName}` });
    }
  };

  // Draw sparkline chart
  const drawSparkline = (stock: StockData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Generate mock price data
    const points = 120;
    let price = stock.price * (0.94 + 0.12 * Math.random());
    const prices = [];
    
    for (let i = 0; i < points; i++) {
      price *= 1 + (Math.random() - 0.5) * stock.atrp / 1000 + stock.mom3m / 10000;
      prices.push(price);
    }

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min;

    ctx.beginPath();
    prices.forEach((price, i) => {
      const x = i * (width / (points - 1));
      const y = height - ((price - min) / range) * height;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.strokeStyle = 'rgba(125, 200, 247, 0.9)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  };

  // Handle stock selection
  const selectStock = (stock: StockData) => {
    setSelectedStock(stock);
    setTimeout(() => drawSparkline(stock), 0);
  };

  // Export to CSV
  const exportCSV = () => {
    const headers = ['symbol', 'name', 'sector', 'price', 'chg1d', 'mom3m', 'mcap', 'advusd', 'spreadbps', 'pe', 'ev_ebitda', 'fcfy', 'iv30', 'ivrank'];
    const csvContent = [
      headers.join(','),
      ...sortedStocks.map(stock => 
        headers.map(header => stock[header as keyof StockData]).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'screener_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Query processing functions
  const processQuery = () => {
    if (!query.trim()) {
      toast({ title: 'Please enter a query', variant: 'destructive' });
      return;
    }

    const parsedQuery = parseQuery(query);
    
    if (parsedQuery.errors.length > 0) {
      toast({ 
        title: 'Query syntax errors', 
        description: parsedQuery.errors.join(', '),
        variant: 'destructive' 
      });
      return;
    }

    const newFilters = applyParsedQuery(parsedQuery, filters);
    setFilters(newFilters);
    setCurrentPage(1);
    toast({ 
      title: 'Query applied', 
      description: `Updated filters based on: ${query}` 
    });
  };

  const handleQueryKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      processQuery();
    }
  };

  const applyExampleQuery = (exampleQuery: string) => {
    setQuery(exampleQuery);
    setTimeout(() => {
      const parsedQuery = parseQuery(exampleQuery);
      if (parsedQuery.errors.length === 0) {
        const newFilters = applyParsedQuery(parsedQuery, filters);
        setFilters(newFilters);
        setCurrentPage(1);
      }
    }, 100);
    setQueryHelpVisible(false);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="h-14 flex items-center gap-3 px-4 border-b bg-card/50 backdrop-blur-xl">
        <div className="w-5 h-5 rounded-md bg-gradient-to-r from-primary via-accent to-secondary shadow-lg" />
        <div className="font-bold">MAD LAB — Screener</div>
        <Badge variant="secondary">/screener</Badge>
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Quick query (e.g., pe<20 fcfy>5 ivrank>50)… (⌘K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleQueryKeyPress}
            className="pl-9 pr-20 w-96"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setQueryHelpVisible(!queryHelpVisible)}
              className="h-6 w-6 p-0"
              title="Query help"
            >
              <HelpCircle className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={processQuery}
              className="h-6 w-6 p-0"
              title="Apply query"
            >
              <Zap className="h-3 w-3" />
            </Button>
          </div>
          
          {/* Query Help Dropdown */}
          {queryHelpVisible && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border rounded-lg shadow-lg p-4 z-50">
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium mb-2">Query Syntax</h4>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div><span className="font-mono bg-muted px-1 rounded">pe&lt;20</span> - P/E ratio less than 20</div>
                    <div><span className="font-mono bg-muted px-1 rounded">fcfy&gt;5</span> - FCF Yield greater than 5%</div>
                    <div><span className="font-mono bg-muted px-1 rounded">mcap&gt;10</span> - Market cap greater than $10B</div>
                    <div><span className="font-mono bg-muted px-1 rounded">sector:tech</span> - Technology sector</div>
                    <div><span className="font-mono bg-muted px-1 rounded">optionable</span> - Has options</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Example Queries</h4>
                  <div className="space-y-1">
                    {getExampleQueries().map((example, index) => (
                      <button
                        key={index}
                        onClick={() => applyExampleQuery(example)}
                        className="block w-full text-left text-xs font-mono bg-muted hover:bg-muted/70 px-2 py-1 rounded transition-colors"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  <div><strong>Available fields:</strong> pe, mcap, fcfy, ev, mom, atr, adv, spr, iv, ivr</div>
                  <div><strong>Operators:</strong> &lt; &gt; &lt;= &gt;= =</div>
                  <div><strong>Sectors:</strong> tech, fin, disc, stap, hc, indu, energy, util, re, mat, comm</div>
                </div>
              </div>
            </div>
          )}
        </div>
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
        {/* Left: Filters */}
        <aside className="col-span-3 bg-card/50 border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Filters</span>
            </div>
            <Badge variant="outline">{filteredStocks.length} matches</Badge>
          </div>

          <div className="p-4 space-y-6 overflow-auto">
            {/* Universe */}
            <div className="space-y-3">
              <h4 className="text-sm text-muted-foreground">Universe</h4>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Sectors</label>
                  <div className="flex flex-wrap gap-1">
                    {sectors.map(sector => (
                      <button
                        key={sector}
                        onClick={() => toggleSector(sector)}
                        className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                          filters.sectors.has(sector)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card hover:bg-muted border-border'
                        }`}
                      >
                        {sector}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="optionable"
                    checked={filters.optionable}
                    onCheckedChange={(checked) => 
                      setFilters(prev => ({ ...prev, optionable: !!checked }))
                    }
                  />
                  <label htmlFor="optionable" className="text-xs">Optionable only</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="exUS"
                    checked={filters.exUS}
                    onCheckedChange={(checked) => 
                      setFilters(prev => ({ ...prev, exUS: !!checked }))
                    }
                  />
                  <label htmlFor="exUS" className="text-xs">Include ex‑US ADRs</label>
                </div>
              </div>
            </div>

            {/* Valuation */}
            <div className="space-y-3">
              <h4 className="text-sm text-muted-foreground">Valuation</h4>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>Mkt Cap ≥</span>
                    <span>${filters.mcap}B</span>
                  </div>
                  <Slider
                    value={[filters.mcap]}
                    onValueChange={([value]) => setFilters(prev => ({ ...prev, mcap: value }))}
                    max={500}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>P/E ≤</span>
                    <span>{filters.pe}</span>
                  </div>
                  <Slider
                    value={[filters.pe]}
                    onValueChange={([value]) => setFilters(prev => ({ ...prev, pe: value }))}
                    max={100}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>EV/EBITDA ≤</span>
                    <span>{filters.ev}</span>
                  </div>
                  <Slider
                    value={[filters.ev]}
                    onValueChange={([value]) => setFilters(prev => ({ ...prev, ev: value }))}
                    max={60}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>FCF Yield ≥</span>
                    <span>{filters.fcf}%</span>
                  </div>
                  <Slider
                    value={[filters.fcf]}
                    onValueChange={([value]) => setFilters(prev => ({ ...prev, fcf: value }))}
                    max={20}
                    min={-5}
                    step={0.5}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Momentum */}
            <div className="space-y-3">
              <h4 className="text-sm text-muted-foreground">Momentum</h4>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>3M Δ% ≥</span>
                    <span>{filters.mom}%</span>
                  </div>
                  <Slider
                    value={[filters.mom]}
                    onValueChange={([value]) => setFilters(prev => ({ ...prev, mom: value }))}
                    max={100}
                    min={-50}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>ATR% ≤</span>
                    <span>{filters.atr}%</span>
                  </div>
                  <Slider
                    value={[filters.atr]}
                    onValueChange={([value]) => setFilters(prev => ({ ...prev, atr: value }))}
                    max={25}
                    min={1}
                    step={0.5}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={resetFilters} className="flex-1">
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
              <Button size="sm" className="flex-1">
                <Play className="h-3 w-3 mr-1" />
                Apply
              </Button>
            </div>
          </div>
        </aside>

        {/* Center: Results */}
        <section className="col-span-6 bg-card/50 border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Results</span>
            </div>
            <div className="flex items-center gap-2">
              <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="h-3 w-3 mr-1" />
                CSV
              </Button>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  {[
                    { key: 'symbol', label: 'Symbol' },
                    { key: 'name', label: 'Name' },
                    { key: 'sector', label: 'Sector' },
                    { key: 'price', label: 'Price' },
                    { key: 'chg1d', label: 'Δ1d%' },
                    { key: 'mom3m', label: 'Δ3m%' },
                    { key: 'mcap', label: 'MktCap($B)' },
                    { key: 'pe', label: 'P/E' },
                    { key: 'fcfy', label: 'FCFY%' },
                    { key: 'iv30', label: 'IV30%' },
                    { key: 'ivrank', label: 'IVR' }
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      className="px-3 py-2 text-left cursor-pointer hover:bg-muted/70"
                      onClick={() => handleSort(key)}
                    >
                      {label}
                      {sortConfig.key === key && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedStocks.map((stock, index) => (
                  <tr
                    key={stock.symbol}
                    className="border-b hover:bg-muted/30 cursor-pointer"
                    onClick={() => selectStock(stock)}
                  >
                    <td className="px-3 py-2 font-medium">{stock.symbol}</td>
                    <td className="px-3 py-2">{stock.name}</td>
                    <td className="px-3 py-2">{stock.sector}</td>
                    <td className="px-3 py-2">${stock.price.toFixed(2)}</td>
                    <td className={`px-3 py-2 ${stock.chg1d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {stock.chg1d.toFixed(2)}%
                    </td>
                    <td className={`px-3 py-2 ${stock.mom3m >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {stock.mom3m.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2">{stock.mcap.toFixed(1)}</td>
                    <td className="px-3 py-2">{stock.pe.toFixed(1)}</td>
                    <td className={`px-3 py-2 ${stock.fcfy >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {stock.fcfy.toFixed(1)}
                    </td>
                    <td className="px-3 py-2">{stock.iv30.toFixed(1)}</td>
                    <td className="px-3 py-2">{stock.ivrank}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages} ({sortedStocks.length} total)
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </section>

        {/* Right: Preview & Saved Screens */}
        <aside className="col-span-3 bg-card/50 border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <span className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Preview & Screens</span>
            <Badge variant="outline">mock data</Badge>
          </div>

          <div className="p-4 space-y-4 overflow-auto">
            {selectedStock ? (
              <>
                <div>
                  <h3 className="font-medium">{selectedStock.symbol} — {selectedStock.name}</h3>
                  <div className="mt-2 border border-dashed rounded-lg p-2 bg-muted/20">
                    <canvas
                      ref={canvasRef}
                      width={320}
                      height={120}
                      className="w-full h-auto"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div>Sector: <span className="font-bold">{selectedStock.sector}</span></div>
                  <div>Price: <span className="font-bold">${selectedStock.price.toFixed(2)}</span></div>
                  <div>MktCap: <span className="font-bold">{selectedStock.mcap.toFixed(1)}B</span></div>
                  <div>ADV$: <span className="font-bold">{selectedStock.advusd.toFixed(1)}M</span></div>
                  <div>P/E: <span className="font-bold">{selectedStock.pe.toFixed(1)}</span></div>
                  <div>EV/EBITDA: <span className="font-bold">{selectedStock.ev_ebitda.toFixed(1)}</span></div>
                  <div>FCFY: <span className="font-bold">{selectedStock.fcfy.toFixed(1)}%</span></div>
                  <div>3M: <span className="font-bold">{selectedStock.mom3m.toFixed(1)}%</span></div>
                  <div>IV30: <span className="font-bold">{selectedStock.iv30.toFixed(1)}%</span></div>
                  <div>IVR: <span className="font-bold">{selectedStock.ivrank}</span></div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Select a stock to preview</p>
              </div>
            )}

            <hr className="border-border" />

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Saved screens</label>
                <Select
                  value={selectedScreenIndex.toString()}
                  onValueChange={(value) => setSelectedScreenIndex(parseInt(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a screen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {savedScreens.map((screen, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {screen.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Name this screen…"
                  value={screenName}
                  onChange={(e) => setScreenName(e.target.value)}
                  className="flex-1"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button variant="default" size="sm" onClick={saveScreen}>
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={loadScreen}>
                  Load
                </Button>
                <Button variant="outline" size="sm" onClick={deleteScreen}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}