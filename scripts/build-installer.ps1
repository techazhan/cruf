# Cruf — Self-Contained Installer Builder
# Builds a single-file installer that contains the entire Cruf project.
# Share this single .ps1 file with anyone — no npm, no git required.

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $PSScriptRoot
Set-Location $scriptDir

Write-Host ""
Write-Host "  ◆ Building Cruf self-contained installer..." -ForegroundColor Cyan
Write-Host ""

# Read the ZIP file
$zipPath = Join-Path $scriptDir "cruf-v1.0.0.zip"
if (-not (Test-Path $zipPath)) {
    Write-Host "  ◌ Creating ZIP package..." -ForegroundColor Gray
    Compress-Archive -Path "$scriptDir\*" -DestinationPath $zipPath -Force
}

$bytes = [System.IO.File]::ReadAllBytes($zipPath)
$b64 = [System.Convert]::ToBase64String($bytes)
$b64Length = $b64.Length

Write-Host "  ZIP size: $($bytes.Length) bytes"
Write-Host "  Base64 size: $b64Length chars"
Write-Host ""

# Chunk the base64 for the script (split into 80-char lines)
$chunks = for ($i = 0; $i -lt $b64.Length; $i += 80) {
    $b64.Substring($i, [Math]::Min(80, $b64.Length - $i))
}

$b64Lines = $chunks -join "`n"

# Create the self-contained installer
$installerPath = Join-Path $scriptDir "install-cruf.ps1"
$installerContent = @"
# Cruf — Self-Installer
# This script contains the entire Cruf project embedded within it.
# Run this script to install Cruf on any Windows machine.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File install-cruf.ps1

`$ErrorActionPreference = "Stop"
`$ProgressPreference = "SilentlyContinue"

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║          Cruf Installer (Self-Contained)        ║" -ForegroundColor Cyan
Write-Host "  ║     Terminal AI Coding Assistant v1.0.0         ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
try {
    `$nodeVersion = node --version
    Write-Host "  ✔ Node.js `$nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✘ Node.js is required. Download from: https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Decode embedded ZIP
Write-Host "  ◌ Extracting Cruf..." -ForegroundColor Gray

`$b64 = @"
$b64Lines
"@

`$installDir = Join-Path `$env:USERPROFILE "cruf"
if (Test-Path `$installDir) {
    Remove-Item -Path "`$installDir\*" -Recurse -Force -ErrorAction SilentlyContinue
} else {
    New-Item -ItemType Directory -Path `$installDir -Force | Out-Null
}

`$zipBytes = [System.Convert]::FromBase64String(`$b64)
`$zipPath = Join-Path `$env:TEMP "cruf-install.zip"
[System.IO.File]::WriteAllBytes(`$zipPath, `$zipBytes)

# Extract
try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory(`$zipPath, `$installDir)
    Write-Host "  ✔ Extracted to: `$installDir" -ForegroundColor Green
} catch {
    # Fallback: use Expand-Archive
    Expand-Archive -Path `$zipPath -DestinationPath `$installDir -Force
    Write-Host "  ✔ Extracted to: `$installDir" -ForegroundColor Green
}

Remove-Item `$zipPath -Force

# Install dependencies
Write-Host "  ◌ Installing dependencies..." -ForegroundColor Gray
Set-Location `$installDir
npm install --production 2>&1 | ForEach-Object { }
if (`$LASTEXITCODE -eq 0) {
    Write-Host "  ✔ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Dependency installation had issues" -ForegroundColor Yellow
}

# Link globally
Write-Host "  ◌ Linking Cruf globally..." -ForegroundColor Gray
npm link 2>&1 | ForEach-Object { }

if (`$LASTEXITCODE -eq 0) {
    Write-Host "  ✔ Cruf linked globally!" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Could not link globally. You can still run it directly:" -ForegroundColor Yellow
    Write-Host "    node `"`$installDir\bin\cruf.js`"" -ForegroundColor Gray
}

# Create config
`$configDir = Join-Path `$env:USERPROFILE ".config" "cruf"
if (-not (Test-Path `$configDir)) {
    New-Item -ItemType Directory -Path `$configDir -Force | Out-Null
}
`$configFile = Join-Path `$configDir "cruf.json"
if (-not (Test-Path `$configFile)) {
    Copy-Item "`$installDir\.cruf.json" `$configFile
}

Write-Host ""
Write-Host "  ────────────────────────────────────────────────" -ForegroundColor Cyan
Write-Host "  ✔ Cruf v1.0.0 is installed!" -ForegroundColor Green
Write-Host ""
Write-Host "  Quick Start:" -ForegroundColor White
Write-Host "    cruf                       Start interactive chat" -ForegroundColor Gray
Write-Host '    cruf "hello"               One-shot mode' -ForegroundColor Gray
Write-Host ""
Write-Host "  Set API Key (optional):" -ForegroundColor White
Write-Host '    `$env:CRUF_API_KEY = "your-key"' -ForegroundColor Gray
Write-Host ""
Write-Host "  Documentation:" -ForegroundColor White
Write-Host "    https://github.com/techazhan/cruf" -ForegroundColor Blue
Write-Host "  ────────────────────────────────────────────────" -ForegroundColor Cyan
Write-Host ""
"@

Set-Content -Path $installerPath -Value $installerContent -Encoding UTF8

$installerSize = (Get-Item $installerPath).Length
Write-Host "  ✔ Self-contained installer created!" -ForegroundColor Green
Write-Host "    Path: $installerPath" -ForegroundColor White
Write-Host "    Size: $($installerSize / 1KB -f 0) KB"
Write-Host ""
Write-Host "  Share this single file with anyone." -ForegroundColor Yellow
Write-Host "  They can install Cruf by running:" -ForegroundColor Yellow
Write-Host "    powershell -ExecutionPolicy Bypass -File install-cruf.ps1" -ForegroundColor Cyan
Write-Host ""
