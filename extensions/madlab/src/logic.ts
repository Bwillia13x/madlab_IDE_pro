// Temporary stub: replace with imports from packages/madlab-core when ready (Agent C)

export interface DcfInput {
  fcf0: number;
  growth: number;
  wacc: number;
  horizon: number;
  terminalMultiple: number;
  shares: number;
}

export interface DcfResult {
  equityValue: number;
  perShare: number;
  breakdown: { pvStage: number; pvTerminal: number };
}

export function dcf(input: DcfInput): DcfResult {
  const { fcf0, growth, wacc, horizon, terminalMultiple, shares } = input;
  if (wacc <= 0 || horizon <= 0 || shares <= 0) {
    throw new Error('Invalid inputs');
  }
  let pvStage = 0;
  let cash = fcf0;
  for (let t = 1; t <= horizon; t++) {
    cash = cash * (1 + growth);
    pvStage += cash / Math.pow(1 + wacc, t);
  }
  const terminalValue = cash * terminalMultiple;
  const pvTerminal = terminalValue / Math.pow(1 + wacc, horizon);
  const equityValue = pvStage + pvTerminal;
  return {
    equityValue,
    perShare: equityValue / shares,
    breakdown: { pvStage, pvTerminal },
  };
}

export function handleCalc(payload: DcfInput) {
  return dcf(payload);
}


