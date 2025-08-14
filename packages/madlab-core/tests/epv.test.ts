import { describe, it, expect } from 'vitest'
import { epv, InputValidationError } from '../src/index'

describe('epv', () => {
  it('computes EPV and per-share deterministically', () => {
    const input = { ebit: 200, taxRate: 0.21, reinvestmentRate: 0.3, wacc: 0.09, shares: 100 }
    const result = epv(input)

    const afterTaxOperatingIncome = input.ebit * (1 - input.taxRate)
    const freeCashFlowProxy = afterTaxOperatingIncome * (1 - input.reinvestmentRate)
    const expectedEpv = freeCashFlowProxy / input.wacc

    expect(result.epv).toBeCloseTo(expectedEpv, 6)
    expect(result.perShare).toBeCloseTo(expectedEpv / input.shares, 6)
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


