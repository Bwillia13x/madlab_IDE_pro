"use strict";
// Temporary stub: replace with imports from packages/madlab-core when ready (Agent C)
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCalc = exports.dcf = void 0;
function dcf(input) {
    var fcf0 = input.fcf0, growth = input.growth, wacc = input.wacc, horizon = input.horizon, terminalMultiple = input.terminalMultiple, shares = input.shares;
    if (wacc <= 0 || horizon <= 0 || shares <= 0) {
        throw new Error('Invalid inputs');
    }
    var pvStage = 0;
    var cash = fcf0;
    for (var t = 1; t <= horizon; t++) {
        cash = cash * (1 + growth);
        pvStage += cash / Math.pow(1 + wacc, t);
    }
    var terminalValue = cash * terminalMultiple;
    var pvTerminal = terminalValue / Math.pow(1 + wacc, horizon);
    var equityValue = pvStage + pvTerminal;
    return {
        equityValue: equityValue,
        perShare: equityValue / shares,
        breakdown: { pvStage: pvStage, pvTerminal: pvTerminal },
    };
}
exports.dcf = dcf;
function handleCalc(payload) {
    return dcf(payload);
}
exports.handleCalc = handleCalc;
