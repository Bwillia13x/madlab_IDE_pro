export interface DcfInput {
  fcf0: number;
  growth: number; // annual growth rate (0.0 - 1.0)
  wacc: number; // discount rate (0.0 - 1.0)
  horizon: number; // years in explicit forecast (integer >= 1)
  terminalMultiple: number; // terminal value = terminalMultiple * final year FCF
  shares: number; // diluted shares outstanding
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
  ebit: number; // current EBIT
  taxRate: number; // (0.0 - 1.0)
  reinvestmentRate: number; // fraction of after-tax operating income reinvested (0.0 - 1.0)
  wacc: number; // (0.0 - 1.0)
  shares: number;
}

export interface EpvResult {
  epv: number; // enterprise present value proxy
  perShare: number;
}

export class InputValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InputValidationError'
  }
}

function assertFinitePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new InputValidationError(`${name} must be a finite number > 0`)
  }
}

function assertFiniteNonNegative(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new InputValidationError(`${name} must be a finite number >= 0`)
  }
}

function assertRate(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new InputValidationError(`${name} must be in [0, 1)`) // allow 0, disallow 1
  }
}

function assertIntegerMin(name: string, value: number, min: number): void {
  if (!Number.isInteger(value) || value < min) {
    throw new InputValidationError(`${name} must be an integer >= ${min}`)
  }
}

export function dcf(input: DcfInput): DcfResult {
  const { fcf0, growth, wacc, horizon, terminalMultiple, shares } = input

  assertFinitePositive('fcf0', fcf0)
  assertRate('growth', growth)
  assertRate('wacc', wacc)
  assertIntegerMin('horizon', horizon, 1)
  assertFinitePositive('terminalMultiple', terminalMultiple)
  assertFinitePositive('shares', shares)

  // Forecast FCFs: FCF_t = fcf0 * (1 + growth)^t, t=1..horizon
  // Discount factor per year: (1 + wacc)^t
  let presentValueStage = 0
  for (let t = 1; t <= horizon; t += 1) {
    const cashFlow = fcf0 * Math.pow(1 + growth, t)
    const discounted = cashFlow / Math.pow(1 + wacc, t)
    presentValueStage += discounted
  }

  const fcfTerminalYear = fcf0 * Math.pow(1 + growth, horizon)
  const terminalValue = terminalMultiple * fcfTerminalYear
  const presentValueTerminal = terminalValue / Math.pow(1 + wacc, horizon)

  const equityValue = presentValueStage + presentValueTerminal
  const perShare = equityValue / shares

  return {
    equityValue,
    perShare,
    breakdown: {
      pvStage: presentValueStage,
      pvTerminal: presentValueTerminal,
    },
  }
}

export function epv(input: EpvInput): EpvResult {
  const { ebit, taxRate, reinvestmentRate, wacc, shares } = input

  assertFinitePositive('ebit', ebit)
  assertRate('taxRate', taxRate)
  assertRate('reinvestmentRate', reinvestmentRate)
  assertRate('wacc', wacc)
  assertFinitePositive('shares', shares)

  // EPV approximation:
  // After-tax operating income = EBIT * (1 - taxRate)
  // Free cash flow proxy = afterTaxOperatingIncome * (1 - reinvestmentRate)
  // Capitalize by WACC: EPV = FCF_proxy / wacc
  const afterTaxOperatingIncome = ebit * (1 - taxRate)
  const freeCashFlowProxy = afterTaxOperatingIncome * (1 - reinvestmentRate)
  const epvValue = freeCashFlowProxy / wacc
  const perShare = epvValue / shares

  return { epv: epvValue, perShare }
}

// CSP-safe HTML helper for VS Code Webviews
export interface WebviewHtmlOptions {
  title: string;
  cspSource: string; // webview.cspSource
  nonce: string;
  scriptUris: string[]; // URIs via asWebviewUri
  styleUris?: string[]; // URIs via asWebviewUri
  bodyHtml?: string; // static HTML only; no inline event handlers
}

export function buildCspHtml(options: WebviewHtmlOptions): string {
  const { title, cspSource, nonce, scriptUris, styleUris = [], bodyHtml = '' } = options

  const metaCsp = [
    `default-src 'none'`,
    `img-src ${cspSource} data:`,
    `style-src ${cspSource}`,
    `font-src ${cspSource}`,
    `script-src 'nonce-${nonce}'`,
    `connect-src ${cspSource}`,
  ].join('; ')

  const scripts = scriptUris
    .map((src) => `<script nonce="${nonce}" src="${src}"></script>`) // no inline code
    .join('\n')

  const styles = styleUris.map((href) => `<link rel="stylesheet" href="${href}" />`).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${metaCsp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    ${styles}
  </head>
  <body>
    ${bodyHtml}
    ${scripts}
  </body>
  </html>`
}

import { z } from 'zod'
export { z }

// Optional zod schemas for payload validation used by the extension panel
export const DcfInputSchema = z.object({
  fcf0: z.number().positive(),
  growth: z.number().min(0).lt(1),
  wacc: z.number().min(0).lt(1),
  horizon: z.number().int().min(1),
  terminalMultiple: z.number().positive(),
  shares: z.number().positive(),
})

export const EpvInputSchema = z.object({
  ebit: z.number().positive(),
  taxRate: z.number().min(0).lt(1),
  reinvestmentRate: z.number().min(0).lt(1),
  wacc: z.number().min(0).lt(1),
  shares: z.number().positive(),
})


