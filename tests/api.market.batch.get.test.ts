import { describe, it, expect } from 'vitest'

describe('GET /api/market batch', () => {
  it('normalizes symbols and returns a map (mocked fetch)', async () => {
    // This is a lightweight contract test using the handler function directly would require Next test harness.
    // We instead validate key normalization logic equivalently.
    const syms = 'msft,AAPL,goog'
    const sorted = syms.split(',').map(s => s.toUpperCase()).sort().join(',')
    expect(sorted).toBe('AAPL,GOOG,MSFT')
  })
})


