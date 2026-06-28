# Cruf — Web Bootstrap Installer (PowerShell)
# Downloads and installs Cruf from the internet.
# Size: ~2KB — shares this tiny file, it fetches the rest.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File bootstrap-installer.ps1

# Configuration — change these URLs after publishing
$CRUF_NPM_PACKAGE = "cruf"
$CRUF_GITHUB_REPO = "https://github.com/techazhan/cruf"
$CRUF_VERSION = "1.0.0"

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

Write-Host ""
Write-Host "  ================================================" -ForegroundColor Cyan
Write-Host "          Cruf Bootstrap Installer v$CRUF_VERSION" -ForegroundColor Cyan
Write-Host "  ================================================" -ForegroundColor Cyan
Write-Host ""

# ─── Check prerequisites ─────────────────────────────────────────
try {
    $nodeVersion = node --version
    Write-Host "  [OK] Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERR] Node.js is required." -ForegroundColor Red
    Write-Host "  Download from: https://nodejs.org (v18+)"
    exit 1
}

try {
    $npmVersion = npm --version
    Write-Host "  [OK] npm $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERR] npm is required." -ForegroundColor Red
    exit 1
}

# ─── Install Methods (tries each in order) ───────────────────────
$installed = $false

# Method 1: npm
Write-Host ""
Write-Host "  Method 1: Installing via npm..." -ForegroundColor Yellow
$npmResult = npm install -g $CRUF_NPM_PACKAGE 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Installed via npm!" -ForegroundColor Green
    $installed = $true
} else {
    Write-Host "  [..] npm install failed, trying alternative..." -ForegroundColor Gray

    # Method 2: GitHub clone
    Write-Host "  Method 2: Cloning from GitHub..." -ForegroundColor Yellow
    $installDir = Join-Path $env:USERPROFILE "cruf"

    try {
        # Try git clone
        git clone $CRUF_GITHUB_REPO.git $installDir 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Push-Location $installDir
            npm install 2>&1 | Out-Null
            npm link 2>&1 | Out-Null
            Pop-Location
            Write-Host "  [OK] Installed from GitHub!" -ForegroundColor Green
            $installed = $true
        }
    } catch {
        Write-Host "  [..] GitHub clone failed..." -ForegroundColor Gray
    }

    if (-not $installed) {
        # Method 3: Download ZIP
        Write-Host "  Method 3: Downloading ZIP..." -ForegroundColor Yellow
        $zipUrl = "$CRUF_GITHUB_REPO/archive/refs/heads/main.zip"
        $zipPath = Join-Path $env:TEMP "cruf.zip"

        try {
            Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
            Remove-Item -Path $installDir -Recurse -Force -ErrorAction SilentlyContinue
            Expand-Archive -Path $zipPath -DestinationPath $env:TEMP -Force
            $extracted = Join-Path $env:TEMP "cruf-main"
            Move-Item -Path "$extracted\*" -Destination $installDir -Force
            Remove-Item $extracted -Recurse -Force

            Push-Location $installDir
            npm install 2>&1 | Out-Null
            npm link 2>&1 | Out-Null
            Pop-Location

            Write-Host "  [OK] Installed from ZIP!" -ForegroundColor Green
            $installed = $true
        } catch {
            Write-Host "  [ERR] All installation methods failed." -ForegroundColor Red
            Write-Host "  Please install manually: npm install -g cruf"
            exit 1
        }
    }
}

# ─── Verify ───────────────────────────────────────────────────────
try {
    $version = cruf --version 2>&1
    Write-Host ""
    Write-Host "  [OK] Cruf $version is ready!" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "  [WARN] Installation completed but 'cruf' command not found." -ForegroundColor Yellow
    Write-Host "  Try running: $installDir\bin\cruf.js"
}

Write-Host ""
Write-Host "  ------------------------------------------------" -ForegroundColor Cyan
Write-Host "  Quick Start:" -ForegroundColor White
Write-Host "    cruf                       Start interactive chat" -ForegroundColor Gray
Write-Host "    cruf --help                View all options" -ForegroundColor Gray
Write-Host ""
Write-Host "  Set API Key (optional):" -ForegroundColor White
Write-Host '    $env:CRUF_API_KEY = "your-key"' -ForegroundColor Gray
Write-Host ""
Write-Host "  Report issues: $CRUF_GITHUB_REPO/issues" -ForegroundColor Blue
Write-Host "  ------------------------------------------------" -ForegroundColor Cyan
Write-Host ""
