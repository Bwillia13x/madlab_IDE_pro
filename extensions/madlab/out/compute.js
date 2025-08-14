'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.handleCalc = void 0;
// Adapter bridge to @madlab/core
const adapters_1 = require('@madlab/core/adapters');
function handleCalc(payload) {
  const method = payload?.method ?? 'dcf';
  if (method === 'epv') {
    const res = (0, adapters_1.computeEpv)(payload.model);
    if (res.ok) return res.value;
    throw new Error(JSON.stringify(res.error));
  }
  const res = (0, adapters_1.computeDcf)(payload.model);
  if (res.ok) return res.value;
  throw new Error(JSON.stringify(res.error));
}
exports.handleCalc = handleCalc;
