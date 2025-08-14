Got it, Drew. I pulled your repo and aligned the next development slices to your current structure (Next.js 14 App Router, Tailwind + shadcn/ui, Zustand, react-grid-layout, tests, VS Code extension scaffold). The batches below assume the folders and files shown in your README (e.g., `components/chrome/*`, `components/editor/*`, `components/widgets/*`, `lib/store.ts`, `lib/presets.ts`, `apps/extension`) and your roadmap priorities (data integration, richer widgets, agent capabilities). ([GitHub][1])

Each batch includes: scope, acceptance checks, touched files, and a single **agent prompt** you can paste into Cursor/Windsurf/Claude to complete the slice.

# Batch 10 — Typed widget schemas + Inspector drawer (zod-powered)

**Scope:** unify widget prop types with `zod`, add a right-side Inspector to edit title/props JSON with validation, and wire selection/keyboard behaviors.

**Touch:**
`types/widgets.ts` (new) · `lib/store.ts` · `components/editor/{GridCanvas.tsx,WidgetTile.tsx,SheetTabs.tsx}` · `components/inspector/Inspector.tsx` (new) · `components/panels/BottomPanel.tsx`

**Accept:**

* Click selects a tile (visible #007ACC outline); `Esc` clears.
* `Cmd/Ctrl+D` duplicates tile; `Delete/Backspace` removes.
* “Configure” opens an Inspector drawer (width \~360px).
* Editing `title` or `props` (JSON) zod-validates and updates live; invalid states show inline errors.
* Duplicate offsets position by +1 column without overflow.

**Agent prompt**

```
You are working in a Next.js 14 (App Router) + Tailwind + shadcn/ui + Zustand + react-grid-layout project.

Goal: Add typed widget schemas + Inspector drawer.

1) Types
- Create `types/widgets.ts` that exports:
  - WidgetKind union (e.g., 'KpiCard'|'DcfBasic'|'LineChart'|'BarChart'|'Heatmap'|'VarEs'|'StressScenarios'|'FactorExposures'|'CorrelationMatrix'|'GreeksSurface'|'VolCone'|'StrategyBuilder'|'PnLProfile'|'BlankTile').
  - zod schemas for each widget's `props` (minimal but real defaults).
  - `WidgetModel` type: { id: string; kind: WidgetKind; title: string; x:number; y:number; w:number; h:number; props: unknown }.

2) Store
- In `lib/store.ts`, add:
  - selectedWidgetId?: string; actions: setSelectedWidget(id?: string)
  - updateWidgetProps(id, partialProps), updateWidgetTitle(id, title)
  - duplicateWidget(sheetId,id) with +1 column offset (wrap to next row if overflow)
  - removeWidget(sheetId,id)
- Ensure persistence includes the new fields; add safe guards for legacy states.

3) Selection & Keys
- In `components/editor/WidgetTile.tsx`, click => setSelectedWidget(widget.id), show 1px outline when selected (`data-selected`).
- In an editor-level focus scope (GridCanvas or parent), bind:
  - Cmd/Ctrl+D => duplicate selected
  - Delete/Backspace => remove selected
  - Esc => clear selection

4) Inspector UI
- New `components/inspector/Inspector.tsx`: right-side Drawer (shadcn) opens on selection.
- Fields:
  - Title (input): updates updateWidgetTitle
  - Props (textarea): parse-as-JSON -> validate with zod schema by kind; show error if invalid
- Add a "Configure" item to each tile’s kebab menu to open the Inspector.

5) BottomPanel
- Log selection changes: “Selected widget: <kind> (<id>)”.

6) Tests
- Extend unit tests to cover duplicate/remove/update props/title.
- E2E: select first tile, duplicate, edit title via Inspector, validate persistence after reload.

Keep changes minimal, strictly typed, and avoid unnecessary re-renders (memoize tile).
```

# Batch 11 — Command Palette (Cmd/Ctrl+K) + Import/Export + Templates

**Scope:** fast execution UX for core actions, plus JSON import/export and “Save as Template / New from Template”.

**Touch:**
`components/commands/CommandPalette.tsx` (new) · `lib/commands.ts` (new) · `components/chrome/TitleBar.tsx` (trigger) · `components/editor/SheetTabs.tsx` (menu) · `lib/store.ts`

**Accept:**

* `Cmd/Ctrl+K` opens palette with fuzzy search.
* Actions: New Sheet (Valuation/Charting/Risk/Options/Blank), Toggle Explorer/Chat, Duplicate/Remove Widget, Open Inspector, Export Workspace JSON, Import Workspace JSON, Save Sheet as Template, New From Template.
* Templates persisted and listed under “My Templates”.
* Import/Export round-trips state (schemaVersion preserved).

**Agent prompt**

```
Implement a command palette and workspace import/export:

1) Palette
- `components/commands/CommandPalette.tsx`: shadcn Dialog + Command.
- Global keybind Cmd/Ctrl+K to open. Provide fuzzy search for actions.

2) Actions registry
- `lib/commands.ts`: register actions with id, title, run(store) signature. Include:
  - New Sheet (5 kinds)
  - Toggle Explorer / Toggle Chat
  - Duplicate Widget / Remove Widget / Open Inspector
  - Export Workspace JSON
  - Import Workspace JSON (open hidden file input, parse, store.importWorkspace())
  - Save Sheet as Template / New From Template

3) Store helpers
- In `lib/store.ts` add:
  - exportWorkspace(): JSON blob without volatile fields.
  - importWorkspace(json): safe-merge with version checks.
  - Templates API: getTemplates(), saveTemplate(name, sheetId), createSheetFromTemplate(name).

4) UI hooks
- Add a small "Templates" section in `SheetTabs`’ + menu.
- Show “My Templates” divider when any exist.

5) Tests
- Unit: export/import not empty; template save/create produces fresh IDs.
- E2E: open palette, create “Charting” sheet, save as template, then new from template.
```

# Batch 12 — Data layer v1: provider abstraction, deterministic mocks, optional live prices

**Scope:** introduce a clean `DataProvider` interface with deterministic mock data; optional live historical prices via route handler, with caching and rate-limit safety.

**Touch:**
`lib/data/providers.ts` (new) · `lib/data/mock.ts` (new) · `lib/data/hooks.ts` (new) · `app/api/market/route.ts` (new) · `components/widgets/*` (light refactor)

**Accept:**

* `usePrices(symbol, range)`, `useKpis(symbol)`, `useVolSurface(symbol)` hooks exist and power widgets.
* Default provider = deterministic mocks (same symbol ⇒ same series).
* If `MARKET_DATA_URL` env is set, hooks fetch from `/api/market?symbol=...&range=...` with 5-minute TTL cache; otherwise fallback to mock.
* Widgets show loading/error states; UI never blocks.

**Agent prompt**

```
Abstract data and add mocks + optional live prices:

1) Providers
- `lib/data/providers.ts`: define DataProvider { getKpis, getPrices, getVolSurface } and a singleton setProvider/getProvider.

2) Mocks
- `lib/data/mock.ts`: implement deterministic pseudo-random series seeded by symbol (use mulberry32 or equivalent) for prices, KPIs, and a simple vol surface grid.

3) Hooks
- `lib/data/hooks.ts`: useKpis(symbol), usePrices(symbol, range), useVolSurface(symbol) with local cache (Map + TTL) and localStorage backup.

4) API Route
- `app/api/market/route.ts`: receive symbol/range, proxy to a public-source or placeholder (return a simple OHLCV JSON for now). Use in-memory LRU or TTL to avoid spamming. If env `DISABLE_LIVE_DATA=true`, short-circuit to mocks.

5) Widgets
- Refactor widgets (KpiCard, LineChart, VolCone, VarEs) to use hooks and allow a symbol input in the widget header to update widget.props.symbol.

6) Tests
- Unit: mock provider determinism (same inputs => same outputs).
- E2E: switch symbol in LineChart and see series update without errors.
```

# Batch 13 — Agent runtime v1: streaming + tool-calls to mutate workspace

**Scope:** a local agent runtime that can “stream” text responses and emit structured tool-calls (add sheet/widget, rename sheet, select widget). Optional server route for future LLMs.

**Touch:**
`components/panels/AgentChat.tsx` · `lib/agent/runtime.ts` (new) · `lib/agent/tools.ts` (new) · `app/api/agent/route.ts` (stub)

**Accept:**

* Chat messages stream token-by-token in UI.
* Agent can emit a JSON tool call wrapped in triple-backticks (`tool { ... }`) that invokes store actions.
* Destructive ops require a confirm click.
* Route `/api/agent` exists as a future hook (no external calls yet).

**Agent prompt**

````
Add a local agent runtime with tool calls:

1) Tools
- `lib/agent/tools.ts`: map tool ids to functions that call store actions:
  - add_sheet(kind), add_widget(sheetId, kind, title), select_widget(id), rename_sheet(sheetId, title)

2) Runtime
- `lib/agent/runtime.ts`: export async generator `runAgentTurn(history)` that:
  - Yields tokens with small delays to simulate streaming.
  - Occasionally emits a tool block ```tool {"name":"add_sheet","args":{"kind":"Valuation"}}```; parse and execute via tools map; yield a short “✅ Added Valuation sheet” system message.

3) AgentChat
- Replace any previous mock with runtime streaming.
- Render special chips for tool calls and results.
- For destructive actions (remove), ask user to confirm before invoking.

4) API stub
- `app/api/agent/route.ts`: accept POST { messages: [...] }; currently returns a canned streamed response for future LLM integration.

5) Tests
- Unit: runtime parses tool JSON and dispatches.
- E2E: user asks “create a charting sheet and add a line chart,” agent emits two tool calls, UI reflects changes.
````

# Batch 14 — VS Code extension: load `/out` and handshake (open/save JSON)

**Scope:** wire the `apps/extension` to open the static export and exchange messages for import/export of workspace JSON.

**Touch:**
`next.config.js` (confirm `output: 'export'`) · `apps/extension/src/extension.ts` · `apps/extension/README.md`

**Accept:**

* `pnpm build` creates `/out`; running the “MAD LAB: Open Workbench” command opens a WebviewPanel loading `/out/index.html`.
* Webview can send `request-export` and receive workspace JSON; can send `request-import` with JSON payload to replace local state (with confirmation).
* README documents build/run steps with screenshots.

**Agent prompt**

```
Connect the static export to the VS Code webview:

1) Ensure `next.config.js` has `output: 'export'` and images unoptimized.

2) In `apps/extension/src/extension.ts`:
- Register command "madlab.openWorkbench".
- Create WebviewPanel; set `enableScripts: true` and `localResourceRoots: [outDirUri]`.
- Load `out/index.html`, rewriting asset URLs to `webview.asWebviewUri`.
- Wire `webview.onDidReceiveMessage` to handle:
  - request-export -> call a small script in the webview to post back current JSON (use window.acquireVsCodeApi()).
  - request-import (payload) -> post a message to the webview; on web side call store.importWorkspace() with confirm.

3) In the web app, add a small bridge (when running inside VS Code) that listens to `message` events for import/export.

4) README: add build/run steps and screenshots.

Smoke test locally: export JSON, delete state, import JSON -> identical layout.
```

# Batch 15 — Persistence v2: schemaVersion + migrations + crash-safe hydration

**Scope:** add `schemaVersion` to Zustand persist, define `migrate` for legacy states, and harden hydration to avoid crashes on unknown widget kinds.

**Touch:**
`lib/store.ts` · `tests/store.test.ts`

**Accept:**

* Persist config includes `version` and `migrate(old, version)`; start at 1.
* Missing keys (e.g., explorer/chat collapsed states, widths) default sanely.
* Unknown widget kinds are filtered or downgraded to `BlankTile` with a warning.
* Unit tests simulate legacy payloads and pass.

**Agent prompt**

```
Improve persistence and migrations:

1) In `lib/store.ts`:
- Add `schemaVersion = 1`.
- Configure `persist({ name: 'madlab-workspace', version: 1, migrate: (old, v) => normalizedState })`.
- Normalize:
  - explorerCollapsed/chatCollapsed default false
  - explorerWidth default 280
  - fill missing sheet fields
  - coerce unknown widget kinds to 'BlankTile' and keep size

2) Add a console.warn during hydrate for downgraded widgets.

3) Tests:
- Feed a v0-like object (no version, missing keys) into migrate and assert normalized shape.
- Ensure hydrate never throws if an unknown kind exists.
```

# Batch 16 — Test pass & UX polish: keyboard map, a11y, empty states

**Scope:** stabilize Playwright + Vitest, add `data-testid`s, and fix empty/initial states for first-run UX.

**Touch:**
`tests/e2e/*` · `tests/setup.ts` · `playwright.config.ts` · minor `components/*` for `data-testid`

**Accept:**

* E2E: create sheet from preset, drag/resize persists, inspector opens/edits, palette creates from template.
* Unit: store actions coverage for add/duplicate/remove/migrate.
* Empty states: if no sheets, show a centered “Create your first analysis” card with a “+ New sheet” CTA and keyboard hint (`⌘K`).

**Agent prompt**

```
Stabilize tests and polish UX:

1) Add `data-testid` to key elements: add-sheet button, widget tiles, inspector drawer, palette input.

2) Playwright
- Ensure baseURL and dev server hooks are correct.
- Update selectors to use testids; avoid flakey nth-child.
- Add waits for grid animation promises.

3) Unit tests
- Cover add/duplicate/remove widgets, template save/create, migrate v0->v1.

4) Empty state
- If no sheets exist, show a welcome card with “+ New sheet” and hint “Press ⌘K to run a command”.

Run `pnpm test && pnpm e2e` and fix deterministic failures.
```

---

## Notes

* I based file paths and features on your repo’s current layout and README (features, tech stack, roadmap), so these batches drop in cleanly. ([GitHub][1])
* If you prefer, I can convert each batch into JSON tasks for your agent runner (title, intent, constraints, file whitelist, acceptance).

[1]: https://github.com/Bwillia13x/madlab_IDE_proto.git "GitHub - Bwillia13x/madlab_IDE_proto"
