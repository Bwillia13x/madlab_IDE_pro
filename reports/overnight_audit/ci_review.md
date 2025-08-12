# CI Review

Workflows inspected:
- `.github/workflows/ci.yml`
- `.github/workflows/package-extension.yml`
- `.github/workflows/size-check.yml` (manually attached variant mentions `pnpm size`, but no `size` script exists in repo)

## Current Gates
- Install with pnpm
- Lint
- Typecheck
- Build (web + extension)
- Install Playwright browsers
- Unit tests
- E2E tests

## Gaps
- No bundle size gating (no `size-limit` or `pnpm size` script in `package.json`).
- Typecheck and build currently fail due to missing modules; CI would be red until stubs added.
- No upload of Playwright traces/artifacts to CI for failed E2E.

## Recommendations
- Add bundle size check using `size-limit` or `rollup-plugin-visualizer` and wire `pnpm size` to CI.
- Add artifact upload for `playwright-report` and trace archives.
- Cache Playwright browsers across runs where possible.
- Add a separate workflow to package VSIX only on tags (already present), ensure icon and contributes metadata verified by vsce.