# MAD LAB: Batches Status and Implementation Plan

Last updated: 2025-08-09 21:01 (-06:00)

This document summarizes completed workstreams/batches to date, what remains, and prescribes file-by-file instructions to finish the project without breaking existing behavior. The instructions are aligned to the current codebase structure and verified components.

---

## Completed Batches/Workstreams

- __Command Palette & Workspace Import/Export__
  - Implemented `components/commands/CommandPalette.tsx` with global Cmd/Ctrl+K, accessible dialog, and actions to export/import workspace.
  - Mounted palette globally and wired hidden file input for import with a11y label.
  - Unit tests: `tests/store.import-export.test.ts` validate export payload, import roundtrip, and safe handling of invalid payloads.

- __Versioned Persistence & Migration__
  - Store persistence versioned with `PERSIST_VERSION=1` and `migrateState()` in `lib/store.ts`.
  - Normalizes legacy state (dates, UI defaults like `explorerWidth=280`, sheet/widget normalization).
  - Unit tests: `tests/store.migrate.test.ts` cover migration from v0 and defaults; `tests/store.import-export.test.ts` ensures roundtrip of `explorerWidth` and defaulting when missing.

- __Workspace Templates: Persistence + UX__
  - Store actions in `lib/store.ts`:
    - `saveTemplate(name, sheetId)` persists a template with kind/title and widgets (IDs stripped).
    - `createSheetFromTemplate(name)` creates a sheet of the template kind and adds widgets with fresh IDs.
  - UI integration:
    - `components/commands/CommandPalette.tsx`: command to "Save Current Sheet as Template…" (prompt), and dynamic commands per saved template to create sheets.
    - `components/editor/PresetPicker.tsx`: lists templates; compute templates inline for freshness, typed with `Widget`.
    - `components/editor/SheetTabs.tsx`: Save Template dialog and template creation via PresetPicker. Fixed `aria-selected` to boolean.
  - Unit tests: `tests/store.templates.test.ts` cover saving templates and creating sheets from them with fresh widget IDs.

- __Core Store Flows & UI__
  - `components/editor/GridCanvas.tsx` renders widgets via `react-grid-layout` and supports selection via `data-widget-id` and `selectedWidgetId` in store.
  - `components/panels/BottomPanel.tsx` exists with tabs: Output, Problems, Terminal; supports collapse/maximize and tab switching through store state.

All unit tests pass (`pnpm test`). Typecheck passes (`pnpm exec tsc --noEmit`).

---

## Remaining Batches/Workstreams

- __Inspector Panel (UI + Store wiring)__
  - Implement a right-side Inspector that reflects `selectedWidgetId`, shows editable properties, and respects `inspectorOpen` in store.

- __E2E Coverage & Selector Stabilization__
  - Add robust Playwright tests for template flows, widget duplication, bottom panel interactions, and command palette actions.
  - Add stable `data-testid` attributes where needed to avoid brittle role/text selectors.

- __Type Safety & Lint Cleanup__
  - Remove `any` in tests where feasible and tighten types around migration inputs. Tidy unused params.

---

## Detailed Implementation Instructions (File-by-File)

Below is a prescriptive list of changes to implement the remaining work. Each bullet references exact files and suggested selectors/props to keep tests stable.

### 1) Inspector Panel

- __Create__: `components/editor/Inspector.tsx`
  - Client component that reads from `useWorkspaceStore()`:
    - `selectedWidgetId`, `sheets`, `activeSheetId`, `inspectorOpen`, and actions: `setInspectorOpen?` (if not present, add to store, see below).
  - When `!inspectorOpen`, render a collapsed narrow strip with a button to open. When open, render a fixed-width panel (e.g., 280px) at the right edge with scrollable content.
  - If `selectedWidgetId` is set, render fields for the selected widget (title, symbol, position/size). Use controlled inputs and call store actions to update.
  - Add stable selectors:
    - Root: `data-testid="inspector"`
    - Toggle button: `data-testid="inspector-toggle"`
    - Field inputs: `data-testid="inspector-title"`, `inspector-symbol"`, etc.

- __Wire into editor layout__: `components/editor/Editor.tsx`
  - Wrap the canvas area in a flex row and mount `<Inspector />` to the right.
  - Ensure responsive behavior so the grid remains usable when the inspector is open.

- __Store additions__: `lib/store.ts`
  - Confirm presence of `inspectorOpen` (it exists in resets). Add actions if missing:
    - `setInspectorOpen(open: boolean)`, `toggleInspector()`, and if needed, `updateWidget(sheetId: string, widgetId: string, patch: Partial<Widget>)` to support inspector edits.
  - Maintain persist version and add migration guard defaults so older states get `inspectorOpen: false`.

- __Optional__: Add a menu/command to toggle Inspector
  - In `components/commands/CommandPalette.tsx`, add a workspace command: "Toggle Inspector" that calls `toggleInspector()`.

### 2) E2E Tests and Selectors

- __Stabilize selectors in UI (non-breaking additive changes)__:
  - `components/editor/SheetTabs.tsx`:
    - Add `data-testid="sheet-tab"` on each tab button, and `data-testid="sheet-tab-close"` on the close button.
  - `components/editor/PresetPicker.tsx`:
    - Add `data-testid="preset-picker"` root, `data-testid="preset-item-{kind}"` for each preset, and `data-testid="template-item"` for templates. Add `data-testid="save-template"` button if present.
  - `components/commands/CommandPalette.tsx`:
    - Add `data-testid="command-palette"` root, `data-testid="command-item"` for each command, and `data-testid="command-search"` for the input.
  - `components/editor/GridCanvas.tsx` & `components/editor/WidgetTile.tsx`:
    - Keep `data-widget-id` on the clickable wrapper (already present). Add `data-testid="widget-duplicate"` on the duplicate action menu item.
  - `components/panels/BottomPanel.tsx`:
    - Add `data-testid="bottom-panel"` root, `data-testid="bottom-toggle"` for collapse, `data-testid="bottom-maximize"` for maximize, and `data-testid="bottom-tab-{name}"` for each tab trigger.

- __Playwright tests__: `tests/e2e/workspace.spec.ts`
  - Add scenarios:
    - __Templates via Command Palette__:
      - Open palette (Cmd/Ctrl+K), run "Save Current Sheet as Template…", confirm prompt (or dialog), then run template command to create a new sheet. Assert a new tab appears and widgets count matches with fresh IDs.
    - __Templates via Preset Picker__:
      - Click "+" (Add Sheet), pick template item, assert new sheet created.
    - __Widget duplication__:
      - Select a widget, trigger duplicate action, assert new widget appears with offset layout and new ID.
    - __Bottom Panel__:
      - Toggle open/close and maximize; switch tabs; assert tab contents visible.
    - __Inspector__ (after implemented):
      - Toggle inspector, select a widget, edit title/symbol, assert changes reflected in tile and store.

- __Playwright config__ (if not already set): `playwright.config.ts`
  - Ensure base URL and test IDs attribute support (default is fine). Consider `use: { trace: 'retain-on-failure' }` for debugging.

### 3) Type Safety and Lint Cleanup

- __Migration typing__: `lib/store.ts`
  - Type the migration input/interface to avoid `any` where used.
  - If a migration function has an unused parameter (e.g., `fromVersion`), rename to `_fromVersion` to satisfy linters.

- __Tests__: `tests/store.templates.test.ts`
  - Replace `as any` in `resetStore()` with a typed helper. Create `tests/utils/testStore.ts` with a `createResetState()` factory matching `WorkspaceState` shape, and import it in tests.

---

## Integration Notes

- All added selectors must be additive (no breaking changes to roles/labels) to keep existing tests stable.
- Keep template persistence under the same storage key (`madlab-templates`) and avoid structural changes in payloads.
- When editing `lib/store.ts`, preserve `PERSIST_VERSION=1` and extend `migrateState()` carefully to default new fields while remaining backward compatible.

---

## Handoff Workflow (You provide raw code, I integrate)

1. You implement code following the file-by-file instructions above.
2. You send me the raw patches or file contents.
3. I integrate changes into the repo and run:
   - `pnpm test`
   - `pnpm exec tsc --noEmit`
   - Optional: Playwright E2E if configured locally
4. I resolve any conflicts, adjust selectors, and ensure the build remains green.

If your original batch numbering differs from the headings above, keep the same concrete file targets and steps; only rename section headings to match your batch IDs. This plan is aligned to the current code and minimizes the risk of regressions.


###### update

I'll assess the completion status of Batch 1 and Batch 2 by examining the current codebase against the requirements specified in those batch documents.

Read file: 5-edits/batch1.md
Now let me examine the current codebase to assess completion status for Batch 1 and Batch 2:

Read file: components/chrome/TitleBar.tsx
Read file: components/chrome/Explorer.tsx
Read file: components/chrome/StatusBar.tsx
Read file: lib/store.ts
Ran tool
Ran tool
Ran tool
Read file: components/editor/WidgetTile.tsx
Ran tool
Ran tool
Ran tool
Read file: components/editor/Inspector.tsx
Read file: app/globals.css
Read file: components/panels/BottomPanel.tsx
Based on my examination of the codebase against the requirements in Batch 1 and Batch 2, here's the current completion status:

## **Batch 1 — VS Code Visual Parity & Chrome Behavior** ❌ **INCOMPLETE**

### **Missing Requirements:**

1. **Keyboard Shortcuts** ❌
   - `Alt+1` to toggle Explorer - **NOT IMPLEMENTED**
   - `Alt+3` to toggle AgentChat - **NOT IMPLEMENTED**

2. **Explorer Resize Handle** ❌
   - Draggable vertical resize handle on Explorer's right edge - **NOT IMPLEMENTED**
   - Explorer currently has fixed width (`w-60` class)

3. **StatusBar Content** ❌
   - Missing active sheet title + widget count on left
   - Missing "Local · Read-Only" + clock on right
   - Current StatusBar shows generic VS Code info (Git branch, encoding, etc.)

4. **TitleBar Theme Toggle** ❌
   - Missing light/dark toggle using ThemeProvider
   - No theme switching functionality

5. **CSS Polish** ❌
   - Missing VS Code dark theme tokens in `globals.css`
   - Current CSS uses generic Tailwind dark theme, not VS Code-specific colors

6. **Persistence** ❌
   - `explorerWidth` exists in store but not applied to Explorer component
   - Explorer width not persisted or resizable

## **Batch 2 — Sheet & Widget Ergonomics** ❌ **INCOMPLETE**

### **Missing Requirements:**

1. **Widget Selection** ❌
   - Click to select widget with `data-selected` attribute - **NOT IMPLEMENTED**
   - Missing 1px #007acc outline when selected
   - No selection state management in WidgetTile

2. **Keyboard Shortcuts** ❌
   - `Cmd/Ctrl+D` to duplicate - **NOT IMPLEMENTED**
   - `Delete/Backspace` to remove - **NOT IMPLEMENTED**
   - `Esc` to clear selection - **NOT IMPLEMENTED**

3. **Inspector Integration** ❌
   - Inspector exists but not integrated with widget selection
   - Missing "Configure" action in widget kebab menu
   - Inspector doesn't open when widget is selected

4. **BottomPanel Logging** ❌
   - Missing selection change logging in Output tab
   - No "Selected widget: <type> (<id>)" messages

## **Summary**

**Both Batch 1 and Batch 2 are significantly incomplete.** The codebase has:

✅ **What's Done:**
- Basic component structure exists
- Store has required state and actions
- Inspector component exists
- Basic widget duplication via menu

❌ **What's Missing:**
- Keyboard shortcuts (Alt+1, Alt+3, Cmd+D, Delete, Esc)
- Explorer resize functionality
- Widget selection system
- VS Code theme integration
- StatusBar content updates
- Inspector-widget integration
- Selection logging

**Estimated Completion:** ~30% for Batch 1, ~25% for Batch 2

The foundation is there, but the interactive behaviors, keyboard shortcuts, and visual polish that make it feel like a real IDE are missing.



####### update 2
