### Extension architecture

The VS Code extension acts as the orchestrator, with strict CSP and a modular route system.

- Entry: `apps/extension/src/extension.ts`
  - Creates the webview, injects CSP nonce and bridge script, and delegates all messages to the routes map.
  - Unknown message types are logged but not handled.

- Routes composition: `apps/extension/src/routes.ts`
  - Consolidates individual route modules:
    - `routes/system.ts`: `llm:available`, `webview:ready`, `ping`
    - `routes/workspace.ts`: `workspace:get`, `workspace:sync`
    - `routes/files.ts`: `file:open`, `file:save`
    - `routes/data.ts`: `data:*` endpoints (prefers AlphaVantage with key, falls back to mock adapter)
    - `routes/agent.ts`: `agent:*` mock endpoints
  - Shared type: `routes/types.ts` (`RouteHandler`)

- Data adapters: `apps/extension/src/data-adapters/` (mock and AlphaVantage)
  - Keep CSP strict; do not widen `connect-src` beyond `https:` and the webview source.

Development notes
- Keep `extension.ts` minimal (webview and dispatcher only).
- Prefer adding new routes as separate modules under `routes/` and composing them in `routes.ts`.
- Avoid exposing secrets to the webview; use the host-side route handlers to call external services.


