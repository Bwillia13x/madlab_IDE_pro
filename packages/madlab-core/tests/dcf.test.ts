import { describe, it, expect } from 'vitest'
import { dcf, InputValidationError } from '../src/index'

describe('dcf', () => {
  it('computes equity value and per-share deterministically', () => {
    const input = {
      fcf0: 100,
      growth: 0.05,
      wacc: 0.10,
      horizon: 5,
      terminalMultiple: 12,
      shares: 50,
    }
    const result = dcf(input)

    // Independent reference calculation of the same formula for determinism
    let pvStage = 0
    for (let t = 1; t <= input.horizon; t++) {
      const cf = input.fcf0 * Math.pow(1 + input.growth, t)
      pvStage += cf / Math.pow(1 + input.wacc, t)
    }
    const fcfTerminalYear = input.fcf0 * Math.pow(1 + input.growth, input.horizon)
    const terminalValue = input.terminalMultiple * fcfTerminalYear
    const pvTerminal = terminalValue / Math.pow(1 + input.wacc, input.horizon)
    const expectedEquity = pvStage + pvTerminal

    expect(result.equityValue).toBeCloseTo(expectedEquity, 10)
    expect(result.breakdown.pvStage).toBeCloseTo(pvStage, 10)
    expect(result.breakdown.pvTerminal).toBeCloseTo(pvTerminal, 10)
    expect(result.perShare).toBeCloseTo(expectedEquity / input.shares, 10)
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


