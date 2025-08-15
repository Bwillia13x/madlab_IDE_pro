/**
 * Error thrown when inputs fail validation in imperative guards.
 * Note: Zod schemas are provided for structured validation in UI.
 */
export class InputValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InputValidationError';
    }
}
function assertFinitePositive(name, value) {
    if (!Number.isFinite(value) || value <= 0) {
        throw new InputValidationError(`${name} must be a finite number > 0`);
    }
}
function assertFiniteNonNegative(name, value) {
    if (!Number.isFinite(value) || value < 0) {
        throw new InputValidationError(`${name} must be a finite number >= 0`);
    }
}
function assertRate(name, value) {
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
        throw new InputValidationError(`${name} must be in [0, 1)`); // allow 0, disallow 1
    }
}
function assertIntegerMin(name, value, min) {
    if (!Number.isInteger(value) || value < min) {
        throw new InputValidationError(`${name} must be an integer >= ${min}`);
    }
}
export function dcf(input) {
    const { fcf0, growth, wacc, horizon, terminalMultiple, shares } = input;
    assertFinitePositive('fcf0', fcf0);
    if (!(growth > -0.5 && growth < 1 && Number.isFinite(growth))) {
        throw new InputValidationError('growth must be finite and within (-0.5, 1)');
    }
    if (!(wacc > 0 && wacc < 1 && Number.isFinite(wacc))) {
        throw new InputValidationError('wacc must be finite and within (0, 1)');
    }
    assertIntegerMin('horizon', horizon, 1);
    assertFinitePositive('terminalMultiple', terminalMultiple);
    assertFinitePositive('shares', shares);
    // Forecast FCFs: FCF_t = fcf0 * (1 + growth)^t, t=1..horizon
    // Discount factor per year: (1 + wacc)^t
    let presentValueStage = 0;
    for (let t = 1; t <= horizon; t += 1) {
        const cashFlow = fcf0 * Math.pow(1 + growth, t);
        const discounted = cashFlow / Math.pow(1 + wacc, t);
        presentValueStage += discounted;
    }
    const fcfTerminalYear = fcf0 * Math.pow(1 + growth, horizon);
    const terminalValue = terminalMultiple * fcfTerminalYear;
    const presentValueTerminal = terminalValue / Math.pow(1 + wacc, horizon);
    const equityValue = presentValueStage + presentValueTerminal;
    const perShare = equityValue / shares;
    return {
        equityValue,
        perShare,
        breakdown: {
            pvStage: presentValueStage,
            pvTerminal: presentValueTerminal,
        },
    };
}
export function epv(input) {
    const { ebit, taxRate, reinvestmentRate, wacc, shares } = input;
    assertFinitePositive('ebit', ebit);
    if (!(taxRate >= 0 && taxRate < 1 && Number.isFinite(taxRate))) {
        throw new InputValidationError('taxRate must be finite and within [0, 1)');
    }
    if (!(reinvestmentRate >= 0 && reinvestmentRate < 1 && Number.isFinite(reinvestmentRate))) {
        throw new InputValidationError('reinvestmentRate must be finite and within [0, 1)');
    }
    if (!(wacc > 0 && wacc < 1 && Number.isFinite(wacc))) {
        throw new InputValidationError('wacc must be finite and within (0, 1)');
    }
    assertFinitePositive('shares', shares);
    // EPV approximation:
    // After-tax operating income = EBIT * (1 - taxRate)
    // Free cash flow proxy = afterTaxOperatingIncome * (1 - reinvestmentRate)
    // Capitalize by WACC: EPV = FCF_proxy / wacc
    const afterTaxOperatingIncome = ebit * (1 - taxRate);
    const freeCashFlowProxy = afterTaxOperatingIncome * (1 - reinvestmentRate);
    const epvValue = freeCashFlowProxy / wacc;
    const perShare = epvValue / shares;
    return { epv: epvValue, perShare };
}
export function buildCspHtml(options) {
    const { title, cspSource, nonce, scriptUris, styleUris = [], bodyHtml = '' } = options;
    const metaCsp = [
        `default-src 'none'`,
        `img-src ${cspSource} data:`,
        `style-src ${cspSource}`,
        `font-src ${cspSource}`,
        `script-src 'nonce-${nonce}'`,
        `connect-src ${cspSource}`,
    ].join('; ');
    const scripts = scriptUris
        .map((src) => `<script nonce="${nonce}" src="${src}"></script>`) // no inline code
        .join('\n');
    const styles = styleUris.map((href) => `<link rel="stylesheet" href="${href}" />`).join('\n');
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
  </html>`;
}
// Schemas exported via subpath: @madlab/core/schemas
