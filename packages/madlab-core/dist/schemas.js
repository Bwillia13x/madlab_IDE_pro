import { z } from 'zod';
export const DcfInputSchema = z.object({
    fcf0: z
        .number()
        .finite({ message: 'fcf0 must be finite' })
        .gt(0, { message: 'fcf0 must be > 0' }),
    growth: z
        .number()
        .finite({ message: 'growth must be finite' })
        .gt(-0.5, { message: 'growth must be > -0.5' })
        .lt(1, { message: 'growth must be < 1' }),
    wacc: z
        .number()
        .finite({ message: 'wacc must be finite' })
        .gt(0, { message: 'wacc must be > 0' })
        .lt(1, { message: 'wacc must be < 1' }),
    horizon: z
        .number()
        .int({ message: 'horizon must be an integer' })
        .min(1, { message: 'horizon must be >= 1' }),
    terminalMultiple: z
        .number()
        .finite({ message: 'terminalMultiple must be finite' })
        .gt(0, { message: 'terminalMultiple must be > 0' }),
    shares: z
        .number()
        .finite({ message: 'shares must be finite' })
        .gt(0, { message: 'shares must be > 0' }),
});
export const EpvInputSchema = z.object({
    ebit: z
        .number()
        .finite({ message: 'ebit must be finite' })
        .gt(0, { message: 'ebit must be > 0' }),
    taxRate: z
        .number()
        .finite({ message: 'taxRate must be finite' })
        .min(0, { message: 'taxRate must be >= 0' })
        .lt(1, { message: 'taxRate must be < 1' }),
    reinvestmentRate: z
        .number()
        .finite({ message: 'reinvestmentRate must be finite' })
        .min(0, { message: 'reinvestmentRate must be >= 0' })
        .lt(1, { message: 'reinvestmentRate must be < 1' }),
    wacc: z
        .number()
        .finite({ message: 'wacc must be finite' })
        .gt(0, { message: 'wacc must be > 0' })
        .lt(1, { message: 'wacc must be < 1' }),
    shares: z
        .number()
        .finite({ message: 'shares must be finite' })
        .gt(0, { message: 'shares must be > 0' }),
});
