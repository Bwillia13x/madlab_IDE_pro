#!/usr/bin/env bash
set -euo pipefail

# Placeholder notarization script for macOS DMG/ZIP artifacts.
# Requires the following env vars when enabled:
#   APPLE_ID, APPLE_TEAM_ID, APPLE_APP_SPECIFIC_PASSWORD

ARTIFACT_PATH=${1:-}

if [ -z "${ARTIFACT_PATH}" ]; then
  echo "Usage: $0 <artifact.(dmg|zip)>" >&2
  exit 1
fi

if [ -z "${APPLE_ID:-}" ] || [ -z "${APPLE_TEAM_ID:-}" ] || [ -z "${APPLE_APP_SPECIFIC_PASSWORD:-}" ]; then
  echo "Notarization skipped: missing APPLE_ID/APPLE_TEAM_ID/APPLE_APP_SPECIFIC_PASSWORD" >&2
  exit 0
fi

echo "Submitting $ARTIFACT_PATH for notarization..."
xcrun notarytool submit "$ARTIFACT_PATH" \
  --apple-id "$APPLE_ID" \
  --team-id "$APPLE_TEAM_ID" \
  --password "$APPLE_APP_SPECIFIC_PASSWORD" \
  --wait

echo "Stapling ticket..."
xcrun stapler staple "$ARTIFACT_PATH"
echo "Notarization completed."


