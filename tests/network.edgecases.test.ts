import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FetchRESTProvider } from '@/lib/data/providers/FetchRESTProvider'

describe('Network edge cases', () => {
  const baseConfig = {
    id: 'rest1',
    name: 'REST',
    type: 'rest' as const,
    options: { baseUrl: 'https://api.example.com', endpoint: '/data', retries: 2, timeout: 50 },
  }

  const realFetch = globalThis.fetch

  beforeEach(() => {
    vi.useRealTimers()
  })

  afterEach(() => {
    globalThis.fetch = realFetch as any
  })

  it('retries on network failure and surfaces final error', async () => {
    const provider = new FetchRESTProvider(baseConfig)

    // First connect call should fail and return false instead of throwing
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error('network down')).mockRejectedValueOnce(new Error('network down'))

    const connected = await provider.connect()
    expect(connected).toBe(false)

    // Now simulate success to ensure recoverability
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }) as any
    const connected2 = await provider.connect()
    expect(connected2).toBe(true)

    // getData should throw if network fails even after retries
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline')) as any
    await expect(provider.getData({ q: 'x' })).rejects.toThrow('offline')
  })
})


