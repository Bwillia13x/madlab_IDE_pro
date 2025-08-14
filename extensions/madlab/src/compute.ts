// Adapter bridge to @madlab/core
import { computeDcf, computeEpv } from '@madlab/core/adapters';

export type DcfInput = {
  fcf0: number;
  growth: number;
  wacc: number;
  horizon: number;
  terminalMultiple: number;
  shares: number;
};

export function handleCalc(payload: { method?: 'dcf' | 'epv'; model: unknown }) {
  const method = payload?.method ?? 'dcf';
  if (method === 'epv') {
    const res = computeEpv(payload.model);
    if (res.ok) return res.value;
    throw new Error(JSON.stringify(res.error));
  }
  const res = computeDcf(payload.model);
  if (res.ok) return res.value;
  throw new Error(JSON.stringify(res.error));
}
