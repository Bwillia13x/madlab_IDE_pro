import { describe, it, expect } from 'vitest';
import { dcf, InputValidationError } from '../src/index';
import { expectClose } from './helpers';

describe('dcf', () => {
  it('computes equity value and per-share deterministically', () => {
    const input = {
      fcf0: 100,
      growth: 0.05,
      wacc: 0.1,
      horizon: 5,
      terminalMultiple: 12,
      shares: 50,
    };
    const result = dcf(input);

    // Independent reference calculation of the same formula for determinism
    let pvStage = 0;
    for (let t = 1; t <= input.horizon; t++) {
      const cf = input.fcf0 * Math.pow(1 + input.growth, t);
      pvStage += cf / Math.pow(1 + input.wacc, t);
    }
    const fcfTerminalYear = input.fcf0 * Math.pow(1 + input.growth, input.horizon);
    const terminalValue = input.terminalMultiple * fcfTerminalYear;
    const pvTerminal = terminalValue / Math.pow(1 + input.wacc, input.horizon);
    const expectedEquity = pvStage + pvTerminal;

    expectClose(result.equityValue, expectedEquity);
    expectClose(result.breakdown.pvStage, pvStage);
    expectClose(result.breakdown.pvTerminal, pvTerminal);
    expectClose(result.perShare, expectedEquity / input.shares);
  });

  it('handles wacc near growth without instability', () => {
    const input = {
      fcf0: 100,
      growth: 0.099,
      wacc: 0.1,
      horizon: 10,
      terminalMultiple: 15,
      shares: 100,
    };
    const result = dcf(input);
    expect(result.equityValue).toBeGreaterThan(0);
    expect(Number.isFinite(result.equityValue)).toBe(true);
  });

  it('scale invariance: scaling cash flows scales result linearly', () => {
    const base = {
      fcf0: 10,
      growth: 0.05,
      wacc: 0.1,
      horizon: 5,
      terminalMultiple: 10,
      shares: 10,
    };
    const res1 = dcf(base);
    const scaled = { ...base, fcf0: base.fcf0 * 100, shares: base.shares * 100 };
    const res2 = dcf(scaled);
    expectClose(res1.perShare, res2.perShare);
  });

  it('edge horizons', () => {
    const h1 = dcf({
      fcf0: 100,
      growth: 0.05,
      wacc: 0.1,
      horizon: 1,
      terminalMultiple: 12,
      shares: 50,
    });
    expect(h1.equityValue).toBeGreaterThan(0);
    const h30 = dcf({
      fcf0: 100,
      growth: 0.03,
      wacc: 0.08,
      horizon: 30,
      terminalMultiple: 10,
      shares: 100,
    });
    expect(h30.equityValue).toBeGreaterThan(h1.equityValue);
  });

  it('validates inputs', () => {
    expect(() =>
      dcf({ fcf0: 0, growth: 0.05, wacc: 0.1, horizon: 5, terminalMultiple: 10, shares: 10 })
    ).toThrow(InputValidationError);
    expect(() =>
      dcf({ fcf0: 100, growth: 1, wacc: 0.1, horizon: 5, terminalMultiple: 10, shares: 10 })
    ).toThrow(InputValidationError);
    expect(() =>
      dcf({ fcf0: 100, growth: 0.05, wacc: 1, horizon: 5, terminalMultiple: 10, shares: 10 })
    ).toThrow(InputValidationError);
    expect(() =>
      dcf({ fcf0: 100, growth: 0.05, wacc: 0.1, horizon: 0, terminalMultiple: 10, shares: 10 })
    ).toThrow(InputValidationError);
    expect(() =>
      dcf({ fcf0: 100, growth: 0.05, wacc: 0.1, horizon: 5, terminalMultiple: 0, shares: 10 })
    ).toThrow(InputValidationError);
    expect(() =>
      dcf({ fcf0: 100, growth: 0.05, wacc: 0.1, horizon: 5, terminalMultiple: 10, shares: 0 })
    ).toThrow(InputValidationError);
    expect(() =>
      dcf({ fcf0: 100, growth: -0.75, wacc: 0.1, horizon: 5, terminalMultiple: 10, shares: 10 })
    ).toThrow(InputValidationError);
  });
});
