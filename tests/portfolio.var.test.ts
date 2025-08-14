import { describe, it, expect } from 'vitest'
import { portfolioReturns, historicalVaR, expectedShortfall, cornishFisherVaR } from '@/lib/quant/risk'

describe('portfolio risk', () => {
  it('computes portfolio returns and VaR metrics', () => {
    // Two assets with simple synthetic prices
    const a = Array.from({ length: 200 }, (_, i) => 100 * Math.exp(0.001 * i + 0.02 * Math.sin(i / 10)))
    const b = Array.from({ length: 200 }, (_, i) => 80 * Math.exp(0.0005 * i + 0.03 * Math.cos(i / 15)))
    const series = { A: a, B: b }
    const weights = { A: 0.6, B: 0.4 }
    const r = portfolioReturns(series, weights, 'log')
    expect(r.length).toBeGreaterThan(0)
    const var95 = historicalVaR(r, 0.95)
    const es95 = expectedShortfall(r, 0.95)
    const cf95 = cornishFisherVaR(r, 0.95)
    expect(var95).toBeGreaterThan(0)
    expect(es95).toBeGreaterThan(0)
    expect(cf95).toBeGreaterThan(0)
  })
})


