import { describe, it, expect } from 'vitest';
import { realizedVol, buildVolCone } from '@/lib/quant/vol';

describe('Volatility', () => {
  it('realizedVol annualizes daily returns', () => {
    // synthetic upward drift series
    const series = Array.from({ length: 300 }, (_, i) => 100 * Math.exp(0.0005 * i + Math.sin(i / 10) * 0.01));
    const vol = realizedVol(series, 60);
    expect(Number.isFinite(vol)).toBe(true);
    expect(vol).toBeGreaterThan(0);
  });

  it('buildVolCone returns points for given windows', () => {
    const series = Array.from({ length: 300 }, (_, i) => 100 + i);
    const cone = buildVolCone(series, [20, 60, 120]);
    expect(cone.length).toBe(3);
    expect(cone[0].window).toBe(20);
  });
});


