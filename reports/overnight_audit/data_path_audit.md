# Data Path Audit

## Expected
- Provider registry: `setDataProvider(provider)`, `getDataProvider()` and initialization.
- Hooks: `usePrices(symbol, range)`, `useKpis(symbol)`, `useDataCache()` returning `{ data, isLoading|loading, error }` and cache control.
- Adapters: `mock`, `alphaVantage`, `yahoo` (at least mock for demo).
- Shared types and Zod schemas for adapter boundaries.

## Found
- UI wrapper: `components/providers/DataProvider.tsx` referencing `initializeDataProviders` and `setDataProvider`.
- Mock adapter exists: `lib/data/adapters/mock.ts` with deterministic generators but missing:
  - `../provider.types` and `../schemas` imports.
- Store-level methods: `lib/store.ts` dynamically imports `./data/providers` in `setDataProvider` (file missing).
- Hooks referenced in `components/widgets/KpiCard.tsx`: `useKpis`, `useDataCache` (not present under `lib/data/hooks`).

## Impact
- Typecheck/build/tests fail; widgets cannot fetch or display data; E2E blocked.

## Fixes (proposed stubs)
Create minimal data layer under `lib/data/`:
- `lib/data/provider.types.ts`: define `Provider`, `PriceRange`, `PricePoint`, `KpiData`, `FinancialData`.
- `lib/data/schemas.ts`: Zod schemas `zPriceSeries`, `zKpiData`, `zFinancials`.
- `lib/data/providers.ts`: in-memory registry with `setDataProvider`, `getDataProvider`, `getProvider`, register `mock`.
- `lib/data/init.ts`: `initializeDataProviders()` registering mock.
- `lib/data/hooks.ts`: `useKpis`, `usePrices`, `useDataCache` using `getProvider()` and React state with simple cache.
Update imports in `mock.ts` to new relative paths.

These stubs unblock typecheck and unit tests while preserving deterministic behavior for demo mode.