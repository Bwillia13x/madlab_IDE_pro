## Data Providers

MAD LAB supports runtime switching between data sources:

- mock: deterministic synthetic data (offline/demo)
- extension: live data proxied by the VS Code extension (secrets in SecretStorage)

### Initialization

- `components/providers/DataProvider.tsx` calls `initializeDataProviders()` on startup
- `lib/data/init.ts` registers `mock` and `extension`, defaulting to `mock`

### Switching

- Store holds `dataProvider` and exposes `setDataProvider(name)`
- UI entry points:
  - Status bar button (data-testid="provider-toggle")
  - Command Palette command: Toggle Data Provider

### Validation

- Adapters parse responses via `lib/data/schemas.ts` (Zod)
- Errors surface into hooks as user-friendly messages

### Health panel

- Open from the Status Bar info button next to the provider label.
- Shows current provider, availability (healthy / degraded / down), last check, error count.
- Actions: Retry health check, Switch provider, Open settings (future stub).
- Health check runs on open and on Retry; heavy polling is avoided.

### Extension contract

- The webview bridge exposes `request(type, payload)`
- Implemented request types: `data:prices`, `data:kpis`, `data:financials`, `data:vol`
- CSP/nonce enforced; webview never sees API keys


