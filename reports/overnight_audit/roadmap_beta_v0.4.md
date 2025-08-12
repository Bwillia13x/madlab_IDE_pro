# Roadmap to Beta v0.4

## Fast-Path (This Week)

### Batch FP-1: Restore Data Layer (Providers + Hooks)
- Objective: Unblock typecheck/tests/build by adding minimal provider registry, schemas, hooks.
- Files to add:
  - `lib/data/provider.types.ts`
  - `lib/data/schemas.ts`
  - `lib/data/providers.ts`
  - `lib/data/init.ts`
  - `lib/data/hooks.ts`
- Files to edit:
  - `lib/data/adapters/mock.ts` (fix imports)
  - `lib/store.ts` (ensure dynamic import path aligns)
- Tests:
  - `tests/data.mock.test.ts` passes with async/determinism checks.
- Acceptance:
  - `pnpm typecheck` green; `pnpm test` green (data tests).
- Effort: M, Risk: Low, Owner: FE+TS
- Rollback: Remove added files; revert import changes.

### Batch FP-2: Widget Registry + Inspector AutoForm
- Objective: Restore schema-driven widgets and inspector editing.
- Files to add:
  - `lib/widgets/schema.ts`
  - `lib/widgets/registry.ts`
  - `lib/widgets/coreWidgets.ts`
  - `lib/ui/AutoForm.tsx`
- Files to edit:
  - `components/inspector/Inspector.tsx` (use `AutoForm` from new path)
  - `components/editor/WidgetTile.tsx` (leave imports; they resolve)
- Tests:
  - Add simple test to register and resolve a dummy widget; inspector renders fields.
- Acceptance:
  - `pnpm build` succeeds; E2E server boots; widget shows with inspector form.
- Effort: M, Risk: Medium, Owner: FE
- Rollback: Remove new modules; revert import usage.

### Batch FP-3: E2E Server Boot Stability
- Objective: Fix EADDRINUSE during Playwright `webServer`.
- Actions:
  - Ensure no pre-start dev server in CI; rely on Playwright `webServer` only.
  - If needed, change `playwright.config.ts` to `reuseExistingServer: false` in CI and randomize port via env.
- Acceptance:
  - `pnpm e2e` runs locally; Playwright starts/stops server.
- Effort: S, Risk: Low

## Near-Term (Next 2 Weeks)

### Batch NT-1: Analytics Engines (DCF, VaR/ES)
- Add `lib/quant/dcf.ts` and `lib/quant/risk.ts` with tested, deterministic implementations.
- Connect `VarEs` and DCF widgets to these engines via hooks/utilities.
- Acceptance: Unit tests cover fixtures; widget displays match expected values.
- Effort: M, Risk: Medium (math correctness)

### Batch NT-2: Size Budgets + Perf
- Add `size-limit` config and `pnpm size`; add CI gate.
- Lazy-load heavy widgets and tree-shake Recharts.
- Acceptance: gz JS < 3 MB; CSS < 500 KB.
- Effort: S, Risk: Low

### Batch NT-3: Security Tests
- Add test to assert CSP meta and `nonce` on script tags in webview HTML.
- Add greps for secrets in CI.
- Effort: S, Risk: Low

## Beta Gate (Release)

### Batch BG-1: Packaging and Smoke
- Ensure `pnpm -w build` green; `vsce package` succeeds.
- Add smoke test for webview message handshake.
- Effort: S, Risk: Low

### Batch BG-2: Docs and UX Polish
- Replace hard-coded hexes with tokens; add a11y improvements and labels.
- Update README with provider selection and demo mode behavior.
- Effort: S, Risk: Low

## Apply Instructions
- Apply diffs under `reports/overnight_audit/patches/`:
```bash
git apply reports/overnight_audit/patches/<file>.diff
```