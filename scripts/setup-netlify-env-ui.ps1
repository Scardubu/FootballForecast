#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Generate Netlify Environment Variables for UI Import

.DESCRIPTION
    This script reads your local .env file and generates a format
    that can be easily copied into the Netlify UI.
#>

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  Netlify Environment Variables - UI Import Format" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
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
            
            # Remove quotes if present
            $value = $value -replace '^["'']|["'']$', ''
            
            # Only include required vars and non-Netlify vars
            if ($requiredVars -contains $key -or 
                ($key -notlike "NETLIFY_*" -and 
                 $key -notlike "VITE_*" -and
                 $key -ne "NODE_ENV" -and
                 $key -ne "PORT")) {
                $envVars[$key] = $value
            }
        }
    }
}

Write-Host "[OK] Found $($envVars.Count) production environment variables" -ForegroundColor Green
Write-Host ""

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  Copy these to Netlify UI" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Project: graceful-rolypoly-c18a32 (Sabiscoore Team)" -ForegroundColor Cyan
Write-Host "Site ID: 022fe550-d17f-44f8-b187-193b4ddc78a0" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Go to: https://app.netlify.com/sites/graceful-rolypoly-c18a32/settings/env" -ForegroundColor Yellow
Write-Host "2. Click 'Add a variable' for each one below" -ForegroundColor Yellow
Write-Host "3. Copy the Key and Value exactly as shown" -ForegroundColor Yellow
Write-Host ""
Write-Host "---------------------------------------------------" -ForegroundColor Gray
Write-Host ""

foreach ($key in $envVars.Keys | Sort-Object) {
    $value = $envVars[$key]
    
    Write-Host "Key:   " -NoNewline -ForegroundColor Cyan
    Write-Host $key -ForegroundColor White
    Write-Host "Value: " -NoNewline -ForegroundColor Cyan
    Write-Host $value -ForegroundColor White
    Write-Host ""
}

Write-Host "---------------------------------------------------" -ForegroundColor Gray
Write-Host ""

# Save to a file for easy reference
$outputFile = "netlify-env-vars.txt"
$output = @"
Netlify Environment Variables
Project: graceful-rolypoly-c18a32 (Sabiscoore Team)
Site ID: 022fe550-d17f-44f8-b187-193b4ddc78a0
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

Instructions:
1. Go to: https://app.netlify.com/sites/graceful-rolypoly-c18a32/settings/env
2. Click 'Add a variable' for each variable below
3. Copy the Key and Value exactly as shown

---------------------------------------------------

"@

foreach ($key in $envVars.Keys | Sort-Object) {
    $value = $envVars[$key]
    $output += "Key:   $key`n"
    $output += "Value: $value`n`n"
}

$output | Out-File -FilePath $outputFile -Encoding UTF8

Write-Host "[OK] Variables also saved to: $outputFile" -ForegroundColor Green
Write-Host ""

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  Next Steps" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Open Netlify UI:" -ForegroundColor White
Write-Host "   https://app.netlify.com/sites/graceful-rolypoly-c18a32/settings/env" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Add each variable manually (or use bulk import if available)" -ForegroundColor White
Write-Host ""
Write-Host "3. After adding all variables, trigger a new deployment:" -ForegroundColor White
Write-Host "   https://app.netlify.com/sites/graceful-rolypoly-c18a32/deploys" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. Click 'Trigger deploy' -> 'Deploy site'" -ForegroundColor White
Write-Host ""

$openBrowser = Read-Host "Open Netlify settings in browser? (y/N)"
if ($openBrowser -eq "y" -or $openBrowser -eq "Y") {
    Start-Process "https://app.netlify.com/sites/graceful-rolypoly-c18a32/settings/env"
}

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""
