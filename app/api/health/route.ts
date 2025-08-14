import { NextResponse } from 'next/server'
import { getDataProvider } from '@/lib/data/providers'
import { serverMetrics } from '@/lib/metrics/server'

export const runtime = 'edge'

export async function GET() {
  try {
    const provider = getDataProvider()
    const providerStatus = provider?.isAvailable() ? 'available' : 'unavailable'
    let dbOk = false
    try {
      // Only attempt if DB mode is enabled via env
      // eslint-disable-next-line no-process-env
      const mode = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_DB_MODE) as string | undefined
      if (mode === 'db') {
        const mod = await import('@/lib/db/client')
        // Narrow type at runtime to avoid type errors on MockPrisma
        const client: any = (mod as any).prisma
        if (client && typeof client.$queryRaw === 'function') {
          await client.$queryRaw`SELECT 1`
        }
        dbOk = true
      }
    } catch {
      dbOk = false
    }

    return NextResponse.json({
      status: 'ok',
      time: new Date().toISOString(),
      provider: providerStatus,
      metrics: serverMetrics.snapshot(),
      db: dbOk ? 'ok' : 'down',
    })
  } catch (error) {
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}


