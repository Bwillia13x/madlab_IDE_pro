// Risk primitives: returns, quantile, expected shortfall, Cornish–Fisher VaR

import { FinancialModelError } from './dcf';

export type ReturnMethod = 'simple' | 'log';

function validateFiniteArray(arr: number[], fieldName: string): void {
  if (!Array.isArray(arr)) {
    throw new FinancialModelError(`${fieldName} must be an array`);
  }
  if (arr.length === 0) {
    throw new FinancialModelError(`${fieldName} cannot be empty`);
  }
  for (let i = 0; i < arr.length; i++) {
    if (!Number.isFinite(arr[i])) {
      throw new FinancialModelError(`${fieldName}[${i}] must be a finite number, got: ${arr[i]}`);
    }
  }
}

export function calculateReturns(values: number[], method: ReturnMethod = 'log'): number[] {
  validateFiniteArray(values, 'values');
  const n = values.length;
  if (n < 2) {
    throw new FinancialModelError('Need at least 2 values to calculate returns');
  }
  const returns: number[] = new Array(n - 1);
  for (let i = 1; i < n; i++) {
    const prev = values[i - 1];
    const curr = values[i];
    if (method === 'simple') {
      returns[i - 1] = (curr - prev) / (prev || 1);
    } else {
      returns[i - 1] = Math.log((curr || 1) / (prev || 1));
    }
  }
  return returns;
}

export function mean(arr: number[]): number {
  validateFiniteArray(arr, 'array');
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function stddev(arr: number[]): number {
  validateFiniteArray(arr, 'array');
  if (arr.length <= 1) {
    throw new FinancialModelError('Standard deviation requires at least 2 data points');
  }
  const m = mean(arr);
  const v = arr.reduce((acc, x) => acc + (x - m) * (x - m), 0) / (arr.length - 1);
  return Math.sqrt(Math.max(v, 0));
}

export function skewness(arr: number[]): number {
  validateFiniteArray(arr, 'array');
  const n = arr.length;
  if (n < 3) {
    throw new FinancialModelError('Skewness calculation requires at least 3 data points');
  }
  const m = mean(arr);
  const s = stddev(arr);
  if (s === 0) return 0;
  const sum3 = arr.reduce((acc, x) => acc + Math.pow((x - m) / s, 3), 0);
  return (n / ((n - 1) * (n - 2))) * sum3;
}

export function kurtosisExcess(arr: number[]): number {
  validateFiniteArray(arr, 'array');
  const n = arr.length;
  if (n < 4) {
    throw new FinancialModelError('Kurtosis calculation requires at least 4 data points');
  }
  const m = mean(arr);
  const s = stddev(arr);
  if (s === 0) return 0;
  const sum4 = arr.reduce((acc, x) => acc + Math.pow((x - m) / s, 4), 0);
  // Fisher's excess kurtosis (kurtosis - 3)
  const k = (n * (n + 1) * sum4 - 3 * Math.pow(n - 1, 2)) / ((n - 1) * (n - 2) * (n - 3));
  return k;
}

export function quantile(arr: number[], p: number): number {
  if (arr.length === 0) return NaN;
  const sorted = [...arr].sort((a, b) => a - b);
  const rank = (sorted.length - 1) * p;
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  const w = rank - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
}

export function historicalVaR(returns: number[], confidence: number): number {
  // VaR as positive loss fraction: VaR = -Q(alpha), alpha = 1 - confidence
  const alpha = Math.max(0, Math.min(1, 1 - confidence));
  const q = quantile(returns, alpha);
  return -q;
}

export function expectedShortfall(returns: number[], confidence: number): number {
  const alpha = Math.max(0, Math.min(1, 1 - confidence));
  const q = quantile(returns, alpha);
  const tail = returns.filter((r) => r <= q);
  if (tail.length === 0) return -q; // fallback
  const avg = mean(tail);
  return -avg;
}

// Approximate inverse standard normal CDF (Acklam's approximation)
function invNormCDF(p: number): number {
  // Coefficients in rational approximations
  const a = [
    -3.969683028665376e+01,
     2.209460984245205e+02,
    -2.759285104469687e+02,
     1.383577518672690e+02,
    -3.066479806614716e+01,
     2.506628277459239e+00,
  ];
  const b = [
    -5.447609879822406e+01,
     1.615858368580409e+02,
    -1.556989798598866e+02,
     6.680131188771972e+01,
    -1.328068155288572e+01,
  ];
  const c = [
    -7.784894002430293e-03,
    -3.223964580411365e-01,
    -2.400758277161838e+00,
    -2.549732539343734e+00,
     4.374664141464968e+00,
     2.938163982698783e+00,
  ];
  const d = [
     7.784695709041462e-03,
     3.224671290700398e-01,
     2.445134137142996e+00,
     3.754408661907416e+00,
  ];
  const plow = 0.02425;
  const phigh = 1 - plow;
  let q;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (phigh < p) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  q = p - 0.5;
  const rLocal = q * q;
  return (((((a[0] * rLocal + a[1]) * rLocal + a[2]) * rLocal + a[3]) * rLocal + a[4]) * rLocal + a[5]) * q /
         (((((b[0] * rLocal + b[1]) * rLocal + b[2]) * rLocal + b[3]) * rLocal + b[4]) * rLocal + 1);
}

// Cornish–Fisher adjusted z-score and VaR (percent loss)
export function cornishFisherVaR(returns: number[], confidence: number): number {
  // Use lower-tail probability alpha = 1 - confidence to obtain a negative z
  const alpha = Math.max(0, Math.min(1, 1 - confidence));
  const z = invNormCDF(alpha);
  const s = skewness(returns);
  const k = kurtosisExcess(returns);
  const zAdj = z + (1 / 6) * (z * z - 1) * s + (1 / 24) * (z * z * z - 3 * z) * k - (1 / 36) * (2 * z * z * z - 5 * z) * s * s;
  const sigma = stddev(returns);
  // For log returns, VaR ~ - (mu + zAdj * sigma). Use mean as drift estimate
  const mu = mean(returns);
  const varPct = -(mu + zAdj * sigma);
  return varPct;
}

export function toMonetary(amountPct: number, notional: number): number {
  return amountPct * notional;
}

/**
 * Bootstrap confidence intervals for VaR/ES style metrics.
 * Resamples the returns array with replacement and computes metrics on each sample.
 */
export function bootstrapVaREs(
  returns: number[],
  confidence: number,
  options?: { samples?: number; sampleSize?: number; ci?: [number, number] }
): {
  varHist: number;
  esHist: number;
  varCF: number;
  ci: {
    varHist: [number, number];
    esHist: [number, number];
    varCF: [number, number];
  };
} {
  const samples = Math.max(100, Math.floor(options?.samples ?? 1000));
  const n = returns.length;
  const sampleSize = Math.max(20, Math.min(n, Math.floor(options?.sampleSize ?? n)));
  const [ciLo, ciHi] = options?.ci ?? [0.05, 0.95];
  if (n < 2) {
    const base = { varHist: NaN, esHist: NaN, varCF: NaN };
    return { ...base, ci: { varHist: [NaN, NaN], esHist: [NaN, NaN], varCF: [NaN, NaN] } };
  }
  const valsVar: number[] = [];
  const valsEs: number[] = [];
  const valsCf: number[] = [];
  for (let s = 0; s < samples; s++) {
    // Resample with replacement
    const idxs = Array.from({ length: sampleSize }, () => Math.floor(Math.random() * n));
    const boot = idxs.map((i) => returns[i]);
    valsVar.push(historicalVaR(boot, confidence));
    valsEs.push(expectedShortfall(boot, confidence));
    valsCf.push(cornishFisherVaR(boot, confidence));
  }
  const pct = (arr: number[], p: number) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const rank = (sorted.length - 1) * p;
    const lo = Math.floor(rank);
    const hi = Math.ceil(rank);
    if (lo === hi) return sorted[lo];
    const w = rank - lo;
    return sorted[lo] * (1 - w) + sorted[hi] * w;
  };
  const ci = {
    varHist: [pct(valsVar, ciLo), pct(valsVar, ciHi)] as [number, number],
    esHist: [pct(valsEs, ciLo), pct(valsEs, ciHi)] as [number, number],
    varCF: [pct(valsCf, ciLo), pct(valsCf, ciHi)] as [number, number],
  };
  // Point estimates on full series
  const point = {
    varHist: historicalVaR(returns, confidence),
    esHist: expectedShortfall(returns, confidence),
    varCF: cornishFisherVaR(returns, confidence),
  };
  return { ...point, ci };
}

/**
 * Compute portfolio returns from per-asset price series and weights.
 * Prices shape: Record<symbol, number[]> all arrays must be same length.
 */
export function portfolioReturns(
  priceSeriesBySymbol: Record<string, number[]>,
  weightsBySymbol: Record<string, number>,
  method: ReturnMethod = 'log'
): number[] {
  const symbols = Object.keys(priceSeriesBySymbol)
  if (symbols.length === 0) throw new FinancialModelError('No assets provided')
  const lengths = symbols.map(s => priceSeriesBySymbol[s].length)
  const n = lengths[0]
  if (!lengths.every(x => x === n)) throw new FinancialModelError('All price series must have the same length')
  const weights = symbols.map(s => Number(weightsBySymbol[s] ?? 0))
  const weightSum = weights.reduce((a, b) => a + b, 0)
  if (!Number.isFinite(weightSum) || Math.abs(weightSum) < 1e-12) throw new FinancialModelError('Weights must sum to non-zero')
  const normalized = weights.map(w => w / weightSum)
  const assetReturns = symbols.map(s => calculateReturns(priceSeriesBySymbol[s], method))
  const m = assetReturns[0].length
  const portfolio: number[] = new Array(m).fill(0)
  for (let t = 0; t < m; t++) {
    let r = 0
    for (let i = 0; i < symbols.length; i++) {
      r += normalized[i] * assetReturns[i][t]
    }
    portfolio[t] = r
  }
  return portfolio
}


