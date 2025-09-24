# Automated Netlify deployment script for Football Forecast (PowerShell)
# Usage: ./scripts/deploy-netlify.ps1

Write-Host "--- Netlify CLI Version ---"
if (-not (Get-Command netlify -ErrorAction SilentlyContinue)) {
    Write-Host "Netlify CLI not found. Installing..."
    npm install -g netlify-cli
}

netlify --version

# Login if not already
$loginStatus = netlify status 2>&1
if ($loginStatus -notmatch 'Logged in') {
    Write-Host "Logging in to Netlify..."
    netlify login
}

# Link project if not already linked
if (-not (Test-Path .netlify/state.json)) {
    Write-Host "Linking Netlify project..."
    netlify link
}

# Build the project
npm run build

# Deploy to production
netlify deploy --build --prod

Write-Host "--- Deployment Complete ---"
