/**
 * Inputs for a single-stage DCF model where:
 * - Free cash flow grows at a constant rate for a finite horizon
 * - Terminal value is computed as a simple multiple of final-year FCF
 */
export interface DcfInput {
    fcf0: number;
    growth: number;
    wacc: number;
    horizon: number;
    terminalMultiple: number;
    shares: number;
}
/**
 * Decomposition of DCF present value
 */
export interface DcfResultBreakdown {
    pvStage: number;
    pvTerminal: number;
}
/**
 * DCF output containing equity value and per-share value
 */
export interface DcfResult {
    equityValue: number;
    perShare: number;
    breakdown: DcfResultBreakdown;
}
/**
 * Inputs for earnings power value approximation.
 * Uses after-tax EBIT and reinvestment rate to proxy free cash flow,
 * then capitalizes by WACC.
 */
export interface EpvInput {
    ebit: number;
    taxRate: number;
    reinvestmentRate: number;
    wacc: number;
    shares: number;
}
/**
 * EPV output
 */
export interface EpvResult {
    epv: number;
    perShare: number;
}
/**
 * Error thrown when inputs fail validation in imperative guards.
 * Note: Zod schemas are provided for structured validation in UI.
 */
export declare class InputValidationError extends Error {
    constructor(message: string);
}
export declare function dcf(input: DcfInput): DcfResult;
export declare function epv(input: EpvInput): EpvResult;
/** CSP-safe HTML generation options for VS Code Webview */
export interface WebviewHtmlOptions {
    title: string;
    cspSource: string;
    nonce: string;
    scriptUris: string[];
    styleUris?: string[];
    bodyHtml?: string;
}
export declare function buildCspHtml(options: WebviewHtmlOptions): string;
