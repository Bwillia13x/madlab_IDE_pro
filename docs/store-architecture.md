### Store architecture

This app uses a single Zustand store composed from domain-focused slices. The goal is clarity, testability, and incremental refactors without changing behavior or the public API.

Slices live under `lib/store/slices/` and are folded together in `lib/store.ts` using the same action names as before. Existing components and tests continue to work unchanged.

- `uiSlice` (`lib/store/slices/uiSlice.ts`):
  - UI state and actions such as `toggleExplorer`, `setActiveBottomTab`, inspector visibility, onboarding celebration, and skill level.

- `sheetSlice` (`lib/store/slices/sheetSlice.ts`):
  - Sheet lifecycle and preset helpers: `addSheet`, `closeSheet`, `setActiveSheet`, `updateSheetTitle`, `populateSheetWithPreset`, `getPresetWidgets`.

- `widgetSlice` (`lib/store/slices/widgetSlice.ts`):
  - Widget CRUD and layout: `setSelectedWidget`, `addWidget`, `updateWidget`, `removeWidget`, `duplicateWidget`, `updateLayout`.

- `templateSlice` (`lib/store/slices/templateSlice.ts`):
  - Template storage in `localStorage`: `getTemplates`, `saveTemplate`, `createSheetFromTemplate`, `deleteTemplate`, `renameTemplate`.

- `providerSlice` (`lib/store/slices/providerSlice.ts`):
  - Data provider activation and availability checks: `setDataProvider`, `getDataProvider`.

- `chatSlice` (`lib/store/slices/chatSlice.ts`):
  - Chat history helpers: `addMessage`, `clearMessages`.

- `coreSlice` (`lib/store/slices/coreSlice.ts`):
  - Initialization lifecycle and import/export helpers: `setInitializationPhase`, `completeHydration`, `isReady`, `safeUpdate`, `persist` (no-op), `hydrate`, `exportWorkspace`, `importWorkspace`.

The root store (`lib/store.ts`) still defines the state shape and migrations, wires slices, and applies persistence middleware. Persisted schema version remains `PERSIST_VERSION = 1`.

### Extending the store

1) Choose the appropriate slice for your concern; if none fits, add a new slice in `lib/store/slices/` with a minimal surface.
2) Keep action names and behavior stable; do not change the public API from components/tests.
3) Avoid side effects in slice constructors; use `get` and `set` only.
4) When adding persisted fields, update migration logic in `lib/store.ts` and bump the persisted version if the shape changes.
5) Add or update tests close to the affected domain. Keep changes incremental and green.


