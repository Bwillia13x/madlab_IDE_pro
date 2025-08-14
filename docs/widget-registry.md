# Widget Registry

Widgets are registered via a lightweight, schema-driven registry in `lib/widgets`.
Legacy manifest-based registration has been removed. Author widgets using schema definitions only.

- Register core widgets at runtime: `registerCoreWidgets()` from `lib/widgets/coreWidgets.ts`
- Each widget definition provides:
  - meta: type, name, category, description
  - runtime: component (often lazy-loaded via `getLazyWidget(name)`)
  - optional `meta.configSchema` (Zod) for Inspector auto-forms
- Grid renders widgets by type using the registry (see `components/editor/WidgetTile.tsx`).

## Adding a widget

1) Create a component in `components/widgets/YourWidget.tsx`
2) Export a definition: `export const YourWidgetDefinition = { meta, runtime }`
3) Register it in `lib/widgets/coreWidgets.ts` using `registerSchemaWidget(YourWidgetDefinition)`

## Authoring schema-first widgets

- Define `meta` with `type`, `name`, `category`, `version`, and a Zod `configSchema`
- Provide `runtime.component` as a React component; prefer lazy via `getLazyWidget('YourWidget')`
- Use `getSchemaWidget(type)` to read definitions and render via `components/editor/WidgetTile.tsx`

## Versioning

- Store persists: type, title, layout, props, version
- Start at `version: 1` and bump when breaking props changes are introduced
