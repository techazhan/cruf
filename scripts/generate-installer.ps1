# Cruf — Self-Contained Installer Generator
# Generates a single .ps1 file that contains the entire Cruf project.
# Share this single file with anyone — they run it and get Cruf.

param(
    [string]$ZipPath = "",
    [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"

# Paths
$scriptDir = Split-Path -Parent $PSScriptRoot
if (-not $ZipPath) { $ZipPath = Join-Path $scriptDir "cruf-v1.0.0.zip" }
if (-not $OutputPath) { $OutputPath = Join-Path $scriptDir "install-cruf.ps1" }

Write-Host "  Generator script..." -ForegroundColor Cyan

# Read ZIP as base64
$zipBytes = [System.IO.File]::ReadAllBytes($ZipPath)
$b64Full = [System.Convert]::ToBase64String($zipBytes)

# Chunk into 80-char lines
$b64Lines = for ($i = 0; $i -lt $b64Full.Length; $i += 80) {
    $b64Full.Substring($i, [Math]::Min(80, $b64Full.Length - $i))
}

Write-Host "  Base64 length: $($b64Full.Length) chars"
Write-Host "  Lines: $($b64Lines.Count)"

# Build the installer
# Use a StreamWriter to avoid issues with large strings in PowerShell
$writer = New-Object System.IO.StreamWriter($OutputPath, $false, [System.Text.UTF8Encoding]::new($false))

$writer.WriteLine('#!/usr/bin/env pwsh')
$writer.WriteLine('<#')
$writer.WriteLine('.SYNOPSIS')
$writer.WriteLine('    Cruf — Self-Contained Installer')
$writer.WriteLine('    Terminal AI Coding Assistant v1.0.0')
$writer.WriteLine('')
$writer.WriteLine('.DESCRIPTION')
$writer.WriteLine('    This script contains the entire Cruf project embedded within it.')
$writer.WriteLine('    Run it to install Cruf on any Windows machine with Node.js.')
$writer.WriteLine('')
$writer.WriteLine('.EXAMPLE')
$writer.WriteLine('    powershell -ExecutionPolicy Bypass -File install-cruf.ps1')
$writer.WriteLine('#>')
$writer.WriteLine('')
$writer.WriteLine('$ErrorActionPreference = "Stop"')
$writer.WriteLine('$ProgressPreference = "SilentlyContinue"')
$writer.WriteLine('')
$writer.WriteLine('Write-Host ""')
$writer.WriteLine('Write-Host "  ================================================" -ForegroundColor Cyan')
$writer.WriteLine('Write-Host "          Cruf Installer (Self-Contained)" -ForegroundColor Cyan')
$writer.WriteLine('Write-Host "     Terminal AI Coding Assistant v1.0.0" -ForegroundColor Cyan')
$writer.WriteLine('Write-Host "  ================================================" -ForegroundColor Cyan')
$writer.WriteLine('Write-Host ""')
$writer.WriteLine('')
$writer.WriteLine('# Check Node.js')
$writer.WriteLine('try {')
$writer.WriteLine('    $nodeVersion = node --version')
$writer.WriteLine('    Write-Host "  [OK] Node.js $nodeVersion" -ForegroundColor Green')
$writer.WriteLine('} catch {')
$writer.WriteLine('    Write-Host "  [ERR] Node.js is required. Download from: https://nodejs.org" -ForegroundColor Red')
$writer.WriteLine('    exit 1')
$writer.WriteLine('}')
$writer.WriteLine('')
$writer.WriteLine('Write-Host "  ... Extracting Cruf..." -ForegroundColor Gray')
$writer.WriteLine('')
$writer.WriteLine('# Embedded base64-encoded ZIP')
$writer.WriteLine('$b64 = @"')
foreach ($line in $b64Lines) {
    $writer.WriteLine($line)
}
$writer.WriteLine('"@')
$writer.WriteLine('')
$writer.WriteLine('$installDir = Join-Path $env:USERPROFILE "cruf"')
$writer.WriteLine('if (Test-Path $installDir) {')
$writer.WriteLine('    Remove-Item -Path "$installDir\*" -Recurse -Force -ErrorAction SilentlyContinue')
$writer.WriteLine('} else {')
$writer.WriteLine('    New-Item -ItemType Directory -Path $installDir -Force | Out-Null')
$writer.WriteLine('}')
$writer.WriteLine('')
$writer.WriteLine('$zipBytes = [System.Convert]::FromBase64String($b64)')
$writer.WriteLine('$zipPath = Join-Path $env:TEMP "cruf-install.zip"')
$writer.WriteLine('[System.IO.File]::WriteAllBytes($zipPath, $zipBytes)')
$writer.WriteLine('')
$writer.WriteLine('try {')
$writer.WriteLine('    Add-Type -AssemblyName System.IO.Compression.FileSystem')
$writer.WriteLine('    [System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $installDir)')
$writer.WriteLine('} catch {')
$writer.WriteLine('    Expand-Archive -Path $zipPath -DestinationPath $installDir -Force')
$writer.WriteLine('}')
$writer.WriteLine('Write-Host "  [OK] Extracted to: $installDir" -ForegroundColor Green')
$writer.WriteLine('Remove-Item $zipPath -Force')
$writer.WriteLine('')
$writer.WriteLine('# Install dependencies')
$writer.WriteLine('Write-Host "  ... Installing dependencies..." -ForegroundColor Gray')
$writer.WriteLine('Push-Location $installDir')
$writer.WriteLine('npm install --production 2>&1 | Out-Null')
$writer.WriteLine('if ($LASTEXITCODE -eq 0) {')
$writer.WriteLine('    Write-Host "  [OK] Dependencies installed" -ForegroundColor Green')
$writer.WriteLine('} else {')
$writer.WriteLine('    Write-Host "  [WARN] Dependencies may have issues" -ForegroundColor Yellow')
$writer.WriteLine('}')
$writer.WriteLine('')
$writer.WriteLine('# Link globally')
$writer.WriteLine('Write-Host "  ... Linking Cruf globally..." -ForegroundColor Gray')
$writer.WriteLine('npm link 2>&1 | Out-Null')
$writer.WriteLine('if ($LASTEXITCODE -eq 0) {')
$writer.WriteLine('    Write-Host "  [OK] Cruf linked globally! Run: cruf" -ForegroundColor Green')
$writer.WriteLine('} else {')
$writer.WriteLine('    Write-Host "  [WARN] Could not link. Run from: node $installDir\bin\cruf.js" -ForegroundColor Yellow')
$writer.WriteLine('}')
$writer.WriteLine('Pop-Location')
$writer.WriteLine('')
$writer.WriteLine('# Config')
$writer.WriteLine('$configDir = Join-Path $env:USERPROFILE ".config" "cruf"')
$writer.WriteLine('if (-not (Test-Path $configDir)) { New-Item -ItemType Directory -Path $configDir -Force | Out-Null }')
$writer.WriteLine('$configFile = Join-Path $configDir "cruf.json"')
$writer.WriteLine('if (-not (Test-Path $configFile)) { Copy-Item "$installDir\.cruf.json" $configFile }')
$writer.WriteLine('')
$writer.WriteLine('Write-Host ""')
$writer.WriteLine('Write-Host "  ------------------------------------------------" -ForegroundColor Cyan')
$writer.WriteLine('Write-Host "  [DONE] Cruf v1.0.0 is installed!" -ForegroundColor Green')
$writer.WriteLine('Write-Host ""')
$writer.WriteLine('Write-Host "  Quick Start:" -ForegroundColor White')
$writer.WriteLine('Write-Host "    cruf                       Start interactive chat" -ForegroundColor Gray')
$writer.WriteLine('Write-Host "    cruf --help                View all options" -ForegroundColor Gray')
$writer.WriteLine('Write-Host ""')
$writer.WriteLine('Write-Host "  Set API Key (optional):" -ForegroundColor White')
$writer.WriteLine('Write-Host "    `$env:CRUF_API_KEY = `"your-key`"" -ForegroundColor Gray')
$writer.WriteLine('Write-Host ""')
$writer.WriteLine('Write-Host "  Docs: https://github.com/cruf/cruf" -ForegroundColor Blue')
$writer.WriteLine('Write-Host "  ------------------------------------------------" -ForegroundColor Cyan')
$writer.WriteLine('Write-Host ""')

$writer.Close()

$installerSize = (Get-Item $OutputPath).Length
Write-Host ""
Write-Host "  [DONE] Self-contained installer created!" -ForegroundColor Green
Write-Host "  Path: $OutputPath"
Write-Host "  Size: $([Math]::Round($installerSize / 1KB)) KB"
Write-Host ""
Write-Host "  Share this single file with anyone."
Write-Host "  They run:"
Write-Host "    powershell -ExecutionPolicy Bypass -File install-cruf.ps1"
Write-Host ""
