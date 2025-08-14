import { describe, it, expect } from 'vitest'
import { dcf, InputValidationError } from '../src/index'

describe('dcf', () => {
  it('computes equity value and per-share deterministically', () => {
    const result = dcf({
      fcf0: 100,
      growth: 0.05,
      wacc: 0.10,
      horizon: 5,
      terminalMultiple: 12,
      shares: 50,
    })

    // Snapshot-like deterministic assertions
    expect(result.equityValue).toBeCloseTo(1386.882, 3)
    expect(result.perShare).toBeCloseTo(result.equityValue / 50, 6)
    expect(result.breakdown.pvStage).toBeGreaterThan(0)
    expect(result.breakdown.pvTerminal).toBeGreaterThan(0)
  })

  it('validates inputs', () => {
    expect(() => dcf({ fcf0: 0, growth: 0.05, wacc: 0.1, horizon: 5, terminalMultiple: 10, shares: 10 })).toThrow(
      InputValidationError,
    )
    expect(() => dcf({ fcf0: 100, growth: 1, wacc: 0.1, horizon: 5, terminalMultiple: 10, shares: 10 })).toThrow(
      InputValidationError,
    )
    expect(() => dcf({ fcf0: 100, growth: 0.05, wacc: 1, horizon: 5, terminalMultiple: 10, shares: 10 })).toThrow(
      InputValidationError,
    )
    expect(() => dcf({ fcf0: 100, growth: 0.05, wacc: 0.1, horizon: 0, terminalMultiple: 10, shares: 10 })).toThrow(
      InputValidationError,
    )
    expect(() => dcf({ fcf0: 100, growth: 0.05, wacc: 0.1, horizon: 5, terminalMultiple: 0, shares: 10 })).toThrow(
      InputValidationError,
    )
    expect(() => dcf({ fcf0: 100, growth: 0.05, wacc: 0.1, horizon: 5, terminalMultiple: 10, shares: 0 })).toThrow(
      InputValidationError,
    )
  })
})


