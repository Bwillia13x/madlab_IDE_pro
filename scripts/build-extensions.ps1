Param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Root = (Resolve-Path "$PSScriptRoot/..").Path
$Ext = Join-Path $Root 'extensions/madlab'
if (-not (Test-Path $Ext)) { Write-Error "[build-extensions] $Ext not found" }
Set-Location $Ext

if (Get-Command pnpm -ErrorAction SilentlyContinue) {
  pnpm install --frozen-lockfile; if ($LASTEXITCODE -ne 0) { pnpm install }
  pnpm run build
} elseif (Get-Command npm -ErrorAction SilentlyContinue) {
  try { npm ci } catch { npm install }
  npm run build
} else {
  Write-Error '[build-extensions] pnpm or npm is required.'
}

Write-Host '[build-extensions] Built MadLab extension.'


