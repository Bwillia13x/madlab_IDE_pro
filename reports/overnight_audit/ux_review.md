# UX and A11y Review

## Flows exercised
- Create sheet → add preset widgets → select widget → open Inspector → edit symbol → duplicate/remove → toggle panels.

## Findings
- Visual hierarchy and VS Code-inspired chrome are consistent; however multiple widgets use hard-coded hex colors instead of tokens.
- Inspector relies on missing `AutoForm`, blocking property editing beyond title/symbol.
- Focus indicators rely on default browser styles; keyboard navigation is basic.
- Demo mode banner present when provider is `mock`.

## Prioritized defects
1. Replace hard-coded hex colors in widgets with theme tokens (Tailwind CSS variables), especially in `VarEs`, `DcfBasic`, `KpiCard`.
2. Restore Inspector auto-form via `lib/ui/AutoForm` and per-widget Zod schema.
3. Ensure actionable controls have labels and `aria-*` attributes (icon-only buttons already have titles in many places; audit all)
4. Add keyboard shortcuts for panel toggles and sheet actions; ensure focus management when opening Inspector.

## Suggested code edits
- Introduce CSS variables mapping to `vscode-*` tokens and replace hex occurrences.
- Create `AutoForm` minimal implementation for `string|number|enum` types.
- Add `aria-label` to icon-only `Button`s that currently lack descriptive text.