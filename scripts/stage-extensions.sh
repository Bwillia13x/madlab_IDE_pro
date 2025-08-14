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


