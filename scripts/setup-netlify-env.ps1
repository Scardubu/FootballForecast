#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Setup Netlify Environment Variables from local .env file

.DESCRIPTION
    This script reads your local .env file and sets the environment variables
    in your Netlify deployment automatically.

.EXAMPLE
    .\setup-netlify-env.ps1
#>

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  Netlify Environment Variables Setup" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Netlify CLI is installed
$netlifyInstalled = Get-Command netlify -ErrorAction SilentlyContinue
if (-not $netlifyInstalled) {
    Write-Host "[ERROR] Netlify CLI is not installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install it with:" -ForegroundColor Yellow
    Write-Host "  npm install -g netlify-cli" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "[ERROR] .env file not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Create a .env file with your environment variables first" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "[INFO] Reading .env file..." -ForegroundColor Cyan

# Read .env file and parse variables
$envVars = @{}
Get-Content ".env" | ForEach-Object {
    $line = $_.Trim()
    
    # Skip comments and empty lines
    if ($line -and -not $line.StartsWith("#")) {
        $parts = $line -split "=", 2
        if ($parts.Count -eq 2) {
            $key = $parts[0].Trim()
            $value = $parts[1].Trim()
            
            # Remove quotes if present
            $value = $value -replace '^["'']|["'']$', ''
            
            $envVars[$key] = $value
        }
    }
}

Write-Host "[OK] Found $($envVars.Count) environment variables" -ForegroundColor Green
Write-Host ""

# Required variables for production
$requiredVars = @(
    "API_FOOTBALL_KEY",
    "DATABASE_URL",
    "OPENWEATHER_API_KEY",
    "SCRAPER_AUTH_TOKEN",
    "API_BEARER_TOKEN"
)

# Check if all required variables are present
$missingVars = @()
foreach ($var in $requiredVars) {
    if (-not $envVars.ContainsKey($var)) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "[WARNING] Missing required variables:" -ForegroundColor Yellow
    foreach ($var in $missingVars) {
        Write-Host "  - $var" -ForegroundColor Yellow
    }
    Write-Host ""
    
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "[CANCELLED] Setup cancelled" -ForegroundColor Yellow
        exit 0
    }
}

# Login check
Write-Host "[INFO] Checking Netlify authentication..." -ForegroundColor Cyan
$loginStatus = netlify status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[INFO] Not logged in to Netlify" -ForegroundColor Yellow
    Write-Host "[INFO] Opening browser for authentication..." -ForegroundColor Cyan
    netlify login
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Login failed" -ForegroundColor Red
        exit 1
    }
}

Write-Host "[OK] Authenticated with Netlify" -ForegroundColor Green
Write-Host ""

# Link to site if not already linked
Write-Host "[INFO] Checking site link..." -ForegroundColor Cyan
$linkStatus = netlify status 2>&1
if ($linkStatus -match "Not linked to") {
    Write-Host "[INFO] Linking to Netlify site..." -ForegroundColor Cyan
    netlify link
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to link site" -ForegroundColor Red
        exit 1
    }
}

Write-Host "[OK] Site linked" -ForegroundColor Green
Write-Host ""

# Set environment variables
Write-Host "[INFO] Setting environment variables in Netlify..." -ForegroundColor Cyan
Write-Host ""

$successCount = 0
$failCount = 0

foreach ($key in $envVars.Keys) {
    $value = $envVars[$key]
    
    # Mask sensitive values in output
    $displayValue = if ($value.Length -gt 20) {
        $value.Substring(0, 20) + "..."
    } else {
        $value
    }
    
    Write-Host "  Setting $key = $displayValue" -ForegroundColor White
    
    # Set the environment variable
    $result = netlify env:set $key $value 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        $successCount++
    } else {
        Write-Host "    [FAILED] $result" -ForegroundColor Red
        $failCount++
    }
}

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  Summary" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Variables set: $successCount" -ForegroundColor Green
Write-Host "  Failed: $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($failCount -eq 0) {
    Write-Host "[SUCCESS] All environment variables configured!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Trigger a new deployment:" -ForegroundColor White
    Write-Host "     netlify deploy --prod" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  2. Or deploy via dashboard:" -ForegroundColor White
    Write-Host "     https://app.netlify.com/sites/resilient-souffle-0daafe/deploys" -ForegroundColor Yellow
    Write-Host ""
    
    $deploy = Read-Host "Deploy now? (y/N)"
    if ($deploy -eq "y" -or $deploy -eq "Y") {
        Write-Host ""
        Write-Host "[INFO] Starting production deployment..." -ForegroundColor Cyan
        netlify deploy --prod
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "[SUCCESS] Deployment complete!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Visit your site:" -ForegroundColor Cyan
            Write-Host "  https://resilient-souffle-0daafe.netlify.app" -ForegroundColor Yellow
            Write-Host ""
        } else {
            Write-Host ""
            Write-Host "[ERROR] Deployment failed" -ForegroundColor Red
            Write-Host "Check the logs above for details" -ForegroundColor Yellow
            Write-Host ""
        }
    }
} else {
    Write-Host "[WARNING] Some variables failed to set" -ForegroundColor Yellow
    Write-Host "Please check the errors above and try again" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""
