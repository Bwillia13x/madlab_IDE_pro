

# MAD LAB IDE — Development Roadmap v2.0 (Batched Cursor Prompts)

**How to use**
- Each section below is a self-contained **Cursor Agent Prompt**. Copy one batch at a time into Cursor’s Agent (Plan/Fix) and run.
- Batches are ordered. Ship after every green batch. Keep PRs small and focused.
- Constraints: **Next 14 static export (`output: "export"`), VS Code webview extension, Zustand store, Recharts**, no server. 
- Data keys must never be exposed to the browser; use the **extension as a data proxy**.

---

## Batch 00 — Repository Health & Baseline
**Cursor Agent Prompt**
```
ROLE: Release Engineer
OBJECTIVE: Establish a clean baseline; confirm type, lint, unit & E2E pass; surface bundle sizes.
TASKS:
1) Run and capture outputs:
   - pnpm install
   - pnpm typecheck
   - pnpm lint
   - pnpm test -- --reporter verbose
   - pnpm dev:test & pnpm e2e (ensure server on :3010)
   - pnpm build
2) Emit a short baseline report (sizes, warnings, failures) in /docs/_healthcheck.md.
OUTPUT: /docs/_healthcheck.md with commands, exit codes, bundle sizes.
ACCEPTANCE: All pass or issues documented with owner + fix-forward batch id.
COMMIT: chore(ci): baseline healthcheck and size report
```

---

## Batch 01 — Kill Preset Drift (Single Source of Truth)
**Cursor Agent Prompt**
```
ROLE: Senior TS/React
OBJECTIVE: Ensure sheet/widget presets live in one place.
CHANGES:
1) In lib/presets.ts, export `SHEET_PRESETS: Record<string,{title:string, widgets:WidgetConfig[]}>`.
2) In lib/store.ts, replace any internal preset mapping with direct import:
   import { SHEET_PRESETS } from "@/lib/presets";
   getPresetWidgets: (kind) => SHEET_PRESETS[kind]?.widgets ?? []
3) Add `presetVersion: number` to persisted workspace state.
4) Add a migration step that assigns default `presetVersion` when missing.
TESTS:
- Update store migration test to assert presetVersion added.
- Add test guarding against divergence (importing presets only from lib/presets.ts).
ACCEPTANCE: Creating sheet from preset produces identical layout to presets.ts; tests green.
COMMIT: refactor(presets): unify presets and add presetVersion to state
```

---

## Batch 02 — Webview CSP + Nonce Hardening
**Cursor Agent Prompt**
```
ROLE: VS Code Extension Engineer
OBJECTIVE: Make webview CSP-compliant; no inline scripts without nonce.
CHANGES (apps/extension/src/extension.ts):
1) Generate a nonce and inject CSP meta:
   default-src 'none';
   img-src ${webview.cspSource} data:;
   style-src ${webview.cspSource} 'unsafe-inline';
   script-src 'nonce-${nonce}';
2) Add nonce attribute to all injected <script> tags including bridgeScript().
3) Restrict localResourceRoots to the dist assets folder.
TESTS:
- Run extension in VS Code; open DevTools console; verify no CSP violations.
ACCEPTANCE: No CSP/TrustedTypes errors; webview renders fully.
COMMIT: chore(extension): add CSP meta and nonce; tighten localResourceRoots
```

---

## Batch 03 — Data Provider Switch (Mock ↔ Extension)
**Cursor Agent Prompt**
```
ROLE: Frontend Architect
OBJECTIVE: Toggle between mock data and extension-proxied data at runtime.
CHANGES:
1) Create lib/data/provider.types.ts with Provider interface (getPrices, getKpis, getFinancials...).
2) Create lib/data/providers/index.ts exporting setDataProvider/getDataProvider/useDataProviderName.
3) Build adapters/mock.ts (existing), adapters/extension.ts (bridge calls), both conforming to interface.
4) Add a simple Command Palette action or toolbar toggle "Data Provider: Mock/Extension" stored in Zustand.
5) Persist provider choice in workspace state.
TESTS: Unit tests for provider registry; default is mock.
ACCEPTANCE: Toggling provider updates widgets after refresh; no page reload required.
COMMIT: feat(data): runtime provider switch with extension adapter
```

---

## Batch 04 — Extension Data Proxy (Secrets + Messages)
**Cursor Agent Prompt**
```
ROLE: Extension Backend (Node)
OBJECTIVE: Handle data requests in the extension process and keep API keys in SecretStorage.
CHANGES (apps/extension):
1) messaging.ts: Add request/response types: data:quote, data:prices, data:kpis, data:financials.
2) extension.ts: Implement handlers using global fetch; cache per-symbol in-memory with TTL.
3) Secrets: add commands "MAD LAB: Set API Key (Yahoo/Alpha Vantage)" → store via context.secrets.
4) Settings: expose provider choice; but main UI toggle remains in webview state.
5) adapters: implement yahoo (free endpoints) and alphavantage; normalize to { timestamp, open, high, low, close }.
TESTS: Manual and unit (mock fetch) for handler mapping and validation.
ACCEPTANCE: Webview calls window.madlabBridge.request('data:prices', {symbol:'AAPL'}) and receives normalized series.
COMMIT: feat(extension): data proxy with secrets and basic caching
```

---

## Batch 05 — Zod Validation for Data Contracts
**Cursor Agent Prompt**
```
ROLE: Type Safety Engineer
OBJECTIVE: Validate all provider responses.
CHANGES:
1) lib/data/schemas.ts: define zod schemas for PricePoint, PriceSeries, KpiData, Financials.
2) Apply parse() at the adapter boundary; log and surface user-friendly errors on failure.
3) Add defensive defaults in widgets (loading, error, empty states).
TESTS: Schema unit tests for happy/sad paths.
ACCEPTANCE: Invalid API shape is caught; UI shows non-blocking error card.
COMMIT: feat(data): add zod schemas and guarded adapters
```

---

## Batch 06 — Wire KPI & LineChart to Real Data
**Cursor Agent Prompt**
```
ROLE: Frontend Engineer
OBJECTIVE: Replace mock calls in KPI and LineChart widgets with provider-aware hooks.
CHANGES:
1) lib/data/hooks.ts: expose usePrices(symbol, range), useKpis(symbol), honoring current provider.
2) components/widgets/KpiCard.tsx: swap to useKpis; add loading/error states.
3) components/widgets/LineChart.tsx (create if missing): plot OHLC close; range selector (1D–5Y); refresh button.
TESTS: Snapshot test on deterministic mock; integration test in E2E for provider toggle.
ACCEPTANCE: AAPL shows a live line when provider=Extension; mock when provider=Mock.
COMMIT: feat(widgets): KPI and LineChart consume provider hooks
```

---

## Batch 07 — Widget Registry & Contract
**Cursor Agent Prompt**
```
ROLE: Platform Engineer
OBJECTIVE: Make widgets pluggable and self-describing.
CHANGES:
1) lib/widgets/registry.ts: register/get/list; WidgetMeta {kind, title, version, propertySchema}.
2) Migrate existing widgets (KPI, LineChart, DCFBasic) to the registry; export their meta.
3) GridCanvas: render by kind via registry.get(kind).component.
4) Store: persist widget.kind + props + version.
TESTS: registry unit tests; migration adds version when missing.
ACCEPTANCE: Adding a widget via palette pulls from registry; old workspaces still load.
COMMIT: feat(widgets): central registry and versioned contract
```

---

## Batch 08 — Inspector Auto-Forms from Zod
**Cursor Agent Prompt**
```
ROLE: UX Engineer
OBJECTIVE: Auto-render widget property forms from zod schemas.
CHANGES:
1) lib/ui/AutoForm.tsx: zod → controls (text/number/enum/boolean arrays) with controlled components.
2) Inspector.tsx: when selection, render AutoForm for widget.propertySchema; dispatch update on change.
3) Add min/max/step metadata via zod .describe() annotations.
TESTS: unit tests for coercion and enum rendering.
ACCEPTANCE: Editing symbol/range/title in inspector updates widget live.
COMMIT: feat(inspector): auto forms from zod schemas
```

---

## Batch 09 — DCF Mini-Engine + Sensitivities
**Cursor Agent Prompt**
```
ROLE: Quant Engineer
OBJECTIVE: Implement DCF with unit-tested primitives and a basic widget.
CHANGES:
1) lib/quant/dcf.ts: present value, WACC, terminal value (GGM), NPV; table of yearly FCFs.
2) components/widgets/DCFBasic.tsx: inputs (FCF0, growth g, WACC, years N, TV method), outputs chart + table.
3) Optional: sensitivity grid for g vs WACC.
TESTS: numeric accuracy tests with fixed fixtures.
ACCEPTANCE: Deterministic results match tests; UI remains responsive.
COMMIT: feat(quant): DCF engine and basic widget
```

---

## Batch 10 — Risk: Historical VaR/ES
**Cursor Agent Prompt**
```
ROLE: Risk Engineer
OBJECTIVE: Compute VaR and ES from returns using history/Cornish–Fisher.
CHANGES:
1) lib/quant/risk.ts: returns(series), quantile(p), cornishFisherVaR, expectedShortfall.
2) components/widgets/VarEsCard.tsx: inputs (window, confidence), display VaR/ES.
3) Wire to usePrices(symbol, range) for returns.
TESTS: math tests with toy series; UI snapshot.
ACCEPTANCE: Toggle 95/99% shows sensible values; no blocking >16ms per calc.
COMMIT: feat(risk): VaR/ES engine and widget
```

---

## Batch 11 — Options: Black–Scholes + Vol Cone
**Cursor Agent Prompt**
```
ROLE: Derivatives Engineer
OBJECTIVE: Implement BS greeks and realized vol cone.
CHANGES:
1) lib/quant/blackScholes.ts: price, delta, gamma, vega, theta, rho.
2) lib/quant/vol.ts: realized volatility over rolling windows; vol cone chart data.
3) components/widgets/OptionsCard.tsx: inputs (S,K,σ,r,T,call/put), display greeks; second tab: vol cone from prices.
TESTS: numeric benchmarks vs known values.
ACCEPTANCE: Greeks match references within tolerance.
COMMIT: feat(options): BS greeks and vol cone widget
```

---

## Batch 12 — Performance & Bundle Discipline
**Cursor Agent Prompt**
```
ROLE: Performance Engineer
OBJECTIVE: Keep main bundle <3MB gzip; remove jank.
CHANGES:
1) Lazy-load heavy widgets via dynamic import.
2) Memoize expensive transforms; use Web Workers for quant routines (dcf/risk/options) if size allows.
3) Ensure Recharts is tree-shaken; avoid all-in imports.
4) Add size-limit config and CI check; document budgets in README.
TESTS: run size-limit; record numbers in /docs/_healthcheck.md.
ACCEPTANCE: main bundle <3MB gzip; no >50ms blocks in profiler during common flows.
COMMIT: perf(build): lazy chunks and size budgets
```

---

## Batch 13 — E2E Expansion with Stable Selectors
**Cursor Agent Prompt**
```
ROLE: Test Engineer
OBJECTIVE: Strengthen E2E; add data-testid anchors.
CHANGES:
1) Add data-testid to Sheet tabs, AddWidget, Inspector toggle, Duplicate/Delete actions, Provider toggle.
2) tests/e2e/workspace.spec.ts: cover create→rename→add widget→duplicate→delete→persist→reload→toggle provider.
ACCEPTANCE: E2E green locally and in CI.
COMMIT: test(e2e): add selectors and flows
```

---

## Batch 14 — Agent Tools: Data + Workspace Ops
**Cursor Agent Prompt**
```
ROLE: Agentic Systems Engineer
OBJECTIVE: Make the chat agent useful without a cloud LLM.
CHANGES:
1) tools: add fetchPrices, fetchKpis; wrap store ops (addSheet, addWidget, select, openInspector).
2) intent: pattern-based parser for commands like "Line chart for AAPL (6M)" → tool plan.
3) response: templated summaries with small markdown.
ACCEPTANCE: User can ask for a line chart; agent creates widget and fills data.
COMMIT: feat(agent): tool-driven local intents for data and layout
```

---

## Batch 15 — Optional LLM Tool-Calling Mode
**Cursor Agent Prompt**
```
ROLE: Integration Engineer
OBJECTIVE: If user adds an API key in extension secrets, enable LLM tool-calling; otherwise fallback to Batch 14 behavior.
CHANGES:
1) extension.ts: add secret for OPENAI/Anthropic; proxy calls; never expose key to webview.
2) webview: if capability advertised, route agent turns through extension LLM endpoint with tool schema.
ACCEPTANCE: Works with or without key; network inspector shows no key in webview.
COMMIT: feat(agent): optional LLM tool-calling via extension proxy
```

---

## Batch 16 — Workspace Import/Export (JSON)
**Cursor Agent Prompt**
```
ROLE: Platform Engineer
OBJECTIVE: Save/load full workspace state to/from JSON.
CHANGES:
1) lib/io/export.ts & import.ts (versioned schema; zod validate on import).
2) UI buttons in the workspace menu; file download/upload.
TESTS: Round-trip unit tests; migration on import.
ACCEPTANCE: Export then import reproduces identical layout and data bindings (provider may differ).
COMMIT: feat(io): workspace import/export
```

---

## Batch 17 — Static Demo Export + Warning Banner
**Cursor Agent Prompt**
```
ROLE: Frontend Engineer
OBJECTIVE: Publish a mock-data demo on Vercel and clearly label it.
CHANGES:
1) Add top banner when provider=Mock: "Demo mode: synthetic data".
2) Update README with deploy instructions and limitations.
ACCEPTANCE: Vercel deploy works; demo clearly marked.
COMMIT: chore(docs): demo deploy and banner
```

---

## Batch 18 — VSIX Packaging & Marketplace Readiness
**Cursor Agent Prompt**
```
ROLE: Extension Release Engineer
OBJECTIVE: Package a signed VSIX and release notes.
CHANGES:
1) Add icon, categories, contributes.commands in package.json.
2) Update README with setup (CSP, data provider, secrets).
3) Add vsce scripts; ensure assets copied.
OUTPUT: apps/extension/*.vsix
ACCEPTANCE: VSIX installs locally; main flows work.
COMMIT: chore(release): package VSIX and docs
```

---

## Batch 19 — Error Boundaries & Toasts
**Cursor Agent Prompt**
```
ROLE: DX Engineer
OBJECTIVE: Fail gracefully and informatively.
CHANGES:
1) Add React error boundary around grid and agent.
2) Add a lightweight toast system for data/agent errors.
ACCEPTANCE: Network failures show non-blocking toasts; boundary renders fallback UI.
COMMIT: feat(ui): error boundary and toasts
```

---

## Batch 20 — Accessibility & Keyboarding
**Cursor Agent Prompt**
```
ROLE: Accessibility Engineer
OBJECTIVE: Improve a11y and keyboard workflows.
CHANGES:
1) Ensure focus rings; aria-labels for toolbar buttons; role=tab for sheets.
2) Keyboard shortcuts list in README.
ACCEPTANCE: Axe audit passes critical checks; tabs navigable via keyboard.
COMMIT: feat(a11y): labels, roles, and keyboard docs
```

---

## Batch 21 — Theming Tokens & Visual Polish
**Cursor Agent Prompt**
```
ROLE: UI Engineer
OBJECTIVE: Consolidate tokens and reduce ad-hoc colors.
CHANGES:
1) lib/tokens.ts: define semantic tokens; refactor components to tokens.
2) Ensure dark/light modes consistent; add prefers-color-scheme sync.
ACCEPTANCE: Zero hard-coded hexes in widgets; visual consistency improved.
COMMIT: style(theme): consolidate tokens and polish
```

---

## Batch 22 — Documentation Pass
**Cursor Agent Prompt**
```
ROLE: Writer
OBJECTIVE: Update docs with data provider architecture, widget SDK, agent tools, and quant references.
CHANGES:
1) docs/architecture.md, docs/data-providers.md, docs/widget-sdk.md, docs/agent.md, docs/quant.md.
2) Add diagrams (Mermaid) where helpful.
ACCEPTANCE: New contributor can build, add a widget, and fetch data in <1h.
COMMIT: docs: architecture, data provider, widget SDK, agent, quant
```

---

## Batch 23 — CI Hardening
**Cursor Agent Prompt**
```
ROLE: DevOps
OBJECTIVE: Ensure CI gates: type, lint, unit, e2e, size-limit.
CHANGES:
1) GitHub Actions workflow with matrix (node LTS) and cache.
2) Upload Playwright traces on failure.
ACCEPTANCE: CI red on violations; green otherwise.
COMMIT: ci: add full pipeline with size-limit
```

---

## Batch 24 — Release Checklist & Tag
**Cursor Agent Prompt**
```
ROLE: Release Manager
OBJECTIVE: Cut v0.2.0 (feature-complete alpha).
TASKS:
1) Update CHANGELOG.md (Keep a Changelog format).
2) Tag and create GitHub release attaching VSIX and demo link.
3) Open next milestone issues (P2+ features, bugs, debts).
ACCEPTANCE: Release artifacts present; roadmap issues created.
COMMIT: release: v0.2.0 and next-milestone planning
```

---

## Batch 25 — Post-Release Bug Triage Template
**Cursor Agent Prompt**
```
ROLE: PM
OBJECTIVE: Standardize bug intake and prioritization.
CHANGES:
1) .github/ISSUE_TEMPLATE/bug_report.md with env, repro, expected/actual, logs, screenshots.
2) Labels: severity:{S1..S4}, area:{extension,widgets,data,agent,ui}.
ACCEPTANCE: New issues follow template; board filters by labels.
COMMIT: chore(templates): bug report and labels
```

---

### Appendix — Quick Commands
```
pnpm install
pnpm typecheck && pnpm lint && pnpm test
pnpm dev:test & pnpm e2e
pnpm build
```

### Appendix — Commit Message Style
- feat(scope): …
- fix(scope): …
- refactor(scope): …
- perf(scope): …
- chore(scope): …
- docs(scope): …
- test(scope): …
- ci(scope): …

# MAD LAB IDE — Development Roadmap v3.0 (Batched Cursor Prompts — Post‑v2.0)

**Prereqs**
- v2.0 is complete and green: CSP hardened, provider toggle, extension data proxy, widget registry, inspector auto‑forms, quant cores (DCF, VaR/ES, BS), E2E hardened, VSIX packaged.
- Constraints remain: **Next 14 static export**, **no server** for the web demo; sensitive keys live only in the **extension**. WASM/Workers allowed. Keep main bundle **<3 MB gzip** (excluding lazy chunks).
- Goal of v3.0: **Research‑grade analytics, plugin ecosystem, optional collaboration, and reporting** while preserving the extension‑first security model.

---

## Batch 30 — Data Layer 2.0 (Queries, Offline Cache, Hydration)
**Cursor Agent Prompt**
```
ROLE: Data Platform Engineer
OBJECTIVE: Introduce TanStack Query for cache, retries, and offline support; hydrate from extension cache.
CHANGES:
1) Add @tanstack/react-query. Create lib/data/queryClient.ts and provider.
2) Wrap app root with <QueryClientProvider>.
3) Migrate usePrices/useKpis hooks to useQuery with queryKeys: ['prices', symbol, range], ['kpis', symbol].
4) Add staleTime, cacheTime, retry/backoff. Support initialData passed from extension (window.__MADLAB_BOOT__?).
5) Expose a "Cache Inspector" dev panel gated by NODE_ENV.
TESTS: Unit tests for query key stability; E2E: toggle offline (mock fetch failure) → serve from cache.
ACCEPTANCE: Switching symbols reuses cache; offline renders last known good data with stale badge.
COMMIT: feat(data): TanStack Query cache + offline hydration
```

---

## Batch 31 — Columnar Data & Importers (CSV/XLSX/Parquet/Arrow)
**Cursor Agent Prompt**
```
ROLE: Data Engineer
OBJECTIVE: Enable local dataset import at scale with columnar formats; zero key exposure.
CHANGES:
1) Add parsers: papaparse (CSV), sheetjs (XLSX), Apache Arrow (arrow & parquet-wasm).
2) lib/io/importers/: csv.ts, xlsx.ts, arrow.ts, parquet.ts → normalize to Table<{date:number, ...fields}>.
3) Add Import Data wizard (dropzone) with schema inference and type validation via zod.
4) Store datasets in IndexedDB; reference by id in widgets.
TESTS: Large file import (100MB CSV) streaming parse; type inference snapshot.
ACCEPTANCE: User can import CSV and drive LineChart without any network.
COMMIT: feat(io): columnar importers and dataset registry
```

---

## Batch 32 — Reactive Computation Graph (Pipelines)
**Cursor Agent Prompt**
```
ROLE: Platform Architect
OBJECTIVE: Create a minimal DAG engine for data transforms with memoization and dependency tracking.
CHANGES:
1) lib/graph/core.ts: Node, Edge, compute(), invalidate(), subscribe().
2) lib/graph/nodes/: returns, resample, join, rolling, zscore, normalize.
3) UI: Pipeline panel (node editor lite) to build transforms; output feeds widgets via datasetId.
TESTS: Graph invalidation tests; cyclic detection.
ACCEPTANCE: Changing source dataset recomputes dependent widgets only.
COMMIT: feat(graph): reactive pipelines powering widgets
```

---

## Batch 33 — Backtesting Engine (Event‑Driven, Single Asset → Multi)
**Cursor Agent Prompt**
```
ROLE: Quant Engineer
OBJECTIVE: Implement a deterministic backtesting core with slippage/fees and portfolio P&L.
CHANGES:
1) lib/backtest/core.ts: bar iterator, order types (MKT/LMT/STOP), fills with slippage/fees, portfolio ledger.
2) Strategy API: onBar(ctx), placeOrder, indicators registry (SMA/EMA/RSI/MACD/ATR).
3) Widget: BacktestRunner.tsx with config, run/stop, equity curve & drawdown.
4) Save runs in IndexedDB with seed for replay.
TESTS: Deterministic run with fixed seed; P&L accounting tests.
ACCEPTANCE: Toy SMA crossover on AAPL produces reproducible equity curve.
COMMIT: feat(quant): event-driven backtester and runner widget
```

---

## Batch 34 — Factor Models & Risk Attribution
**Cursor Agent Prompt**
```
ROLE: Quant Researcher
OBJECTIVE: Add multi-factor exposure and attribution.
CHANGES:
1) lib/quant/factors.ts: returns alignment, OLS regression, PCA helper.
2) Preload canonical factors (Fama-French daily/weekly via import wizard or sample bundle).
3) Widget: FactorExposure.tsx (betas, t-stats, R^2), Attribution.tsx (contribution by factor).
TESTS: Regression against synthetic data recovers known betas.
ACCEPTANCE: Exposure and attribution update with date range.
COMMIT: feat(risk): factor exposure & attribution widgets
```

---

## Batch 35 — Stress & Scenario Engine
**Cursor Agent Prompt**
```
ROLE: Risk Engineer
OBJECTIVE: Parametric and historical stress testing with correlation regime switches.
CHANGES:
1) lib/risk/scenario.ts: define shocks (Δμ, Δσ, ρ-matrix override), apply to portfolio.
2) Widget: ScenarioLab.tsx with presets (’08 crisis, COVID crash) + custom shocks.
3) Use graph engine for fast recompute.
TESTS: Sanity tests on single-asset; matrix PD check.
ACCEPTANCE: Applying scenario updates VaR/ES and P&L distribution instantly.
COMMIT: feat(risk): scenario lab with regime switching
```

---

## Batch 36 — Portfolio Optimizer (MV, BL, Constraints)
**Cursor Agent Prompt**
```
ROLE: Optimization Engineer
OBJECTIVE: Add mean-variance and Black–Litterman with constraints.
CHANGES:
1) lib/opt/mv.ts: cov, efficient frontier, long-only & box constraints (quadprog-lite or custom QP).
2) lib/opt/bl.ts: prior, views, tau, posterior.
3) Widget: Optimizer.tsx with frontier plot, allocations table, PDF export.
TESTS: Frontier monotonicity; weights sum-to-1 under constraints.
ACCEPTANCE: Frontier renders; allocations respond to views.
COMMIT: feat(opt): MV + Black–Litterman optimizer
```

---

## Batch 37 — Monte Carlo Engine (GBM, Jump‑Diffusion)
**Cursor Agent Prompt**
```
ROLE: Numerics Engineer
OBJECTIVE: Path simulations in workers/WASM with PRNG streams.
CHANGES:
1) lib/sim/gbm.ts & mertonJD.ts with antithetic variates; seedable RNG (xoshiro).
2) Worker pool (comlink) to parallelize paths; throttled UI updates.
3) Widget: MonteCarlo.tsx with histogram, CI bands.
TESTS: Convergence tests on mean/variance.
ACCEPTANCE: 100k paths compute without UI jank.
COMMIT: feat(sim): Monte Carlo workers and widget
```

---

## Batch 38 — WASM Kernels + Worker Pool
**Cursor Agent Prompt**
```
ROLE: Systems Engineer
OBJECTIVE: Compile hot loops (risk/opt/sim) to WASM and run in a managed worker pool.
CHANGES:
1) Add a small Rust crate (optional) for math kernels; build via wasm-pack.
2) lib/sys/workers.ts: queue, cancelation, priority lanes; fallback to JS when WASM unsupported.
3) Benchmarks: document speedups.
TESTS: Parity tests JS vs WASM outputs.
ACCEPTANCE: 2–10x speedup on heavy analytics.
COMMIT: perf(wasm): worker pool & kernels
```

---

## Batch 39 — Custom Widget Builder (No‑Code → Codegen)
**Cursor Agent Prompt**
```
ROLE: DX Engineer
OBJECTIVE: Allow users to design a widget via form → generate a real TSX component and registry entry.
CHANGES:
1) Wizard collects: data bindings, chart type, props schema.
2) Codegen to components/widgets/MyWidget.tsx and registry.register().
3) Users can export/import custom widget as a JSON+TSX pack.
TESTS: Generated widget compiles and renders in grid.
ACCEPTANCE: Non‑dev user creates a KPI variant without touching code.
COMMIT: feat(widgets): custom builder with codegen
```

---

## Batch 40 — Plugin System (Manifest, Permissions, Signing)
**Cursor Agent Prompt**
```
ROLE: Platform Security Engineer
OBJECTIVE: Sandboxed plugin API with least‑privilege permissions.
CHANGES:
1) Define plugin manifest (name, version, permissions: data.read, data.write, files, agent.tools).
2) Load plugins from zip with JSON manifest; run in isolated iframe/worker; message bus.
3) Permission prompts UI; audit log of granted scopes.
4) Optional signature check (developer key) for integrity.
TESTS: Malicious plugin attempts denied by sandbox.
ACCEPTANCE: Hello‑world plugin adds a panel; cannot access secrets/files without grants.
COMMIT: feat(plugins): manifest, sandbox, permissions
```

---

## Batch 41 — Collaboration (Yjs CRDT, WebRTC, Extension Host)
**Cursor Agent Prompt**
```
ROLE: Real‑Time Systems Engineer
OBJECTIVE: Optional multi‑user editing without a central server.
CHANGES:
1) Integrate yjs for workspace state; awareness (cursors, presence).
2) Transport: y-webrtc for peer discovery; fallback to "Extension Host" relay where one user’s extension acts as relay.
3) Conflict resolution rules on widget edits and graph operations.
TESTS: Two‑client edit sessions; offline/online merge.
ACCEPTANCE: Co‑editing grid and inspector works; no duplicate widgets.
COMMIT: feat(collab): CRDT-based real‑time editing (opt‑in)
```

---

## Batch 42 — Notebook Mode (Code Cells; JS & Pyodide)
**Cursor Agent Prompt**
```
ROLE: Research Tools Engineer
OBJECTIVE: Add runnable code cells in a Notebook sheet; first-class data bridge to datasets.
CHANGES:
1) Monaco for cells; execution kernel for JS (eval in sandboxed worker) and Python via Pyodide.
2) API to access datasets from cells (read‑only view); results saved as ephemeral datasets.
3) Markdown cells; export to Markdown/PDF.
TESTS: JS cell computes returns; Python cell computes rolling beta.
ACCEPTANCE: Notebook executes reproducibly; no main thread blocking.
COMMIT: feat(notebook): JS/Py cells with dataset bridge
```

---

## Batch 43 — Data Connectors Gallery (Adapters)
**Cursor Agent Prompt**
```
ROLE: Integration Engineer
OBJECTIVE: Add optional connectors via the extension: Polygon, Tiingo, Quandl, Yahoo WS.
CHANGES:
1) Standardize adapter interface; rate limiters; disk cache (extension) with LRU.
2) UI gallery with capability flags; per‑connector docs.
3) Keys stored in SecretStorage; never in webview.
TESTS: Mock adapters; timeout/backoff tests.
ACCEPTANCE: Switching connectors is seamless for widgets.
COMMIT: feat(connectors): pluggable data adapters
```

---

## Batch 44 — Agent 2.0 (Plan→Execute→Reflect)
**Cursor Agent Prompt**
```
ROLE: Agent Systems Engineer
OBJECTIVE: Structured agent loop with scratchpad and tool traces (local first; optional LLM).
CHANGES:
1) Add planner → tool runner → reflector steps; persist traces per turn.
2) Skill library: dataset.find, graph.build, backtest.run, report.generate.
3) UI: expandable turn details with tool inputs/outputs.
TESTS: Golden trace tests; determinism under mock mode.
ACCEPTANCE: Agent can build a simple pipeline from a natural query and run it.
COMMIT: feat(agent): planner/runner/reflector with trace UI
```

---

## Batch 45 — Agent Evaluation Harness
**Cursor Agent Prompt**
```
ROLE: QA Engineer
OBJECTIVE: Record‑and‑replay harness for agent behavior.
CHANGES:
1) tests/agent/: YAML scenarios with prompts, expected tools sequence, assertions.
2) Runner that replays scenarios in CI with deterministic mocks.
ACCEPTANCE: CI fails on tool regression.
COMMIT: test(agent): evaluation harness and scenarios
```

---

## Batch 46 — Report Generator (Markdown → PDF/PNG)
**Cursor Agent Prompt**
```
ROLE: Reporting Engineer
OBJECTIVE: One‑click report builds with snapshot charts and tables.
CHANGES:
1) lib/report/build.ts: assemble Markdown from selected widgets; html-to-image for charts; pdf via puppeteer in extension.
2) Templates (Executive, Research, Risk) with variables.
3) UI: "Generate Report" dialog; export to /reports.
TESTS: Deterministic snapshot count; file output existence.
ACCEPTANCE: PDF report exports locally via extension without network.
COMMIT: feat(report): markdown templating and PDF export
```

---

## Batch 47 — Template & Layout Marketplace
**Cursor Agent Prompt**
```
ROLE: Product Engineer
OBJECTIVE: Share/import templates (presets, pipelines, widgets) as signed packs.
CHANGES:
1) Pack format: .madpack (zip) with manifest + assets.
2) Gallery UI; import/export commands.
3) Optional signature verification.
ACCEPTANCE: Importing a pack reproduces a curated layout.
COMMIT: feat(packs): shareable template marketplace
```

---

## Batch 48 — Theme Editor & Token Export
**Cursor Agent Prompt**
```
ROLE: UI Systems Engineer
OBJECTIVE: Visual theme editor with token export for reuse.
CHANGES:
1) Theme editor panel; live preview; persist as JSON.
2) Export to CSS variables file and JSON token bundle.
ACCEPTANCE: Users create a theme and apply instantly.
COMMIT: feat(theme): visual editor and token export
```

---

## Batch 49 — Telemetry (Opt‑In, Privacy‑Safe)
**Cursor Agent Prompt**
```
ROLE: Privacy Engineer
OBJECTIVE: Add local analytics with explicit user consent.
CHANGES:
1) Event schema; local ring buffer; redact PII.
2) Extension uploads anonymized metrics only if opt‑in; network disabled in web demo.
3) Privacy policy doc; toggle in settings.
ACCEPTANCE: No events sent without consent; data visible in a local viewer.
COMMIT: feat(telemetry): opt‑in analytics and local viewer
```

---

## Batch 50 — Compliance & Audit Trail
**Cursor Agent Prompt**
```
ROLE: Controls Engineer
OBJECTIVE: Provide provenance for data and calculations.
CHANGES:
1) Hash and sign (local key) workspace snapshots; record data source, adapter version, calc versions per widget.
2) Audit log viewer with filters.
ACCEPTANCE: Any report lists sources, versions, and hashes.
COMMIT: feat(audit): provenance and signed snapshots
```

---

## Batch 51 — Performance Program 2.0
**Cursor Agent Prompt**
```
ROLE: Performance Engineer
OBJECTIVE: Progressive hydration + islands; strict budgets.
CHANGES:
1) Convert heavy panes to islands with dynamic import; pause rendering off‑screen grids.
2) Precompute expensive transforms in workers; cache serialized results.
3) size-limit per-chunk budgets; flame charts in docs.
ACCEPTANCE: TTI < 2.5s on mid laptop; main bundle still <3MB gzip.
COMMIT: perf: progressive hydration and budgets
```

---

## Batch 52 — Internationalization & Localization
**Cursor Agent Prompt**
```
ROLE: i18n Engineer
OBJECTIVE: Add i18n plumbing and number/currency/date localization.
CHANGES:
1) i18n router and message catalogs; ICU formatting; locale switcher.
2) NumberFormat and currency helpers; date-fns locale wiring.
ACCEPTANCE: UI switch to fr-CA works; currency formats update.
COMMIT: feat(i18n): locale support and formatting
```

---

## Batch 53 — Accessibility Deep Pass
**Cursor Agent Prompt**
```
ROLE: Accessibility Engineer
OBJECTIVE: Bring key flows to WCAG 2.1 AA.
CHANGES:
1) Audit with axe; fix color contrast; add landmarks, roles.
2) Keyboard traps removed; focus management for dialogs; screen reader labels for charts (summaries).
ACCEPTANCE: Axe criticals = 0; keyboard-only E2E passes.
COMMIT: feat(a11y): WCAG fixes and chart summaries
```

---

## Batch 54 — Distribution & Update Channels
**Cursor Agent Prompt**
```
ROLE: Release Engineer
OBJECTIVE: Stable/Beta channels and auto-update for the extension.
CHANGES:
1) Separate VSIX channels; changelog gating; migration notes surfaced on first run.
2) Web demo adds a version badge; link to release notes.
ACCEPTANCE: Upgrade from Beta→Stable migrates state safely.
COMMIT: chore(release): channels and migration surface
```

---

## Batch 55 — Security Hardening
**Cursor Agent Prompt**
```
ROLE: Security Engineer
OBJECTIVE: Threat model and mitigations for extension/webview.
CHANGES:
1) STRIDE threat model doc; permissions review; SSRF guards in data adapters.
2) CSP tightened with strict-dynamic if feasible; SRI on external fonts (if any) or remove.
3) Pen-test checklist and scripts.
ACCEPTANCE: Issues tracked; mitigations implemented where applicable.
COMMIT: sec: threat model and mitigations
```

---

## Batch 56 — QA & Fuzzing
**Cursor Agent Prompt**
```
ROLE: QA Engineer
OBJECTIVE: Fuzz test importers and serializers; soak tests for workers.
CHANGES:
1) property-based tests with fast-check on IO schemas.
2) Long‑running soak in CI nightly; memory leak detection.
ACCEPTANCE: No leaks; fuzzers find no crashes over N seeds.
COMMIT: test(qa): fuzz IO and soak workers
```

---

## Batch 57 — Schema Registry & Deprecations
**Cursor Agent Prompt**
```
ROLE: Data Governance Engineer
OBJECTIVE: Central registry for dataset and widget schemas; controlled deprecations.
CHANGES:
1) lib/schema/registry.ts with versioning and compatibility checks.
2) Migration helpers; deprecation warnings surfaced in UI.
ACCEPTANCE: Import of older workspace triggers guided migration.
COMMIT: feat(schema): registry and migrations
```

---

## Batch 58 — Backup/Restore & Share Packs
**Cursor Agent Prompt**
```
ROLE: Platform Engineer
OBJECTIVE: One‑click backup/restore of all local data and settings.
CHANGES:
1) Export a .madlab-backup (zip): workspace state, datasets (IDB export), templates, themes.
2) Import wizard with selective restore.
ACCEPTANCE: New machine restore reproduces environment.
COMMIT: feat(backup): full backup/restore packs
```

---

## Batch 59 — Data Import Wizards (Retail CSV → Canonical)
**Cursor Agent Prompt**
```
ROLE: UX Engineer
OBJECTIVE: Opinionated wizards for common retail exports (broker statements, TradingView CSV).
CHANGES:
1) Parsers and mappers to canonical schema; validation and reconciliation.
2) Preview & error correction UI.
ACCEPTANCE: Importing a broker CSV yields positions & transactions datasets.
COMMIT: feat(import): retail CSV wizards
```

---

## Batch 60 — Road to v3.1 (SaaS‑Optional Backend)
**Cursor Agent Prompt**
```
ROLE: Architect
OBJECTIVE: Draft RFCs for optional cloud add‑ons without breaking offline‑first.
CHANGES:
1) RFC: sync service (end‑to‑end encrypted), hosted collab relay, long‑term data storage.
2) RFC: plugin store signing and update pipeline.
3) RFC: enterprise controls (SSO, policy, audit export).
OUTPUT: /docs/rfcs/v3.1/*.md with proposed interfaces and threat models.
ACCEPTANCE: Reviewed and signed off.
COMMIT: docs(rfc): v3.1 cloud/enterprise proposals
```

---

### v3.0 Appendix — Suggested Order of Release Cuts
- 30–33 (data+graph+backtest) → **v3.0‑alpha.1**
- 34–37 (risk+opt+sim) → **v3.0‑alpha.2**
- 38–41 (wasm+plugins+collab) → **v3.0‑beta.1**
- 42, 46–48 (notebook+reports+themes) → **v3.0‑beta.2**
- 49–55 (privacy+security) → **v3.0‑rc.1**
- 56–60 (QA+governance+import+wider RFCs) → **v3.0**