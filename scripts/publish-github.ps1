# Cruf — GitHub Publisher
# Publishes Cruf to GitHub so anyone can clone or download.
#
# Usage:
#   1. Create a GitHub Personal Access Token at https://github.com/settings/tokens
#      (needs 'repo' scope for private repos, 'public_repo' for public)
#   2. Run this script:
#      .\scripts\publish-github.ps1
#
# The script will create a GitHub repo and push the code.

param(
    [string]$Token = "",
    [string]$RepoName = "cruf",
    [string]$Description = "Cruf — Terminal AI Coding Assistant. Like OpenCode, but built for everyone.",
    [switch]$Private
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrEmpty($Token)) {
    $Token = [Environment]::GetEnvironmentVariable("GITHUB_TOKEN", "User")
    if ([string]::IsNullOrEmpty($Token)) {
        $Token = [Environment]::GetEnvironmentVariable("GH_TOKEN", "User")
    }
}

if ([string]::IsNullOrEmpty($Token)) {
    Write-Host ""
    Write-Host "  ✘ No GitHub token found." -ForegroundColor Red
    Write-Host ""
    Write-Host "  To create a token:" -ForegroundColor Yellow
    Write-Host "    1. Go to https://github.com/settings/tokens" -ForegroundColor Gray
    Write-Host "    2. Generate a classic token with 'public_repo' scope" -ForegroundColor Gray
    Write-Host "    3. Set it as an environment variable:" -ForegroundColor Gray
    Write-Host '       $env:GITHUB_TOKEN = "your-token-here"' -ForegroundColor Gray
    Write-Host "       or pass it as -Token parameter" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Or manually:" -ForegroundColor Yellow
    Write-Host "    1. Create a repo on GitHub: https://github.com/new" -ForegroundColor Gray
    Write-Host "    2. Run: git remote add origin https://github.com/YOUR_USER/cruf.git" -ForegroundColor Gray
    Write-Host "    3. Run: git push -u origin master" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

$scriptDir = Split-Path -Parent $PSScriptRoot
Set-Location $scriptDir

Write-Host ""
Write-Host "  ◆ Publishing Cruf to GitHub..." -ForegroundColor Cyan
Write-Host ""

# Check git status
$status = git status --porcelain
if ($status) {
    Write-Host "  ⚠ Uncommitted changes found. Committing first..." -ForegroundColor Yellow
    git add -A
    git commit -m "Updates before publish" --no-verify
}

# Get GitHub username
try {
    $userResponse = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers @{
        "Authorization" = "Bearer $Token"
        "User-Agent" = "cruf-publisher"
    } -ErrorAction Stop
    $username = $userResponse.login
    Write-Host "  ✔ Authenticated as: $username" -ForegroundColor Green
} catch {
    Write-Host "  ✘ Failed to authenticate with GitHub. Check your token." -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)"
    exit 1
}

# Check if repo already exists
$repoUrl = "https://api.github.com/repos/$username/$RepoName"
try {
    $existing = Invoke-RestMethod -Uri $repoUrl -Headers @{
        "Authorization" = "Bearer $Token"
        "User-Agent" = "cruf-publisher"
    }
    Write-Host "  ⚠ Repo '$RepoName' already exists. Updating remote..." -ForegroundColor Yellow
} catch {
    # Create the repo
    Write-Host "  ◌ Creating GitHub repo '$RepoName'..." -ForegroundColor Gray
    $body = @{
        name = $RepoName
        description = $Description
        @{ if ($Private) { "private" } else { "public" } } = $Private
        has_issues = $true
        has_wiki = $true
    } | ConvertTo-Json

    try {
        $createResponse = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers @{
            "Authorization" = "Bearer $Token"
            "User-Agent" = "cruf-publisher"
            "Content-Type" = "application/json"
        } -Body $body
        Write-Host "  ✔ GitHub repo created!" -ForegroundColor Green
    } catch {
        Write-Host "  ✘ Failed to create repo: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Set up remote and push
$remoteUrl = "https://$username`:$Token@github.com/$username/$RepoName.git"

try {
    $existingRemote = git remote get-url origin 2>$null
    if ($existingRemote) {
        git remote set-url origin $remoteUrl
    } else {
        git remote add origin $remoteUrl
    }
} catch {
    git remote add origin $remoteUrl
}

Write-Host "  ◌ Pushing code to GitHub..." -ForegroundColor Gray
git push -u origin master --force 2>&1 | ForEach-Object { Write-Host "    $_" }

if ($LASTEXITCODE -eq 0) {
    $publicUrl = if ($Private) { "private" } else { "public" }
    Write-Host ""
    Write-Host "  ✔ Cruf is live on GitHub!" -ForegroundColor Green
    Write-Host "    https://github.com/$username/$RepoName" -ForegroundColor Blue
    Write-Host ""
    Write-Host "  Anyone can now:" -ForegroundColor White
    Write-Host "    git clone https://github.com/$username/$RepoName.git" -ForegroundColor Gray
    Write-Host "    cd $RepoName" -ForegroundColor Gray
    Write-Host "    npm install" -ForegroundColor Gray
    Write-Host "    npm link" -ForegroundColor Gray
    Write-Host "    cruf" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Or download the ZIP directly from GitHub." -ForegroundColor White
    Write-Host "  Repo is $publicUrl." -ForegroundColor White
    Write-Host ""

    # Remove token from remote URL (switch to HTTPS without token)
    $cleanUrl = "https://github.com/$username/$RepoName.git"
    git remote set-url origin $cleanUrl
    Write-Host "  ◌ Remote URL cleaned (token removed)." -ForegroundColor Gray
} else {
    Write-Host "  ✘ Push failed. Check your token and network." -ForegroundColor Red
    exit 1
}
