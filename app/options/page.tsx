'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useWorkspaceStore } from '@/lib/store';

type Underlying = { S: number; iv: number; r: number };
type Position = { u: string; type: 'C' | 'P'; K: number; qty: number; iv: number; dte: number };
type GreeksAgg = { delta: number; gamma: number; theta: number; vega: number };

function N_pdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}
function N_cdf(x: number): number {
  const a1 = 0.31938153, a2 = -0.356563782, a3 = 1.781477937, a4 = -1.821255978, a5 = 1.330274429;
  const L = Math.abs(x);
  const k = 1 / (1 + 0.2316419 * L);
  // Polynomial approximation (Abramowitz and Stegun)
  const w = 1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-L * L / 2) * (a1 * k + a2 * k ** 2 + a3 * k ** 3 + a4 * k ** 4 + a5 * k ** 5);
  return x < 0 ? 1 - w : w;
}
function bsAll(S: number, K: number, r: number, sig: number, T: number, isCall: boolean) {
  const sqrtT = Math.sqrt(Math.max(T, 1 / 365));
  const d1 = (Math.log(S / K) + (r + 0.5 * sig * sig) * T) / (sig * sqrtT);
  const d2 = d1 - sig * sqrtT;
  const price = isCall ? S * N_cdf(d1) - K * Math.exp(-r * T) * N_cdf(d2) : K * Math.exp(-r * T) * N_cdf(-d2) - S * N_cdf(-d1);
  const delta = isCall ? N_cdf(d1) : N_cdf(d1) - 1;
  const gamma = N_pdf(d1) / (S * sig * sqrtT);
  const vega = S * N_pdf(d1) * sqrtT; // per 100%
  const vegaPt = vega * 0.01; // per 1 vol point
  const theta = (-(S * N_pdf(d1) * sig) / (2 * sqrtT) - (isCall ? r * K * Math.exp(-r * T) * N_cdf(d2) : -r * K * Math.exp(-r * T) * N_cdf(-d2))) / 365;
  return { price, delta, gamma, theta, vegaPt };
}

function fmtMoney(x: number): string {
  const s = x < 0 ? '-' : '';
  const a = Math.abs(x);
  const v = a >= 1e9 ? (a / 1e9).toFixed(2) + 'B' : a >= 1e6 ? (a / 1e6).toFixed(2) + 'M' : a >= 1e3 ? (a / 1e3).toFixed(1) + 'k' : a.toFixed(2);
  return s + '$' + v;
}

export default function OptionsTraderPage() {
  const { theme, setTheme } = useWorkspaceStore();

  const mult = 100;
  const [underlyings] = useState<Record<string, Underlying>>({
    SPY: { S: 550, iv: 0.21, r: 0.02 },
    NVDA: { S: 1175, iv: 0.54, r: 0.02 },
    AAPL: { S: 191, iv: 0.28, r: 0.02 },
    TSLA: { S: 245, iv: 0.62, r: 0.02 },
  });
  const [positions] = useState<Position[]>([
    { u: 'NVDA', type: 'C', K: 1100, qty: -10, iv: 0.52, dte: 35 },
    { u: 'NVDA', type: 'P', K: 1000, qty: 8, iv: 0.56, dte: 35 },
    { u: 'SPY', type: 'P', K: 500, qty: 50, iv: 0.22, dte: 60 },
    { u: 'AAPL', type: 'C', K: 200, qty: 30, iv: 0.30, dte: 20 },
    { u: 'TSLA', type: 'P', K: 210, qty: -20, iv: 0.65, dte: 15 },
  ]);
  const [selectedU, setSelectedU] = useState<string>('NVDA');
  const [shockPrice, setShockPrice] = useState(0);
  const [shockIV, setShockIV] = useState(0);
  const [shockDays, setShockDays] = useState(0);

  const barGreeksRef = useRef<HTMLCanvasElement | null>(null);
  const payoffRef = useRef<HTMLCanvasElement | null>(null);
  const skewRef = useRef<HTMLCanvasElement | null>(null);

  const orders = useMemo(() => [
    { u: 'NVDA', text: 'Sell 5x 1180C @ 32.40 LMT', status: 'Working' },
    { u: 'AAPL', text: 'Buy 10x 190P @ 2.15 LMT', status: 'Working' },
    { u: 'SPY', text: 'Close 20x 510P @ MKT', status: 'Pending' },
  ], []);
  const events = useMemo(() => [
    { u: 'NVDA', t: 'Earnings', d: 'Sep 12' },
    { u: 'AAPL', t: 'Div Ex‑Date', d: 'Aug 28' },
    { u: 'TSLA', t: 'Delivery Report', d: 'Oct 03' },
  ], []);

  const agg = useMemo(() => {
    let netDelta = 0, netGamma = 0, netTheta = 0, netVega = 0, mtm = 0, pnl = 0;
    const byU: Record<string, GreeksAgg> = {};
    positions.forEach((p) => {
      const u = underlyings[p.u];
      const S = u.S * (1 + shockPrice / 100);
      const iv = Math.max(0.01, p.iv + shockIV / 100);
      const T = Math.max((p.dte - shockDays) / 365, 1 / 365);
      const res = bsAll(S, p.K, u.r, iv, T, p.type === 'C');
      const res0 = bsAll(u.S, p.K, u.r, p.iv, Math.max(p.dte / 365, 1 / 365), p.type === 'C');
      const qty = p.qty * mult;
      mtm += res.price * qty;
      pnl += (res.price - res0.price) * qty;
      netDelta += res.delta * qty;
      netGamma += res.gamma * qty;
      netTheta += res.theta * qty;
      netVega += res.vegaPt * qty;
      if (!byU[p.u]) byU[p.u] = { delta: 0, gamma: 0, theta: 0, vega: 0 };
      byU[p.u].delta += res.delta * qty;
      byU[p.u].vega += res.vegaPt * qty;
    });
    return { netDelta, netGamma, netTheta, netVega, mtm, pnl, byU };
  }, [positions, underlyings, shockPrice, shockIV, shockDays]);

  // Charts
  useEffect(() => {
    const c = barGreeksRef.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return;
    const W = c.width, H = c.height; ctx.clearRect(0, 0, W, H);
    const keys = Object.keys(underlyings);
    const barW = W / (keys.length * 2);
    keys.forEach((k, i) => {
      const x = i * (W / keys.length) + 20;
      const d = agg.byU[k]?.delta || 0;
      const v = agg.byU[k]?.vega || 0;
      const h1 = Math.max(-H / 2, Math.min(H / 2, -d / 500));
      ctx.fillStyle = 'rgba(125,200,247,0.7)'; ctx.fillRect(x, H / 2, barW, h1);
      const h2 = Math.max(-H / 2, Math.min(H / 2, -v / 2000));
      ctx.fillStyle = 'rgba(255,126,182,0.7)'; ctx.fillRect(x + barW + 6, H / 2, barW, h2);
      ctx.fillStyle = 'rgba(230,240,255,.9)'; ctx.fillText(k, x, H - 4);
    });
    ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
  }, [agg.byU, underlyings]);

  useEffect(() => {
    const u = underlyings[selectedU]; const c = payoffRef.current; if (!u || !c) return; const ctx = c.getContext('2d'); if (!ctx) return;
    const W = c.width, H = c.height; ctx.clearRect(0, 0, W, H);
    const S0 = u.S; const min = S0 * 0.7, max = S0 * 1.3, steps = 80;
    function payoffAt(S: number) {
      let sum = 0; positions.filter((p) => p.u === selectedU).forEach((p) => { const q = p.qty * mult; if (p.type === 'C') sum += q * Math.max(0, S - p.K); else sum += q * Math.max(0, p.K - S); }); return sum;
    }
    const ys: number[] = []; for (let i = 0; i <= steps; i++) { const S = min + (i * (max - min)) / steps; ys.push(payoffAt(S)); }
    const yMin = Math.min(...ys), yMax = Math.max(...ys);
    ctx.beginPath(); ys.forEach((y, i) => { const X = i * (W / steps); const Y = H - ((y - yMin) / (yMax - yMin + 1e-9)) * H; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.strokeStyle = 'rgba(125,200,247,0.95)'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = 'rgba(230,240,255,.8)'; ctx.fillText(`${selectedU} payoff @ expiry (sum)`, 8, 14);
  }, [selectedU, positions, underlyings]);

  useEffect(() => {
    const u = underlyings[selectedU]; const c = skewRef.current; if (!u || !c) return; const ctx = c.getContext('2d'); if (!ctx) return;
    const W = c.width, H = c.height; ctx.clearRect(0, 0, W, H);
    const S = u.S; const Klist: number[] = []; for (let m = 0.7; m <= 1.3; m += 0.075) Klist.push(S * m);
    const baseIV = underlyings[selectedU].iv; const slope = -0.15; const IVs = Klist.map((K) => Math.max(0.05, baseIV + slope * (K / S - 1)));
    const min = Math.min(...IVs), max = Math.max(...IVs);
    ctx.beginPath(); IVs.forEach((iv, i) => { const X = i * (W / (IVs.length - 1)); const Y = H - ((iv - min) / (max - min + 1e-9)) * H; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.strokeStyle = 'rgba(255,126,182,0.9)'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = 'rgba(230,240,255,.8)'; ctx.fillText(`IV skew (${selectedU})`, 8, 14);
  }, [selectedU, underlyings]);

  const chainRows = useMemo(() => {
    const u = underlyings[selectedU]; if (!u) return [] as { K: number; c: number; p: number; iv: number }[];
    const S = u.S; const r = u.r; const iv = Math.max(0.05, u.iv + shockIV / 100); const T = 14 / 365;
    const strikes: number[] = []; for (let k = S * 0.8; k <= S * 1.2; k += S * 0.05) strikes.push(Math.round(k / 5) * 5);
    return strikes.map((K) => ({ K, c: bsAll(S, K, r, iv, T, true).price, p: bsAll(S, K, r, iv, T, false).price, iv }));
  }, [underlyings, selectedU, shockIV]);

  const grossVega = useMemo(() => Object.values(agg.byU).reduce((a: number, b: GreeksAgg) => a + Math.abs(b.vega || 0), 0), [agg.byU]);
  const util = useMemo(() => Math.min(99, Math.abs(agg.netDelta) / 50000 * 100), [agg.netDelta]);

  return (
    <div className="min-h-screen bg-[radial-gradient(900px_500px_at_15%_-10%,rgba(125,200,247,0.25),transparent_55%),radial-gradient(800px_520px_at_85%_8%,rgba(255,126,182,0.18),transparent_60%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background))) ]">
      {/* Titlebar */}
      <div className="h-14 flex items-center gap-3 px-4 border-b bg-[linear-gradient(180deg,rgba(125,200,247,0.08),rgba(255,255,255,0.02))]">
        <div className="w-5 h-5 rounded-md bg-[conic-gradient(from_120deg,#7DC8F7,#FFD29D,#FF7EB6,#7DC8F7)] shadow-[0_0_8px_rgba(125,200,247,0.55)]" />
        <div className="font-semibold tracking-wide">MAD LAB — Options Trader</div>
        <Badge variant="outline" className="ml-1">Malibu</Badge>
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
        {/* Left Column */}
        <Card className="overflow-hidden">
          <div className="px-3 py-2 border-b flex items-center justify-between"><div className="text-[12px] uppercase tracking-wide text-muted-foreground">Portfolio Risk</div><div className="text-[11px] px-2 py-0.5 rounded-full border">live</div></div>
          <div className="p-2">
            <div className="border rounded-lg p-3 mb-2">
              <div className="text-[12px] text-muted-foreground mb-1">Net Greeks</div>
              <div className="grid grid-cols-2 gap-2">
                <div><div className="text-xs text-muted-foreground">Δ (shares)</div><div className="text-lg font-extrabold">{Math.round(agg.netDelta).toLocaleString()}</div></div>
                <div><div className="text-xs text-muted-foreground">Γ / $1</div><div className="text-lg font-extrabold">{agg.netGamma.toFixed(3)}</div></div>
                <div><div className="text-xs text-muted-foreground">Θ / day</div><div className="text-lg font-extrabold">{fmtMoney(agg.netTheta)}</div></div>
                <div><div className="text-xs text-muted-foreground">Vega / 1 vol pt</div><div className="text-lg font-extrabold">{fmtMoney(agg.netVega)}</div></div>
              </div>
            </div>
            <div className="border rounded-lg p-3 mb-2">
              <div className="text-[12px] text-muted-foreground mb-1">P&L</div>
              <div className="grid grid-cols-2 gap-2">
                <div><div className="text-xs text-muted-foreground">Today (scenario)</div><div className="text-lg font-extrabold">{(agg.pnl >= 0 ? '+' : '') + fmtMoney(agg.pnl)}</div></div>
                <div><div className="text-xs text-muted-foreground">MTM Value</div><div className="text-lg font-extrabold">{fmtMoney(agg.mtm)}</div></div>
              </div>
            </div>
            <div className="border rounded-lg p-3 mb-2">
              <div className="text-[12px] text-muted-foreground mb-1">Scenario (global)</div>
              <div className="text-xs text-muted-foreground">Shock all underlyings</div>
              <div className="mt-2">
                <div className="text-xs text-muted-foreground">Price move: {shockPrice.toFixed(1)}%</div>
                <Slider value={[shockPrice]} min={-5} max={5} step={0.5} onValueChange={(v) => setShockPrice(v[0] as number)} className="mt-1" />
              </div>
              <div className="mt-3">
                <div className="text-xs text-muted-foreground">IV change (vol pts): {shockIV.toFixed(1)}</div>
                <Slider value={[shockIV]} min={-10} max={10} step={0.5} onValueChange={(v) => setShockIV(v[0] as number)} className="mt-1" />
              </div>
              <div className="mt-3">
                <div className="text-xs text-muted-foreground">Days forward: {shockDays.toFixed(0)}d</div>
                <Slider value={[shockDays]} min={0} max={30} step={1} onValueChange={(v) => setShockDays(v[0] as number)} className="mt-1" />
              </div>
              <div className="flex gap-2 mt-3">
                <Button variant="secondary" onClick={() => setShockDays((d) => Math.min(30, d + 1))}>+1d Θ</Button>
                <Button variant="outline" onClick={() => { setShockPrice(0); setShockIV(0); setShockDays(0); }}>Reset</Button>
              </div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-[12px] text-muted-foreground mb-1">Limits</div>
              <div className="text-xs text-muted-foreground">Gross Vega <span className="font-medium text-foreground">{fmtMoney(grossVega)}</span></div>
              <div className="text-xs text-muted-foreground">Net Gamma <span className="font-medium text-foreground">{agg.netGamma.toFixed(3)}</span></div>
              <div className="text-xs text-muted-foreground">Utilization <span className="font-medium text-foreground">{util.toFixed(0)}%</span></div>
              <div className="h-1.5 rounded-full border bg-muted relative mt-1"><i style={{ position: 'absolute', top: -3, left: `${util.toFixed(0)}%` }} className="block w-0.5 h-3 bg-primary rounded" /></div>
            </div>
          </div>
        </Card>

        {/* Center Dashboard */}
        <Card className="overflow-hidden col-span-1">
          <div className="px-3 py-2 border-b flex items-center justify-between"><div className="text-[12px] uppercase tracking-wide text-muted-foreground">Dashboard</div><div className="text-[11px] px-2 py-0.5 rounded-full border">mock data</div></div>
          <div className="p-2">
            <div className="grid grid-cols-12 auto-rows-[130px] gap-2">
              <div className="col-span-12 md:col-span-7 row-span-2 border rounded-lg p-2">
                <div className="text-[12px] text-muted-foreground mb-2">Positions (selected list)</div>
                <div className="overflow-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="text-right">
                        <th className="text-left p-1">Underlying</th><th className="p-1">Expiry</th><th className="p-1">Type</th><th className="p-1">Strike</th><th className="p-1">Qty</th>
                        <th className="p-1">IV</th><th className="p-1">Price</th><th className="p-1">Δ</th><th className="p-1">Γ</th><th className="p-1">Θ/d</th><th className="p-1">Vega</th><th className="p-1">P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((p, idx) => {
                        const u = underlyings[p.u];
                        const S = u.S * (1 + shockPrice / 100);
                        const iv = Math.max(0.01, p.iv + shockIV / 100);
                        const T = Math.max((p.dte - shockDays) / 365, 1 / 365);
                        const res = bsAll(S, p.K, u.r, iv, T, p.type === 'C');
                        const res0 = bsAll(u.S, p.K, u.r, p.iv, Math.max(p.dte / 365, 1 / 365), p.type === 'C');
                        const qty = p.qty * mult;
                        const pl = (res.price - res0.price) * qty;
                        return (
                          <tr key={idx} className="text-right border-b">
                            <td className="text-left p-1">
                              <button className="underline-offset-2 hover:underline" onClick={() => setSelectedU(p.u)} title="Click to select">{p.u}</button>
                            </td>
                            <td className="p-1">{p.dte}d</td>
                            <td className="p-1">{p.type}</td>
                            <td className="p-1">{p.K}</td>
                            <td className="p-1">{p.qty}</td>
                            <td className="p-1">{(iv * 100).toFixed(1)}%</td>
                            <td className="p-1">{res.price.toFixed(2)}</td>
                            <td className="p-1">{res.delta.toFixed(3)}</td>
                            <td className="p-1">{res.gamma.toFixed(4)}</td>
                            <td className="p-1">{res.theta.toFixed(2)}</td>
                            <td className="p-1">{res.vegaPt.toFixed(2)}</td>
                            <td className={`p-1 ${pl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{(pl >= 0 ? '+' : '') + pl.toFixed(0)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="col-span-12 md:col-span-5 border rounded-lg p-2">
                <div className="text-[12px] text-muted-foreground mb-1">By Underlying — Delta / Vega</div>
                <div className="border border-dashed rounded grid place-items-center min-h-[70px]"><canvas ref={barGreeksRef} width={520} height={100} /></div>
              </div>

              <div className="col-span-12 md:col-span-6 border rounded-lg p-2">
                <div className="text-[12px] text-muted-foreground mb-1">Strategy Payoff — Selected Underlying</div>
                <div className="border border-dashed rounded grid place-items-center min-h-[70px]"><canvas ref={payoffRef} width={560} height={110} /></div>
              </div>
              <div className="col-span-12 md:col-span-6 border rounded-lg p-2">
                <div className="text-[12px] text-muted-foreground mb-1">IV Skew — Selected Expiry</div>
                <div className="border border-dashed rounded grid place-items-center min-h-[70px]"><canvas ref={skewRef} width={560} height={110} /></div>
              </div>

              <div className="col-span-12 border rounded-lg p-2">
                <div className="text-[12px] text-muted-foreground mb-2">Options Chain (next expiry)</div>
                <div className="overflow-auto">
                  <table className="w-full text-xs font-mono">
                    <thead><tr className="text-right"><th className="text-left p-1">Strike</th><th className="p-1">Call Mid</th><th className="p-1">Put Mid</th><th className="p-1">IV Call</th><th className="p-1">IV Put</th></tr></thead>
                    <tbody>
                      {chainRows.map((r) => (
                        <tr key={r.K} className="text-right border-b"><td className="text-left p-1">{r.K}</td><td className="p-1">{r.c.toFixed(2)}</td><td className="p-1">{r.p.toFixed(2)}</td><td className="p-1">{(r.iv * 100).toFixed(1)}%</td><td className="p-1">{(r.iv * 100).toFixed(1)}%</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Right Column */}
        <Card className="overflow-hidden">
          <div className="px-3 py-2 border-b flex items-center justify-between"><div className="text-[12px] uppercase tracking-wide text-muted-foreground">Orders & Events</div><div className="text-[11px] px-2 py-0.5 rounded-full border">today</div></div>
          <div className="p-2">
            <div className="border rounded-lg p-2 mb-2">
              <div className="text-[12px] text-muted-foreground mb-1">Open Orders</div>
              <div className="space-y-2">
                {orders.map((o, i) => (
                  <div key={i} className="flex items-center justify-between border rounded px-3 py-2"><span><b>{o.u}</b> — {o.text}</span><span className="text-[11px] px-2 py-0.5 rounded-full border">{o.status}</span></div>
                ))}
              </div>
            </div>
            <div className="border rounded-lg p-2">
              <div className="text-[12px] text-muted-foreground mb-1">Event Calendar</div>
              <div className="text-xs text-muted-foreground space-y-1">
                {events.map((e, i) => (
                  <div key={i}>• <b>{e.u}</b> — {e.t} <span className="text-[11px] px-2 py-0.5 rounded-full border">{e.d}</span></div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Status */}
      <div className="fixed bottom-2 right-3 z-30 flex items-center gap-2 border rounded px-3 py-1.5 text-xs text-muted-foreground bg-primary/10">
        <div className="w-2 h-2 rounded-full bg-[linear-gradient(180deg,#3ddc97,#18a86d)] shadow-[0_0_10px_rgba(61,220,151,.8)]" />
        Connected • Demo portfolio • Recalc on input
      </div>
    </div>
  );
}


