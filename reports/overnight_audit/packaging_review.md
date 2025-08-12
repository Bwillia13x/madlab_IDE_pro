# Packaging Review

## Static Web Demo
- Next.js `output: 'export'` configured; `npm run build` produces `out/`.
- Extension build script copies `out/` to `apps/extension/dist/webview`.
- Demo mode banner shown when dataProvider is `mock`.

## VS Code Extension
- `apps/extension/package.json` has `build` and `package` scripts.
- CI packaging workflow exists for tags `v*.*.*`.
- `contributes.commands` include workbench open and SecretStorage key commands.

## Gaps
- Build currently fails due to missing modules → VSIX packaging would fail.
- No explicit validation of `icon` size or marketplace metadata.

## Recommendations
- Fix missing modules and ensure build succeeds; then validate `vsce package` locally.
- Add an integration smoke test that opens the webview in a stub VS Code environment and asserts `extension:ready` message is received.