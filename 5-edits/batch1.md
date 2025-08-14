Got it, Drew. I inspected both zips—this is a Next.js (App Router) + Tailwind + shadcn/ui + Zustand + react-grid-layout workbench with a VS Code-style shell and a VS Code webview extension scaffold under `apps/extension`. Below are tightly scoped, **batched agent prompts** you can paste into Cursor/Claude/Windsurf—each delivers a concrete slice with acceptance checks and filenames grounded in your repo.

---

# Batch 1 — Tighten VS Code visual parity & chrome behavior

**Goal:** finalize shell (TitleBar, ActivityBar, Explorer, StatusBar) so layout is pixel-clean and resizes correctly; add keyboard toggles and persisted UI state.

**Touch:**
`components/chrome/{TitleBar.tsx,ActivityBar.tsx,Explorer.tsx,StatusBar.tsx}`
`app/globals.css` · `lib/store.ts`

**Acceptance:**

* `Alt+1` toggles Explorer, `Alt+3` toggles AgentChat, persisted via Zustand.
* Explorer width resizable (drag handle) and persisted.
* StatusBar shows active sheet name, widget count, and connection mock (“Local · Read-Only”).
* No layout jump on window resize.

**Agent Prompt**

```
You are editing a Next.js App Router project with Tailwind, shadcn/ui, Zustand, and react-grid-layout. Implement VS Code–like chrome polish and keyboard toggles:

1) Explorer panel
- Add a draggable vertical resize handle on Explorer’s right edge (8px).
- Persist width in Zustand (key: explorerWidth, default 280px).
- Update `lib/store.ts`: add explorerWidth number + actions setExplorerWidth.
- Apply `style={{ width: explorerWidth }}` and prevent shrinking < 200px.
- Add `Alt+1` to toggle explorerCollapsed.

2) AgentChat panel
- Wire `Alt+3` to toggle chatCollapsed (already in store). Ensure layout recalculates min-w-0 to avoid overflow.

3) StatusBar
- Show left: active sheet title (or "No Sheet") + widget count.
- Show right: "Local · Read-Only" + clock (HH:MM) updated every minute (client effect).
- Ensure compact on small widths.

4) TitleBar
- Add app title + light/dark toggle using ThemeProvider.
- Do not introduce server/client mismatch (use "use client" where hooks appear).

5) CSS polish
- In `app/globals.css`, align background and border tokens to VS Code dark:
  background #1e1e1e, panels #252526, borders #2d2d30, label #cccccc, muted #969696, accent #007acc.
- Avoid tailwind overrides that fight shadcn.

6) Persistence
- Ensure explorerCollapsed, chatCollapsed, explorerWidth persist via Zustand persist (existing middleware). Add them to the store initial state and types.

7) Tests
- Update `tests/e2e/workspace.spec.ts` to verify:
  - Alt+1 toggles "EXPLORER" visibility and persists after reload.
  - Explorer width changes by dragging and persists after reload.

Only modify files under components/chrome/*, app/globals.css, lib/store.ts, and the e2e test. Keep code minimal and accessible.
```

---

# Batch 2 — Sheet & widget ergonomics (selection, duplicate, configure)

**Goal:** make tiles feel like “real IDE panels”: selection outline, keyboard delete/duplicate, and a working “Configure” drawer.

**Touch:**
`components/editor/{WidgetTile.tsx,GridCanvas.tsx,SheetTabs.tsx}`
`components/panels/BottomPanel.tsx` (small) · `lib/store.ts` · `components/inspector/Inspector.tsx` (new)

**Acceptance:**

* Click selects a widget (1px #007acc outline). `Esc` clears selection.
* `Cmd/Ctrl+D` duplicates selected tile; `Delete/Backspace` removes it.
* “Configure” opens right-side Inspector drawer with title field + JSON props editor (zod-validated) that updates live.
* Duplicate preserves size/pos with small offset.

**Agent Prompt**

```
Add widget selection + duplicate + simple Inspector:

1) Store additions:
- selectedWidgetId?: string with setSelectedWidget(id?: string).
- add action duplicateWidget(sheetId,id): clones widget with new id, layout offset +1 column (if overflow, push next row).

2) WidgetTile:
- On click: setSelectedWidget(widget.id). Add `data-selected` and a visible 1px #007acc outline when selected.
- Keyboard shortcuts at Editor level:
  - Cmd/Ctrl+D -> duplicate selected widget.
  - Delete/Backspace -> remove selected widget.
  - Esc -> setSelectedWidget(undefined).

3) Inspector (new file `components/inspector/Inspector.tsx`):
- Right-side drawer (width 360px) that opens when selectedWidgetId is set and `inspectorOpen` state = true.
- Fields: Title (string), Props (textarea with JSON, safe-parse via zod; on success call updateWidget with parsed props).
- Add "Configure" in Widget kebab menu to open inspector for that widget.

4) GridCanvas:
- Stop click bubbling on header buttons. Non-destructive focus management (tabIndex, aria-selected).
- Ensure group hover keeps drag handle visible.

5) BottomPanel:
- When selection changes, append a small log line in Output: "Selected widget: <type> (<id>)".

6) Tests:
- Extend e2e to select first tile, press Cmd/Ctrl+D, assert count+1 and position offset; open Configure and change title, assert UI updates.

Keep code strictly typed, avoid unnecessary re-renders (use memo where needed).
```

---

# Batch 3 — Command Palette (⌘/Ctrl+K) with actions

**Goal:** fast command execution for core actions.

**Touch:**
`components/chrome/TitleBar.tsx` (trigger) · `components/commands/CommandPalette.tsx` (new) · `lib/commands.ts` (new) · `lib/store.ts`

**Acceptance:**

* `Cmd/Ctrl+K` opens palette; fuzzy-search actions.
* Actions: “New Sheet: Valuation/Charting/Risk/Options/Blank”, “Toggle Explorer/Chat”, “Duplicate Widget”, “Remove Widget”, “Open Inspector”, “Export Workspace JSON”, “Import Workspace JSON”.
* Import/export works (download/upload file).

**Agent Prompt**

```
Implement a lightweight command palette:

1) Add `components/commands/CommandPalette.tsx` using shadcn Dialog + Command primitives.
2) Register actions in `lib/commands.ts` with id, title, run(): (use store actions).
3) Keyboard: global Cmd/Ctrl+K toggles palette. Provide search with fuzzy match.
4) Implement export/import in `lib/store.ts` helpers:
   - exportWorkspace(): Blob of current persisted state (excluding transient bits).
   - importWorkspace(json): replace sheets/messages/ui safely; bump a `schemaVersion` if not present; no crash on mismatch.
5) Surface a small "Import…" item that opens a file input, parses, and calls importWorkspace.

Add basic tests to ensure export returns non-empty and import restores a recognizable sheet.
```

---

# Batch 4 — State persistence: versioned schema & migrations

**Goal:** future-proof localStorage; add `schemaVersion` and migrations.

**Touch:**
`lib/store.ts`

**Acceptance:**

* `schemaVersion` added (start at 1).
* `persist` middleware configured with `version` and `migrate(old, version)`.
* Old states without version migrate cleanly (defaults filled, no crash).

**Agent Prompt**

```
Enhance Zustand persist:
- Configure `persist` with `{ name: 'madlab-workspace', version: 1, migrate: (state, version) => { ... } }`.
- Handle undefined keys: explorerWidth (default 280), activeBottomTab ('output'), chatCollapsed/explorerCollapsed default false, theme default 'dark'.
- Ensure Dates in messages are revived or stored as ISO strings.
- Add simple migration test in vitest that simulates version 0 and asserts state normalization.
```

---

# Batch 5 — Minimal data provider abstraction + mock fetches for widgets

**Goal:** prepare real data later; unify widget data loading now.

**Touch:**
`lib/data/providers.ts` (new interface) · `lib/data/mock.ts` (new) · `components/widgets/*` (light refactor)

**Acceptance:**

* Common `DataProvider` interface: `getKpis(symbol)`, `getPrices(symbol, range)`, `getVolSurface(symbol)`, etc.
* Default provider = `mockProvider` (deterministic samples).
* Widgets receive data via small hooks (`useKpis`, `usePrices`) with loading state.
* No network calls; UI remains responsive.

**Agent Prompt**

```
Abstract a data layer:

1) Create `lib/data/providers.ts` with a `DataProvider` type and a `setProvider/getProvider` singleton.
2) Implement `lib/data/mock.ts` with deterministic pseudo-random series seeded by symbol.
3) Add hooks `lib/data/hooks.ts`: useKpis(symbol), usePrices(symbol, range), useVolSurface(symbol).
4) Update widgets (KpiCard, LineChart, VolCone, VarEs) to consume hooks; default symbol "ACME" with an Input in Widget header to change symbol (update widget.props).
5) No external APIs; keep everything local.

Add unit tests for mock provider determinism (same symbol => same results).
```

---

# Batch 6 — AgentChat: streaming + tool calls into store (mock model)

**Goal:** wire a real interaction loop (no external API yet): streaming responses and tool calls to mutate workspace (add sheet/widget, rename, etc.).

**Touch:**
`components/panels/AgentChat.tsx` · `lib/agent/{runtime.ts, tools.ts}` (new)

**Acceptance:**

* Messages stream token-by-token.
* Agent can call tools: `add_sheet(kind)`, `add_widget(type,title)`, `select_widget(id)`, `rename_sheet(title)`.
* Simple DSL: wrap JSON in triple backticks tagged `tool`.
* Safety: refuse destructive actions unless user confirms.

**Agent Prompt**

````
Implement a local agent runtime:

1) Create `lib/agent/tools.ts` exporting tool functions that call Zustand actions.
2) Create `lib/agent/runtime.ts` with:
   - `runAgentTurn(history)`: returns an async generator yielding tokens.
   - If the agent outputs ```tool { ... }```, parse JSON and invoke mapped tools, then continue.
   - For now, use a dumb template-based responder that occasionally emits one tool call (mock the LLM).

3) AgentChat:
   - Replace setTimeout mock with `runAgentTurn`.
   - Show streamed tokens in UI.
   - Render tool call chips in the transcript, including the result (e.g., "Added Valuation sheet").

4) Confirmation:
   - For remove operations, require a user confirmation step before invoking.

No external network. Keep it testable by injecting the runtime.
````

---

# Batch 7 — Export static app for VS Code webview + extension wiring

**Goal:** make the VS Code extension (`apps/extension`) open the static export from `/out`.

**Touch:**
Root `next.config.js` (already `output: 'export'`) · `apps/extension/src/extension.ts` · `apps/extension/README.md`

**Acceptance:**

* `pnpm build:web` produces `/out` with index.html.
* Running the extension command “MAD LAB: Open Workbench” opens a WebviewPanel that loads the local `/out/index.html` via `asWebviewUri`.
* Messaging scaffold compiled and working.

**Agent Prompt**

```
Wire static export to VS Code webview:

1) Confirm `next.config.js` has `output: 'export'` and images unoptimized (it does).
2) In `apps/extension/src/extension.ts`, implement a WebviewPanel that:
   - Finds the workspace root's `out` folder.
   - Sets `webview.options = { enableScripts: true, localResourceRoots: [vscode.Uri.file(outDir)] }`.
   - Reads `out/index.html` and rewrites asset URLs (`/` prefix) to use `webview.asWebviewUri`.
3) Ensure CSP allows local scripts/styles only.
4) Update README with build steps:
   - `pnpm build:web`
   - `pnpm --filter @madlab/extension build`
   - F5 to debug extension.

Add a smoke test doc in README with screenshots.
```

---

# Batch 8 — Test pass: unit + e2e stabilization

**Goal:** green tests + coverage bump to core flows.

**Touch:**
`tests/store.test.ts` · `tests/e2e/workspace.spec.ts` · `tests/setup.ts` · `playwright.config.ts`

**Acceptance:**

* Unit: store actions for add/duplicate/remove widgets, selection, migrations.
* E2E: add sheet from preset, drag/resize persists, open Inspector, rename widget, toggle bottom tabs.

**Agent Prompt**

```
Stabilize tests:
1) Expand store unit tests to cover:
   - addSheet(kind), populateSheetWithPreset
   - duplicateWidget, removeWidget
   - migration from version 0 -> 1
2) E2E: ensure baseURL set and server starts on /.
3) Update flakey selectors:
   - Use data-testid for add-sheet button and widget tiles.
   - Add waits around grid animations.

Run: pnpm test && pnpm e2e. Fix failures deterministically.
```

---

# Batch 9 — Workspace templates & import/export UX

**Goal:** speed startup via saved templates.

**Touch:**
`lib/store.ts` · `components/editor/SheetTabs.tsx` · `components/commands/CommandPalette.tsx`

**Acceptance:**

* “Save Current Sheet as Template” and “New From Template…” available in palette and “+” menu.
* Templates persisted under `madlab-templates` key.
* Creating from template instantiates widgets with fresh IDs.

**Agent Prompt**

```
Implement templates:
1) In store, add getTemplates(), saveTemplate(name, sheetId), createSheetFromTemplate(name).
2) Update PresetPicker to include a divider "My Templates" when any exist.
3) Add palette actions for save/open templates.

Keep UX simple; no modal beyond a prompt for template name (use shadcn Dialog).
```

---

## How to run these

* After each batch: `pnpm dev` (for app) or `pnpm --filter @madlab/extension build` (for extension) and run tests: `pnpm test && pnpm e2e`.
* Commit per batch with a conventional summary, e.g., `feat(ui): command palette and import/export`.

If you want, I can generate these as separate, copy-pasteable JSON “tasks” for your agent runner, one per message.
