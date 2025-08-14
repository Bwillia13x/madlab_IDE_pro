// Basic DCF primitives and helpers

// Financial modeling error for invalid inputs
export class FinancialModelError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'FinancialModelError';
  }
}

// Input validation functions
function validateFiniteNumber(value: number, fieldName: string): void {
  if (!Number.isFinite(value)) {
    throw new FinancialModelError(`${fieldName} must be a finite number, got: ${value}`);
  }
}

export interface DcfInput {
  initialFcf: number; // FCF at t=0
  growthRate: number; // g as decimal, e.g. 0.03
  discountRate: number; // WACC as decimal, e.g. 0.10
  years: number; // forecast horizon N
  terminalMethod: 'ggm' | 'exit-multiple';
  exitMultiple?: number; // optional EBITDA/FCF multiple for exit
}

export interface DcfYearRow {
  year: number; // 1..N
  fcf: number; // FCF_t
  discountFactor: number; // 1 / (1 + r)^t
  pvFcf: number; // fcf * discountFactor
  cumulativePv: number; // sum_{k<=t} pvFcf_k
}

export interface DcfResult {
  schedule: DcfYearRow[];
  terminalValue: number; // at t=N (undiscounted)
  pvTerminalValue: number; // discounted to t=0
  enterpriseValue: number; // sum PV(FCFs) + PV(TV)
}

export function presentValue(cashFlow: number, discountRate: number, yearIndex: number): number {
  validateFiniteNumber(cashFlow, 'cashFlow');
  validateFiniteNumber(discountRate, 'discountRate');
  validateFiniteNumber(yearIndex, 'yearIndex');
  
  if (yearIndex < 0) {
    throw new FinancialModelError('yearIndex must be non-negative');
  }
  if (discountRate <= -1) {
    throw new FinancialModelError('discountRate must be greater than -100% (-1.0)');
  }
  
  const factor = 1 / Math.pow(1 + discountRate, yearIndex);
  return cashFlow * factor;
}

export function computeWacc(params: {
  equityValue: number;
  debtValue: number;
  costOfEquity: number; // Re
  costOfDebt: number; // Rd
  taxRate: number; // T
}): number {
  const { equityValue, debtValue, costOfEquity, costOfDebt, taxRate } = params;
  const totalCapital = Math.max(equityValue + debtValue, 1e-12);
  const weightEquity = equityValue / totalCapital;
  const weightDebt = debtValue / totalCapital;
  return weightEquity * costOfEquity + weightDebt * costOfDebt * (1 - taxRate);
}

// Gordon Growth Model terminal value at t=N, using FCF_{N+1} / (r - g)
export function terminalValueGordon(lastFcf: number, growthRate: number, discountRate: number): number {
  validateFiniteNumber(lastFcf, 'lastFcf');
  validateFiniteNumber(growthRate, 'growthRate');
  validateFiniteNumber(discountRate, 'discountRate');
  
  if (discountRate <= growthRate) {
    throw new FinancialModelError(
      `Growth rate (${(growthRate * 100).toFixed(2)}%) cannot exceed or equal discount rate (${(discountRate * 100).toFixed(2)}%) in Gordon Growth Model`,
      'INVALID_GROWTH_RATE'
    );
  }
  
  // Reasonable bounds checking
  if (growthRate < -0.5) {
    throw new FinancialModelError('Growth rate cannot be less than -50%');
  }
  if (growthRate > 0.5) {
    throw new FinancialModelError('Growth rate cannot exceed 50% (unrealistic perpetual growth)');
  }
  if (discountRate <= 0) {
    throw new FinancialModelError('Discount rate must be positive');
  }
  
  const nextFcf = lastFcf * (1 + growthRate);
  return nextFcf / (discountRate - growthRate);
}

export function terminalValueExitMultiple(lastFcf: number, multiple: number): number {
  return Math.max(0, lastFcf) * Math.max(0, multiple);
}

export function buildDcfSchedule(
  initialFcf: number,
  growthRate: number,
  discountRate: number,
  years: number
): DcfYearRow[] {
  const schedule: DcfYearRow[] = [];
  let prevFcf = initialFcf;
  let cumulative = 0;
  for (let t = 1; t <= years; t++) {
    const fcf = prevFcf * (1 + growthRate);
    const discountFactor = 1 / Math.pow(1 + discountRate, t);
    const pvFcf = fcf * discountFactor;
    cumulative += pvFcf;
    schedule.push({ year: t, fcf, discountFactor, pvFcf, cumulativePv: cumulative });
    prevFcf = fcf;
  }
  return schedule;
}

export function computeDcf(input: DcfInput): DcfResult {
  // Comprehensive input validation
  const { initialFcf, growthRate, discountRate, years, terminalMethod, exitMultiple } = input;
  
  validateFiniteNumber(initialFcf, 'initialFcf');
  validateFiniteNumber(growthRate, 'growthRate');
  validateFiniteNumber(discountRate, 'discountRate');
  validateFiniteNumber(years, 'years');
  
  if (years <= 0 || years > 50) {
    throw new FinancialModelError('Forecast years must be between 1 and 50');
  }
  if (!Number.isInteger(years)) {
    throw new FinancialModelError('Forecast years must be a whole number');
  }
  
  if (terminalMethod === 'exit-multiple') {
    const multiple = exitMultiple ?? 10;
    validateFiniteNumber(multiple, 'exitMultiple');
    if (multiple < 0) {
      throw new FinancialModelError('Exit multiple cannot be negative');
    }
  }
  
  const schedule = buildDcfSchedule(initialFcf, growthRate, discountRate, years);
  const lastFcf = schedule.length > 0 ? schedule[schedule.length - 1].fcf : initialFcf;

  let terminalValue = 0;
  if (terminalMethod === 'ggm') {
    terminalValue = terminalValueGordon(lastFcf, growthRate, discountRate);
  } else if (terminalMethod === 'exit-multiple') {
    terminalValue = terminalValueExitMultiple(lastFcf, input.exitMultiple ?? 10);
  }

  const pvTerminalValue = presentValue(terminalValue, discountRate, years);
  const sumPvFcf = schedule.reduce((acc, r) => acc + r.pvFcf, 0);
  const enterpriseValue = sumPvFcf + pvTerminalValue;

  return { schedule, terminalValue, pvTerminalValue, enterpriseValue };
}

/**
 * DCF sensitivity grid for (growthRate, discountRate)
 */
export function dcfSensitivityGrid(
  base: Omit<DcfInput, 'growthRate' | 'discountRate'> & { growthRate: number; discountRate: number },
  growthRates: number[],
  discountRates: number[]
): { growth: number; discount: number; enterpriseValue: number }[] {
  const out: { growth: number; discount: number; enterpriseValue: number }[] = [];
  for (const g of growthRates) {
    for (const r of discountRates) {
      const res = computeDcf({ ...base, growthRate: g, discountRate: r });
      out.push({ growth: g, discount: r, enterpriseValue: res.enterpriseValue });
    }
  }
  return out;
}


