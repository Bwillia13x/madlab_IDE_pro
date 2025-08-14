import { describe, it, expect } from 'vitest';
import { priceBS, greeks } from '@/lib/quant/blackScholes';

describe('Black–Scholes', () => {
  it('prices at-the-money call sensibly', () => {
    const price = priceBS({ S: 100, K: 100, r: 0.01, sigma: 0.2, T: 1, type: 'call' });
    expect(price).toBeGreaterThan(7);
    expect(price).toBeLessThan(15);
  });

  it('put-call parity roughly holds via greeks.price', () => {
    const call = greeks({ S: 100, K: 100, r: 0.01, sigma: 0.2, T: 0.5, type: 'call' });
    const put = greeks({ S: 100, K: 100, r: 0.01, sigma: 0.2, T: 0.5, type: 'put' });
    const lhs = call.price - put.price;
    const rhs = 100 - 100 * Math.exp(-0.01 * 0.5);
    expect(Math.abs(lhs - rhs)).toBeLessThan(0.5);
  });
});


