# Copies required assets from the root project into this scaffold's public/ folder.
# Usage (PowerShell):
#   cd deploy/vercel/scripts
#   ./prepare-assets.ps1

$ErrorActionPreference = 'Stop'

# Resolve paths
$scaffoldRoot = (Resolve-Path "$PSScriptRoot\..\").Path
$targetPublic = Join-Path $scaffoldRoot 'public'
$rootPublic = (Resolve-Path "$PSScriptRoot\..\..\..\public").Path

# Ensure public dir exists
New-Item -ItemType Directory -Force -Path $targetPublic | Out-Null

# Copy card_data.csv
$csvSrc = Join-Path $rootPublic 'card_data.csv'
$csvDst = Join-Path $targetPublic 'card_data.csv'
if (Test-Path $csvSrc) {
  Copy-Item -Path $csvSrc -Destination $csvDst -Force
} else {
  Write-Warning "card_data.csv not found at $csvSrc"
}

# Copy card sprites (project uses /card-sprites-128)
$spritesSrc = Join-Path $rootPublic 'card-sprites-128'
$spritesDst = Join-Path $targetPublic 'card-sprites-128'
if (Test-Path $spritesSrc) {
  Copy-Item -Path $spritesSrc -Destination $spritesDst -Recurse -Force
} else {
  Write-Warning "card-sprites-128 not found at $spritesSrc"
}

# Optional: copy favicon and any other public assets if present
$maybeAssets = @('favicon.ico', 'favicon.png')
foreach ($name in $maybeAssets) {
  $src = Join-Path $rootPublic $name
  if (Test-Path $src) {
    Copy-Item -Path $src -Destination (Join-Path $targetPublic $name) -Force
  }
}

Write-Host "Assets copied to $targetPublic" -ForegroundColor Green
