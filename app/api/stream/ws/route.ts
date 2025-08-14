import { serverMetrics } from '@/lib/metrics/server'
import { getDataProvider } from '@/lib/data/providers'

export const runtime = 'edge'

type InboundMessage =
  | { type: 'subscribe'; symbols: string[]; options?: { throttle?: number } }
  | { type: 'unsubscribe'; symbols: string[] }
  | { type: 'ping' }
  | { type: 'heartbeat_response'; timestamp?: number }

export async function GET(request: Request) {
  // @ts-ignore: WebSocketPair is available in edge runtime
  const { 0: client, 1: server } = new (globalThis as any).WebSocketPair()

  const url = new URL(request.url)
  const initialSymbolsParam = url.searchParams.get('symbols') || ''
  const initialSymbols = initialSymbolsParam
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(s => /^[A-Z0-9.\-:]{1,10}$/i.test(s))
    .slice(0, 50)

  const tickIntervalMs = Math.max(250, Math.min(3000, Number(url.searchParams.get('interval') || '1000')))

  // Per-connection state
  const subscriptions = new Set<string>(initialSymbols)
  let heartbeatTimer: number | undefined
  let tickTimer: number | undefined
  let dispatchTimer: number | undefined
  let closed = false
  const MIN_DISPATCH_INTERVAL_MS = 200
  const MAX_QUEUE_ITEMS_PER_FLUSH = 200
  const COALESCE_KEY = (msg: any) => `${msg?.type}:${msg?.data?.symbol || ''}`
  const pendingMap = new Map<string, any>()

  const sendJson = (obj: unknown) => {
    try {
      // @ts-ignore: WebSocket in edge runtime
      server.send(JSON.stringify(obj))
      serverMetrics.inc('ws:messages:sent')
      serverMetrics.mark('ws:messages:sent:rate')
    } catch {
      // ignore
    }
  }

  const startHeartbeat = () => {
    // @ts-ignore: setInterval types differ in edge runtime
    heartbeatTimer = setInterval(() => {
      sendJson({ type: 'heartbeat', ts: Date.now() })
    }, 30000) as unknown as number
  }

  const startTicks = () => {
    // Guard against multiple intervals
    if (tickTimer) return
    // @ts-ignore: setInterval types differ in edge runtime
    tickTimer = setInterval(async () => {
      if (closed || subscriptions.size === 0) return
      const t = serverMetrics.startTimer('ws:tick')
      try {
        const provider = getDataProvider()
        if (!provider) return
        await Promise.all(
          Array.from(subscriptions).map(async (sym) => {
            try {
              const kpi = await provider.getKpis(sym)
              const payload = {
                type: 'price_update',
                data: {
                  symbol: sym,
                  price: kpi.price,
                  volume: kpi.volume,
                  timestamp: Date.now(),
                  change: kpi.change,
                  changePercent: kpi.changePercent,
                  high: kpi.fiftyTwoWeekHigh ?? kpi.price,
                  low: kpi.fiftyTwoWeekLow ?? kpi.price,
                  open: kpi.price - kpi.change,
                },
              }
              const key = COALESCE_KEY(payload)
              if (pendingMap.has(key)) {
                serverMetrics.inc('ws:queue:coalesced')
              }
              pendingMap.set(key, payload)
            } catch (e) {
              serverMetrics.inc('ws:stream:errors')
            }
          })
        )
      } catch {
        // ignore provider errors at this cadence
      } finally {
        t.stop(200)
      }
    }, tickIntervalMs) as unknown as number

    if (!dispatchTimer) {
      // @ts-ignore
      dispatchTimer = setInterval(() => {
        if (pendingMap.size === 0) return
        let sent = 0
        for (const [, value] of pendingMap) {
          if (sent >= MAX_QUEUE_ITEMS_PER_FLUSH) break
          sendJson(value)
          sent++
        }
        if (sent > 0) serverMetrics.inc('ws:queue:flushed', sent)
        pendingMap.clear()
      }, Math.max(100, MIN_DISPATCH_INTERVAL_MS)) as unknown as number
    }
  }

  const stopTimers = () => {
    try { if (heartbeatTimer) clearInterval(heartbeatTimer as unknown as number) } catch {}
    heartbeatTimer = undefined
    try { if (tickTimer) clearInterval(tickTimer as unknown as number) } catch {}
    tickTimer = undefined
    try { if (dispatchTimer) clearInterval(dispatchTimer as unknown as number) } catch {}
    dispatchTimer = undefined
  }

  server.accept()
  serverMetrics.inc('ws:connections')

  // Initial hello
  sendJson({ type: 'open', symbols: Array.from(subscriptions), interval: tickIntervalMs })

  // Heartbeat and ticks
  startHeartbeat()
  startTicks()

  server.addEventListener('message', (event: MessageEvent) => {
    serverMetrics.inc('ws:messages:recv')
    serverMetrics.mark('ws:messages:recv:rate')
    try {
      const msg = JSON.parse(String((event as any).data || '{}')) as InboundMessage
      if (msg.type === 'subscribe') {
        for (const s of (msg.symbols || []).slice(0, 100)) {
          const sym = String(s || '').toUpperCase()
          if (/^[A-Z0-9.\-:]{1,10}$/i.test(sym)) {
            subscriptions.add(sym)
            serverMetrics.inc('ws:subscriptions')
          }
        }
        sendJson({ type: 'subscribed', symbols: Array.from(subscriptions) })
      } else if (msg.type === 'unsubscribe') {
        for (const s of msg.symbols || []) {
          subscriptions.delete(String(s || '').toUpperCase())
        }
        sendJson({ type: 'unsubscribed', symbols: Array.from(subscriptions) })
      } else if (msg.type === 'ping') {
        sendJson({ type: 'heartbeat', ts: Date.now() })
      }
    } catch (e) {
      sendJson({ type: 'error', code: 'BAD_MESSAGE', message: 'Invalid message format' })
      serverMetrics.inc('ws:bad_messages')
    }
  })

  server.addEventListener('close', () => {
    closed = true
    stopTimers()
    serverMetrics.inc('ws:connections:closed')
  })

  server.addEventListener('error', () => {
    serverMetrics.inc('ws:errors')
  })

  // Upgrade
  // @ts-ignore: WebSocket upgrade in edge runtime
  return new Response(null, { status: 101, webSocket: client })
}


