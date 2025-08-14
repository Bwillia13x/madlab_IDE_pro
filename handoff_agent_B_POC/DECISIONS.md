# Decisions & Next Steps

- Next native views (top 3):
  1. Watchlist panel (native TreeView + inline details)
  2. Fundamentals inspector (native WebviewView)
  3. Scenario runner (batch recompute UI)

- Indexing timing: defer until core lands; index .mlab.json on idle using workspace FS events.
- Settings model: use `vscode.WorkspaceConfiguration` (namespaced `madlab.*`) for defaults (e.g., WACC/growth presets).
