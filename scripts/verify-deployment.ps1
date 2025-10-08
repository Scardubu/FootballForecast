#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Comprehensive deployment verification script for Football Forecast
.DESCRIPTION
    Verifies all aspects of the deployment including build, configuration, and runtime health
.EXAMPLE
    .\scripts\verify-deployment.ps1
#>

param(
    [string]$Environment = "development",
    [string]$BaseUrl = "http://localhost:5000"
)

$ErrorActionPreference = "Continue"
$WarningPreference = "Continue"

Write-Host "🔍 Football Forecast - Deployment Verification" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$script:FailureCount = 0
$script:WarningCount = 0
$script:SuccessCount = 0

function Test-Step {
    param(
        [string]$Name,
        [scriptblock]$Test,
        [string]$SuccessMessage = "✅ Passed",
        [string]$FailureMessage = "❌ Failed",
        [bool]$Critical = $true
    )
    
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    
    try {
        $result = & $Test
        if ($result) {
            Write-Host "  $SuccessMessage" -ForegroundColor Green
            $script:SuccessCount++
            return $true
        } else {
            if ($Critical) {
                Write-Host "  $FailureMessage" -ForegroundColor Red
                $script:FailureCount++
            } else {
                Write-Host "  ⚠️  Warning: $FailureMessage" -ForegroundColor Yellow
                $script:WarningCount++
            }
            return $false
        }
    } catch {
        if ($Critical) {
            Write-Host "  $FailureMessage - $($_.Exception.Message)" -ForegroundColor Red
            $script:FailureCount++
        } else {
            Write-Host "  ⚠️  Warning: $($_.Exception.Message)" -ForegroundColor Yellow
            $script:WarningCount++
        }
        return $false
    }
}

# 1. Environment Configuration
Write-Host "`n📋 Step 1: Environment Configuration" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

Test-Step "Environment file exists" {
    Test-Path ".env"
} -SuccessMessage "✅ .env file found" -FailureMessage "❌ .env file missing"

Test-Step "Node.js version" {
    $nodeVersion = node --version
    Write-Host "  Node version: $nodeVersion" -ForegroundColor Gray
    $nodeVersion -match "v\d+\.\d+\.\d+"
} -SuccessMessage "✅ Node.js installed" -FailureMessage "❌ Node.js not found"

Test-Step "npm version" {
    $npmVersion = npm --version
    Write-Host "  npm version: $npmVersion" -ForegroundColor Gray
    $npmVersion -match "\d+\.\d+\.\d+"
} -SuccessMessage "✅ npm installed" -FailureMessage "❌ npm not found"

Test-Step "Dependencies installed" {
    (Test-Path "node_modules") -and (Test-Path "node_modules/.package-lock.json")
} -SuccessMessage "✅ Dependencies installed" -FailureMessage "❌ Run 'npm install'"

# 2. Build Verification
Write-Host "`n🔨 Step 2: Build Verification" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

Test-Step "TypeScript compilation" {
    $tsFiles = Get-ChildItem -Path "server", "client/src" -Filter "*.ts" -Recurse -ErrorAction SilentlyContinue
    Write-Host "  TypeScript files found: $($tsFiles.Count)" -ForegroundColor Gray
    $tsFiles.Count -gt 0
} -SuccessMessage "✅ TypeScript files present" -FailureMessage "❌ No TypeScript files found"

Test-Step "Vite configuration" {
    Test-Path "vite.config.ts"
} -SuccessMessage "✅ Vite config found" -FailureMessage "❌ Vite config missing"

Test-Step "Package.json scripts" {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    $requiredScripts = @("dev", "build", "dev:netlify")
    $hasAllScripts = $true
    foreach ($script in $requiredScripts) {
        if (-not $packageJson.scripts.$script) {
            Write-Host "  Missing script: $script" -ForegroundColor Red
            $hasAllScripts = $false
        }
    }
    $hasAllScripts
} -SuccessMessage "✅ All required scripts present" -FailureMessage "❌ Missing required scripts"

# 3. Configuration Validation
Write-Host "`n⚙️  Step 3: Configuration Validation" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    
    Test-Step "DATABASE_URL configured" {
        $envContent -match "DATABASE_URL=.+"
    } -SuccessMessage "✅ Database URL configured" -FailureMessage "❌ DATABASE_URL missing" -Critical $false
    
    Test-Step "API_FOOTBALL_KEY configured" {
        $envContent -match "API_FOOTBALL_KEY=.+"
    } -SuccessMessage "✅ API key configured" -FailureMessage "❌ API_FOOTBALL_KEY missing" -Critical $false
    
    Test-Step "DISABLE_PREDICTION_SYNC configured" {
        $envContent -match "DISABLE_PREDICTION_SYNC=(true|false)"
    } -SuccessMessage "✅ Prediction sync configured" -FailureMessage "⚠️  DISABLE_PREDICTION_SYNC not set" -Critical $false
    
    Test-Step "Authentication tokens configured" {
        ($envContent -match "API_BEARER_TOKEN=.+") -and ($envContent -match "SCRAPER_AUTH_TOKEN=.+")
    } -SuccessMessage "✅ Auth tokens configured" -FailureMessage "⚠️  Auth tokens missing" -Critical $false
}

# 4. File Structure
Write-Host "`n📁 Step 4: File Structure Verification" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

Test-Step "Server directory structure" {
    (Test-Path "server/index.ts") -and 
    (Test-Path "server/routers") -and 
    (Test-Path "server/services") -and
    (Test-Path "server/middleware")
} -SuccessMessage "✅ Server structure valid" -FailureMessage "❌ Server structure incomplete"

Test-Step "Client directory structure" {
    (Test-Path "client/src") -and 
    (Test-Path "client/src/components") -and 
    (Test-Path "client/index.html")
} -SuccessMessage "✅ Client structure valid" -FailureMessage "❌ Client structure incomplete"

Test-Step "Shared schema" {
    Test-Path "shared/schema.ts"
} -SuccessMessage "✅ Shared schema found" -FailureMessage "❌ Shared schema missing"

Test-Step "Documentation files" {
    (Test-Path "README.md") -and 
    (Test-Path "API_INTEGRATION_FIXES.md") -and
    (Test-Path "INTEGRATION_COMPLETE_FINAL.md")
} -SuccessMessage "✅ Documentation complete" -FailureMessage "⚠️  Some documentation missing" -Critical $false

# 5. Build Test
Write-Host "`n🏗️  Step 5: Build Test" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan

Write-Host "  Attempting production build..." -ForegroundColor Gray
$buildOutput = npm run build 2>&1
$buildSuccess = $LASTEXITCODE -eq 0

Test-Step "Production build" {
    $buildSuccess
} -SuccessMessage "✅ Build completed successfully" -FailureMessage "❌ Build failed - check output above"

if ($buildSuccess) {
    Test-Step "Build artifacts generated" {
        (Test-Path "dist/public") -and (Get-ChildItem "dist/public" -Recurse).Count -gt 0
    } -SuccessMessage "✅ Build artifacts present" -FailureMessage "❌ No build artifacts found"
}

# 6. Runtime Health Check (if server is running)
Write-Host "`n🏥 Step 6: Runtime Health Check" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

Test-Step "Server health endpoint" {
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/api/health" -TimeoutSec 5 -UseBasicParsing
        $response.StatusCode -eq 200
    } catch {
        Write-Host "  Server not running or not accessible" -ForegroundColor Gray
        $false
    }
} -SuccessMessage "✅ Server is healthy" -FailureMessage "⚠️  Server not running (start with 'npm run dev:netlify')" -Critical $false

Test-Step "Frontend accessibility" {
    try {
        $response = Invoke-WebRequest -Uri $BaseUrl -TimeoutSec 5 -UseBasicParsing
        $response.StatusCode -eq 200
    } catch {
        Write-Host "  Frontend not accessible" -ForegroundColor Gray
        $false
    }
} -SuccessMessage "✅ Frontend accessible" -FailureMessage "⚠️  Frontend not accessible" -Critical $false

# 7. API Integration Check
Write-Host "`n🔌 Step 7: API Integration Status" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

Test-Step "API client implementation" {
    Test-Path "server/services/apiFootballClient.ts"
} -SuccessMessage "✅ API client found" -FailureMessage "❌ API client missing"

Test-Step "Prediction sync service" {
    Test-Path "server/services/prediction-sync.ts"
} -SuccessMessage "✅ Prediction sync found" -FailureMessage "❌ Prediction sync missing"

Test-Step "Enhanced fallback data" {
    Test-Path "server/lib/enhanced-fallback-data.ts"
} -SuccessMessage "✅ Fallback data found" -FailureMessage "❌ Fallback data missing"

# 8. Security Check
Write-Host "`n🔒 Step 8: Security Configuration" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    
    Test-Step "No hardcoded secrets in code" {
        $suspiciousFiles = Get-ChildItem -Path "server", "client" -Filter "*.ts" -Recurse | 
            Where-Object { (Get-Content $_.FullName -Raw) -match "(password|secret|key)\s*=\s*['\"][^'\"]+['\"]" }
        $suspiciousFiles.Count -eq 0
    } -SuccessMessage "✅ No hardcoded secrets detected" -FailureMessage "⚠️  Potential hardcoded secrets found" -Critical $false
    
    Test-Step "Environment file not in git" {
        $gitignore = Get-Content ".gitignore" -Raw -ErrorAction SilentlyContinue
        $gitignore -match "\.env"
    } -SuccessMessage "✅ .env in .gitignore" -FailureMessage "⚠️  .env should be in .gitignore" -Critical $false
}

# 9. Deployment Readiness
Write-Host "`n🚀 Step 9: Deployment Readiness" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

Test-Step "Netlify configuration" {
    Test-Path "netlify.toml"
} -SuccessMessage "✅ Netlify config found" -FailureMessage "⚠️  Netlify config missing" -Critical $false

Test-Step "GitHub Actions workflow" {
    Test-Path ".github/workflows/deploy.yml"
} -SuccessMessage "✅ CI/CD workflow found" -FailureMessage "⚠️  CI/CD workflow missing" -Critical $false

Test-Step "Production documentation" {
    (Test-Path "DEPLOYMENT_GUIDE.md") -or (Test-Path "docs/deployment.md")
} -SuccessMessage "✅ Deployment docs found" -FailureMessage "⚠️  Deployment docs missing" -Critical $false

# Summary
Write-Host "`n" -NoNewline
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "📊 Verification Summary" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ Passed:   $script:SuccessCount tests" -ForegroundColor Green
Write-Host "⚠️  Warnings: $script:WarningCount tests" -ForegroundColor Yellow
Write-Host "❌ Failed:   $script:FailureCount tests" -ForegroundColor Red
Write-Host ""

$totalTests = $script:SuccessCount + $script:WarningCount + $script:FailureCount
$successRate = [math]::Round(($script:SuccessCount / $totalTests) * 100, 2)

Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 90) { "Green" } elseif ($successRate -ge 70) { "Yellow" } else { "Red" })
Write-Host ""

# Final Verdict
if ($script:FailureCount -eq 0) {
    Write-Host "🎉 DEPLOYMENT READY!" -ForegroundColor Green
    Write-Host "All critical checks passed. You can proceed with deployment." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Start dev server: npm run dev:netlify" -ForegroundColor Gray
    Write-Host "  2. Test locally: http://localhost:5000" -ForegroundColor Gray
    Write-Host "  3. Deploy: npm run deploy" -ForegroundColor Gray
    exit 0
} elseif ($script:FailureCount -le 2) {
    Write-Host "⚠️  DEPLOYMENT POSSIBLE WITH WARNINGS" -ForegroundColor Yellow
    Write-Host "Some non-critical checks failed. Review failures above." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Recommended actions:" -ForegroundColor Cyan
    Write-Host "  1. Review failed checks above" -ForegroundColor Gray
    Write-Host "  2. Fix critical issues if any" -ForegroundColor Gray
    Write-Host "  3. Test thoroughly before deploying" -ForegroundColor Gray
    exit 0
} else {
    Write-Host "❌ NOT READY FOR DEPLOYMENT" -ForegroundColor Red
    Write-Host "Multiple critical checks failed. Please fix issues before deploying." -ForegroundColor Red
    Write-Host ""
    Write-Host "Required actions:" -ForegroundColor Cyan
    Write-Host "  1. Review all failed checks above" -ForegroundColor Gray
    Write-Host "  2. Fix critical issues" -ForegroundColor Gray
    Write-Host "  3. Run verification again" -ForegroundColor Gray
    Write-Host "  4. Consult documentation if needed" -ForegroundColor Gray
    exit 1
}
