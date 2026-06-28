# Cruf Installer for Windows (PowerShell)
# Run: powershell -ExecutionPolicy Bypass -File install.ps1

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$CRUF_VERSION = "1.0.0"
$CRUF_NAME = "cruf"

function Write-Header {
    Clear-Host
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║          Cruf Installer for Windows             ║" -ForegroundColor Cyan
    Write-Host "  ║     Terminal AI Coding Assistant                ║" -ForegroundColor Cyan
    Write-Host "  ╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Check-Requirements {
    Write-Host "  ◆ Checking prerequisites..." -ForegroundColor Yellow

    # Check Node.js
    try {
        $nodeVersion = node --version
        Write-Host "  ✔ Node.js $nodeVersion detected" -ForegroundColor Green
    } catch {
        Write-Host "  ✘ Node.js is required but not found." -ForegroundColor Red
        Write-Host "    Download from: https://nodejs.org (v18 or later)"
        exit 1
    }

    # Check npm
    try {
        $npmVersion = npm --version
        Write-Host "  ✔ npm $npmVersion detected" -ForegroundColor Green
    } catch {
        Write-Host "  ✘ npm is required but not found." -ForegroundColor Red
        exit 1
    }

    # Check git
    try {
        $gitVersion = git --version
        Write-Host "  ✔ Git detected" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠ Git not found (optional, for cloning)" -ForegroundColor Yellow
    }

    Write-Host ""
}

function Install-Cruf {
    $installDir = Join-Path $env:USERPROFILE "cruf"

    Write-Host "  ◆ Installing Cruf v$CRUF_VERSION..." -ForegroundColor Yellow
    Write-Host ""

    # Check if already installed
    try {
        $existing = npm list -g cruf 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ⚠ Cruf is already installed globally." -ForegroundColor Yellow
            $answer = Read-Host "    Reinstall? (y/N)"
            if ($answer -ne "y" -and $answer -ne "Y") {
                Write-Host "  ◌ Skipping installation."
                return
            }
        }
    } catch {}

    # Install globally from npm
    Write-Host "  ◌ Installing from npm..." -ForegroundColor Gray
    npm install -g cruf 2>&1 | Out-Null

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✔ Cruf installed successfully!" -ForegroundColor Green
    } else {
        Write-Host "  ◌ npm global install failed. Installing from source..." -ForegroundColor Yellow

        # Clone or copy
        if (-not (Test-Path $installDir)) {
            git clone https://github.com/cruf/cruf.git $installDir 2>$null
            if ($LASTEXITCODE -ne 0) {
                Write-Host "  ✘ Failed to clone repository." -ForegroundColor Red
                Write-Host "    Please install manually: npm install -g cruf"
                exit 1
            }
        }

        Set-Location $installDir
        npm install
        npm link

        Write-Host "  ✔ Cruf installed from source!" -ForegroundColor Green
    }
}

function Configure-Cruf {
    Write-Host ""
    Write-Host "  ◆ Configuration" -ForegroundColor Yellow
    Write-Host ""

    $configDir = Join-Path $env:USERPROFILE ".config" "cruf"
    if (-not (Test-Path $configDir)) {
        New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    }

    $configFile = Join-Path $configDir "cruf.json"
    if (-not (Test-Path $configFile)) {
        # Create default config
        $defaultConfig = @{
            default_provider = "opencode"
            default_model = "deepseek-v4-flash-free"
            default_agent = "assistant"
            providers = @{
                opencode = @{
                    api_base = "https://api.opencode.ai/v1"
                    api_key = ""
                    models = @{
                        "deepseek-v4-flash-free" = @{ max_tokens = 64000; temperature = 0.7 }
                        "deepseek-v4-flash" = @{ max_tokens = 64000; temperature = 0.7 }
                        "deepseek-v4" = @{ max_tokens = 128000; temperature = 0.7 }
                        "gpt-4o" = @{ max_tokens = 128000; temperature = 0.7 }
                        "claude-sonnet-4" = @{ max_tokens = 128000; temperature = 0.7 }
                    }
                }
            }
            agents = @{
                assistant = @{ description = "General-purpose coding assistant"; mode = "primary"; tools = @("read","write","edit","glob","grep","bash","websearch","webfetch","task") }
                coder = @{ description = "Focused on writing code"; mode = "primary"; tools = @("read","write","edit","glob","grep","bash") }
                explorer = @{ description = "Codebase exploration"; mode = "readonly"; tools = @("read","glob","grep","webfetch") }
                debugger = @{ description = "Debugging specialist"; mode = "primary"; tools = @("read","edit","grep","bash") }
            }
        } | ConvertTo-Json -Depth 10

        Set-Content -Path $configFile -Value $defaultConfig
        Write-Host "  ✔ Default config created at: $configFile" -ForegroundColor Green
    } else {
        Write-Host "  ✔ Config already exists at: $configFile" -ForegroundColor Green
    }

    # Check API key
    $apiKey = [Environment]::GetEnvironmentVariable("CRUF_API_KEY", "User")
    if ([string]::IsNullOrEmpty($apiKey)) {
        Write-Host ""
        Write-Host "  ⚠ No CRUF_API_KEY set." -ForegroundColor Yellow
        Write-Host "    The default model (deepseek-v4-flash-free) is free and may not need a key."
        Write-Host "    To set a custom API key:" -ForegroundColor Gray
        Write-Host '    [Environment]::SetEnvironmentVariable("CRUF_API_KEY", "your-key", "User")' -ForegroundColor Gray
    }
}

function Print-Success {
    Write-Host ""
    Write-Host "  ────────────────────────────────────────────────" -ForegroundColor Cyan
    Write-Host "  ✔  Cruf v$CRUF_VERSION is ready!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Quick Start:" -ForegroundColor White
    Write-Host "    cruf                       Start interactive chat"
    Write-Host '    cruf "hello"               One-shot mode'
    Write-Host "    cruf --init                Init config in project"
    Write-Host "    cruf --help                View all options"
    Write-Host ""
    Write-Host "  Documentation:" -ForegroundColor White
    Write-Host "    https://github.com/cruf/cruf" -ForegroundColor Blue
    Write-Host "  ────────────────────────────────────────────────" -ForegroundColor Cyan
    Write-Host ""
}

# Main
Write-Header
Check-Requirements
Install-Cruf
Configure-Cruf
Print-Success
