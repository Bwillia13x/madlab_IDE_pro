'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useWorkspaceStore } from '@/lib/store';

function cls(x: number) { return x >= 0 ? 'text-emerald-400' : 'text-red-400'; }
function fmtPct(x: number) { const s = x >= 0 ? '+' : ''; return s + (x * 100).toFixed(2) + '%'; }
function fmtBps(x: number) { const s = x >= 0 ? '+' : ''; return s + x.toFixed(0) + ' bp'; }

function drawSpark(canvas: HTMLCanvasElement, n = 60, drift = 0, vol = 0.7) {
  const ctx = canvas.getContext('2d'); if (!ctx) return; const W = canvas.width, H = canvas.height;
  const ys: number[] = []; let p = 1;
  for (let i = 0; i < n; i++) { p *= 1 + (drift / 1000) + ((Math.random() - 0.5) * vol) / 100; ys.push(p); }
  const min = Math.min(...ys), max = Math.max(...ys);
  ctx.clearRect(0, 0, W, H); ctx.beginPath(); ys.forEach((y, i) => { const X = i * (W / Math.max(1, n - 1)); const Y = H - ((y - min) / (max - min + 1e-9)) * H; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
  ctx.strokeStyle = 'rgba(125,200,247,0.95)'; ctx.lineWidth = 1.6; ctx.stroke();
}

function heatColor(pct: number) { // green to red
  const g = Math.max(0, Math.min(1, (pct + 2) / 4)); // map -2..+2% → 0..1
  const r = 1 - g; const a = 0.75;
  // Approximate color-mix with RGBA for TSX
  const green = `rgba(50,214,147,${a * g})`; const red = `rgba(255,107,107,${a * r})`;
  return `linear-gradient(90deg, ${green}, ${red})`;
}

export default function MarketOverviewPage() {
  const { theme, setTheme } = useWorkspaceStore();

  // Base values
  const base = useMemo(() => ({
    spx: { px: 5550, chg: 0 }, ndx: { px: 20350, chg: 0 }, rut: { px: 2320, chg: 0 },
    y2: 4.42, y10: 4.18, y30: 4.28,
    dxy: 103.6, eur: 1.09, jpy: 156.2,
    btc: 64000, eth: 3200,
    vix: 15.2, vvix: 89, rv5: 9.8, term: 0.7,
  }), []);

  // Controls
  const [mv, setMv] = useState(0); // % move
  const [bps, setBps] = useState(0); // rates bps
  const [fx, setFx] = useState(0); // USD shock %
  const [cc, setCc] = useState(0); // Crypto shock %

  // Refs for sparklines
  const sEqRef = useRef<HTMLCanvasElement | null>(null);
  const sFxRef = useRef<HTMLCanvasElement | null>(null);
  const sCcRef = useRef<HTMLCanvasElement | null>(null);
  const vixRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      if (sEqRef.current) drawSpark(sEqRef.current, 60, mv, 0.5 + Math.abs(mv));
      if (sFxRef.current) drawSpark(sFxRef.current, 60, fx, 0.4 + Math.abs(fx));
      if (sCcRef.current) drawSpark(sCcRef.current, 60, cc, 1.0 + Math.abs(cc));
      if (vixRef.current) {
        const c = vixRef.current; const ctx = c.getContext('2d'); if (!ctx) return; const W = c.width, H = c.height; ctx.clearRect(0, 0, W, H);
        // bands
        ctx.fillStyle = 'rgba(50,214,147,.08)'; ctx.fillRect(0, H - (13 / 40) * H, W, (13 / 40) * H);
        ctx.fillStyle = 'rgba(255,204,102,.08)'; ctx.fillRect(0, H - (20 / 40) * H, W, (20 / 40 - 13 / 40) * H);
        ctx.fillStyle = 'rgba(255,107,107,.08)'; ctx.fillRect(0, H - (30 / 40) * H, W, (30 / 40 - 20 / 40) * H);
        // series mock ending at v
        const v = Math.max(10, base.vix * (1 - mv * 0.6 / 100) + Math.abs(mv) * 1.2);
        const n = 60; const ys: number[] = []; let p = v * (0.9 + 0.2 * Math.random());
        for (let i = 0; i < n; i++) { p = p * (0.99 + 0.02 * Math.random()); ys.push(p); }
        ys[n - 1] = v; const min = 8, max = 40; ctx.beginPath(); ys.forEach((y, i) => { const X = i * (W / (n - 1)); const Y = H - ((y - min) / (max - min)) * H; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.strokeStyle = 'rgba(255,126,182,0.9)'; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.fillStyle = 'rgba(230,240,255,.85)'; ctx.fillText('VIX regime', 8, 14);
      }
    }, 3000);
    return () => clearInterval(id);
  }, [mv, fx, cc, base.vix]);

  // Derived values
  const eq = useMemo(() => ({
    spx: { px: base.spx.px * (1 + mv / 100), chg: mv / 100 },
    ndx: { px: base.ndx.px * (1 + (mv * 1.2) / 100), chg: (mv * 1.2) / 100 },
    rut: { px: base.rut.px * (1 + (mv * 0.9) / 100), chg: (mv * 0.9) / 100 },
  }), [base, mv]);
  const rates = useMemo(() => ({
    y2: base.y2 + bps / 100, y10: base.y10 + (bps * 0.6) / 100, y30: base.y30 + (bps * 0.4) / 100,
    slope: (base.y10 + (bps * 0.6) / 100 - (base.y2 + bps / 100)) * 100,
  }), [base, bps]);
  const fxm = useMemo(() => ({ dxy: base.dxy * (1 + fx / 100), eur: base.eur * (1 - fx / 300), jpy: base.jpy * (1 + fx / 50) }), [base, fx]);
  const ccm = useMemo(() => ({ btc: base.btc * (1 + cc / 100), eth: base.eth * (1 + (cc * 1.4) / 100) }), [base, cc]);
  const breadth = useMemo(() => { const adv = Math.round(250 + 120 * Math.max(0, 1 + mv / 3)); const decl = 500 - adv; const upv = Math.max(0.2, Math.min(0.85, 0.5 + mv / 5)); const trin = (decl / adv) / (1 - upv); return { adv, decl, upv, trin }; }, [mv]);
  const vix = useMemo(() => Math.max(10, base.vix * (1 - mv * 0.6 / 100) + Math.abs(mv) * 1.2), [base.vix, mv]);
  const vvix = useMemo(() => Math.max(70, base.vvix + Math.sign(mv) * -4 + Math.abs(mv) * 3), [base.vvix, mv]);
  const rv5 = useMemo(() => Math.max(4, base.rv5 + Math.abs(mv) * 0.7), [base.rv5, mv]);
  const term = useMemo(() => base.term + (mv > 0 ? 0.05 : -0.05), [base.term, mv]);
  const regime = useMemo(() => (vix < 13 ? 'Calm' : vix < 20 ? 'Elevated' : vix < 30 ? 'Stressed' : 'Crisis'), [vix]);

  const sectors: [string, string][] = useMemo(() => ([
    ['XLK', 'Tech'], ['XLF', 'Fin'], ['XLY', 'Disc'], ['XLP', 'Stap'], ['XLV', 'HC'], ['XLI', 'Indu'],
    ['XLE', 'Energy'], ['XLU', 'Util'], ['XLRE', 'RE'], ['XLB', 'Mat'], ['XLC', 'Comm'],
  ]), []);

  return (
    <div className="min-h-screen bg-[radial-gradient(900px_500px_at_15%_-10%,rgba(125,200,247,0.25),transparent_55%),radial-gradient(800px_520px_at_85%_8%,rgba(255,126,182,0.18),transparent_60%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background))) ]">
      {/* Titlebar */}
      <div className="h-14 flex items-center gap-3 px-4 border-b bg-[linear-gradient(180deg,rgba(125,200,247,0.08),rgba(255,255,255,0.02))]">
        <div className="w-5 h-5 rounded-md bg-[conic-gradient(from_120deg,#7DC8F7,#FFD29D,#FF7EB6,#7DC8F7)] shadow-[0_0_8px_rgba(125,200,247,0.55)]" />
        <div className="font-semibold tracking-wide">MAD LAB — Market Overview</div>
        <Badge variant="outline" className="ml-1">/market</Badge>
        <div className="flex-1" />
        <div className="text-xs text-muted-foreground">Theme</div>
        <Select value={theme} onValueChange={(v: 'malibu-sunrise' | 'malibu-sunset' | 'dark' | 'light') => setTheme(v)}>
          <SelectTrigger className="w-36 h-8 ml-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="malibu-sunrise">Sunrise</SelectItem>
            <SelectItem value="malibu-sunset">Sunset</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
            <SelectItem value="light">Light</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main */}
      <div className="grid md:grid-cols-[320px_1fr_420px] grid-cols-1 grid-rows-[auto_1fr] gap-2 p-2 min-h-[calc(100vh-56px)]">
        {/* Left: Macro snapshot */}
        <Card className="overflow-hidden">
          <div className="px-3 py-2 border-b flex items-center justify-between"><div className="text-[12px] uppercase tracking-wide text-muted-foreground">Macro Snapshot</div><div className="text-[11px] px-2 py-0.5 rounded-full border">mock data</div></div>
          <div className="p-2 grid gap-2">
            <div className="border rounded-lg p-2">
              <div className="text-[12px] text-muted-foreground mb-1">Equity Indices — SPX / NDX / RUT</div>
              <div className="flex items-center justify-between gap-3">
                <div><div className="text-xs text-muted-foreground">SPX</div><div className="text-lg font-extrabold">{eq.spx.px.toFixed(0)} <span className={`font-bold ${cls(eq.spx.chg)}`}>{fmtPct(eq.spx.chg)}</span></div></div>
                <div><div className="text-xs text-muted-foreground">NDX</div><div className="text-lg font-extrabold">{eq.ndx.px.toFixed(0)} <span className={`font-bold ${cls(eq.ndx.chg)}`}>{fmtPct(eq.ndx.chg)}</span></div></div>
                <div><div className="text-xs text-muted-foreground">RUT</div><div className="text-lg font-extrabold">{eq.rut.px.toFixed(0)} <span className={`font-bold ${cls(eq.rut.chg)}`}>{fmtPct(eq.rut.chg)}</span></div></div>
                <div className="border border-dashed rounded p-1 grid place-items-center"><canvas ref={sEqRef} width={180} height={50} /></div>
              </div>
            </div>

            <div className="border rounded-lg p-2">
              <div className="text-[12px] text-muted-foreground mb-1">US Treasury Yields</div>
              <div className="flex items-center justify-between gap-3">
                <div><div className="text-xs text-muted-foreground">2Y</div><div className="text-lg font-extrabold">{rates.y2.toFixed(2)}%</div></div>
                <div><div className="text-xs text-muted-foreground">10Y</div><div className="text-lg font-extrabold">{rates.y10.toFixed(2)}%</div></div>
                <div><div className="text-xs text-muted-foreground">30Y</div><div className="text-lg font-extrabold">{rates.y30.toFixed(2)}%</div></div>
                <div><div className="text-xs text-muted-foreground">2s10s</div><div className="text-lg font-extrabold">{fmtBps(rates.slope)}</div></div>
              </div>
            </div>

            <div className="border rounded-lg p-2">
              <div className="text-[12px] text-muted-foreground mb-1">FX Majors</div>
              <div className="flex items-center justify-between gap-3">
                <div><div className="text-xs text-muted-foreground">DXY</div><div className="text-lg font-extrabold">{fxm.dxy.toFixed(1)} <span className={`font-bold ${cls(fx)}`}>{fmtPct(fx / 100)}</span></div></div>
                <div><div className="text-xs text-muted-foreground">EURUSD</div><div className="text-lg font-extrabold">{fxm.eur.toFixed(3)}</div></div>
                <div><div className="text-xs text-muted-foreground">USDJPY</div><div className="text-lg font-extrabold">{fxm.jpy.toFixed(1)}</div></div>
                <div className="border border-dashed rounded p-1 grid place-items-center"><canvas ref={sFxRef} width={180} height={50} /></div>
              </div>
            </div>

            <div className="border rounded-lg p-2">
              <div className="text-[12px] text-muted-foreground mb-1">Crypto</div>
              <div className="flex items-center justify-between gap-3">
                <div><div className="text-xs text-muted-foreground">BTC</div><div className="text-lg font-extrabold">{ccm.btc.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className={`font-bold ${cls(cc)}`}>{fmtPct(cc / 100)}</span></div></div>
                <div><div className="text-xs text-muted-foreground">ETH</div><div className="text-lg font-extrabold">{ccm.eth.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className={`font-bold ${cls((cc * 1.4))}`}>{fmtPct((cc * 1.4) / 100)}</span></div></div>
                <div className="border border-dashed rounded p-1 grid place-items-center"><canvas ref={sCcRef} width={180} height={50} /></div>
              </div>
            </div>

            <div className="border rounded-lg p-2">
              <div className="text-[12px] text-muted-foreground mb-1">Breadth</div>
              <table className="w-full text-xs font-mono text-[#dce6ff]">
                <tbody>
                  <tr className="border-b"><td className="p-1 text-left">Adv / Decl</td><td className="p-1 text-right">{breadth.adv} / {breadth.decl}</td></tr>
                  <tr className="border-b"><td className="p-1 text-left">Up Volume</td><td className="p-1 text-right">{(breadth.upv * 100).toFixed(0)}%</td></tr>
                  <tr><td className="p-1 text-left">TRIN</td><td className="p-1 text-right">{breadth.trin.toFixed(2)} <span className={breadth.trin < 1 ? 'text-emerald-400' : 'text-red-400'}>{breadth.trin < 1 ? '(risk‑on)' : '(risk‑off)'}</span></td></tr>
                </tbody>
              </table>
            </div>

            <div className="border rounded-lg p-2">
              <div className="text-[12px] text-muted-foreground mb-1">Session Controls</div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <label>Market move (Δ %)<input className="w-full mt-1" type="range" min={-3} max={3} step={0.1} value={mv} onChange={(e) => setMv(parseFloat(e.target.value))} /></label>
                <label>Rates shock (bps)<input className="w-full mt-1" type="range" min={-25} max={25} step={1} value={bps} onChange={(e) => setBps(parseFloat(e.target.value))} /></label>
                <label>USD shock (%)<input className="w-full mt-1" type="range" min={-1.5} max={1.5} step={0.1} value={fx} onChange={(e) => setFx(parseFloat(e.target.value))} /></label>
                <label>Crypto shock (%)<input className="w-full mt-1" type="range" min={-5} max={5} step={0.25} value={cc} onChange={(e) => setCc(parseFloat(e.target.value))} /></label>
              </div>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" onClick={() => { setMv(0); setBps(0); setFx(0); setCc(0); }}>Reset</Button>
                <Button onClick={() => {
                  const snapshot = {
                    ts: new Date().toISOString(),
                    indices: { spx: `${eq.spx.px.toFixed(0)} ${fmtPct(eq.spx.chg)}`, ndx: `${eq.ndx.px.toFixed(0)} ${fmtPct(eq.ndx.chg)}`, rut: `${eq.rut.px.toFixed(0)} ${fmtPct(eq.rut.chg)}` },
                    rates: { y2: `${rates.y2.toFixed(2)}%`, y10: `${rates.y10.toFixed(2)}%`, y30: `${rates.y30.toFixed(2)}%`, slope: fmtBps(rates.slope) },
                    fx: { dxy: `${fxm.dxy.toFixed(1)} ${fmtPct(fx / 100)}`, eur: `${fxm.eur.toFixed(3)}`, jpy: `${fxm.jpy.toFixed(1)}` },
                    crypto: { btc: ccm.btc.toFixed(0), eth: ccm.eth.toFixed(0) },
                    breadth: { advdecl: `${breadth.adv} / ${breadth.decl}`, upvol: `${(breadth.upv * 100).toFixed(0)}%`, trin: breadth.trin.toFixed(2) },
                    vol: { vix: vix.toFixed(1), vvix: vvix.toFixed(0), rv5: `${rv5.toFixed(1)}%`, spread: (vix - rv5).toFixed(1), term: `${term.toFixed(2)} pts`, regime },
                  };
                  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
                  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'market_snapshot.json'; a.click(); URL.revokeObjectURL(a.href);
                }}>Export snapshot JSON</Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Center: Heatmap */}
        <Card className="overflow-hidden">
          <div className="px-3 py-2 border-b flex items-center justify-between"><div className="text-[12px] uppercase tracking-wide text-muted-foreground">Sectors Heat (SPX)</div><div className="text-[11px] px-2 py-0.5 rounded-full border">click to shuffle</div></div>
          <div className="p-2">
            <div className="grid grid-cols-6 auto-rows-[56px] gap-1">
              {sectors.map(([sym, name]) => {
                const beta = sym === 'XLK' || sym === 'XLY' || sym === 'XLC' ? 1.2 : sym === 'XLU' || sym === 'XLP' || sym === 'XLRE' ? 0.6 : 1.0;
                const pct = mv * beta + (Math.random() - 0.5) * 0.8;
                return (
                  <div key={sym} className="rounded-lg border px-2 py-1 flex items-center justify-between text-[12px]"
                    style={{ background: heatColor(pct) }}
                    title={name}
                  >
                    <span className="font-semibold">{sym} <span className="opacity-80 font-normal">{name}</span></span>
                    <span className={pct >= 0 ? 'text-emerald-400' : 'text-red-400'}>{pct.toFixed(2)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Right: Vol Regime */}
        <Card className="overflow-hidden">
          <div className="px-3 py-2 border-b flex items-center justify-between"><div className="text-[12px] uppercase tracking-wide text-muted-foreground">Volatility Regime</div><div className="text-[11px] px-2 py-0.5 rounded-full border">{regime}</div></div>
          <div className="p-2">
            <div className="border border-dashed rounded grid place-items-center min-h-[70px]"><canvas ref={vixRef} width={360} height={110} /></div>
            <table className="w-full text-xs font-mono text-[#dce6ff] mt-2">
              <tbody>
                <tr className="border-b"><td className="p-1 text-left">VIX</td><td className="p-1 text-right">{vix.toFixed(1)}</td></tr>
                <tr className="border-b"><td className="p-1 text-left">VVIX</td><td className="p-1 text-right">{vvix.toFixed(0)}</td></tr>
                <tr className="border-b"><td className="p-1 text-left">5d RV (SPX)</td><td className="p-1 text-right">{rv5.toFixed(1)}%</td></tr>
                <tr className="border-b"><td className="p-1 text-left">IV − RV (pts)</td><td className="p-1 text-right">{(vix - rv5).toFixed(1)}</td></tr>
                <tr><td className="p-1 text-left">Term slope (1m−3m)</td><td className="p-1 text-right">{term.toFixed(2)} pts</td></tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}


