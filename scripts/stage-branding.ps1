Param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Root = (Resolve-Path "$PSScriptRoot/..").Path
$VsRes = Join-Path $Root 'vscode/resources'
$BrandIcons = Join-Path $Root 'branding/icons'

if (-not (Test-Path $VsRes)) { Write-Error "[stage-branding] $VsRes not found." }
if (-not (Test-Path $BrandIcons)) {
  New-Item -ItemType Directory -Force -Path $BrandIcons | Out-Null
}

@('darwin','win32','linux') | ForEach-Object {
  $target = Join-Path $VsRes $_
  New-Item -ItemType Directory -Force -Path $target | Out-Null
  $src = Join-Path $BrandIcons $_
  if (Test-Path $src) {
    Copy-Item -Recurse -Force -Path (Join-Path $src '*') -Destination $target -ErrorAction SilentlyContinue
  }
}

Write-Host '[stage-branding] Copied icons.'


