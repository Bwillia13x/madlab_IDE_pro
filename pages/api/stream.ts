import type { NextApiRequest, NextApiResponse } from 'next';
import { mockProvider } from '@/lib/data/mock';
import { getDataProvider } from '@/lib/data/providers';
import { serverMetrics } from '@/lib/metrics/server';

function parseSymbols(param: string | string[] | undefined): string[] {
  if (!param) return ['AAPL'];
  const raw = Array.isArray(param) ? param.join(',') : param;
  return raw
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-Z0-9.\-:]{1,10}$/i.test(s))
    .slice(0, 25);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only support GET
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  const symbols = parseSymbols(req.query.symbols);
  const intervalMs = Math.max(250, Math.min(3000, Number(req.query.interval) || 1000));

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  let closed = false;
  const write = (data: string) => res.write(data);

  // Initial hello + subscribe event
  write(`event: open\n`);
  write(`data: {"ok":true,"symbols":[${symbols.map((s) => `"${s}"`).join(',')}]}\n\n`);

  const provider = getDataProvider() || mockProvider;

  const tick = async () => {
    if (closed) return;
    try {
      const start = Date.now()
      // heartbeat
      write(`event: heartbeat\n`);
      write(`data: {"ts":${Date.now()}}\n\n`);

      // price updates
      await Promise.all(
        symbols.map(async (sym) => {
          const kpi = await provider.getKpis(sym);
          const payload = {
            symbol: sym,
            price: kpi.price,
            volume: kpi.volume,
            timestamp: Date.now(),
            change: kpi.change,
            changePercent: kpi.changePercent,
            high: kpi.fiftyTwoWeekHigh ?? kpi.price,
            low: kpi.fiftyTwoWeekLow ?? kpi.price,
            open: kpi.price - kpi.change,
          };
          write(`event: price_update\n`);
          write(`data: ${JSON.stringify(payload)}\n\n`);
        })
      );
      serverMetrics.inc('stream:ticks')
      const latency = Date.now() - start
      if (latency > intervalMs) serverMetrics.inc('stream:overdue')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      write(`event: error\n`);
      write(`data: ${JSON.stringify({ message, code: 'STREAM_ERROR' })}\n\n`);
      serverMetrics.inc('stream:errors')
    }
  };

  const interval = setInterval(tick, intervalMs);
  // Backpressure: if client is too slow, drop cycles
  let ticking = false
  const guardedTick = async () => {
    if (ticking) return
    ticking = true
    try { await tick() } finally { ticking = false }
  }
  clearInterval(interval)
  const bpInterval = setInterval(guardedTick, intervalMs)
  // kickoff
  tick();

  const close = () => {
    if (closed) return;
    closed = true;
    clearInterval(bpInterval);
    try {
      write(`event: close\n`);
      write(`data: {"reason":"client_disconnected"}\n\n`);
    } finally {
      res.end();
    }
  };

  req.on('close', close);
}


