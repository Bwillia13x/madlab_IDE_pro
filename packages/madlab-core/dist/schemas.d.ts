import { z } from 'zod';
export declare const DcfInputSchema: z.ZodObject<
  {
    fcf0: z.ZodNumber;
    growth: z.ZodNumber;
    wacc: z.ZodNumber;
    horizon: z.ZodNumber;
    terminalMultiple: z.ZodNumber;
    shares: z.ZodNumber;
  },
  'strip',
  z.ZodTypeAny,
  {
    fcf0: number;
    growth: number;
    wacc: number;
    horizon: number;
    terminalMultiple: number;
    shares: number;
  },
  {
    fcf0: number;
    growth: number;
    wacc: number;
    horizon: number;
    terminalMultiple: number;
    shares: number;
  }
>;
export declare const EpvInputSchema: z.ZodObject<
  {
    ebit: z.ZodNumber;
    taxRate: z.ZodNumber;
    reinvestmentRate: z.ZodNumber;
    wacc: z.ZodNumber;
    shares: z.ZodNumber;
  },
  'strip',
  z.ZodTypeAny,
  {
    wacc: number;
    shares: number;
    ebit: number;
    taxRate: number;
    reinvestmentRate: number;
  },
  {
    wacc: number;
    shares: number;
    ebit: number;
    taxRate: number;
    reinvestmentRate: number;
  }
>;
export type DcfInput = z.infer<typeof DcfInputSchema>;
export type EpvInput = z.infer<typeof EpvInputSchema>;
