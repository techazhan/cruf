# Cruf — npm Publisher
# Publishes Cruf to npm so anyone can install with: npm install -g cruf
#
# Usage:
#   1. Create an npm account at https://www.npmjs.com/signup
#   2. Run: npm login
#   3. Run: .\scripts\publish-npm.ps1

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $PSScriptRoot
Set-Location $scriptDir

Write-Host ""
Write-Host "  ◆ Publishing Cruf to npm..." -ForegroundColor Cyan
Write-Host ""

# Check if logged in to npm
try {
    $whoami = npm whoami 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Not logged in"
    }
    Write-Host "  ✔ Logged in to npm as: $whoami" -ForegroundColor Green
} catch {
    Write-Host "  ✘ Not logged in to npm." -ForegroundColor Red
    Write-Host "  Run 'npm login' first." -ForegroundColor Yellow
    Write-Host "  Create an account at: https://www.npmjs.com/signup" -ForegroundColor Yellow
    exit 1
}

# Make sure package name is available
$packageName = "cruf"
try {
    $pkgInfo = Invoke-RestMethod -Uri "https://registry.npmjs.org/$packageName" -ErrorAction SilentlyContinue
    if ($pkgInfo) {
        Write-Host "  ⚠ Package '$packageName' already exists on npm." -ForegroundColor Yellow
        Write-Host "    The package.json has version 1.0.0 - you need to use 'npm publish' with a unique version."
        Write-Host "    Consider publishing as a scoped package: @your-username/cruf"
        $answer = Read-Host "    Continue with 'cruf' anyway? (y/N)"
        if ($answer -ne "y") {
            exit 1
        }
    }
} catch {
    # Package doesn't exist - good!
    Write-Host "  ✔ Package name '$packageName' is available!" -ForegroundColor Green
}

# Test the package
Write-Host "  ◌ Running pre-publish checks..." -ForegroundColor Gray

# Check version
$pkg = Get-Content "package.json" | ConvertFrom-Json
Write-Host "    Version: $($pkg.version)"

# Dry run
Write-Host "  ◌ Performing dry run..." -ForegroundColor Gray
npm publish --dry-run 2>&1 | ForEach-Object { Write-Host "    $_" }

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✘ Dry run failed. Check the errors above." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  ────────────────────────────────────────────────" -ForegroundColor Cyan
Write-Host "  Ready to publish!" -ForegroundColor Green
Write-Host ""
Write-Host "  Run this command to publish:" -ForegroundColor White
Write-Host "    npm publish" -ForegroundColor Cyan
Write-Host ""
Write-Host "  After publishing, anyone can install:" -ForegroundColor White
Write-Host "    npm install -g cruf" -ForegroundColor Cyan
Write-Host "    cruf" -ForegroundColor Cyan
Write-Host ""
Write-Host "  To update later:" -ForegroundColor White
Write-Host "    1. Bump version: npm version patch" -ForegroundColor Gray
Write-Host "    2. Publish: npm publish" -ForegroundColor Gray
Write-Host "  ────────────────────────────────────────────────" -ForegroundColor Cyan
Write-Host ""

$answer = Read-Host "  Publish now? (y/N)"
if ($answer -eq "y") {
    npm publish 2>&1 | ForEach-Object { Write-Host "    $_" }
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✔ Cruf published to npm!" -ForegroundColor Green
        Write-Host "    npm install -g cruf" -ForegroundColor Cyan
    } else {
        Write-Host "  ✘ Publish failed." -ForegroundColor Red
    }
}
