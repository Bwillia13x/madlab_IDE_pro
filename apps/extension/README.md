# MAD LAB VS Code Extension

Development:

- Build static web app: pnpm build:web (creates /out)
- Compile extension: pnpm --filter @madlab/extension build
- Debug: F5 with "Run MAD LAB Extension" launch config, then run command "MAD LAB: Open Workbench".

Notes:

- The extension loads the static export from your workspace's `/out/index.html` using `asWebviewUri`.
- Ensure you open the repo folder in VS Code so the extension can resolve `/out`.

Packaging:

- Package VSIX locally:
  - pnpm -w build
  - pnpm --filter @madlab/extension package
- Install VSIX in VS Code: Extensions panel → … menu → Install from VSIX…
  - CI packaging: push a semver tag (vX.Y.Z); see .github/workflows/package-extension.yml
