# Local Packaging Repro

Run these from repo root on macOS (arm64):

```bash
./scripts/build-extensions.sh
./scripts/stage-extensions.sh
./scripts/stage-branding.sh
(cd vscode && yarn gulp vscode-darwin-arm64-min)
ls -la vscode/.build/*/resources/app/extensions | grep madlab
jq '.nameShort,.extensionsGallery' $(echo vscode/.build/*/resources/app/product.json)
```

If you hit permission issues:

```bash
chmod +x scripts/*.sh
```
