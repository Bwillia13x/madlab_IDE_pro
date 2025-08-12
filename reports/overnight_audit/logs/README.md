Logs captured during the overnight audit:

- env.log — Node/pnpm versions
- install.log — pnpm install output
- typecheck.log — TypeScript diagnostics and EXIT_CODE
- lint.log — ESLint output
- unit.log — Vitest output and EXIT_CODE
- dev.log — Next.js dev server boot for E2E
- e2e.log — Playwright output and EXIT_CODE

Traces directory is reserved under `../traces/` for Playwright traces if enabled.