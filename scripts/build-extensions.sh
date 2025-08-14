#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
EXT_DIR="${ROOT_DIR}/extensions/madlab"

if [[ ! -d "${EXT_DIR}" ]]; then
  echo "[build-extensions] Error: ${EXT_DIR} not found" >&2
  exit 1
fi

cd "${EXT_DIR}"

if command -v pnpm >/dev/null 2>&1; then
  pnpm install --frozen-lockfile || pnpm install
  pnpm run build
elif command -v npm >/dev/null 2>&1; then
  npm ci || npm install
  npm run build
else
  echo "[build-extensions] Error: pnpm or npm is required to build the extension." >&2
  exit 1
fi

echo "[build-extensions] Built MadLab extension."


