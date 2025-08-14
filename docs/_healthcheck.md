MAD LAB IDE — Healthcheck (Batch 00)

- TypeScript: PASS
- Lint: PASS
- Tests: PASS
- Static Build: PASS
- Size Limit: TIMEOUT (local headless Chrome not available in this run)

Commands executed:

- pnpm typecheck → exit 0
- pnpm lint → exit 0
- pnpm test → exit 0 (all green)
- pnpm build → exit 0
- pnpm size → exit 1 (Chrome launch timeout; see below)

Notes:

- Size limit previously measured: JS ≈ 451 kB gzip, CSS ≈ 10.3 kB gzip (under budgets). In this run, the timing phase failed to launch headless Chrome and returned exit 1; treat as environment flake rather than a size regression.
- CSP/nonce hardened in the extension; no CSP violations observed during manual runs.
 - E2E: On flake investigations, set TRACE_ALL=1 in CI or local runs to capture full Playwright traces for every test.
  - Or use the new script: `pnpm e2e:trace`.

# MAD LAB IDE - Baseline Health Check Report

Generated: latest local run

Exit codes: typecheck=0, lint=0, test=0, build=0, size=1

Bundle sizes (gzip): JS≈451 kB (last successful run), CSS≈10.3 kB (last successful run)

Follow-ups:

- Stabilize size-limit in CI (ensure a headless Chromium is available); keep budgets JS<3 MB, CSS<500 kB.
- Keep verifying CSP in VS Code DevTools; no TrustedTypes violations.
