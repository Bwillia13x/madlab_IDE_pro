import { z } from 'zod';

export const zPricePoint = z.object({
  date: z.date(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
});

export const zPriceSeries = z.array(zPricePoint);

export const zKpiData = z.object({
  symbol: z.string(),
  name: z.string(),
  price: z.number(),
  change: z.number(),
  changePercent: z.number(),
  volume: z.number(),
  marketCap: z.number(),
  peRatio: z.number().optional(),
  eps: z.number().optional(),
  dividend: z.number().optional(),
  divYield: z.number().optional(),
  beta: z.number().optional(),
  fiftyTwoWeekHigh: z.number().optional(),
  fiftyTwoWeekLow: z.number().optional(),
  timestamp: z.date(),
});

export const zFinancials = z.object({
  symbol: z.string(),
  revenue: z.number(),
  netIncome: z.number(),
  cashFlow: z.number(),
  fcf: z.number(),
  timestamp: z.date(),
});

export const zPriceRange = z.enum(['1D', '5D', '1M', '3M', '6M', '1Y', '2Y', '5Y', 'MAX']);