import { describe, it, expect } from 'vitest';
import { epv, InputValidationError } from '../src/index';
import { expectClose } from './helpers';

describe('epv', () => {
  it('computes EPV and per-share deterministically', () => {
    const input = { ebit: 200, taxRate: 0.21, reinvestmentRate: 0.3, wacc: 0.09, shares: 100 };
    const result = epv(input);

    const afterTaxOperatingIncome = input.ebit * (1 - input.taxRate);
    const freeCashFlowProxy = afterTaxOperatingIncome * (1 - input.reinvestmentRate);
    const expectedEpv = freeCashFlowProxy / input.wacc;

    expectClose(result.epv, expectedEpv);
    expectClose(result.perShare, expectedEpv / input.shares);
  });

  it('validates inputs', () => {
    expect(() =>
      epv({ ebit: 0, taxRate: 0.2, reinvestmentRate: 0.2, wacc: 0.1, shares: 10 })
    ).toThrow(InputValidationError);
    expect(() =>
      epv({ ebit: 100, taxRate: 1, reinvestmentRate: 0.2, wacc: 0.1, shares: 10 })
    ).toThrow(InputValidationError);
    expect(() =>
      epv({ ebit: 100, taxRate: 0.2, reinvestmentRate: 1, wacc: 0.1, shares: 10 })
    ).toThrow(InputValidationError);
    expect(() =>
      epv({ ebit: 100, taxRate: 0.2, reinvestmentRate: 0.2, wacc: 1, shares: 10 })
    ).toThrow(InputValidationError);
    expect(() =>
      epv({ ebit: 100, taxRate: 0.2, reinvestmentRate: 0.2, wacc: 0.1, shares: 0 })
    ).toThrow(InputValidationError);
  });

  it('scale invariance: ebit scale and shares scale offset in perShare', () => {
    const base = { ebit: 100, taxRate: 0.2, reinvestmentRate: 0.2, wacc: 0.1, shares: 10 };
    const res1 = epv(base);
    const scaled = { ...base, ebit: base.ebit * 100, shares: base.shares * 100 };
    const res2 = epv(scaled);
    expectClose(res1.perShare, res2.perShare);
  });
});
