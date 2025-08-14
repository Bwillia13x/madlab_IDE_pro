import { describe, it, expect } from 'vitest'
import { epv, InputValidationError } from '../src/index'

describe('epv', () => {
  it('computes EPV and per-share deterministically', () => {
    const result = epv({ ebit: 200, taxRate: 0.21, reinvestmentRate: 0.3, wacc: 0.09, shares: 100 })
    // after-tax = 158, fcf proxy = 110.6, epv = 1228.888..., perShare ~ 12.2889
    expect(result.epv).toBeCloseTo(1228.888, 3)
    expect(result.perShare).toBeCloseTo(result.epv / 100, 6)
  })

  it('validates inputs', () => {
    expect(() => epv({ ebit: 0, taxRate: 0.2, reinvestmentRate: 0.2, wacc: 0.1, shares: 10 })).toThrow(
      InputValidationError,
    )
    expect(() => epv({ ebit: 100, taxRate: 1, reinvestmentRate: 0.2, wacc: 0.1, shares: 10 })).toThrow(
      InputValidationError,
    )
    expect(() => epv({ ebit: 100, taxRate: 0.2, reinvestmentRate: 1, wacc: 0.1, shares: 10 })).toThrow(
      InputValidationError,
    )
    expect(() => epv({ ebit: 100, taxRate: 0.2, reinvestmentRate: 0.2, wacc: 1, shares: 10 })).toThrow(
      InputValidationError,
    )
    expect(() => epv({ ebit: 100, taxRate: 0.2, reinvestmentRate: 0.2, wacc: 0.1, shares: 0 })).toThrow(
      InputValidationError,
    )
  })
})


