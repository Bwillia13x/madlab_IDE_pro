# Performance Review

## Budgets (guardrail)
- JS bundle < 3 MB gzip, CSS < 500 KB gzip
- Current: build failed → sizes not computed. Prior docs indicate ~412 KB JS / 9.9 KB CSS (gzip) in a previous run.

## Opportunities
- Lazy-load heavy widgets (charts, options, risk) via dynamic imports; tree-shake Recharts subset.
- Ensure memoization of transforms in widgets; avoid recreating scales/formatters unnecessarily.
- Use `next/script` with `strategy="lazyOnload"` only if needed in the static export (mostly not required).

## Actions
- After fixing build, add a `size-limit` config and `pnpm size` script; wire into CI.
- Split vendor chunks where possible; verify no large polyfills included with Next 13.5.1.