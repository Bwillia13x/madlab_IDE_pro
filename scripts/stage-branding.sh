#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VS_DIR="$ROOT_DIR/vscode"

if [ ! -d "$VS_DIR" ]; then
  echo "[stage-branding] Skipping: Code-OSS submodule not found at $VS_DIR"
  exit 0
fi

echo "[stage-branding] (placeholder) Branding staging done."

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
VSCODE_RES="${ROOT_DIR}/vscode/resources"
BRANDING_ICONS="${ROOT_DIR}/branding/icons"

if [[ ! -d "${VSCODE_RES}" ]]; then
  echo "[stage-branding] Error: ${VSCODE_RES} not found." >&2
  exit 1
fi

if [[ ! -d "${BRANDING_ICONS}" ]]; then
  echo "[stage-branding] Warning: ${BRANDING_ICONS} not found; creating placeholder."
  mkdir -p "${BRANDING_ICONS}"
fi

mkdir -p "${VSCODE_RES}/darwin" "${VSCODE_RES}/win32" "${VSCODE_RES}/linux"

for target in darwin win32 linux; do
  if compgen -G "${BRANDING_ICONS}/${target}/*" > /dev/null; then
    cp -R "${BRANDING_ICONS}/${target}/"* "${VSCODE_RES}/${target}/"
  fi
done

echo "[stage-branding] Copied icons into vscode/resources/{darwin,win32,linux}"


