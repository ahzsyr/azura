# Creates hostinger-upload.zip with source files only (no node_modules / .next / secrets).
# Usage: powershell -File scripts/deploy/prepare-hostinger-zip.ps1

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "../..")
$zipPath = Join-Path $root "hostinger-upload.zip"

$includes = @(
  "package.json",
  "package-lock.json",
  ".npmrc",
  ".nvmrc",
  "next.config.ts",
  "tsconfig.json",
  "postcss.config.mjs",
  "eslint.config.mjs",
  "components.json",
  "db.js",
  ".env.hostinger.example",
  "messages",
  "src",
  "prisma",
  "database",
  "public",
  "scripts"
)

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

$staging = Join-Path $env:TEMP "azura-hostinger-staging"
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null

foreach ($item in $includes) {
  $source = Join-Path $root $item
  if (-not (Test-Path $source)) {
    Write-Warning "Skipping missing: $item"
    continue
  }
  Copy-Item -Path $source -Destination (Join-Path $staging $item) -Recurse -Force
}

Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $zipPath -Force
Remove-Item $staging -Recurse -Force

$productJsonCount = (Get-ChildItem -Path (Join-Path $root "src\data\en-us\products") -Filter "*.json" -Recurse -ErrorAction SilentlyContinue | Measure-Object).Count
$indexManifest = Join-Path $root "src\data\products-index\manifest.json"
Write-Host "Created: $zipPath"
Write-Host "Product JSON files (en-us): $productJsonCount"
if ($productJsonCount -lt 1) {
  Write-Warning "No catalog JSON in zip. Set SKIP_CATALOG_PREBUILD=1 on Hostinger and include products-index."
}
if (Test-Path $indexManifest) { Write-Host "Includes: src/data/products-index/manifest.json" }
$msgEn = Join-Path $root "messages\en.json"
if (-not (Test-Path $msgEn)) { Write-Warning "Missing messages/en.json" } else { Write-Host "Includes: messages/en.json" }
Write-Host "Upload to Hostinger. Build command: npm run build."
