#!/usr/bin/env bash
set -euo pipefail

# Merge branding/product.json into vscode/product.json using jq deep merge
# Usage: scripts/patch-product.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
VSCODE_PRODUCT="${ROOT_DIR}/vscode/product.json"
BRANDING_PRODUCT="${ROOT_DIR}/branding/product.json"
BACKUP_PRODUCT="${ROOT_DIR}/vscode/product.base.json"

if ! command -v jq >/dev/null 2>&1; then
  echo "[patch-product] Error: jq is required." >&2
  exit 1
fi

if [[ ! -f "${VSCODE_PRODUCT}" ]]; then
  echo "[patch-product] Error: ${VSCODE_PRODUCT} not found. Did you init the submodule?" >&2
  exit 1
fi

if [[ ! -f "${BRANDING_PRODUCT}" ]]; then
  echo "[patch-product] Error: ${BRANDING_PRODUCT} not found." >&2
  exit 1
fi

cp "${VSCODE_PRODUCT}" "${BACKUP_PRODUCT}"

# Deep merge: branding overrides base
jq -s '.[0] * .[1]' "${BACKUP_PRODUCT}" "${BRANDING_PRODUCT}" > "${VSCODE_PRODUCT}.tmp"
mv "${VSCODE_PRODUCT}.tmp" "${VSCODE_PRODUCT}"

echo "[patch-product] Patched ${VSCODE_PRODUCT} with branding/product.json"


