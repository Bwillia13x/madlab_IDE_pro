## Agent (MVP)

The MVP agent runs locally without cloud keys and can optionally call an LLM via the extension.

Flow

- UI panel: `components/panels/AgentChat.tsx`
- Runtime: `lib/agent/runtime.ts` (intent inference, optional LLM plan)
- Tools: `lib/agent/tools.ts` (workspace operations and data fetch triggers)

Supported intents (examples)

- "new valuation sheet" → add_sheet(kind:"valuation")
- "line chart for AAPL (6M)" → add_widget(type:"line-chart", props:{ symbol, range })
- "open inspector" → open_inspector()

Optional LLM

- The extension exposes `agent:llm` proxy to OpenAI when a key is stored in SecretStorage
- When available, runtime prefers the LLM plan; otherwise falls back to local patterns


## Testing helpers and events

This app exposes a small set of testing hooks when running E2E to make end-to-end tests deterministic and flake-resistant.

### Window helpers

- `window.madlab.addSheetByKind(kind: SheetKind)`: creates a new sheet from presets and populates widgets (no UI interaction).

### DOM Events (dispatch from tests)

- `madlab:add-sheet` with `{ detail: { kind: SheetKind } }`: identical to calling `addSheetByKind`.
- `madlab:set-provider` with `{ detail: { provider: 'mock' | 'extension' } }`: asks the app to switch data provider. When switching to `extension`, test-mode will set `data-extension-bridge` and optimistically synchronize the status bar label.

### Test-mode gate

Enable deterministic behavior by visiting `/?e2e=1` or running under WebDriver. In test-mode the app will:

- Auto-surface `data-extension-bridge` when an extension bridge object exists.
- Auto-create a `valuation` sheet on first load if no sheets exist.
- Reduce animations and increase certain internal expect timeouts.

These behaviors are gated behind WebDriver/query checks and do not affect user-facing UX.

### Provider bridging in the DOM

- When an extension bridge is available, the root `<html>` element includes `data-extension-bridge="true"`.
- The Status Bar provider button has `data-testid="provider-toggle"` and mirrors the current label via `data-provider-label`.


