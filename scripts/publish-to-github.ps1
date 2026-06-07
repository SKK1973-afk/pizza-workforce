# Run this once to publish the project and get a shareable GitHub link.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/publish-to-github.ps1

$env:Path = "C:\Program Files\Git\bin;C:\Program Files\GitHub CLI;" + $env:Path
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host ""
Write-Host "=== Publish Pizza Workforce to GitHub ===" -ForegroundColor Cyan
Write-Host ""

$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Step 1: Log into GitHub (browser will open)..." -ForegroundColor Yellow
    gh auth login --hostname github.com --git-protocol https --web
    if ($LASTEXITCODE -ne 0) {
        Write-Host "GitHub login failed. Run: gh auth login" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Step 2: Creating public repo and pushing code..." -ForegroundColor Yellow
gh repo create pizza-workforce --public --source=. --remote=origin --push

if ($LASTEXITCODE -eq 0) {
    $url = gh repo view --json url -q .url
    Write-Host ""
    Write-Host "Done! Send this link to your collaborator:" -ForegroundColor Green
    Write-Host $url
    Write-Host ""
    Write-Host "They run: git clone $url" -ForegroundColor Cyan
} else {
    Write-Host "Repo may already exist. Try: gh repo view --web" -ForegroundColor Yellow
}
