# Message Schema (Panel ↔ Extension)

- INIT (ext → webview)
  - payload: { version: string; defaultModel?: DcfInput }
- LOAD_MODEL (either direction)
  - payload: DcfInput
- CALC (webview → ext)
  - payload: DcfInput
- RESULT (ext → webview)
  - payload: DcfResult
- ERROR (ext → webview)
  - error: string

Example CALC payload:

```json
{
  "type": "CALC",
  "payload": {
    "fcf0": 100,
    "growth": 0.03,
    "wacc": 0.1,
    "horizon": 5,
    "terminalMultiple": 12,
    "shares": 100
  }
}
```
