# Widgets Platform Audit

## Expected
- Central `WidgetRegistry` describing `kind`, `title`, `version`, `propertySchema` and `runtime.component`.
- Inspector auto-forms derived from Zod schema per widget; no per-widget bespoke forms.
- Migration versioning for persisted widgets with tests.

## Found
- `components/editor/WidgetTile.tsx` imports `@/lib/widgets/registry`, `coreWidgets`, and `schema` (missing). Fallback shows "Unknown widget".
- Inspector uses `AutoForm` (`@/lib/ui/AutoForm`, missing). Current inspector falls back to a simple `{ symbol?: string }` schema inline.
- Persistence has `version` on each widget and `migrateState` handles base coercions, but no per-widget migrations present.

## Impact
- Build/typecheck failures; no schema-driven registry; inspector cannot render auto-forms.

## Fixes (proposed stubs)
- Add `lib/widgets/schema.ts`: base `WidgetProps` and helper types.
- Add `lib/widgets/registry.ts`: minimal in-memory registry with `registerWidget`, `getSchemaWidget`.
- Add `lib/widgets/coreWidgets.ts`: register core widgets (`kpi-card`, `dcf-basic`, `var-es`, etc.) mapping to existing components and a basic property schema (e.g., `{ symbol?: z.string() }`).
- Add `lib/ui/AutoForm.tsx`: minimal Zod-to-form component supporting string/number/enum; used by Inspector until a richer form generator is added.
- Add tests to assert a widget can be registered and resolved by type, and inspector renders inputs from schema.