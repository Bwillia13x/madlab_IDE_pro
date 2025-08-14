Param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Root = (Resolve-Path "$PSScriptRoot/..").Path
$Src = Join-Path $Root 'extensions/madlab'
$Dst = Join-Path $Root 'vscode/extensions/madlab'

if (-not (Test-Path $Src)) { Write-Error "[stage-extensions] $Src missing." }

Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $Dst
New-Item -ItemType Directory -Force -Path $Dst | Out-Null
Copy-Item -Recurse -Force -Path (Join-Path $Src '*') -Destination $Dst

Write-Host "[stage-extensions] Staged built-in extension to $Dst"


