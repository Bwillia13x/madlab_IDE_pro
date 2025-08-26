High-level wiring notes for MAD LAB IDE Pro — phased integration

Feature flags

- Auth: `NEXT_PUBLIC_FEATURE_AUTH=true|false`
- Rate limit: `NEXT_PUBLIC_FEATURE_RATELIMIT=true|false`
- Collaboration: `NEXT_PUBLIC_FEATURE_COLLAB=true|false`, `NEXT_PUBLIC_SYNC_WS_URL=ws://…`
- Marketplace Launch: `NEXT_PUBLIC_FEATURE_MARKETPLACE_LAUNCH=true|false`, `NEXT_PUBLIC_MARKETPLACE_ADMIN=true|false`
- HFT/Aggregator: `NEXT_PUBLIC_FEATURE_HFT=true|false`
- Advanced AI: `NEXT_PUBLIC_FEATURE_ADV_AI=true|false` or runtime toggle via Command Palette
- Docs UI: `NEXT_PUBLIC_FEATURE_DOCS=true|false`

Enterprise wrappers (Phase 1)

- File: `lib/enterprise/withEnterprise.ts`
- Composables: `withAuth`, `withRateLimit`, `withErrorHandling`, `withPerfMetrics`, `compose`
- Used by: `app/api/news/route.ts`, `app/api/historical/route.ts`
- Auth routes: `app/api/auth/login`, `/logout`, `/me`
- Middleware: `middleware.ts` to gate `/api/*` when auth flag is on

Provider UX & init (Phase 2)

- IBKR wiring in `lib/data/init.ts` and UI fields in `components/providers/DataProviderConfig.tsx`
- Palette: provider switchers + clear credentials
- LocalStorage keys: `madlab_*` prefixed (alpha, polygon, alpaca, ibkr)

Collaboration (Phase 3)

- Route: `/collaboration` (flag + WS URL enable live)
- No-op fallback when flags/URL missing
- Palette + ActivityBar entries (flag-gated)

Marketplace Launch (Phase 4)

- Extended `MarketplacePanel` with Creators/Campaigns tabs (flag-gated)
- Singleton launcher: `lib/marketplace/launchInstance.ts` (in-memory seed)
- Admin palette actions (create/activate/pause latest campaign)

Advanced data (Phase 5)

- HFT ingestion from WS in `lib/data/websocketService.ts` (flag-gated)
- Aggregator bridge: `lib/data/aggregatorBridge.ts` started from `DataProvider`
- Widget: `market-ticker-hft`

Advanced AI (Phase 6)

- `PredictiveInsights` extended to show advanced cards when enabled
- Runtime toggle via Command Palette (“Toggle Advanced AI Insights”)

Microstructure (Phase 7)

- Widget: `microstructure` using `lib/market/microstructure.ts`

Docs UI (Phase 8)

- Route: `/docs` to list and read `docs/*.md`
- API: `POST /api/docs/generate` (dev-only)
- Palette entries for open/regenerate (flag-gated)

Reveal routes (Phase 9)

- Palette shortcuts: `/widgets`, `/options`, `/advanced-charting`, `/market`, `/watchlist`, `/presets`, `/screener`, `/options-chain`

Telemetry polish (Phase 10)

- Dashboard shows rate limit/auth/error/perf + HFT throughput and aggregator confidence/symbol counts
- Palette: “Open Telemetry Dashboard” (opens chat panel → Telemetry)

Quick commands (Command Palette)

- Open Settings, Widget Gallery, Marketplace, Docs, Collaboration, Telemetry
- Providers: switch and clear credentials
- Data: refresh/clear caches
- Layout: save/restore/reset/undo/redo
- Advanced: toggle Advanced AI

Rollback tips

- To disable a feature, turn off its flag; modules degrade gracefully
- Remove wrappers by exporting base handlers if needed (keep compose usage localized)
- Registry changes are additive; removing a widget type requires cleaning schema/registry entries

