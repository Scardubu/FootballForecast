#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Setup Netlify Environment Variables using API

.DESCRIPTION
    This script uses the Netlify API directly to set environment variables,
    bypassing the CLI account_id issue.
#>

param(
    [string]$AuthToken = $env:NETLIFY_AUTH_TOKEN,
    [string]$SiteId = $env:NETLIFY_SITE_ID
)

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  Netlify Environment Variables Setup (API)" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# Check for required parameters
if (-not $AuthToken) {
    Write-Host "[ERROR] NETLIFY_AUTH_TOKEN not provided" -ForegroundColor Red
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\setup-netlify-env-api.ps1 -AuthToken 'your_token' -SiteId 'your_site_id'" -ForegroundColor White
    Write-Host ""
    Write-Host "Or set environment variables:" -ForegroundColor Yellow
    Write-Host "  `$env:NETLIFY_AUTH_TOKEN='your_token'" -ForegroundColor White
    Write-Host "  `$env:NETLIFY_SITE_ID='your_site_id'" -ForegroundColor White
    Write-Host ""
    exit 1
}

if (-not $SiteId) {
    Write-Host "[ERROR] NETLIFY_SITE_ID not provided" -ForegroundColor Red
    Write-Host ""
    exit 1
}

Write-Host "[INFO] Using Site ID: $SiteId" -ForegroundColor Cyan
Write-Host "[INFO] Auth Token: $($AuthToken.Substring(0, 20))..." -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "[ERROR] .env file not found" -ForegroundColor Red
    Write-Host ""
    exit 1
}

Write-Host "[INFO] Reading .env file..." -ForegroundColor Cyan

# Required variables for production
$requiredVars = @(
    "API_FOOTBALL_KEY",
    "DATABASE_URL",
    "OPENWEATHER_API_KEY",
    "SCRAPER_AUTH_TOKEN",
    "API_BEARER_TOKEN"
)

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
            
            # Remove quotes and comments
            $value = $value -replace '^["'']|["'']$', ''
            $value = ($value -split '#')[0].Trim()
            
            # Only include required vars and non-Netlify internal vars
            if ($requiredVars -contains $key -or 
                ($key -notlike "NETLIFY_*" -and 
                 $key -notlike "VITE_STACK_*" -and
                 $key -notlike "STACK_AUTH_*" -and
                 $key -ne "NODE_ENV" -and
                 $key -ne "PORT" -and
                 $key -ne "SESSION_SECRET" -and
                 $key -ne "SESSION_SECURE" -and
                 $key -ne "SESSION_MAX_AGE" -and
                 $key -ne "LOG_LEVEL" -and
                 $key -ne "LOG_PRETTY" -and
                 $key -ne "NEON_API_KEY")) {
                $envVars[$key] = $value
            }
        }
    }
}

Write-Host "[OK] Found $($envVars.Count) production environment variables" -ForegroundColor Green
Write-Host ""

# Netlify API endpoint
$apiUrl = "https://api.netlify.com/api/v1/accounts/{account_slug}/env"
$siteApiUrl = "https://api.netlify.com/api/v1/sites/$SiteId"

# Headers
$headers = @{
    "Authorization" = "Bearer $AuthToken"
    "Content-Type" = "application/json"
}

Write-Host "[INFO] Getting site information..." -ForegroundColor Cyan
Write-Host "[INFO] Project: graceful-rolypoly-c18a32" -ForegroundColor Cyan
Write-Host "[INFO] Owner: Sabiscoore Team" -ForegroundColor Cyan
Write-Host ""

try {
    $siteInfo = Invoke-RestMethod -Uri $siteApiUrl -Headers $headers -Method Get
    $accountSlug = $siteInfo.account_slug
    
    Write-Host "[OK] Account: $accountSlug" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "[ERROR] Failed to get site information" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please verify:" -ForegroundColor Yellow
    Write-Host "  1. NETLIFY_AUTH_TOKEN is correct (nfp_PU6zf4UE2VrZjLFKytadE7Ch8uoTXi3c0481)" -ForegroundColor White
    Write-Host "  2. NETLIFY_SITE_ID is correct (022fe550-d17f-44f8-b187-193b4ddc78a0)" -ForegroundColor White
    Write-Host "  3. You have access to this site (sabiscore@gmail.com)" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Set environment variables using API
$envApiUrl = "https://api.netlify.com/api/v1/accounts/$accountSlug/env"

Write-Host "[INFO] Setting environment variables..." -ForegroundColor Cyan
Write-Host ""

$successCount = 0
$failCount = 0
$skippedCount = 0

foreach ($key in $envVars.Keys | Sort-Object) {
    $value = $envVars[$key]
    
    # Mask sensitive values in output
    $displayValue = if ($value.Length -gt 30) {
        $value.Substring(0, 30) + "..."
    } else {
        $value
    }
    
    Write-Host "  Setting $key = $displayValue" -ForegroundColor White
    
    # Prepare the request body
    $body = @{
        key = $key
        scopes = @("builds", "functions", "runtime", "post-processing")
        values = @(
            @{
                context = "all"
                value = $value
            }
        )
    } | ConvertTo-Json -Depth 10
    
    try {
        $result = Invoke-RestMethod -Uri $envApiUrl -Headers $headers -Method Post -Body $body
        Write-Host "    [SUCCESS]" -ForegroundColor Green
        $successCount++
    } catch {
        $errorMessage = $_.Exception.Message
        
        # Check if variable already exists
        if ($errorMessage -like "*already exists*" -or $errorMessage -like "*duplicate*") {
            Write-Host "    [SKIPPED] Already exists" -ForegroundColor Yellow
            $skippedCount++
        } else {
            Write-Host "    [FAILED] $errorMessage" -ForegroundColor Red
            $failCount++
        }
    }
}

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  Summary" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Variables set: $successCount" -ForegroundColor Green
Write-Host "  Already exist: $skippedCount" -ForegroundColor Yellow
Write-Host "  Failed: $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($successCount -gt 0 -or $skippedCount -gt 0) {
    Write-Host "[SUCCESS] Environment variables configured!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Trigger a new deployment at:" -ForegroundColor White
    Write-Host "     https://app.netlify.com/sites/graceful-rolypoly-c18a32/deploys" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  2. Or use CLI:" -ForegroundColor White
    Write-Host "     netlify deploy --prod" -ForegroundColor Yellow
    Write-Host ""
    
    $deploy = Read-Host "Open deployment page in browser? (y/N)"
    if ($deploy -eq "y" -or $deploy -eq "Y") {
        Start-Process "https://app.netlify.com/sites/graceful-rolypoly-c18a32/deploys"
    }
} else {
    Write-Host "[WARNING] No variables were set" -ForegroundColor Yellow
    Write-Host "Please check the errors above" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""
