# Production Runbook (MAD LAB Workbench)

This runbook captures operational procedures for running MAD LAB in production.

## Key Endpoints

- Health: `/api/health` — returns provider status, metrics, and DB status (`db: ok|down`)
- Metrics: `/api/metrics` — timers (p50/p90/p99), counters, and error stats
- Market API: `/api/market` — GET (single), POST (batch)
- Streaming:
  - SSE: `/pages/api/stream` (legacy)
  - WebSocket: `/api/stream/ws` (Edge runtime)

## Environment Variables

- `NEXT_PUBLIC_WS_URL`: override default WS endpoint
- `NEXT_PUBLIC_DB_MODE`: set to `db` to use Prisma-backed persistence
- `PRISMA_PROVIDER`: `postgresql` or `sqlite`
- `DATABASE_URL`: Prisma datasource URL
- `MARKET_API_MAX_CACHE`: server-side cache entries cap
- `DISABLE_LIVE_DATA`: set `true` to disable live market data

### Budgets (local targets)

- WS throughput: 50+ msgs/sec sustained (local) with < 1% error rate
- Market API GET p95: < 300ms (mock/local provider), p99 < 800ms under load
- DB CRUD p95: < 200ms (SQLite/Postgres local)

## Deploy Checklist

1. Apply database migrations (when DB mode enabled):
   - `pnpm prisma migrate deploy`
2. Verify health:
   - `curl -s https://<host>/api/health | jq`
3. Verify metrics:
   - `curl -s https://<host>/api/metrics | jq`
4. Verify streaming:
   - Connect a WS client to `wss://<host>/api/stream/ws?symbols=AAPL,MSFT&interval=1000`
5. Run smoke load (optional):
   - `pnpm load:ws` and `pnpm load:market`
6. DB migrations (if DB mode enabled locally):
  - `pnpm prisma generate && pnpm prisma migrate deploy`

## Scaling & Performance

- Prefer WS for high-throughput streaming (set user Settings to `websocket`).
- SSE and polling fallbacks remain available in degraded environments.
- Adjust server cache using `MARKET_API_MAX_CACHE`.
- Use CDN caching for `GET /api/market?type=prices`.

## Observability

- Tracing is enabled opportunistically via `@opentelemetry/api` if present.
- Server counters cover WS connections, messages, subscriptions, and errors.
- Use `/api/metrics` snapshot for dashboards and alerts.

## Incident Response

- Verify `/api/health` and `/api/metrics` first to identify layer (provider, DB, WS).
- Toggle `DISABLE_LIVE_DATA=true` during upstream outages to protect UX.
- Switch users to `polling` mode from the Settings panel when streaming is unstable.
- Clear server cache if stale data suspected (redeploy or restart).

## Backups & Persistence

- Templates and workspaces are stored in DB when `NEXT_PUBLIC_DB_MODE=db`.
- Schedule regular DB backups (RPO ≤ 24h recommended).

## Security & Privacy

- No PII stored by default; respect user privacy in optional error reporting integrations.
- Enforce HTTPS and `wss://` in production.
