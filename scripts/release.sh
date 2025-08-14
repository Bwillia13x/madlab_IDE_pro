#!/usr/bin/env bash
set -euo pipefail

# Usage: scripts/release.sh <artifacts_dir>

ARTIFACTS_DIR=${1:-".build"}

if [ ! -d "$ARTIFACTS_DIR" ]; then
  echo "Artifacts directory not found: $ARTIFACTS_DIR" >&2
  exit 1
fi

echo "Generating SHA256 checksums in $ARTIFACTS_DIR"
find "$ARTIFACTS_DIR" -type f \( -name "*.zip" -o -name "*.tar.gz" -o -name "*.dmg" -o -name "*.exe" -o -name "*.AppImage" \) | while read -r file; do
  shasum -a 256 "$file" > "$file.sha256"
  echo "checksum: $file.sha256"
done

echo "Release assets prepared."


