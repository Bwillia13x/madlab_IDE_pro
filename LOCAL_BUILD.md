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

## Troubleshooting

- jq missing: `brew install jq` (macOS) or `sudo apt-get install -y jq` (Linux)
- Submodule not initialized: `git submodule update --init --recursive`
- Gulp task errors in `vscode/`: ensure `corepack enable && (cd vscode && yarn --frozen-lockfile)` first
- Extension not present in packaged app: rerun `./scripts/build-extensions.sh` before `./scripts/stage-extensions.sh` and packaging
