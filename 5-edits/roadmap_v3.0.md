

# MAD LAB IDE — MVP Roadmap v3.0 (Batched Cursor Prompts)

**Purpose**  
Bring the current prototype to a **secure, offline‑capable MVP** that: (1) fetches **real market data via the VS Code extension proxy**; (2) renders **live KPI + Line charts**; (3) performs **core analytics (DCF, VaR/ES)**; (4) allows **basic Inspector edits**; (5) exports/imports **workspaces**; (6) provides a **mock‑data web demo** and an **installable VSIX**. No backend services.

**Constraints**  
- Next.js 14 with `output: "export"` (static demo).  
- VS Code extension handles network & secrets via **SecretStorage**; webview never sees keys.  
- State via **Zustand** with migrations; UI uses **Recharts + RGL**.  
- Keep main bundle **< 3 MB gzip** (excluding lazy chunks).  

**How to use**  
Each section is a **single Cursor Agent Prompt**. Copy the whole code block into Cursor Agent (Plan/Fix) and run in order. Ship after each green batch.

---

## Batch M00 — Baseline Health & Budgets
**Cursor Agent Prompt**
```
ROLE: Release Engineer
OBJECTIVE: Establish a clean baseline (types, lint, unit, E2E) and record bundle sizes.
TASKS:
1) Run: pnpm install; pnpm typecheck; pnpm lint; pnpm test -- --reporter verbose; pnpm dev:test & pnpm e2e; pnpm build
2) Create /docs/_healthcheck.md with command outputs, exit codes, and size-limit results.
3) Ensure size-limit config exists and records budgets (JS <3MB, CSS <500KB).
ACCEPTANCE: All commands pass or issues logged with owner & follow-up batch id.
COMMIT: chore(ci): baseline healthcheck and size budgets
```

---

## Batch M01 — Single Source of Truth for Presets
**Cursor Agent Prompt**
```
ROLE: Senior TS Engineer
OBJECTIVE: Remove preset duplication; prepare for migrations.
CHANGES:
1) lib/presets.ts exports SHEET_PRESETS: Record<PresetKind,{title:string, widgets:WidgetConfig[]}>.
2) lib/store.ts uses only SHEET_PRESETS via getPresetWidgets(kind).
3) Add presetVersion:number to persisted state + migration default.
TESTS: Update migration tests to assert presetVersion.
ACCEPTANCE: Creating sheets from presets matches presets.ts exactly.
COMMIT: refactor(presets): unify source and add presetVersion
```

---

## Batch M02 — Webview CSP + Nonce Hardening
**Cursor Agent Prompt**
```
ROLE: Extension Engineer
OBJECTIVE: Make the webview CSP‑compliant and future‑proof.
CHANGES (apps/extension/src/extension.ts):
1) Generate nonce and add CSP meta:
   default-src 'none';
   img-src ${webview.cspSource} data:;
   style-src ${webview.cspSource} 'unsafe-inline';
   script-src 'nonce-${nonce}';
2) Add nonce to all injected <script> tags (including bridgeScript()).
3) Restrict localResourceRoots to packaged assets.
ACCEPTANCE: No CSP violations in DevTools; webview renders fully.
COMMIT: chore(extension): CSP meta + nonce + tighter localResourceRoots
```

---

## Batch M03 — Data Provider Toggle (Mock ↔ Extension)
**Cursor Agent Prompt**
```
ROLE: Frontend Architect
OBJECTIVE: Switch data source at runtime and persist choice.
CHANGES:
1) lib/data/provider.types.ts → define Provider interface (getPrices, getKpis, getFinancials).
2) lib/data/providers/index.ts → setDataProvider/getDataProvider/useProviderName.
3) adapters/mock.ts (existing) + adapters/extension.ts (bridge to extension messaging).
4) Add UI toggle "Data Provider: Mock/Extension" (toolbar or command palette), persisted in store.
TESTS: Unit tests for provider registry and default.
ACCEPTANCE: Toggling updates widgets without reload.
COMMIT: feat(data): runtime provider switch and extension adapter
```

---

## Batch M04 — Extension Data Proxy (Secrets + Messages)
**Cursor Agent Prompt**
```
ROLE: Node/Extension Engineer
OBJECTIVE: Handle real data requests in the extension; keep secrets out of the webview.
CHANGES (apps/extension):
1) messaging.ts: define request/response types: data:prices, data:kpis, data:financials.
2) extension.ts: implement handlers with fetch; in-memory TTL cache per symbol.
3) Add commands to set API keys (Yahoo/Alpha Vantage) using context.secrets.
4) Normalize responses to {timestamp, open, high, low, close} (Zod in next batch).
ACCEPTANCE: window.madlabBridge.request('data:prices',{symbol:'AAPL'}) returns normalized OHLC.
COMMIT: feat(extension): data proxy with SecretStorage and caching
```

---

## Batch M05 — Zod Validation at Data Boundary
**Cursor Agent Prompt**
```
ROLE: Type Safety Engineer
OBJECTIVE: Validate all provider responses; fail safe.
CHANGES:
1) lib/data/schemas.ts → z.PricePoint, z.PriceSeries, z.KpiData, z.Financials.
2) Parse/validate in adapters; surface friendly errors to UI.
3) Add loading/empty/error states in data hooks & widgets.
TESTS: Happy/sad path unit tests for schemas.
ACCEPTANCE: Invalid shapes are caught and shown as non‑blocking errors.
COMMIT: feat(data): zod‑guarded adapters and resilient states
```

---

## Batch M06 — Provider‑Aware Hooks + KPI/Line Wiring
**Cursor Agent Prompt**
```
ROLE: Frontend Engineer
OBJECTIVE: Replace mock calls with provider‑aware hooks and wire two core widgets.
CHANGES:
1) lib/data/hooks.ts → usePrices(symbol, range), useKpis(symbol) with current provider.
2) components/widgets/KpiCard.tsx → switch to useKpis; add loading/error UI.
3) components/widgets/LineChart.tsx → close prices with range (1D–5Y), refresh, min/max tooltips.
TESTS: Snapshot test for deterministic mock; E2E covers provider toggle.
ACCEPTANCE: AAPL renders live line in Extension mode; mock otherwise.
COMMIT: feat(widgets): KPI & LineChart wired to provider hooks
```

---

## Batch M07 — Minimal Widget Registry + Versioning
**Cursor Agent Prompt**
```
ROLE: Platform Engineer
OBJECTIVE: Make widgets pluggable and versioned without over‑engineering.
CHANGES:
1) lib/widgets/registry.ts: register/get/list; meta {kind, title, version, propertySchema}.
2) GridCanvas renders widget by kind via registry.get(kind).
3) Store persists {kind, props, version} per widget.
ACCEPTANCE: Palette reads from registry; existing workspaces migrate with default version.
COMMIT: feat(widgets): lightweight registry and versioned widgets
```

---

## Batch M08 — Inspector Auto‑Forms (Zod → Controls)
**Cursor Agent Prompt**
```
ROLE: UX Engineer
OBJECTIVE: Generate Inspector controls directly from each widget’s Zod schema.
CHANGES:
1) lib/ui/AutoForm.tsx → text/number/enum/boolean controls from schema; uses .describe() for hints.
2) Inspector renders AutoForm for selected widget; dispatches update events.
ACCEPTANCE: Editing symbol/range/title updates widget live; no manual form code per widget.
COMMIT: feat(inspector): auto‑forms from zod schemas
```

---

## Batch M09 — DCF Core (Deterministic; Tested)
**Cursor Agent Prompt**
```
ROLE: Quant Engineer
OBJECTIVE: Implement a small, accurate DCF engine and a widget using it.
CHANGES:
1) lib/quant/dcf.ts → NPV, WACC, terminal value (GGM), series PV; all pure functions.
2) components/widgets/DCFBasic.tsx → inputs (FCF0, g, WACC, N, TV method), output table + chart.
3) Unit tests with reference fixtures.
ACCEPTANCE: Tests pass; UI responsive under edits.
COMMIT: feat(quant): DCF primitives and basic widget
```

---

## Batch M10 — Risk Core (VaR/ES)
**Cursor Agent Prompt**
```
ROLE: Risk Engineer
OBJECTIVE: Compute VaR/ES from historical returns and display.
CHANGES:
1) lib/quant/risk.ts → returns(series), quantile(p), ES; optional Cornish‑Fisher.
2) components/widgets/VarEsCard.tsx → inputs (window, confidence), outputs VaR & ES.
3) Wire to usePrices(symbol, range) for returns series.
ACCEPTANCE: 95%/99% toggles produce sensible values fast (<16ms calc).
COMMIT: feat(risk): VaR/ES engine and widget
```

---

## Batch M11 — Error Boundaries + Toasts
**Cursor Agent Prompt**
```
ROLE: DX Engineer
OBJECTIVE: Fail gracefully for data/agent errors.
CHANGES:
1) Add ErrorBoundary around grid and agent panels.
2) Lightweight toast system for fetch/parse failures and agent tool errors.
ACCEPTANCE: Network faults show non‑blocking toasts; boundary shows fallback UI and reset.
COMMIT: feat(ui): error boundary and toast notifications
```

---

## Batch M12 — Performance Discipline
**Cursor Agent Prompt**
```
ROLE: Performance Engineer
OBJECTIVE: Keep the app snappy and within bundle budgets.
CHANGES:
1) Dynamic import heavy widgets (DCF, VaR) and Inspector.
2) Memoize data transforms; avoid re‑render storms; verify Recharts tree‑shaking.
3) Enforce size‑limit in CI; document numbers in /docs/_healthcheck.md.
ACCEPTANCE: Main bundle <3MB gzip; no >50ms blocking during common flows.
COMMIT: perf(build): lazy chunks and memoization
```

---

## Batch M13 — E2E Expansion w/ Stable Selectors
**Cursor Agent Prompt**
```
ROLE: Test Engineer
OBJECTIVE: Make E2E robust and representative of MVP flows.
CHANGES:
1) Add data-testid anchors: add‑widget, sheet‑tab, inspector‑toggle, provider‑toggle, duplicate/delete.
2) tests/e2e/workspace.spec.ts → flow: create→rename→add LineChart→toggle provider→persist→reload.
ACCEPTANCE: E2E green locally and in CI; traces uploaded on failure.
COMMIT: test(e2e): selectors and MVP flows
```

---

## Batch M14 — Workspace Import/Export (JSON UI)
**Cursor Agent Prompt**
```
ROLE: Platform Engineer
OBJECTIVE: User‑visible import/export of the full workspace.
CHANGES:
1) lib/io/export.ts & import.ts (versioned schema; zod validate on import).
2) Buttons in the workspace menu → download/upload file dialogs.
ACCEPTANCE: Export then import reproduces layout and widget props exactly (provider may differ).
COMMIT: feat(io): workspace import/export UI
```

---

## Batch M15 — Agent Minimal Tools (Local, No LLM)
**Cursor Agent Prompt**
```
ROLE: Agent Systems Engineer
OBJECTIVE: Useful agent without cloud keys.
CHANGES:
1) Tools: addWidget(kind, props), addSheet(title), select(target), openInspector(), fetchPrices(symbol,range).
2) Simple intent parser: "line chart for AAPL 6M" → plan → tools.
3) Templated reply summarizing action and data range.
ACCEPTANCE: User types the example command; widget appears and populates.
COMMIT: feat(agent): minimal tool surface and intents
```

---

## Batch M16 — Static Demo Export + Demo Banner
**Cursor Agent Prompt**
```
ROLE: Frontend Engineer
OBJECTIVE: Publish a safe mock‑data demo and label it clearly.
CHANGES:
1) Add top banner when provider=Mock: "Demo mode — synthetic data".
2) /docs/deploy.md: Vercel deploy steps and limitations.
ACCEPTANCE: Vercel demo builds & shows banner; no network calls other than static assets.
COMMIT: chore(docs): demo deploy and banner
```

---

## Batch M17 — VSIX Packaging
**Cursor Agent Prompt**
```
ROLE: Extension Release Engineer
OBJECTIVE: Produce an installable VSIX with basic marketplace metadata.
CHANGES:
1) apps/extension/package.json → contributes.commands, icon, categories.
2) Add vsce scripts and asset copy steps.
3) README section: data provider setup, secrets, CSP notice.
OUTPUT: apps/extension/*.vsix
ACCEPTANCE: VSIX installs locally; Extension mode fetches real data.
COMMIT: chore(release): package VSIX and update README
```

---

## Batch M18 — Documentation Pass (MVP)
**Cursor Agent Prompt**
```
ROLE: Tech Writer
OBJECTIVE: Document MVP architecture and ops concisely.
CHANGES:
1) docs/: architecture.md, data-providers.md, widget-registry.md, quant.md, agent.md.
2) Include Mermaid diagrams for data flow (webview ⇆ extension ⇆ provider).
ACCEPTANCE: New contributor can fetch data and add a widget in <60 minutes.
COMMIT: docs: MVP architecture and guides
```

---

## Batch M19 — Accessibility & Keyboarding (MVP)
**Cursor Agent Prompt**
```
ROLE: Accessibility Engineer
OBJECTIVE: Address critical a11y and keyboard flows.
CHANGES:
1) aria-labels and roles for toolbar, tabs; focus rings; ESC to close Inspector.
2) Add shortcuts reference in README.
ACCEPTANCE: Axe criticals = 0 on key screens; tabs navigable via keyboard.
COMMIT: feat(a11y): labels, roles, and keyboard docs
```

---

## Batch M20 — CI Pipeline
**Cursor Agent Prompt**
```
ROLE: DevOps Engineer
OBJECTIVE: Enforce quality gates on PRs.
CHANGES:
1) GitHub Actions: node LTS matrix; cache pnpm; run type/lint/unit/e2e/size-limit.
2) Upload Playwright traces on failure; artifact bundle of /docs/_healthcheck.md.
ACCEPTANCE: CI red on any gate failure; green otherwise.
COMMIT: ci: add full MVP pipeline
```

---

## Batch M21 — Issue Templates & Labels
**Cursor Agent Prompt**
```
ROLE: PM
OBJECTIVE: Standardize bug/feature intake.
CHANGES:
1) .github/ISSUE_TEMPLATE/bug_report.md and feature_request.md.
2) Labels: severity:{S1..S4}, area:{extension,widgets,data,agent,ui,docs}.
ACCEPTANCE: New issues follow template; board filters by labels.
COMMIT: chore(templates): issues and labels
```

---

## Batch M22 — MVP Cut & Tag
**Cursor Agent Prompt**
```
ROLE: Release Manager
OBJECTIVE: Cut v0.3.0‑MVP and create release artifacts.
TASKS:
1) Update CHANGELOG.md (Keep a Changelog).
2) Tag and create GitHub release attaching VSIX and Vercel demo link.
3) Open next milestone issues (post‑MVP enhancements).
ACCEPTANCE: Release artifacts present; links verified.
COMMIT: release: v0.3.0‑MVP
```

---

## MVP Success Criteria (Go/No‑Go)
- Extension mode: enter ticker → **live LineChart + KPI** render within ~2s on typical network.  
- DCF & VaR/ES: deterministic, tested, respond to Inspector edits with **<100ms** recompute on target laptop.  
- Mock demo: runs fully **offline** (no keys, no network), **banner visible**.  
- Import/Export: round‑trip exact **layout + props**.  
- Bundle budgets respected; CI green.  

### Quick Commands
```
pnpm install
pnpm typecheck && pnpm lint && pnpm test
pnpm dev:test & pnpm e2e
pnpm build
```

### Commit Style
- feat(scope): …  
- fix(scope): …  
- refactor(scope): …  
- perf(scope): …  
- chore(scope): …  
- docs(scope): …  
- test(scope): …  
- ci(scope): …  
```




############################
update
############################

 MAD LAB IDE MVP Roadmap v3.0 - Progress 
  Analysis

  Executive Summary

  Overall Progress: ~80-85% Complete

  The project shows significant development
  progress with most core infrastructure in
  place, but several key deliverables remain
  incomplete.

  Batch-by-Batch Analysis

  ✅ COMPLETED BATCHES (18/23):

  M00 - Baseline Health & Budgets ✅
  - Evidence: docs/_healthcheck.md exists,
  commit ee3bb74 matches pattern

  M01 - Single Source of Truth for Presets ✅
  - Evidence: lib/presets.ts exists, commit
  3753e7d matches objective

  M02 - Webview CSP + Nonce Hardening ✅
  - Evidence: Commit 6aaf3f1 matches CSP
  implementation, extension files present

  M04 - Extension Data Proxy ✅
  - Evidence: apps/extension/src/messaging.ts +
   extension.ts exist, commit 0a779d8 shows
  Alpha Vantage integration with SecretStorage

  M05 - Zod Validation ✅
  - Evidence: lib/data/schemas.ts exists,
  commit 4ab877f shows Zod-validated adapters

  M06 - Provider-Aware Hooks + KPI/Line Wiring
  ✅
  - Evidence: lib/data/hooks.ts,
  components/widgets/KpiCard.tsx,
  components/widgets/LineChart.tsx exist

  M07 - Widget Registry + Versioning ✅
  - Evidence: lib/widgets/registry.ts exists,
  commit cd992d6 shows registry rendering

  M08 - Inspector Auto-Forms ✅
  - Evidence: lib/ui/AutoForm.tsx exists,
  commit 214932e shows zod auto-form
  implementation

  M09 - DCF Core ✅
  - Evidence: lib/quant/dcf.ts and
  components/widgets/DcfBasic.tsx exist

  M10 - Risk Core (VaR/ES) ✅
  - Evidence: lib/quant/risk.ts and
  components/widgets/VarEs.tsx exist

  M11 - Error Boundaries + Toasts ✅
  - Evidence: components/ui/ErrorBoundary.tsx
  exists

  M12 - Performance Discipline ⚠️
  - Partial: Dynamic imports may be implemented
   but needs verification

  M13 - E2E Expansion ✅
  - Evidence: tests/e2e/workspace.spec.ts and
  provider-toggle.spec.ts exist

  M14 - Workspace Import/Export ✅
  - Evidence: lib/io/export.ts and
  lib/io/import.ts exist, commit a1c36cf

  M15 - Agent Minimal Tools ✅
  - Evidence: lib/agent/ directory with
  runtime.ts and tools.ts

  M17 - VSIX Packaging ✅
  - Evidence:
  apps/extension/madlab-workbench.vsix exists,
  commit 7aca02f

  M18 - Documentation Pass ✅
  - Evidence: docs/architecture.md,
  docs/data-providers.md,
  docs/widget-registry.md, docs/quant.md,
  docs/agent.md exist

  M20 - CI Pipeline ✅
  - Evidence: .github/workflows/ci.yml exists
  with comprehensive checks

  M21 - Issue Templates & Labels ✅
  - Evidence: .github/ISSUE_TEMPLATE/ with
  bug_report.md and feature_request.md

  ❌ INCOMPLETE BATCHES (5/23):

  M03 - Data Provider Toggle ❌
  - Missing: Runtime toggle UI, provider
  switching mechanism
  - Present: lib/data/providers/ with multiple
  providers including
  ExtensionBridgeProvider.ts

  M16 - Static Demo Export + Demo Banner ❌
  - Missing: Demo banner implementation,
  docs/deploy.md
  - Impact: Cannot safely publish demo without
  clear mock-data labeling

  M19 - Accessibility & Keyboarding ❌
  - Missing: Comprehensive a11y implementation,
   keyboard shortcuts documentation

  M22 - MVP Cut & Tag ❌
  - Missing: CHANGELOG.md, release tag
  v0.3.0-MVP
  - Blocker: Cannot release without changelog

  M12 - Performance Discipline ⚠️
  - Uncertain: Bundle analysis needed, lazy
  loading verification required

  Key Infrastructure Status

  ✅ Strong Foundation:

  - Extension System: Fully functional with
  SecretStorage, CSP, VSIX packaging
  - Data Layer: Multiple providers, Zod
  validation, hooks system
  - Widget System: 19 widgets, registry system,
   auto-forms inspector
  - Quantitative Engine: DCF, VaR/ES,
  Black-Scholes implementations
  - Testing: E2E tests, unit tests, CI pipeline
  - Import/Export: Full workspace serialization

  ❌ Critical Gaps:

  - Provider Toggle UI: Users cannot switch
  between mock/extension data sources
  - Demo Safety: No banner indicating synthetic
   data in mock mode
  - Release Process: No changelog or versioning
   system
  - Accessibility: Limited keyboard navigation
  and screen reader support

  Recommendation

  Focus on completing M03, M16, and M22 to
  achieve a releasable MVP. M19 can be deferred
   post-MVP if timeline is constrained.

⏺ Update Todos
  ⎿  ☒ Examine git commit history              
       comprehensively
     ☒ Check file system for key deliverables
     ☒ Verify extension and data infrastructure
     ☒ Assess widget implementation status
     ☒ Check documentation and deployment files
     ☒ Compile final completion report