# MAD LAB VS Code Extension

Development:

- Build webview: pnpm build:webview
- Compile extension: pnpm --filter @madlab/extension build
- Debug: F5 with "Run MAD LAB Extension" launch config, then run command "MAD LAB: Open Workbench".

Packaging:

- Package VSIX locally:
 	- pnpm -w build
 	- pnpm dlx vsce package --no-dependencies --out madlab-extension.vsix (from apps/extension)
- Install VSIX in VS Code: Extensions panel → … menu → Install from VSIX…
- CI packaging: push a semver tag (vX.Y.Z); see .github/workflows/package-extension.yml
