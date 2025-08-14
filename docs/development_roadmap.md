Post-Batches Development Roadmap — MAD LAB IDE (v0-first)

This plan assumes you’ve finished the Inspector Panel, E2E coverage/selector hardening, and type-safety/lint cleanup defined in batches-status.md. The roadmap moves from UX hardening → extensibility → productization, while staying compatible with v0.dev’s small-upload constraints.

⸻

Phase 1 — UX Hardening & Design System (1–2 weeks)

Objectives
	•	Make the current IDE feel “complete” and consistent before adding scope.

Work
	•	Tokenized theme & scale
	•	Extract color/space/typography into tokens.ts + Tailwind theme.extend.
	•	Build a light/dark pair; keep dark opt-in to minimize bundle.
	•	UI kit consolidation
	•	Wrap shadcn primitives you actually use (Tabs, Dialog, Toast) under /components/ui/*.
	•	Replace ad-hoc CSS with atoms/slots; add skeleton states and empty states.
	•	Layout polish
	•	Pane resize handles: larger hit-target, keyboard nudge, focus ring.
	•	Status bar: add connection indicator API (mocked) + quick toggles (wrap/whitespace).
	•	Accessibility
	•	ARIA roles for tablists/dialogs/tree; visible focus for all actions.
	•	Command Palette: label + aria-activedescendant listbox.

Exit criteria
	•	Visual/interaction parity checks pass; a11y smoke tests (keyboard-only) pass.
	•	No “orphan” styles; all colors and spacings come from tokens.

⸻

Phase 2 — Widget Model & Mini-SDK (2–3 weeks)

Objectives

Make widgets first-class and extensible without touching the IDE shell.

Work
	•	Schema
	•	WidgetMeta: kind, version, title, defaults(), propertySchema (zod).
	•	WidgetRuntime: render(props), onEvent, serialize/deserialize.
	•	Registry
	•	registerWidget(kind, meta, runtime); late-bind with dynamic import.
	•	Built-ins: BlankTile, Markdown, ChartLite, Table, KPI.
	•	Property editor
	•	Auto-form from propertySchema (maps types to inputs).
	•	Support enums, number with unit adorners, color, boolean, string, JSON.
	•	Events
	•	Define minimal bus: select, update, duplicate, resize.
	•	Versioning
	•	Widget.version + migration map per kind; integrate with store migrateState.

Exit criteria
	•	New widget can be added by registering a single module.
	•	Inspector edits any registered widget via auto-form.

⸻

Phase 3 — Templates 2.0 & Workspace Sharing (1–2 weeks)

Objectives

Turn the IDE into a shareable artifact for demos and reuse.

Work
	•	Named template packs
	•	Export/import multiple templates with metadata and preview thumbs (lazy).
	•	Workspace export v2
	•	Save as compact JSON with content-addressed blobs for images (optional).
	•	Share links
	•	URL-safe base64 of workspace (≤ 10–20 KB) for small demos; fall back to file.

Exit criteria
	•	Round-trip export/import across app versions.
	•	Template gallery view with previews.

⸻

Phase 4 — Command System & Macro Actions (1–2 weeks)

Objectives

Upgrade the Command Palette from UI toggles to a real action layer.

Work
	•	Action registry
	•	Action type with id, title, run(ctx, args), keybinding?, enabled?(ctx).
	•	Built-in actions
	•	Toggle panels; New Sheet; Save Template; Duplicate Widget; Run Tests (appends terminal log).
	•	Macro recording (lite)
	•	Record a sequence of actions to JSON; play back; save as command.

Exit criteria
	•	Actions are discoverable via palette; keyboard shortcuts bound declaratively.
	•	Macro can reproduce a short flow (e.g., create sheet → add chart → save template).

⸻

Phase 5 — Charting & Analytics Widgets (2–3 weeks)

Objectives

Reach “valuation/risk analytics demo-ready” without heavy libs.

Work
	•	ChartLite
	•	Canvas-based sparkline/line/bar with ~0 deps; 5–10 props only.
	•	Tooltip and axis via CSS overlay.
	•	Table
	•	Virtualized rows (auto-sized), sortable columns, CSV import.
	•	KPI
	•	Value + delta + small inline chart; unit/format tokens.
	•	Formula engine (lite)
	•	Inject a simple expression evaluator for widget props (e.g., =price*shares).
	•	Sandboxed, no dynamic eval (use a tiny expression parser).

Exit criteria
	•	Build remains small; charts render 10k points smoothly.
	•	KPI/table/line chart support the valuation demo scenarios.

⸻

Phase 6 — Data Sources & Caching Abstraction (1–2 weeks)

Objectives

Decouple UI from data; keep v0-friendly.

Work
	•	DataSource interface
	•	query(request): Promise<DataFrame> where DataFrame is typed row arrays.
	•	Providers: LocalStorage, StaticJSON, CSV, FetchREST (URL + schema).
	•	Cache
	•	In-memory + localStorage keyed by request hash; TTL.
	•	Binding
	•	Widgets declare dataRef; editor can pick a source & path.

Exit criteria
	•	Swap from mock JSON to remote REST without code changes in widgets.
	•	Offline read via cache when available.

⸻

Phase 7 — Quality Gate: Testing & Performance (ongoing; 1–2 weeks focus)

Objectives

Keep regressions low as the surface grows.

Work
	•	Tests
	•	Unit: registry, migrations, formulas, data sources.
	•	E2E: flows for templates, macros, inspector editing, pane resize persistence.
	•	Visual regression: Storybook + jest-image-snapshot (or Chromatic if available).
	•	Performance
	•	RGL layout memoization; virtualization in lists; code-splitting widgets; avoid large polyfills.
	•	Size budgets (pnpm size-limit) with CI fail if exceeded.

Exit criteria
	•	85% unit coverage for core libs; green E2E suite; size budget respected.

⸻

Phase 8 — Productization & CI/CD (1–2 weeks)

Objectives

Make this shippable outside v0 while keeping v0 workflow intact.

Work
	•	Repo hygiene
	•	v0-slice/ branch kept lean; GitHub main with full dev tooling.
	•	Lint/type/test pre-push hooks; release tags with changelog.
	•	CI
	•	Build + typecheck + tests + size-limit; preview deploy (Vercel) on PRs.
	•	Telemetry (opt-in)
	•	Minimal event stream (command executed, widget added) via postMessage-friendly adapter; no PII.

Exit criteria
	•	Repeatable thin ZIP generation for v0.
	•	One-click preview deploys; semantic releases with change notes.

⸻

Phase 9 — Documentation & Examples (1 week)

Objectives

Lower the activation energy for contributors and demo users.

Work
	•	Docs site (mdx)
	•	“Architecture”, “Widget SDK”, “Data Sources”, “Actions & Macros”, “Theming”.
	•	Cookbook
	•	5 copy-paste recipes: “Build a KPI”, “CSV to Table”, “Line Chart from REST”, “Macro for New Sheet”, “Share a Workspace”.
	•	Example packs
	•	“Valuation Workbench” and “Risk Dashboard” sample workspaces.

Exit criteria
	•	New dev can register a widget in <30 minutes using docs.
	•	Two polished demo workspaces ready for screen recording.

⸻

Phase 10 — Optional Advanced Tracks (parallel, time-boxed)
	•	Monaco & xterm integration (guard-railed)
Only if needed for code cells/terminal realism. Load behind feature flags and dynamic import; keep out of the v0 slice by default.
	•	Collaboration preview
Single-session CRDT stub (Yjs) behind a toggle; start with “presence” only.
	•	Plugin packaging
Define a manifest + lazy loader for third-party widget packs.

⸻

Milestones & Gates
	•	Alpha (end Phase 3): Stable UX, export/import, Inspector, registry; single-user.
	•	Beta (end Phase 6): Data sources, charts, macros; performance gates pass.
	•	RC (end Phase 8): CI/CD, docs, example packs; API frozen.
	•	Launch: Public demo video + live preview; feedback loop open.

⸻

Success Metrics
	•	Time-to-first-widget < 60s; time-to-shareable workspace < 2 min.
	•	Bundle (v0 slice) < 3 MB gz; FCP < 1.5s on mid-tier laptop.
	•	Test pass rate ≥ 99% on main; visual regressions < 2%/release.
	•	A11y: Keyboard coverage 100% on core flows; lighthouse a11y ≥ 90.

⸻

Risks & Mitigations
	•	Scope creep in charting → enforce “ChartLite” spec; defer heavy libs.
	•	State migration churn → keep PERSIST_VERSION stable; write per-widget migrations.
	•	v0 upload limits → maintain v0-slice branch + automated thin-zip script.
	•	Selector fragility → centralize data-testid constants; avoid text-based selectors.

⸻

Immediate Next Actions (after current batches)
	1.	Spin a feature/widget-sdk branch; scaffold registry, meta, and auto-form.
	2.	Add ChartLite, Table, KPI using the new SDK; seed valuation demo.
	3.	Implement DataSource abstraction with StaticJSON and CSV to prove binding.

