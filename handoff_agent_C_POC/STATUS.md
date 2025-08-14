# Agent C Handoff (POC)

- Package: `@madlab/core`
- API: DCF/EPV + Zod schemas, CSP helper, adapter shim
- Build: CJS + ESM + d.ts; `sideEffects:false`; exports map for `.` and `./schemas`
- Tests: core unit tests pass; perf bench skipped in CI
- Precision: JS doubles; do not round in core; UI rounds

See `packages/madlab-core/API.md`, `packages/madlab-core/EXAMPLES.json`, `packages/madlab-core/METRICS.json`, `handoff_agent_C_POC/OPEN_ISSUES.md`.

Perf (10k iters, local): DCF p50≈11.308ms p95≈34.767ms; EPV p50≈0.496ms p95≈3.496ms.
