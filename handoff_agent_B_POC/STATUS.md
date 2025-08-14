# Agent B POC Panel Status

- Views shipped: activity container `madlab`, WebviewView `madlab.financePanel`, TreeView `madlab.models`.
- Commands: `madlab.open`, `madlab.newModel`.
- Flow: Open command palette → "MadLab: Open Finance Panel" → panel appears. Use "MadLab: New Model" to create a sample .mlab.json; selecting a model in the tree loads it into the panel. Edit inputs and press Calculate to compute DCF locally (shim).
- CSP: Strict meta uses nonce + `webview.cspSource`; `connect-src 'none'`; all assets via `asWebviewUri`.
- Error/empty states: Unknown messages logged; invalid inputs get inline error + aria-invalid; empty workspace shows empty Models list.
