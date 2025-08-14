#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VS_DIR="$ROOT_DIR/vscode"

echo "[stage-extensions] Staging built-in MadLab extension into Code-OSS..."

if [ ! -d "$VS_DIR" ]; then
  echo "[stage-extensions] Skipping: Code-OSS submodule not found at $VS_DIR"
  exit 0
fi

EXT_SRC="$ROOT_DIR/extensions/madlab"
EXT_DST="$VS_DIR/extensions/madlab"

# Ensure webview bundle exists
if [ ! -f "$EXT_SRC/media/main.js" ]; then
  echo "[stage-extensions] webview bundle missing: $EXT_SRC/media/main.js"
  exit 1
fi

rm -rf "$EXT_DST"
mkdir -p "$EXT_DST"
# include compiled JS in out/ and web assets
rsync -a --exclude node_modules --exclude .git "${EXT_SRC}/" "$EXT_DST/"

echo "[stage-extensions] Done."

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
SRC_EXT="${ROOT_DIR}/extensions/madlab"
DST_EXT="${ROOT_DIR}/vscode/extensions/madlab"

if [[ ! -d "${SRC_EXT}" ]]; then
  echo "[stage-extensions] Error: ${SRC_EXT} missing."
  exit 1
fi

rm -rf "${DST_EXT}"
mkdir -p "${DST_EXT}"
cp -R "${SRC_EXT}/"* "${DST_EXT}/"

echo "[stage-extensions] Staged built-in extension to ${DST_EXT}"


