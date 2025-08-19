'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkspaceStore } from '@/lib/store';
import { getProvider } from '@/lib/data/providers';
import { Badge } from '@/components/ui/badge';

type WatchRow = {
  sym: string;
  name: string;
  sector?: string;
  prevClose: number;
  price: number;
  dayLow: number;
  dayHigh: number;
  volume: number;
  mcap: number;
  rsi: number;
  spark: number[];
};

type WatchList = { id: string; name: string; symbols: string[] };

const DEFAULT_SEED: { sym: string; name: string; sector: string }[] = [
  { sym: 'AAPL', name: 'Apple Inc.', sector: 'Tech' },
  { sym: 'MSFT', name: 'Microsoft', sector: 'Tech' },
  { sym: 'NVDA', name: 'NVIDIA', sector: 'Semis' },
  { sym: 'AMZN', name: 'Amazon', sector: 'Consumer' },
  { sym: 'TSLA', name: 'Tesla', sector: 'Auto' },
  { sym: 'META', name: 'Meta', sector: 'Comm' },
  { sym: 'GOOGL', name: 'Alphabet A', sector: 'Comm' },
];

function fmtCap(x: number): string {
  const a = Math.abs(x);
  if (a >= 1e12) return (x / 1e12).toFixed(2) + 'T';
  if (a >= 1e9) return (x / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return (x / 1e6).toFixed(1) + 'M';
  return x.toFixed(0);
}

function fmtPrice(sym: string, p: number): string {
  return /-USD$/.test(sym) ? p.toFixed(0) : p.toFixed(2);
}

function drawSpark(canvas: HTMLCanvasElement, data: number[]) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const min = Math.min(...data);
  const max = Math.max(...data);
  ctx.clearRect(0, 0, W, H);
  ctx.beginPath();
  data.forEach((y, i) => {
    const X = i * (W / Math.max(1, data.length - 1));
    const Y = H - ((y - min) / (max - min + 1e-9)) * H;
    if (i === 0) ctx.moveTo(X, Y);
    else ctx.lineTo(X, Y);
  });
  ctx.strokeStyle = 'rgba(125, 200, 247, 0.95)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export default function WatchlistPage() {
  const { theme } = useWorkspaceStore();
  // Storage keys

  const [lists, setLists] = useState<WatchList[]>([
    { id: 'default', name: 'All Assets', symbols: DEFAULT_SEED.map((x) => x.sym) },
  ]);
  const [activeList, setActiveList] = useState<string>('default');
  const [rows, setRows] = useState<Record<string, WatchRow>>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set(['NVDA', 'AAPL']));
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'sym' | 'price' | 'chg' | 'chp' | 'rsi'>('sym');
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [newSymbol, setNewSymbol] = useState('');
  const [newListName, setNewListName] = useState('');

  // Alerts
  // type AlertRule = { sym: string; type: 'price_gt' | 'price_lt' | 'chg_pct_gt' | 'chg_pct_lt' | 'rsi_gt' | 'rsi_lt'; value: number };

  // Initialize rows with synthetic baseline and provider-enhanced values
  useEffect(() => {
    let mounted = true;
    (async () => {
      const provider = getProvider();
      const initial: Record<string, WatchRow> = {};
      for (const base of DEFAULT_SEED) {
        const kpi = await provider.getKpis(base.sym);
        const price = kpi.price;
        const prevClose = price * (1 + (Math.random() - 0.5) * 0.01);
        initial[base.sym] = {
          sym: base.sym,
          name: base.name,
          sector: base.sector,
          prevClose,
          price,
          dayLow: price * (1 - (0.008 + Math.random() * 0.012)),
          dayHigh: price * (1 + (0.008 + Math.random() * 0.012)),
          volume: Math.floor(1e6 + Math.random() * 2.2e7),
          mcap: price * (1e9 + Math.random() * 5e10),
          rsi: Math.floor(30 + Math.random() * 40),
          spark: Array.from({ length: 60 }, (_, i) => price * (1 + 0.001 * i + (Math.random() - 0.5) * 0.02)),
        };
      }
      if (mounted) setRows(initial);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Ticker refresh
  useEffect(() => {
    const id = setInterval(() => {
      setRows((prev) => {
        const next = { ...prev };
        const t = Date.now();
        Object.values(next).forEach((r) => {
          const drift = Math.sin(t / 60000 + r.sym.length) * 0.0005;
          const shock = (Math.random() - 0.5) * 0.0035;
          const newP = Math.max(0.01, r.price * (1 + drift + shock));
          r.price = newP;
          r.rsi = Math.max(10, Math.min(90, r.rsi + (Math.random() - 0.5) * 2));
          r.spark = [...r.spark, newP].slice(-60);
        });
        return next;
      });
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const activeSymbols = useMemo(() => {
    const l = lists.find((x) => x.id === activeList);
    return (l ? l.symbols : Object.keys(rows)).slice();
  }, [lists, activeList, rows]);

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const syms = activeSymbols.filter((s) => {
      const r = rows[s];
      return (
        !q ||
        r?.sym.toLowerCase().includes(q) ||
        r?.name.toLowerCase().includes(q) ||
        (r?.sector || '').toLowerCase().includes(q)
      );
    });
    syms.sort((a, b) => {
      const ra = rows[a];
      const rb = rows[b];
      let va: number | string = ra?.sym || '';
      let vb: number | string = rb?.sym || '';
      switch (sortBy) {
        case 'price':
          va = ra?.price || 0;
          vb = rb?.price || 0;
          break;
        case 'chg':
          va = (ra?.price || 0) - (ra?.prevClose || 0);
          vb = (rb?.price || 0) - (rb?.prevClose || 0);
          break;
        case 'chp':
          va = ((ra?.price || 0) - (ra?.prevClose || 0)) / Math.max(1e-9, ra?.prevClose || 1);
          vb = ((rb?.price || 0) - (rb?.prevClose || 0)) / Math.max(1e-9, rb?.prevClose || 1);
          break;
        case 'rsi':
          va = ra?.rsi || 0;
          vb = rb?.rsi || 0;
          break;
        default:
          va = ra?.sym || '';
          vb = rb?.sym || '';
      }
      return (va > vb ? 1 : va < vb ? -1 : 0) * sortDir;
    });
    return syms;
  }, [activeSymbols, rows, search, sortBy, sortDir]);

  const addSymbol = () => {
    const raw = newSymbol.trim().toUpperCase();
    if (!raw) return;
    setRows((prev) => {
      if (prev[raw]) return prev;
      const p = 20 + Math.random() * 200;
      return {
        ...prev,
        [raw]: {
          sym: raw,
          name: raw.includes('-USD') ? raw.replace('-USD', '') + ' (Crypto)' : 'New Asset',
          sector: 'Other',
          prevClose: p * (1 + (Math.random() - 0.5) * 0.01),
          price: p,
          dayLow: p * (1 - (0.008 + Math.random() * 0.012)),
          dayHigh: p * (1 + (0.008 + Math.random() * 0.012)),
          volume: Math.floor(1e6 + Math.random() * 2.2e7),
          mcap: p * (1e9 + Math.random() * 5e10),
          rsi: Math.floor(30 + Math.random() * 40),
          spark: Array.from({ length: 60 }, (_, i) => p * (1 + 0.001 * i + (Math.random() - 0.5) * 0.02)),
        },
      };
    });
    setLists((prev) => {
      const idx = prev.findIndex((l) => l.id === activeList);
      if (idx === -1) return prev;
      const l = prev[idx];
      if (!l.symbols.includes(raw)) l.symbols = [...l.symbols, raw];
      const next = [...prev];
      next[idx] = { ...l };
      return next;
    });
    setNewSymbol('');
  };

  const createList = () => {
    const name = newListName.trim();
    if (!name) return;
    const id = Math.random().toString(36).slice(2, 8);
    setLists((prev) => [...prev, { id, name, symbols: [] }]);
    setActiveList(id);
    setNewListName('');
  };

  // Theme select reflects Malibu themes and default
  const [localTheme, setLocalTheme] = useState<'malibu-sunrise' | 'malibu-sunset' | 'dark' | 'light'>(
    theme === 'malibu-sunrise' || theme === 'malibu-sunset' ? theme : 'malibu-sunset'
  );
  useEffect(() => {
    // Sync global theme when switched locally
    const m = useWorkspaceStore.getState();
    m.setTheme(localTheme);
  }, [localTheme]);

  return (
    <div className="min-h-screen bg-[radial-gradient(900px_500px_at_15%_-10%,rgba(125,200,247,0.25),transparent_55%),radial-gradient(800px_520px_at_85%_8%,rgba(255,126,182,0.18),transparent_60%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background))) ]">
      {/* Titlebar */}
      <div className="h-14 flex items-center gap-3 px-4 border-b bg-[linear-gradient(180deg,rgba(125,200,247,0.08),rgba(255,255,255,0.02))]">
        <div className="w-5 h-5 rounded-md bg-[conic-gradient(from_120deg,#7DC8F7,#FFD29D,#FF7EB6,#7DC8F7)] shadow-[0_0_8px_rgba(125,200,247,0.55)]" />
        <div className="font-semibold tracking-wide">MAD LAB — Watchlist</div>
        <Badge variant="outline" className="ml-1">Malibu</Badge>
        <div className="flex-1" />
        <Input value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)} placeholder="Add symbol (e.g., NVDA, BTC-USD)" className="w-48 h-8" />
        <Button onClick={addSymbol} className="h-8 ml-2">Add</Button>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter… (⌘F)" className="w-48 h-8 ml-3" />
        <Select value={localTheme} onValueChange={(v: 'malibu-sunrise' | 'malibu-sunset' | 'dark' | 'light') => setLocalTheme(v)}>
          <SelectTrigger className="w-36 h-8 ml-3">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="malibu-sunrise">Sunrise</SelectItem>
            <SelectItem value="malibu-sunset">Sunset</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
            <SelectItem value="light">Light</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main layout */}
      <div className="grid md:grid-cols-[260px_1fr_360px] grid-cols-1 gap-2 p-2 min-h-[calc(100vh-56px)]">
        {/* Lists */}
        <Card className="overflow-hidden">
          <div className="px-3 py-2 border-b flex items-center justify-between">
            <div className="text-[12px] uppercase tracking-wide text-muted-foreground">Lists</div>
            <div className="text-[11px] px-2 py-0.5 rounded-full border">{lists.reduce((a, b) => a + b.symbols.length, 0)}</div>
          </div>
          <div className="p-2">
            <div className="grid gap-2">
              {lists.map((l) => (
                <button
                  key={l.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-md border ${
                    l.id === activeList ? 'outline outline-1 outline-primary/70 bg-primary/10' : 'bg-muted'
                  }`}
                  onClick={() => setActiveList(l.id)}
                >
                  <span className="text-sm">{l.name}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full border">{l.symbols.length}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <Input value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="New list name" className="h-8" />
              <Button variant="secondary" className="h-8" onClick={createList}>
                Create
              </Button>
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="px-3 py-2 border-b flex items-center justify-between">
            <div className="text-[12px] uppercase tracking-wide text-muted-foreground">Watchlist</div>
            <div className="text-[11px] px-2 py-0.5 rounded-full border">Refreshed just now</div>
          </div>
          <div className="p-2">
            <div className="overflow-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-right sticky top-0 bg-background/80 backdrop-blur">
                    <th className="w-6" />
                    <th className="text-left p-2 cursor-pointer" onClick={() => { setSortBy('sym'); setSortDir(sortBy === 'sym' ? (sortDir === 1 ? -1 : 1) : 1); }}>Symbol</th>
                    <th className="text-left p-2">Name</th>
                    <th className="p-2 cursor-pointer" onClick={() => { setSortBy('price'); setSortDir(sortBy === 'price' ? (sortDir === 1 ? -1 : 1) : 1); }}>Price</th>
                    <th className="p-2">Δ</th>
                    <th className="p-2 cursor-pointer" onClick={() => { setSortBy('chp'); setSortDir(sortBy === 'chp' ? (sortDir === 1 ? -1 : 1) : 1); }}>Δ%</th>
                    <th className="p-2">Day Range</th>
                    <th className="p-2">Vol</th>
                    <th className="p-2">Mkt Cap</th>
                    <th className="p-2 cursor-pointer" onClick={() => { setSortBy('rsi'); setSortDir(sortBy === 'rsi' ? (sortDir === 1 ? -1 : 1) : 1); }}>RSI</th>
                    <th className="p-2">Spark</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSorted.map((s) => {
                    const r = rows[s];
                    if (!r) return null;
                    const ch = r.price - r.prevClose;
                    const chp = (ch / Math.max(1e-9, r.prevClose)) * 100;
                    return (
                      <tr key={s} className="text-right border-b">
                        <td className="p-2">
                          <button
                            className="text-yellow-400"
                            title="Favorite"
                            onClick={() => {
                              setFavorites((prev) => {
                                const next = new Set(prev);
                                if (next.has(s)) next.delete(s);
                                else next.add(s);
                                return next;
                              });
                            }}
                          >
                            {favorites.has(s) ? '★' : '☆'}
                          </button>
                        </td>
                        <td className="p-2 text-left font-semibold tracking-wide">{r.sym}</td>
                        <td className="p-2 text-left text-muted-foreground">{r.name}</td>
                        <td className="p-2">{fmtPrice(r.sym, r.price)}</td>
                        <td className={ch >= 0 ? 'text-emerald-400 p-2' : 'text-red-400 p-2'}>
                          {(ch >= 0 ? '+' : '') + fmtPrice(r.sym, ch)}
                        </td>
                        <td className={chp >= 0 ? 'text-emerald-400 p-2' : 'text-red-400 p-2'}>
                          {(chp >= 0 ? '+' : '') + chp.toFixed(2)}%
                        </td>
                        <td className="p-2">
                          <div className="h-1.5 rounded-full border bg-muted relative">
                            {(() => {
                              const pct = (r.price - r.dayLow) / Math.max(1e-9, r.dayHigh - r.dayLow);
                              return <i style={{ position: 'absolute', top: -3, left: `${(pct * 100).toFixed(1)}%` }} className="block w-0.5 h-3 bg-primary rounded" />;
                            })()}
                          </div>
                        </td>
                        <td className="p-2">{(r.volume / 1e6).toFixed(1)}M</td>
                        <td className="p-2">{fmtCap(r.mcap)}</td>
                        <td className="p-2">{r.rsi}</td>
                        <td className="p-2">
                          <canvas className="w-[110px] h-[28px]" width={110} height={28}
                            ref={(el) => {
                              if (el) drawSpark(el, r.spark);
                            }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        {/* Right widgets */}
        <div className="grid gap-2">
          <Card>
            <div className="px-3 py-2 border-b text-[12px] uppercase tracking-wide text-muted-foreground">Market Overview</div>
            <div id="overview" className="p-3 grid grid-cols-2 gap-2">
              {[
                { sym: 'SPX', name: 'S&P 500', price: 5500, chp: (Math.random() - 0.5) * 0.6 },
                { sym: 'NDX', name: 'Nasdaq 100', price: 20000, chp: (Math.random() - 0.5) * 0.9 },
                { sym: 'RUT', name: 'Russell 2k', price: 2200, chp: (Math.random() - 0.5) * 0.8 },
                { sym: 'VIX', name: 'VIX', price: 13.2, chp: (Math.random() - 0.5) * 4 },
              ].map((x) => (
                <div key={x.sym} className="border rounded p-2">
                  <div className="flex justify-between text-xs"><b>{x.sym}</b><span className="text-muted-foreground">{x.name}</span></div>
                  <div className="font-semibold">
                    {x.price.toFixed(1)}{' '}
                    <span className={x.chp >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {(x.chp >= 0 ? '+' : '') + x.chp.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div className="px-3 py-2 border-b text-[12px] uppercase tracking-wide text-muted-foreground">Top Movers</div>
            <div className="p-3 text-xs space-y-1">
              {useMemo(() => {
                const arr = activeSymbols.map((s) => {
                  const r = rows[s];
                  const chp = ((r?.price || 0) - (r?.prevClose || 0)) / Math.max(1e-9, r?.prevClose || 1) * 100;
                  return { sym: s, chp };
                });
                arr.sort((a, b) => Math.abs(b.chp) - Math.abs(a.chp));
                const top = arr.slice(0, 5);
                const bot = arr.slice(-5).reverse();
                return (
                  <div>
                    <div className="mb-1 text-muted-foreground">Gainers</div>
                    {top.map((x) => (
                      <div key={'g-' + x.sym} className="flex justify-between"><span>{x.sym}</span><span className={x.chp >= 0 ? 'text-emerald-400' : 'text-red-400'}>{(x.chp >= 0 ? '+' : '') + x.chp.toFixed(2)}%</span></div>
                    ))}
                    <div className="my-1 text-muted-foreground">Losers</div>
                    {bot.map((x) => (
                      <div key={'l-' + x.sym} className="flex justify-between"><span>{x.sym}</span><span className={x.chp >= 0 ? 'text-emerald-400' : 'text-red-400'}>{(x.chp >= 0 ? '+' : '') + x.chp.toFixed(2)}%</span></div>
                    ))}
                  </div>
                );
              }, [activeSymbols, rows])}
            </div>
          </Card>
          <Card>
            <div className="px-3 py-2 border-b text-[12px] uppercase tracking-wide text-muted-foreground">Alerts</div>
            <div className="p-3 text-xs">
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-primary" /> Notify on ±3% moves</label>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}


