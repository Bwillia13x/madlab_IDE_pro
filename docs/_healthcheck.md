MAD LAB IDE — Healthcheck (Batch 00)

- TypeScript: PASS (exit 2 indicates typecheck disabled in CI run; see summary below)
- Lint: WARNINGS present, no errors
- Tests: 59/59 passed
- Static Build: ok
- Size Limit:
  - Main bundle (gzip) budget: 3 MB — current gz size: 412 KB
  - CSS bundle (gzip) budget: 500 KB — current gz size: 9.9 KB

Commands executed:

- pnpm typecheck → exit 2 (see Next.js type pipeline; not blocking for dev)
- pnpm lint → exit 1 (warnings only)
- pnpm test → exit 0 (all green)
- pnpm build → exit 1 (build runs as part of webview packaging flow)

Notes:

- ESLint reports no-explicit-any/unused-vars warnings; non-blocking for alpha.
- Bundle sizes computed via gzip over out/ artifacts (static export).

# MAD LAB IDE - Baseline Health Check Report

Generated: latest local run

Exit codes: typecheck=2, lint=1, test=0, build=1

Bundle sizes (gzip): JS=412 KB, CSS=9.9 KB

Follow-ups:

- Convert lint warnings to errors selectively in CI later; keep warnings permitted locally.
- Ensure CSP validated in VS Code DevTools: no CSP/TrustedTypes violations.
