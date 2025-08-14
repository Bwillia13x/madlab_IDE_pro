"use strict";
// Temporary stub: replace with imports from packages/madlab-core when ready (Agent C)
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCalc = exports.dcf = void 0;
function dcf(input) {
    const { fcf0, growth, wacc, horizon, terminalMultiple, shares } = input;
    if (wacc <= 0 || horizon <= 0 || shares <= 0) {
        throw new Error('Invalid inputs');
    }
    let pvStage = 0;
    let cash = fcf0;
    for (let t = 1; t <= horizon; t++) {
        cash = cash * (1 + growth);
        pvStage += cash / Math.pow(1 + wacc, t);
    }
    const terminalValue = cash * terminalMultiple;
    const pvTerminal = terminalValue / Math.pow(1 + wacc, horizon);
    const equityValue = pvStage + pvTerminal;
    return {
        equityValue,
        perShare: equityValue / shares,
        breakdown: { pvStage, pvTerminal },
    };
}
exports.dcf = dcf;
function handleCalc(payload) {
    return dcf(payload);
}
exports.handleCalc = handleCalc;
