import { expect } from 'vitest';

export function expectClose(actual: number, expected: number, rel = 1e-9, abs = 1e-9) {
  const diff = Math.abs(actual - expected);
  const tol = Math.max(abs, rel * Math.max(1, Math.abs(expected)));
  expect(diff).toBeLessThanOrEqual(tol);
}
