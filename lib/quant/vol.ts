import { calculateReturns } from './risk';
import { FinancialModelError } from './dcf';

export interface RealizedVolPoint {
  window: number; // days
  vol: number; // annualized (stdev * sqrt(252))
}

export function realizedVol(series: number[], window: number): number {
  if (!Number.isFinite(window) || window <= 0) {
    throw new FinancialModelError('Window must be a positive finite number');
  }
  if (!Number.isInteger(window)) {
    throw new FinancialModelError('Window must be a whole number');
  }
  if (window > 1000) {
    throw new FinancialModelError('Window cannot exceed 1000 days (unreasonably long)');
  }
  const rets = calculateReturns(series, 'log');
  if (rets.length < window) return NaN;
  const w = rets.slice(-window);
  const mean = w.reduce((a, b) => a + b, 0) / w.length;
  const variance = w.reduce((acc, x) => acc + (x - mean) * (x - mean), 0) / Math.max(1, w.length - 1);
  const stdev = Math.sqrt(Math.max(0, variance));
  return stdev * Math.sqrt(252);
}

export function buildVolCone(series: number[], windows: number[] = [20, 60, 120, 252]) {
  if (!Array.isArray(windows) || windows.length === 0) {
    throw new FinancialModelError('Windows must be a non-empty array');
  }
  for (const window of windows) {
    if (!Number.isFinite(window) || window <= 0) {
      throw new FinancialModelError(`Invalid window: ${window}. All windows must be positive finite numbers`);
    }
  }
  return windows.map((w) => ({ window: w, vol: realizedVol(series, w) }));
}


