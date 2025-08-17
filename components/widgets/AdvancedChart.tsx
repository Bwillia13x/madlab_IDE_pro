'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { WidgetProps } from '@/lib/widgets/schema';
import { Download } from 'lucide-react';

type OhlcBar = {
  t: Date;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  tp: number;
  vwap: number;
};

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function PRNG(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function genSeries(symbol: string, n = 600): OhlcBar[] {
  const rnd = PRNG(hashCode(symbol));
  const drift = 0.0003 + (rnd() - 0.5) * 0.0006;
  const vol = 0.02 + rnd() * 0.05;
  let p = 50 + rnd() * 1500;
  const out: OhlcBar[] = [];
  let vwapNum = 0,
    vwapDen = 0;
  const start = Date.now() - n * 86400000;
  for (let i = 0; i < n; i++) {
    const eps = (rnd() - 0.5) * vol + drift;
    const prev = p;
    p = Math.max(1, prev * (1 + eps));
    const h = Math.max(p, prev) * (1 + rnd() * 0.02);
    const l = Math.min(p, prev) * (1 - rnd() * 0.02);
    const o = prev;
    const c = p;
    const volu = Math.round(1e6 * (0.6 + rnd() * 1.2));
    const tp = (h + l + c) / 3;
    vwapNum += tp * volu;
    vwapDen += volu;
    out.push({ t: new Date(start + i * 86400000), o, h, l, c, v: volu, tp, vwap: vwapNum / Math.max(1, vwapDen) });
  }
  return out;
}

function SMA(src: number[], period: number) {
  const out = Array(src.length).fill(null) as (number | null)[];
  let sum = 0;
  for (let i = 0; i < src.length; i++) {
    sum += src[i] ?? 0;
    if (i >= period) sum -= src[i - period] ?? 0;
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

function STD(src: number[], period: number) {
  const out = Array(src.length).fill(null) as (number | null)[];
  let sum = 0,
    sum2 = 0;
  for (let i = 0; i < src.length; i++) {
    const x = src[i] ?? 0;
    sum += x;
    sum2 += x * x;
    if (i >= period) {
      const y = src[i - period] ?? 0;
      sum -= y;
      sum2 -= y * y;
    }
    if (i >= period - 1) {
      const m = sum / period;
      out[i] = Math.sqrt(Math.max(0, sum2 / period - m * m));
    }
  }
  return out;
}

function ATR(ohlc: OhlcBar[], period: number) {
  const out = Array(ohlc.length).fill(null) as (number | null)[];
  let trSum = 0;
  for (let i = 0; i < ohlc.length; i++) {
    const p = ohlc[i];
    const prev = ohlc[i - 1] || p;
    const tr = Math.max(p.h - p.l, Math.abs(p.h - prev.c), Math.abs(p.l - prev.c));
    trSum += tr;
    if (i >= period) {
      const pp = ohlc[i - period];
      const pprev = ohlc[i - period - 1] || pp;
      const trOld = Math.max(pp.h - pp.l, Math.abs(pp.h - pprev.c), Math.abs(pp.l - pprev.c));
      trSum -= trOld;
    }
    if (i >= period - 1) out[i] = trSum / period;
  }
  return out;
}

function RSI(close: number[], period = 14) {
  const out = Array(close.length).fill(null) as (number | null)[];
  let gain = 0,
    loss = 0;
  for (let i = 1; i < close.length; i++) {
    const d = (close[i] ?? 0) - (close[i - 1] ?? 0);
    if (i <= period) {
      if (d > 0) gain += d;
      else loss -= d;
      if (i === period) {
        const rs = gain / Math.max(1e-9, loss);
        out[i] = 100 - 100 / (1 + rs);
      }
    } else {
      const g = Math.max(0, d);
      const l = Math.max(0, -d);
      gain = (gain * (period - 1) + g) / period;
      loss = (loss * (period - 1) + l) / period;
      const rs = gain / Math.max(1e-9, loss);
      out[i] = 100 - 100 / (1 + rs);
    }
  }
  return out;
}

function MACD(close: number[], fast = 12, slow = 26, sig = 9) {
  function EMA(p: number) {
    const out: number[] = [];
    let m = close[0] ?? 0;
    const k = 2 / (p + 1);
    for (let i = 0; i < close.length; i++) {
      m = i ? ((close[i] ?? 0) - m) * k + m : (close[i] ?? 0);
      out.push(m);
    }
    return out;
  }
  const emaF = EMA(fast);
  const emaS = EMA(slow);
  const macd = emaF.map((x, i) => x - emaS[i]);
  const signal = (function () {
    let m = macd[0] ?? 0;
    const out: number[] = [];
    const k = 2 / (sig + 1);
    for (let i = 0; i < macd.length; i++) {
      m = i ? ((macd[i] ?? 0) - m) * k + m : (macd[i] ?? 0);
      out.push(m);
    }
    return out;
  })();
  const hist = macd.map((x, i) => x - signal[i]);
  return { macd, signal, hist };
}

type WindowSetting = '30' | '90' | '180' | '252' | 'max';

export function AdvancedChart({ widget, onTitleChange }: WidgetProps) {
  const defaultSymbol = (widget.props?.['symbol'] as string) || 'NVDA';
  const [symbol, setSymbol] = useState<string>(defaultSymbol);
  const [compareInput, setCompareInput] = useState<string>('');
  const [compares, setCompares] = useState<string[]>([]);
  const [windowSetting, setWindowSetting] = useState<WindowSetting>('max');
  const [showSMA20, setShowSMA20] = useState(true);
  const [showSMA50, setShowSMA50] = useState(true);
  const [showBB, setShowBB] = useState(true);
  const [showVWAP, setShowVWAP] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [showRegime, setShowRegime] = useState(true);
  const [showRSI, setShowRSI] = useState(true);
  const [showMACD, setShowMACD] = useState(true);

  const priceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rsiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const macdCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const priceWrapRef = useRef<HTMLDivElement | null>(null);
  const rsiWrapRef = useRef<HTMLDivElement | null>(null);
  const macdWrapRef = useRef<HTMLDivElement | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const legendRef = useRef<HTMLDivElement | null>(null);

  const dataCacheRef = useRef<Record<string, OhlcBar[]>>({});
  const zoomRef = useRef<number>(1);
  const offsetRef = useRef<number>(0);
  const annotationsRef = useRef<{ i1: number; p1: number; i2: number; p2: number }[]>([]);
  const annotatingRef = useRef<boolean>(false);
  const annotTempRef = useRef<{ i1: number; p1: number } | null>(null);

  function ensure(symbolCode: string) {
    if (!dataCacheRef.current[symbolCode]) dataCacheRef.current[symbolCode] = genSeries(symbolCode, 700);
  }

  const resize = () => {
    const pw = priceWrapRef.current;
    if (!pw) return;
    const rect = pw.getBoundingClientRect();
    const pc = priceCanvasRef.current;
    const rc = rsiCanvasRef.current;
    const mc = macdCanvasRef.current;
    if (pc) {
      pc.width = rect.width;
      pc.height = rect.height;
    }
    if (rc && rsiWrapRef.current) {
      rc.width = rect.width;
      rc.height = rsiWrapRef.current.getBoundingClientRect().height;
    }
    if (mc && macdWrapRef.current) {
      mc.width = rect.width;
      mc.height = macdWrapRef.current.getBoundingClientRect().height;
    }
  };

  function sliceWindow<T>(arr: T[]): T[] {
    const n = arr.length;
    let winN = n;
    if (windowSetting !== 'max') {
      const W = parseInt(windowSetting);
      winN = Math.min(n, W);
    }
    const start = Math.max(0, n - Math.floor(winN * zoomRef.current) - offsetRef.current);
    const end = Math.min(n, start + Math.floor(winN * zoomRef.current));
    return arr.slice(start, end);
  }

  function drawAll() {
    drawPrice();
    if (showRSI) drawRSI(); else clearCanvas(rsiCanvasRef.current);
    if (showMACD) drawMACD(); else clearCanvas(macdCanvasRef.current);
    updateSnapshot();
  }

  function clearCanvas(cv: HTMLCanvasElement | null) {
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
  }

  function drawGrid(ctx: CanvasRenderingContext2D, W: number, H: number, yticks = 4) {
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < yticks; i++) {
      const y = (i * H) / yticks;
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();
  }

  function drawPrice() {
    const cv = priceCanvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const W = cv.width,
      H = cv.height;
    ctx.clearRect(0, 0, W, H);
    drawGrid(ctx, W, H, 5);

    const series = sliceWindow(dataCacheRef.current[symbol] || []);
    if (series.length < 2) return;
    const close = series.map((d) => d.c);
    const high = series.map((d) => d.h);
    const low = series.map((d) => d.l);
    const vol = series.map((d) => d.v);
    const vwap = series.map((d) => d.vwap);
    const sma20 = SMA(close, 20);
    const sma50 = SMA(close, 50);
    const std20 = STD(close, 20);
    const atr = ATR(series, 14);
    const minP = Math.min(...low.filter((x) => x != null));
    const maxP = Math.max(...high.filter((x) => x != null));
    const maxV = Math.max(...vol);
    const padY = (maxP - minP) * 0.08;
    const yMin = minP - padY,
      yMax = maxP + padY;
    const xStep = W / ((series.length - 1) || 1);
    const y = (p: number) => H - ((p - yMin) / (yMax - yMin + 1e-9)) * H;

    if (showRegime) {
      for (let i = 0; i < series.length; i++) {
        const rv = (atr[i] ?? 0) / (close[i] ?? 0);
        if (!rv) continue;
        const band = rv < 0.02 ? 'rgba(50,214,147,.06)' : rv < 0.04 ? 'rgba(255,204,102,.07)' : 'rgba(255,107,107,.06)';
        ctx.fillStyle = band;
        ctx.fillRect(i * xStep, 0, xStep, H);
      }
    }

    if (showVolume) {
      const vh = H * 0.22;
      for (let i = 0; i < series.length; i++) {
        const h = ((vol[i] ?? 0) / (maxV || 1)) * vh;
        const up = i > 0 ? (close[i] ?? 0) >= (close[i - 1] ?? 0) : true;
        ctx.fillStyle = up ? 'rgba(50,214,147,.5)' : 'rgba(255,107,107,.5)';
        ctx.fillRect(i * xStep - 2, H - h, 4, h);
      }
    }

    for (let i = 0; i < series.length; i++) {
      const d = series[i];
      const up = d.c >= d.o;
      ctx.strokeStyle = up ? 'rgba(50,214,147,.9)' : 'rgba(255,107,107,.9)';
      ctx.fillStyle = up ? 'rgba(50,214,147,.25)' : 'rgba(255,107,107,.25)';
      const x = i * xStep;
      ctx.beginPath();
      ctx.moveTo(x, y(d.h));
      ctx.lineTo(x, y(d.l));
      ctx.stroke();
      const w = Math.max(3, xStep * 0.6);
      const x0 = x - w / 2;
      const y1 = y(d.o),
        y2 = y(d.c);
      const top = Math.min(y1, y2),
        ht = Math.max(1, Math.abs(y2 - y1));
      ctx.fillRect(x0, top, w, ht);
    }

    ctx.lineWidth = 1.6;
    if (showSMA20) {
      ctx.beginPath();
      for (let i = 0; i < sma20.length; i++) {
        const val = sma20[i];
        if (!val) continue;
        const X = i * xStep;
        const Y = y(val);
        if (i === 0 || !sma20[i - 1]) ctx.moveTo(X, Y);
        else ctx.lineTo(X, Y);
      }
      ctx.strokeStyle = 'rgba(125,200,247,.9)';
      ctx.stroke();
    }
    if (showSMA50) {
      ctx.beginPath();
      for (let i = 0; i < sma50.length; i++) {
        const val = sma50[i];
        if (!val) continue;
        const X = i * xStep;
        const Y = y(val);
        if (i === 0 || !sma50[i - 1]) ctx.moveTo(X, Y);
        else ctx.lineTo(X, Y);
      }
      ctx.strokeStyle = 'rgba(255,126,182,.9)';
      ctx.stroke();
    }
    if (showBB) {
      ctx.beginPath();
      for (let i = 0; i < std20.length; i++) {
        const mu = sma20[i];
        const sd = std20[i];
        if (!mu || !sd) continue;
        const X = i * xStep;
        const Yu = y(mu + 2 * sd);
        if (i === 0) ctx.moveTo(0, Yu);
        else ctx.lineTo(X, Yu);
      }
      ctx.strokeStyle = 'rgba(125,200,247,.9)';
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < std20.length; i++) {
        const mu = sma20[i];
        const sd = std20[i];
        if (!mu || !sd) continue;
        const X = i * xStep;
        const Yl = y(mu - 2 * sd);
        if (i === 0) ctx.moveTo(0, Yl);
        else ctx.lineTo(X, Yl);
      }
      ctx.strokeStyle = 'rgba(255,126,182,.9)';
      ctx.stroke();
    }
    if (showVWAP) {
      ctx.beginPath();
      for (let i = 0; i < vwap.length; i++) {
        const val = vwap[i];
        if (!val) continue;
        const X = i * xStep,
          Y = y(val);
        if (i === 0) ctx.moveTo(X, Y);
        else ctx.lineTo(X, Y);
      }
      ctx.strokeStyle = 'rgba(255,210,157,.95)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    const first = close.find((v) => v != null) || 1;
    compares.forEach((sym, idx) => {
      const s = sliceWindow(dataCacheRef.current[sym] || []);
      if (s.length < 2) return;
      const base = s[0].c;
      ctx.beginPath();
      for (let i = 0; i < s.length; i++) {
        const X = i * xStep;
        const Y = y(first * (s[i].c / base));
        if (i === 0) ctx.moveTo(X, Y);
        else ctx.lineTo(X, Y);
      }
      const hues = [180, 330, 120, 40, 260];
      ctx.strokeStyle = `hsl(${hues[idx % hues.length]} 60% 60% / .9)`;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    });

    ctx.strokeStyle = 'rgba(230,240,255,.9)';
    ctx.lineWidth = 1;
    annotationsRef.current.forEach((L) => {
      const x1 = L.i1 * xStep,
        y1 = y(L.p1);
      const x2 = L.i2 * xStep,
        y2 = y(L.p2);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    if (legendRef.current) {
      const last = series[series.length - 1];
      legendRef.current.innerHTML = `<div class='legend'>${symbol}  <span class='small'>(${last.t.toISOString().slice(0,10)})</span></div>` +
        compares.map((s) => `<div class='legend'>↗ ${s}</div>`).join('');
    }
  }

  function drawRSI() {
    const cv = rsiCanvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const W = cv.width,
      H = cv.height;
    ctx.clearRect(0, 0, W, H);
    drawGrid(ctx, W, H, 4);
    const series = sliceWindow(dataCacheRef.current[symbol] || []);
    const close = series.map((d) => d.c);
    const r = RSI(close, 14);
    const xStep = W / ((series.length - 1) || 1);
    ctx.beginPath();
    for (let i = 0; i < r.length; i++) {
      const val = r[i];
      if (!val) continue;
      const X = i * xStep,
        Y = H - (val / 100) * H;
      if (i === 0 || !r[i - 1]) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    }
    ctx.strokeStyle = 'rgba(125,200,247,.95)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.2)';
    [30, 50, 70].forEach((v) => {
      const y = H - (v / 100) * H;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    });
  }

  function drawMACD() {
    const cv = macdCanvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const W = cv.width,
      H = cv.height;
    ctx.clearRect(0, 0, W, H);
    drawGrid(ctx, W, H, 4);
    const series = sliceWindow(dataCacheRef.current[symbol] || []);
    const close = series.map((d) => d.c);
    const { macd, signal, hist } = MACD(close, 12, 26, 9);
    const xStep = W / ((series.length - 1) || 1);
    for (let i = 0; i < hist.length; i++) {
      const v = hist[i] || 0;
      const x = i * xStep;
      const y0 = H / 2;
      const y1 = y0 - (v * (H * 0.4)) / (Math.max(...hist.map((h) => Math.abs(h) || 1)) + 1e-9);
      const up = v >= 0;
      const w = Math.max(2, xStep * 0.6);
      const x0 = x - w / 2;
      ctx.fillStyle = up ? 'rgba(50,214,147,.6)' : 'rgba(255,107,107,.6)';
      ctx.fillRect(x0, Math.min(y0, y1), w, Math.abs(y1 - y0));
    }
    function norm(arr: number[]) {
      const max = Math.max(...arr.map((a) => Math.abs(a) || 1));
      return arr.map((v) => v / (max + 1e-9));
    }
    const mN = norm(macd),
      sN = norm(signal);
    ctx.beginPath();
    for (let i = 0; i < mN.length; i++) {
      const X = i * xStep,
        Y = H / 2 - mN[i] * (H * 0.45);
      if (i === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    }
    ctx.strokeStyle = 'rgba(125,200,247,.9)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < sN.length; i++) {
      const X = i * xStep,
        Y = H / 2 - sN[i] * (H * 0.45);
      if (i === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    }
    ctx.strokeStyle = 'rgba(255,126,182,.9)';
    ctx.lineWidth = 1.3;
    ctx.stroke();
  }

  function updateSnapshot() {
    // Only used in widget header badge, we can compute the bar count
    const s = sliceWindow(dataCacheRef.current[symbol] || []);
    // no-op in widget for now
  }

  function idxFromX(x: number) {
    const s = sliceWindow(dataCacheRef.current[symbol] || []);
    const W = priceCanvasRef.current?.width || 1;
    const i = Math.round((x / Math.max(1, W)) * (s.length - 1));
    return Math.max(0, Math.min(s.length - 1, i));
  }

  useEffect(() => {
    ensure(symbol);
    compares.forEach((s) => ensure(s));
    resize();
    drawAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, compares.join(','), windowSetting, showSMA20, showSMA50, showBB, showVWAP, showVolume, showRegime, showRSI, showMACD]);

  useEffect(() => {
    const onResize = () => {
      resize();
      drawAll();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const cv = priceCanvasRef.current;
    if (!cv) return;
    const onMove = (e: MouseEvent) => {
      const rect = cv.getBoundingClientRect();
      const x = e.clientX - rect.left,
        y = e.clientY - rect.top;
      const i = idxFromX(x);
      const s = sliceWindow(dataCacheRef.current[symbol] || []);
      const d = s[i];
      if (!d) {
        if (tipRef.current) tipRef.current.style.display = 'none';
        return;
      }
      if (!tipRef.current) return;
      tipRef.current.style.display = 'block';
      tipRef.current.style.left = x + 12 + 'px';
      tipRef.current.style.top = y + 12 + 'px';
      tipRef.current.textContent = `${d.t.toISOString().slice(0, 10)}  O:${d.o.toFixed(2)} H:${d.h.toFixed(2)} L:${d.l.toFixed(2)} C:${d.c.toFixed(2)} V:${(d.v / 1e6).toFixed(2)}M`;
    };
    const onLeave = () => {
      if (tipRef.current) tipRef.current.style.display = 'none';
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const f = e.deltaY > 0 ? 1.1 : 0.9;
      zoomRef.current = Math.max(0.2, Math.min(3, zoomRef.current * f));
      drawAll();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        offsetRef.current = Math.max(0, offsetRef.current - 5);
        drawAll();
      }
      if (e.key === 'ArrowLeft') {
        offsetRef.current += 5;
        drawAll();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!annotatingRef.current) return;
      const rect = cv.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const i = idxFromX(x);
      const s = sliceWindow(dataCacheRef.current[symbol] || []);
      const p = s[i]?.c;
      if (p == null) return;
      if (!annotTempRef.current) {
        annotTempRef.current = { i1: i, p1: p };
      } else {
        annotationsRef.current.push({ i1: annotTempRef.current.i1, p1: annotTempRef.current.p1, i2: i, p2: p });
        annotTempRef.current = null;
        annotatingRef.current = false;
        drawAll();
      }
    };
    cv.addEventListener('mousemove', onMove);
    cv.addEventListener('mouseleave', onLeave);
    cv.addEventListener('wheel', onWheel, { passive: false });
    cv.addEventListener('click', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      cv.removeEventListener('mousemove', onMove);
      cv.removeEventListener('mouseleave', onLeave);
      cv.removeEventListener('wheel', onWheel as any);
      cv.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  const handleExport = () => {
    const pc = priceCanvasRef.current;
    const rc = rsiCanvasRef.current;
    const mc = macdCanvasRef.current;
    if (!pc || !rc || !mc) return;
    const W = pc.width,
      H = pc.height + rc.height + mc.height + 12;
    const tmp = document.createElement('canvas');
    tmp.width = W;
    tmp.height = H;
    const t = tmp.getContext('2d');
    if (!t) return;
    t.fillStyle = 'rgba(14,17,23,1)';
    t.fillRect(0, 0, W, H);
    t.drawImage(pc, 0, 0);
    t.drawImage(rc, 0, pc.height + 4);
    t.drawImage(mc, 0, pc.height + rc.height + 8);
    const a = document.createElement('a');
    a.href = tmp.toDataURL('image/png');
    a.download = `${symbol}_chart.png`;
    a.click();
  };

  const addCompare = () => {
    const c = (compareInput || '').toUpperCase().trim();
    if (!c) return;
    if (!compares.includes(c) && c !== symbol) {
      ensure(c);
      setCompares((arr) => [...arr, c]);
      setCompareInput('');
    }
  };

  const clearCompares = () => setCompares([]);

  useEffect(() => {
    ensure(symbol);
    compares.forEach(ensure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, compares.join(',')]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            Advanced Chart
            <Badge variant="outline" className="text-[10px]">Mock</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => { annotatingRef.current = !annotatingRef.current; }}>
              Annotate
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => { annotationsRef.current = []; drawAll(); }}>
              Clear Ann.
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={handleExport}>
              <Download className="h-3 w-3 mr-1" /> PNG
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Label className="text-[11px]">Symbol</Label>
            <Input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} className="h-7 px-2 w-[100px]" />
            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => { ensure(symbol.toUpperCase()); offsetRef.current = 0; drawAll(); }}>Load</Button>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[11px]">Compare</Label>
            <Input value={compareInput} onChange={(e) => setCompareInput(e.target.value)} placeholder="SPY, AAPL…" className="h-7 px-2 w-[120px]" />
            <Button size="sm" variant="outline" className="h-7 px-2" onClick={addCompare}>Add</Button>
            <Button size="sm" variant="outline" className="h-7 px-2" onClick={clearCompares}>Clear</Button>
          </div>
          <div className="flex items-center gap-1">
            {(['30', '90', '180', '252', 'max'] as WindowSetting[]).map((w) => (
              <Button key={w} size="sm" variant={windowSetting === w ? 'default' : 'outline'} className="h-7 px-2" onClick={() => setWindowSetting(w)}>
                {w === '30' ? '1M' : w === '90' ? '3M' : w === '180' ? '6M' : w === '252' ? '1Y' : 'Max'}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <label className="flex items-center gap-2"><input type="checkbox" checked={showSMA20} onChange={(e) => setShowSMA20(e.target.checked)} />SMA20</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={showSMA50} onChange={(e) => setShowSMA50(e.target.checked)} />SMA50</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={showBB} onChange={(e) => setShowBB(e.target.checked)} />Bollinger</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={showVWAP} onChange={(e) => setShowVWAP(e.target.checked)} />VWAP</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={showVolume} onChange={(e) => setShowVolume(e.target.checked)} />Volume</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={showRegime} onChange={(e) => setShowRegime(e.target.checked)} />Regime</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={showRSI} onChange={(e) => setShowRSI(e.target.checked)} />RSI</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={showMACD} onChange={(e) => setShowMACD(e.target.checked)} />MACD</label>
          <span className="text-[11px] text-muted-foreground">Pan: ←/→ • Zoom: wheel</span>
        </div>

        <div className="grid gap-2" style={{ gridTemplateRows: '1fr 120px 120px', height: 420 }}>
          <div className="relative rounded-md border border-border bg-muted/10 p-1" ref={priceWrapRef}>
            <div ref={legendRef} className="absolute top-1.5 left-2 flex gap-1 flex-wrap"></div>
            <canvas ref={priceCanvasRef} className="w-full h-full block"></canvas>
            <div ref={tipRef} className="pointer-events-none absolute hidden text-[11px] px-2 py-1 rounded-md border border-border bg-black/60 text-foreground" />
          </div>
          <div className="relative rounded-md border border-border bg-muted/10 p-1" ref={rsiWrapRef}>
            <canvas ref={rsiCanvasRef} className="w-full h-full block"></canvas>
          </div>
          <div className="relative rounded-md border border-border bg-muted/10 p-1" ref={macdWrapRef}>
            <canvas ref={macdCanvasRef} className="w-full h-full block"></canvas>
          </div>
        </div>

        <style jsx>{`
          .legend { font: 11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; background: rgba(0,0,0,.25); border: 1px solid rgba(255,255,255,.14); padding: 2px 6px; border-radius: 8px; }
          [data-theme] .legend { border-color: rgba(255,255,255,.14); }
          .small { color: rgba(164,177,204,1); }
        `}</style>
      </CardContent>
    </Card>
  );
}

export default AdvancedChart;



