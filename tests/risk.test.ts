import { describe, it, expect } from 'vitest';
import { calculateReturns, quantile, historicalVaR, expectedShortfall, cornishFisherVaR } from '@/lib/quant/risk';

describe('Risk primitives', () => {
  it('calculateReturns computes log and simple returns', () => {
    const prices = [100, 110, 99, 99];
    const rLog = calculateReturns(prices, 'log');
    const rSimple = calculateReturns(prices, 'simple');
    expect(rLog.length).toBe(3);
    expect(rSimple.length).toBe(3);
    expect(rSimple[0]).toBeCloseTo(0.1, 6);
  });

  it('quantile interpolates correctly', () => {
    const arr = [1, 2, 3, 4];
    expect(quantile(arr, 0)).toBe(1);
    expect(quantile(arr, 1)).toBe(4);
    expect(quantile(arr, 0.5)).toBe(2.5);
  });
});

describe('VaR & ES', () => {
  it('historicalVaR and ES produce sensible values', () => {
    // synthetic returns with mild negative tail
    const rets = [-0.05, -0.03, -0.02, -0.01, 0.0, 0.01, 0.02, 0.03];
    const var95 = historicalVaR(rets, 0.95);
    const es95 = expectedShortfall(rets, 0.95);
    expect(var95).toBeGreaterThan(0);
    expect(es95).toBeGreaterThanOrEqual(var95);
  });

  it('cornishFisherVaR returns finite value for reasonable inputs', () => {
    const rets = Array.from({ length: 500 }, (_, i) => Math.sin(i / 10) * 0.01 + (Math.random() - 0.5) * 0.02);
    const varCF = cornishFisherVaR(rets, 0.99);
    expect(Number.isFinite(varCF)).toBe(true);
    expect(varCF).toBeGreaterThan(0);
  });
});


