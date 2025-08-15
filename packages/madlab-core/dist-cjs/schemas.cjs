"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EpvInputSchema = exports.DcfInputSchema = void 0;
const zod_1 = require("zod");
exports.DcfInputSchema = zod_1.z.object({
    fcf0: zod_1.z
        .number()
        .finite({ message: 'fcf0 must be finite' })
        .gt(0, { message: 'fcf0 must be > 0' }),
    growth: zod_1.z
        .number()
        .finite({ message: 'growth must be finite' })
        .gt(-0.5, { message: 'growth must be > -0.5' })
        .lt(1, { message: 'growth must be < 1' }),
    wacc: zod_1.z
        .number()
        .finite({ message: 'wacc must be finite' })
        .gt(0, { message: 'wacc must be > 0' })
        .lt(1, { message: 'wacc must be < 1' }),
    horizon: zod_1.z
        .number()
        .int({ message: 'horizon must be an integer' })
        .min(1, { message: 'horizon must be >= 1' }),
    terminalMultiple: zod_1.z
        .number()
        .finite({ message: 'terminalMultiple must be finite' })
        .gt(0, { message: 'terminalMultiple must be > 0' }),
    shares: zod_1.z
        .number()
        .finite({ message: 'shares must be finite' })
        .gt(0, { message: 'shares must be > 0' }),
});
exports.EpvInputSchema = zod_1.z.object({
    ebit: zod_1.z
        .number()
        .finite({ message: 'ebit must be finite' })
        .gt(0, { message: 'ebit must be > 0' }),
    taxRate: zod_1.z
        .number()
        .finite({ message: 'taxRate must be finite' })
        .min(0, { message: 'taxRate must be >= 0' })
        .lt(1, { message: 'taxRate must be < 1' }),
    reinvestmentRate: zod_1.z
        .number()
        .finite({ message: 'reinvestmentRate must be finite' })
        .min(0, { message: 'reinvestmentRate must be >= 0' })
        .lt(1, { message: 'reinvestmentRate must be < 1' }),
    wacc: zod_1.z
        .number()
        .finite({ message: 'wacc must be finite' })
        .gt(0, { message: 'wacc must be > 0' })
        .lt(1, { message: 'wacc must be < 1' }),
    shares: zod_1.z
        .number()
        .finite({ message: 'shares must be finite' })
        .gt(0, { message: 'shares must be > 0' }),
});
