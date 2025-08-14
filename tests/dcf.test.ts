import { describe, it, expect } from 'vitest';
import { presentValue, terminalValueGordon, buildDcfSchedule, computeDcf, computeWacc } from '@/lib/quant/dcf';

describe('DCF primitives', () => {
  it('presentValue discounts correctly', () => {
    expect(presentValue(110, 0.10, 1)).toBeCloseTo(100, 6);
    expect(presentValue(121, 0.10, 2)).toBeCloseTo(100, 6);
  });

  it('terminalValueGordon uses next cash flow over (r - g)', () => {
    const tv = terminalValueGordon(100, 0.03, 0.10);
    // next = 103, denom = 0.07 => ~1471.4286
    expect(tv).toBeCloseTo(1471.4286, 3);
  });

  it('buildDcfSchedule grows and discounts FCFs', () => {
    const sched = buildDcfSchedule(100, 0.05, 0.10, 3);
    expect(sched.length).toBe(3);
    expect(sched[0].fcf).toBeCloseTo(105, 6);
    expect(sched[1].fcf).toBeCloseTo(110.25, 6);
    expect(sched[2].fcf).toBeCloseTo(115.7625, 6);
    expect(sched[0].pvFcf).toBeCloseTo(95.4545, 3);
  });

  it('computeWacc blends equity and debt costs', () => {
    const wacc = computeWacc({ equityValue: 60, debtValue: 40, costOfEquity: 0.12, costOfDebt: 0.06, taxRate: 0.25 });
    // 0.6*0.12 + 0.4*0.06*(1-0.25) = 0.072 + 0.018 = 0.09
    expect(wacc).toBeCloseTo(0.09, 6);
  });
});

describe('computeDcf', () => {
  it('returns enterprise value with PV of terminal value', () => {
    const res = computeDcf({ initialFcf: 100, growthRate: 0.03, discountRate: 0.10, years: 5, terminalMethod: 'ggm' });
    expect(res.schedule).toHaveLength(5);
    expect(res.enterpriseValue).toBeGreaterThan(0);
    expect(Number.isFinite(res.enterpriseValue)).toBe(true);
  });
});


