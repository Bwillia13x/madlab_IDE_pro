Param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Merge branding/product.json into vscode/product.json using jq deep merge
$Root = (Resolve-Path "$PSScriptRoot/..").Path
$VsProduct = Join-Path $Root 'vscode/product.json'
$Branding = Join-Path $Root 'branding/product.json'
$Backup = Join-Path $Root 'vscode/product.base.json'

if (-not (Get-Command jq -ErrorAction SilentlyContinue)) {
  Write-Error '[patch-product] jq is required.'
}

if (-not (Test-Path $VsProduct)) {
  Write-Error "[patch-product] $VsProduct not found. Did you init the submodule?"
}

if (-not (Test-Path $Branding)) {
  Write-Error "[patch-product] $Branding not found."
}

Copy-Item $VsProduct $Backup -Force
& jq -s '.[0] * .[1]' $Backup $Branding | Set-Content -Encoding UTF8 $VsProduct
Write-Host "[patch-product] Patched $VsProduct with branding/product.json"


