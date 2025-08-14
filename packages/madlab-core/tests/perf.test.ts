import { describe, it, expect } from 'vitest';
import { dcf, epv } from '../src/index';

const sampleDcf = {
  fcf0: 100,
  growth: 0.05,
  wacc: 0.1,
  horizon: 5,
  terminalMultiple: 12,
  shares: 50,
};
const sampleEpv = { ebit: 200, taxRate: 0.21, reinvestmentRate: 0.3, wacc: 0.09, shares: 100 };

describe.skip('perf microbench (skip in CI if slow)', () => {
  it('dcf perf 10k iters', () => {
    const t0 = performance.now();
    for (let i = 0; i < 10_000; i++) dcf(sampleDcf);
    const ms = performance.now() - t0;
    // relax threshold if local env is slow
    expect(ms).toBeLessThan(100);
    // eslint-disable-next-line no-console
    console.log('dcf_10k_ms', ms);
  });

  it('epv perf 10k iters', () => {
    const t0 = performance.now();
    for (let i = 0; i < 10_000; i++) epv(sampleEpv);
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(100);
    // eslint-disable-next-line no-console
    console.log('epv_10k_ms', ms);
  });
});
