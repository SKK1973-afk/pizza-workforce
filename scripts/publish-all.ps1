# Publish to GitHub + deploy to Vercel in one go.
# Run in Cursor terminal (View -> Terminal):
#   powershell -ExecutionPolicy Bypass -File scripts/publish-all.ps1

$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\Git\bin;C:\Program Files\GitHub CLI;C:\Program Files\nodejs;" + $env:Path
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host ""
Write-Host "=== Pizza Workforce: GitHub + Vercel ===" -ForegroundColor Cyan
Write-Host ""

# --- GitHub ---
gh auth status 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "GitHub: log in via browser..." -ForegroundColor Yellow
    gh auth login --hostname github.com --git-protocol https --web
}

git branch -M main 2>$null

$remote = git remote get-url origin 2>$null
if (-not $remote) {
    Write-Host "Creating GitHub repo and pushing..." -ForegroundColor Yellow
    gh repo create pizza-workforce --public --source=. --remote=origin --push
} else {
    Write-Host "Pushing to existing remote..." -ForegroundColor Yellow
    git push -u origin main
}

$githubUrl = gh repo view --json url -q .url 2>$null
if (-not $githubUrl) { $githubUrl = "https://github.com/YOUR_USERNAME/pizza-workforce" }

Write-Host ""
Write-Host "GitHub repo:" -ForegroundColor Green
Write-Host $githubUrl

# --- Vercel ---
npx vercel whoami 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Vercel: log in via browser (follow the link shown)..." -ForegroundColor Yellow
    npx vercel login
}

Write-Host ""
Write-Host "Linking Vercel project..." -ForegroundColor Yellow
npx vercel link --yes 2>$null

Write-Host "Setting environment variables from .env.local..." -ForegroundColor Yellow
$envFile = Join-Path $PWD ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "Missing .env.local — copy from .env.local.example first." -ForegroundColor Red
    exit 1
}

Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $val = $matches[2].Trim()
        if ($key -and $val -and $val -notmatch '^your_') {
            Write-Host "  $key"
            $val | npx vercel env add $key production --force 2>$null
            $val | npx vercel env add $key preview --force 2>$null
            $val | npx vercel env add $key development --force 2>$null
        }
    }
}

Write-Host ""
Write-Host "Deploying to production..." -ForegroundColor Yellow
$deployOutput = npx vercel --prod --yes 2>&1 | Out-String
Write-Host $deployOutput

$vercelUrl = ($deployOutput | Select-String -Pattern 'https://[^\s]+\.vercel\.app' -AllMatches).Matches[-1].Value
if ($vercelUrl) {
    Write-Host ""
    Write-Host "Updating NEXT_PUBLIC_APP_URL on Vercel..." -ForegroundColor Yellow
    $vercelUrl | npx vercel env add NEXT_PUBLIC_APP_URL production --force 2>$null
    npx vercel --prod --yes 2>&1 | Out-Null
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Share with collaborator (code):" -ForegroundColor Green
Write-Host $githubUrl
Write-Host ""
Write-Host "Share with team (live app):" -ForegroundColor Green
if ($vercelUrl) { Write-Host $vercelUrl } else { Write-Host "(check deploy output above for URL)" }
Write-Host ""
Write-Host "Demo login: staff1@pizza.nz / Demo1234!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
