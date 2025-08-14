Param(
  [string]$ArtifactsDir = ".build"
)

if (!(Test-Path -Path $ArtifactsDir)) {
  Write-Error "Artifacts directory not found: $ArtifactsDir"
  exit 1
}

Write-Host "Generating SHA256 checksums in $ArtifactsDir"

Get-ChildItem -Path $ArtifactsDir -Recurse -Include *.zip, *.tar.gz, *.dmg, *.exe, *.AppImage | ForEach-Object {
  $file = $_.FullName
  $hash = Get-FileHash -Path $file -Algorithm SHA256
  $outPath = "$file.sha256"
  "$($hash.Hash)  $file" | Out-File -FilePath $outPath -Encoding ascii
  Write-Host "checksum: $outPath"
}

Write-Host "Release assets prepared."


