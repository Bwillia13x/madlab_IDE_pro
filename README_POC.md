# MadLab Studio POC

This is a proof-of-concept to build a downloadable desktop IDE from a Code-OSS fork, with a built-in MadLab extension and a shared `@madlab/core` TypeScript library.

## Scope
- Open VSX integration only (no MS Marketplace).
- No remote URLs in Webviews; all assets via `asWebviewUri` and strict CSP.
- No local HTTP servers for core UX.
- Reproducible CI artifacts for macOS/Windows/Linux. One platform signing optional.

## Install (POC artifacts)
1. Download the artifact for your OS from CI.
2. Verify checksum (`*.sha256`).
3. Unpack and run the app.

## Checksums
`scripts/release.sh` and `scripts/release.ps1` generate SHA256 sums for staged artifacts.

## Known Issues
- Auto-update is out of scope.
- Notarization/Signing only provided if secrets are available in CI.


