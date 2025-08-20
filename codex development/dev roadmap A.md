codex
Current State

- Stack: Next.js 13 App Router, TypeScript, Tailwind, Radix UI, shadcn-style components, Zustand
(persist), react-grid-layout, Recharts/D3, PWA (service worker + manifest), Playwright/Vitest.
- UI Shell: TitleBar, ActivityBar, Explorer, StatusBar, Editor (grid canvas + tabs), Inspector,
AgentChat, CommandPalette, WidgetGallery, MarketplacePanel, DataProviderConfig.
- Widgets: 30+ (charts, watchlist, KPI, options, portfolio, news, market overview, etc.) with a
schema/registry (lib/widgets) and dynamic lazy-loading.
- Data Layer: Provider registry (mock default) with adapters for Alpha Vantage, Polygon, Alpaca,
IBKR; hooks, caching (lib/data/cache), realtime scaffolding, multi-exchange aggregator.
- Persistence & Templates: Local storage via Zustand persist, import/export helpers, template save/
load, marketplace templates.
- Performance: Advanced Next config, code-splitting, chunking, PWA assets, service worker, runtime
monitor (lib/performance/monitor.ts), health endpoint.
- Packaging: VS Code extension webview build pipeline (build:webview) with extension skeleton in
apps/extension.
- Tests/QA: Playwright config present, Vitest set up, Lighthouse reports provided; not all tests
verified here.

Notable Gaps

- Provider UX: DataProviderConfig focuses on Alpha Vantage; other providers exposed in code but not
wired into UI/testing flows. Secrets stored locally (OK for MVP).
- Widget UX polish: Loading/skeletons and error states are inconsistent across widgets; some rely
on mock without unified error handling.
- Layout actions: TitleBar “Restore/Reset layout” marked TODO; theme switch bypasses ThemeProvider
by editing body class.
- Onboarding: No first-run flow to pick provider, set symbol, and create initial sheet; Explorer
is mock-only.
- Global context: Timeframe is not standardized; symbol propagation exists, but a top-level symbol/
timeframe toolbar is not visible.
- Auth/Collab: No auth; collaboration scaffolding exists but not integrated (out of scope for MVP).
- Docs vs code: Some docs claim advanced features completed (IBKR real, marketplace backend) that
are not fully present in code.

MVP Definition

- A fast, installable web app where users can:
  - Choose mock or Alpha Vantage, set a default symbol.
  - Create analyses via curated templates/workflows.
  - Add/rearrange a core set of polished widgets on a grid.
  - Use a global symbol/timeframe toolbar with one-click propagation.
  - Save/restore workspace locally; import/export JSON.
  - Browse and add marketplace templates; basic agent-assisted sheet creation.
- “Beautifully rendered” polish: consistent theming, loaders, empty/error states, smooth drag/
resize, responsive layout, accessible controls.

High-ROI Priorities

- Onboarding & Cohesion: First-run setup, curated templates, and a symbol/timeframe toolbar
dramatically improve first impressions and flow.
- Data hook unification: One consistent pattern for data fetching across widgets reduces bugs and
speeds iteration.
- Widget polish: Skeletons, error boundaries, and standardized props immediately improve perceived
quality.
- Marketplace + Agent glue: Low backend cost for high “wow” factor by leveraging existing local
templates/workflows.
- PWA + VS Code packaging: Expands distribution with minimal engineering risk.

Roadmap

- Phase 0 — Finish & Polish (1–2 days)
  - TitleBar: Implement layout restore/reset using updateLayout mappings; add “Export/Import
Workspace” actions that call store helpers.
  - Theming: Replace manual body class edits with ThemeProvider state; persist theme in store.
  - Widget shell: Standard loading skeleton + error boundary wrapper for all widgets; standard
empty state.
  - Command Palette: Wire top actions (new sheet, add widget, open marketplace, set symbol).
  - Empty state: Home hero with “Choose data provider” and “Create first sheet” CTA.
  - Empty state: Home hero with “Choose data provider” and “Create first sheet” CTA.
-

Phase 1 — Data & Widgets (5–7 days)
    - Data hooks: Consolidate usePrices, useKpis, useFinancials with provider selection, cache
    - Global context: Add a TitleBar “Symbol” input and “Timeframe” select; wire to setGlobalSymbol
and a new setGlobalTimeframe; propagate to widgets that support it.
    - MVP widgets: Harden 6–8 (Watchlist, Candlestick + indicators, KPI Card, Market Overview, News
feed [mock ok], Options Chain [mock ok], Portfolio Performance).
    - Error handling: Per-widget error boundary with provider-specific messages and quick “switch
to mock” fallback
-

Phase 2 — Templates, Marketplace, Agent (4–5 days)
    - Templates: Ensure user templates save/load from UI; add sample curated templates aligned with
MVP widgets.
    - Marketplace: Use current templates, refine filters/sort, and ensure “Add to workspace”
creates a new sheet with global symbol/timeframe.
    - AgentChat: Add clickable suggestions → “Create sheet for X”; show success toasts and
deep-link to new sheet
-

Phase 3 — PWA, Packaging, QA (3–4 days)
    - PWA: Validate offline behavior with mock data, cache critical routes/widgets, verify install
banners.
    - Extension: Build apps/extension .vsix using build:webview; verify webview loading and local
storage persistence.
    - Tests: Add smoke tests (home render, change symbol, add widget, template install); stabilize
Vitest component tests; Playwright basic flows.
    - Performance: Re-run Lighthouse; fix any major regressions; add simple perf budgets
-

Phase 4 — Optional Real Data Path (4–5 days)
    - Alpha Vantage: Add a Next.js API proxy (to avoid CORS / key exposure and smooth rate limits)
for quote/fundamentals endpoints used by MVP widgets.
    - Feature flag: Toggle mock/alpha-vantage in UI; add provider status indicator in StatusBar.

Milestones & Timeline

- Week 1: Phases 0–1 complete; core widgets polished; global toolbar; cohesive UX.
- Week 2: Phase 2 complete; marketplace/templates and agent-powered flows; MVP demo-ready.
- Week 3 (first half): Phase 3 QA + packaging; PWA + VS Code extension; Lighthouse ≥90 desktop;
smoke tests passing.
- Week 3 (second half, optional): Phase 4 proxy + AV data integration and toggling.

Risks & Mitigations

- Rate limits/latency (AV): Use proxy, cache, and fallback to mock; keep mock default for demos.
- UI regressions from unify hooks: Roll out incrementally; feature flag widgets if needed.
- Next.js version: Optional to stay on 13.5 for MVP; plan upgrade later to 14/15.

Decisions Needed

- Real data now or post-MVP: Prioritize mock-first polish or invest in AV proxy this cycle?
- MVP widget set: Confirm the 6–8 to harden first.
- Marketplace scope: Templates only (no backend) for MVP?

If helpful, I can implement Phase 0 now: fix theme handling, add layout restore/reset, standard
widget shell, and add export/import actions in the TitleBar.
