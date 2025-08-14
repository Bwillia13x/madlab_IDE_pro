// Black–Scholes pricing and greeks for European options

import { FinancialModelError } from './dcf';

// Input validation for options pricing
function validateOptionsInput(S: number, K: number, T: number, r: number, sigma: number): void {
  if (!Number.isFinite(S) || S <= 0) {
    throw new FinancialModelError('Spot price (S) must be positive and finite');
  }
  if (!Number.isFinite(K) || K <= 0) {
    throw new FinancialModelError('Strike price (K) must be positive and finite');
  }
  if (!Number.isFinite(T) || T <= 0) {
    throw new FinancialModelError('Time to expiry (T) must be positive and finite');
  }
  if (T > 10) {
    throw new FinancialModelError('Time to expiry cannot exceed 10 years');
  }
  if (!Number.isFinite(r)) {
    throw new FinancialModelError('Risk-free rate (r) must be finite');
  }
  if (Math.abs(r) > 1) {
    throw new FinancialModelError('Risk-free rate must be between -100% and 100%');
  }
  if (!Number.isFinite(sigma) || sigma < 0) {
    throw new FinancialModelError('Volatility (sigma) must be non-negative and finite');
  }
  if (sigma > 10) {
    throw new FinancialModelError('Volatility cannot exceed 1000% (unrealistic)');
  }
}

function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// Acklam approximation for inverse CDF is already implemented in risk.ts, but keep BS self-contained with erf-based CDF
function erf(x: number): number {
  // Abramowitz-Stegun approximation
  const sign = x < 0 ? -1 : 1;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * Math.abs(x));
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

function normCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

export type OptionType = 'call' | 'put';

export interface BsInput {
  S: number; // spot
  K: number; // strike
  r: number; // risk-free rate (annual, cont.)
  sigma: number; // volatility (annual)
  T: number; // time to expiry in years
  type: OptionType;
}

export interface BsGreeksResult {
  price: number;
  delta: number;
  gamma: number;
  vega: number; // per 1.0 change in sigma (not per 1%)
  theta: number; // per year
  rho: number; // per 1.0 change in r (not per 1%)
  d1: number;
  d2: number;
}

export function d1(S: number, K: number, r: number, sigma: number, T: number): number {
  validateOptionsInput(S, K, T, r, sigma);
  
  if (sigma === 0) {
    throw new FinancialModelError('Volatility cannot be zero for Black-Scholes calculation');
  }
  
  return (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
}

export function d2(S: number, K: number, r: number, sigma: number, T: number): number {
  return d1(S, K, r, sigma, T) - sigma * Math.sqrt(T);
}

export function priceBS(input: BsInput): number {
  const { S, K, r, sigma, T, type } = input;
  
  // Input validation will be handled by d1() function
  if (sigma === 0) {
    // At expiry or zero vol, option value is intrinsic
    const intrinsic = type === 'call' ? Math.max(S - K, 0) : Math.max(K - S, 0);
    return intrinsic;
  }
  const _d1 = d1(S, K, r, sigma, T);
  const _d2 = _d1 - sigma * Math.sqrt(T);
  if (type === 'call') {
    return S * normCdf(_d1) - K * Math.exp(-r * T) * normCdf(_d2);
  } else {
    return K * Math.exp(-r * T) * normCdf(-_d2) - S * normCdf(-_d1);
  }
}

export function greeks(input: BsInput): BsGreeksResult {
  const { S, K, r, sigma, T, type } = input;
  const _d1 = d1(S, K, r, sigma, T);
  const _d2 = _d1 - sigma * Math.sqrt(T);
  const Nd1 = normCdf(type === 'call' ? _d1 : _d1) // not used for sign here
  const nd1 = normPdf(_d1);

  const delta = type === 'call' ? normCdf(_d1) : normCdf(_d1) - 1;
  const gamma = nd1 / (S * sigma * Math.sqrt(T));
  const vega = S * nd1 * Math.sqrt(T);
  const theta = type === 'call'
    ? (-S * nd1 * sigma) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * normCdf(_d2)
    : (-S * nd1 * sigma) / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * normCdf(-_d2);
  const rho = type === 'call'
    ? K * T * Math.exp(-r * T) * normCdf(_d2)
    : -K * T * Math.exp(-r * T) * normCdf(-_d2);

  const price = priceBS(input);
  return { price, delta, gamma, vega, theta, rho, d1: _d1, d2: _d2 };
}

/**
 * Convenience normalizations for reporting greeks consistently.
 * vegaPerPct: per 1% volatility change; thetaPerDay: per day; rhoPerPctRate: per 1% rate change.
 */
export function normalizeGreeks(res: BsGreeksResult) {
  return {
    ...res,
    vegaPerPct: res.vega / 100, // divide by 100 to get per 1% vol change
    thetaPerDay: res.theta / 252, // trading days approximation
    rhoPerPctRate: res.rho / 100,
  };
}


