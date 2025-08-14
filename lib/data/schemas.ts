import { z } from 'zod';

// Common preprocessor: accept Date|string|number -> Date
const toDate = z.preprocess((v) => {
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? v : d;
  }
  return v;
}, z.date());

export const zPricePoint = z.object({
  date: toDate,
  open: z.number().finite(),
  high: z.number().finite(),
  low: z.number().finite(),
  close: z.number().finite(),
  volume: z.number().finite().nonnegative(),
});

export const zPriceSeries = z.array(zPricePoint);

export const zKpiData = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  price: z.number().finite(),
  change: z.number().finite(),
  changePercent: z.number().finite(),
  volume: z.number().finite().nonnegative(),
  marketCap: z.number().finite().nonnegative(),
  peRatio: z.number().finite().optional(),
  eps: z.number().finite().optional(),
  dividend: z.number().finite().optional(),
  divYield: z.number().finite().optional(),
  beta: z.number().finite().optional(),
  fiftyTwoWeekHigh: z.number().finite().optional(),
  fiftyTwoWeekLow: z.number().finite().optional(),
  timestamp: toDate,
});

export const zFinancials = z.object({
  symbol: z.string().min(1),
  revenue: z.number().finite(),
  netIncome: z.number().finite(),
  cashFlow: z.number().finite(),
  fcf: z.number().finite(),
  timestamp: toDate,
});

export const zVolPoint = z.object({
  strike: z.number().finite(),
  expiry: toDate,
  impliedVol: z.number().finite(),
});

export const zVolSurface = z.object({
  symbol: z.string().min(1),
  underlyingPrice: z.number().finite(),
  points: z.array(zVolPoint),
  timestamp: toDate,
});

export type PricePointParsed = z.infer<typeof zPricePoint>;
export type KpiDataParsed = z.infer<typeof zKpiData>;
export type FinancialsParsed = z.infer<typeof zFinancials>;
export type VolSurfaceParsed = z.infer<typeof zVolSurface>;


