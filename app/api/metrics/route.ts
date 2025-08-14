import { NextResponse } from 'next/server'
import { serverMetrics } from '@/lib/metrics/server'
import { errorHandler } from '@/lib/errors'

export const runtime = 'edge'

export async function GET() {
  try {
    const snapshot = serverMetrics.snapshot()
    // basic enrichment: last error stats
    const errors = errorHandler.getStats()
    let memory: { heapUsed?: number; rss?: number } = {}
    try {
      const g: any = globalThis as any
      if (g.process?.memoryUsage) {
        const mu = g.process.memoryUsage()
        memory = { heapUsed: mu.heapUsed, rss: mu.rss }
      }
    } catch {}
    // Add a few explicit WS gauges
    const ws = {
      connections: serverMetrics.getCounter('ws:connections') - serverMetrics.getCounter('ws:connections:closed'),
      connectionsClosed: serverMetrics.getCounter('ws:connections:closed'),
      messagesSentRate: serverMetrics.getRate('ws:messages:sent:rate'),
      messagesRecvRate: serverMetrics.getRate('ws:messages:recv:rate'),
      subscriptionsTotal: serverMetrics.getCounter('ws:subscriptions'),
      streamErrors: serverMetrics.getCounter('ws:stream:errors'),
      errors: serverMetrics.getCounter('ws:errors'),
      badMessages: serverMetrics.getCounter('ws:bad_messages'),
    }
    return NextResponse.json({ ...snapshot, errors, ws, memory }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json(serverMetrics.snapshot(), { headers: { 'Cache-Control': 'no-store' } })
  }
}


