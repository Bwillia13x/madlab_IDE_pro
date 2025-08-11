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
  peRatio: z.number(),
  eps: z.number(),
  dividend: z.number(),
  divYield: z.number(),
  beta: z.number(),
  fiftyTwoWeekHigh: z.number(),
  fiftyTwoWeekLow: z.number(),
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