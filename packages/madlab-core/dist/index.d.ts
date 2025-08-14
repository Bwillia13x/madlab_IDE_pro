export interface DcfInput {
    fcf0: number;
    growth: number;
    wacc: number;
    horizon: number;
    terminalMultiple: number;
    shares: number;
}
export interface DcfResultBreakdown {
    pvStage: number;
    pvTerminal: number;
}
export interface DcfResult {
    equityValue: number;
    perShare: number;
    breakdown: DcfResultBreakdown;
}
export interface EpvInput {
    ebit: number;
    taxRate: number;
    reinvestmentRate: number;
    wacc: number;
    shares: number;
}
export interface EpvResult {
    epv: number;
    perShare: number;
}
export declare class InputValidationError extends Error {
    constructor(message: string);
}
export declare function dcf(input: DcfInput): DcfResult;
export declare function epv(input: EpvInput): EpvResult;
export interface WebviewHtmlOptions {
    title: string;
    cspSource: string;
    nonce: string;
    scriptUris: string[];
    styleUris?: string[];
    bodyHtml?: string;
}
export declare function buildCspHtml(options: WebviewHtmlOptions): string;
import { z } from 'zod';
export { z };
export declare const DcfInputSchema: z.ZodObject<{
    fcf0: z.ZodNumber;
    growth: z.ZodNumber;
    wacc: z.ZodNumber;
    horizon: z.ZodNumber;
    terminalMultiple: z.ZodNumber;
    shares: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    fcf0: number;
    growth: number;
    wacc: number;
    horizon: number;
    terminalMultiple: number;
    shares: number;
}, {
    fcf0: number;
    growth: number;
    wacc: number;
    horizon: number;
    terminalMultiple: number;
    shares: number;
}>;
export declare const EpvInputSchema: z.ZodObject<{
    ebit: z.ZodNumber;
    taxRate: z.ZodNumber;
    reinvestmentRate: z.ZodNumber;
    wacc: z.ZodNumber;
    shares: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    wacc: number;
    shares: number;
    ebit: number;
    taxRate: number;
    reinvestmentRate: number;
}, {
    wacc: number;
    shares: number;
    ebit: number;
    taxRate: number;
    reinvestmentRate: number;
}>;
