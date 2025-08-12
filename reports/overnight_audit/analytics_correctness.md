# Analytics Correctness Audit

## Scope
- DCF, VaR/ES, options primitives

## Findings
- No `lib/quant/dcf.ts` or `lib/quant/risk.ts`. UI widgets `DcfBasic` and `VarEs` show mock values only.
- Tests for deterministic data exist but not for analytics engines.

## Recommendations
- Add `lib/quant/dcf.ts` with a pure function `discountedCashFlow(cashFlows, discountRate, terminalGrowth, terminalMultiple?)` and fixtures.
- Add `lib/quant/risk.ts` with `historicalVaR(returns, conf)` and `expectedShortfall(returns, conf)`; ensure these operate on log-returns and are unit-tested with fixed fixtures.
- Performance target: < 50 ms for typical inputs; include simple micro-bench assertions in vitest using `Date.now()` deltas.

## Example acceptance tests (sketch)
- DCF with fixed cash flows [100,110,121], r=10%, g=2% → present value within tolerance.
- VaR/ES on a fixed returns series: computed quantile and tail mean equal to precomputed constants.