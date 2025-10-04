# Football Forecast - All Services Launcher
# Starts Node backend, Python ML service, and runs health check

param(
    [switch]$SkipHealthCheck = $false,
    [switch]$SkipML = $false
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  Football Forecast - Service Launcher" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (!(Test-Path ".env")) {
    Write-Host "[ERROR] .env file not found!" -ForegroundColor Red
    Write-Host "   Please copy .env.example to .env and configure it." -ForegroundColor Yellow
    exit 1
}

# Load environment variables
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

Write-Host "[OK] Environment variables loaded" -ForegroundColor Green

# Check for required variables
$requiredVars = @(
    "DATABASE_URL",
    "API_FOOTBALL_KEY"
)

$missingVars = @()
foreach ($var in $requiredVars) {
    if (!(Test-Path "env:$var") -or [string]::IsNullOrWhiteSpace((Get-Item "env:$var").Value)) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "`n[ERROR] Missing required environment variables:" -ForegroundColor Red
    foreach ($var in $missingVars) {
        Write-Host "   - $var" -ForegroundColor Yellow
    }
    Write-Host "`nPlease configure these in your .env file.`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] All required environment variables present" -ForegroundColor Green

Write-Host "`n[STARTUP] Starting services..." -ForegroundColor Cyan

# Kill any existing Node.js and Python processes on the ports
Write-Host "   Checking for existing processes..." -ForegroundColor Yellow

# Check port 5000 (Node)
$nodePort = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($nodePort) {
    $nodePid = $nodePort.OwningProcess
    Write-Host "   Stopping existing Node process on port 5000 (PID: $nodePid)..." -ForegroundColor Yellow
    Stop-Process -Id $nodePid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Check port 8000 (Python)
if (!$SkipML) {
    $pythonPort = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
    if ($pythonPort) {
        $pythonPid = $pythonPort.OwningProcess
        Write-Host "   Stopping existing Python process on port 8000 (PID: $pythonPid)..." -ForegroundColor Yellow
        Stop-Process -Id $pythonPid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
}

# Start Node.js backend in new window
Write-Host "   Starting Node.js Backend (Port 5000)..." -ForegroundColor Yellow

$nodeProcess = Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$PWD'; Write-Host 'Node.js Backend (Port 5000)' -ForegroundColor Cyan; npm run dev"
) -PassThru -WindowStyle Normal

# Wait for Node to initialize
Write-Host "   Waiting for Node backend to initialize..." -ForegroundColor Yellow
$maxAttempts = 20
$attempt = 0
$nodeStarted = $false

while ($attempt -lt $maxAttempts) {
    Start-Sleep -Seconds 1
    $nodePort = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
    if ($nodePort) {
        # Port is listening, now verify the server is actually responding
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $nodeStarted = $true
                break
            }
        } catch {
            # Server not ready yet, continue waiting
        }
    }
    $attempt++
}

if (!$nodeStarted) {
    Write-Host "[ERROR] Node backend failed to start on port 5000" -ForegroundColor Red
    Write-Host "   Check the Node window for error messages" -ForegroundColor Yellow
    if ($nodeProcess -and !$nodeProcess.HasExited) {
        Stop-Process -Id $nodeProcess.Id -Force -ErrorAction SilentlyContinue
    }
    exit 1
}

Write-Host "[OK] Node backend started successfully (PID: $($nodePort.OwningProcess))" -ForegroundColor Green

# Start Python ML service (unless skipped)
if (!$SkipML) {
    Write-Host "   Starting Python ML Service (Port 8000)..." -ForegroundColor Yellow
    
    $pythonProcess = Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "cd '$PWD'; Write-Host 'Python ML Service (Port 8000)' -ForegroundColor Cyan; npm run dev:python"
    ) -PassThru -WindowStyle Normal
    
    # Wait for Python to initialize (ML services take longer to load models)
    Write-Host "   Waiting for Python ML service to initialize (this may take 45-60s)..." -ForegroundColor Yellow
    $maxAttempts = 60
    $attempt = 0
    $pythonStarted = $false
    
    while ($attempt -lt $maxAttempts) {
        Start-Sleep -Seconds 1
        
        # Show progress every 10 seconds
        if ($attempt % 10 -eq 0 -and $attempt -gt 0) {
            Write-Host "   Still waiting... ($attempt seconds elapsed)" -ForegroundColor Gray
        }
        
        $pythonPort = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
        if ($pythonPort) {
            # Port is listening, now verify the server is actually responding
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:8000/" -TimeoutSec 3 -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    $pythonStarted = $true
                    break
                }
            } catch {
                # Server not ready yet, continue waiting
            }
        }
        $attempt++
    }
    
    if (!$pythonStarted) {
        Write-Host "[ERROR] Python ML service failed to start on port 8000" -ForegroundColor Red
        Write-Host "   Check the Python window for error messages" -ForegroundColor Yellow
        
        # Stop Node process
        $nodePort = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
        if ($nodePort) {
            Stop-Process -Id $nodePort.OwningProcess -Force -ErrorAction SilentlyContinue
        }
        
        if ($pythonProcess -and !$pythonProcess.HasExited) {
            Stop-Process -Id $pythonProcess.Id -Force -ErrorAction SilentlyContinue
        }
        
        exit 1
    }
    
    Write-Host "[OK] Python ML service started successfully (PID: $($pythonPort.OwningProcess))" -ForegroundColor Green
}

Write-Host "`n[SUCCESS] All services started!" -ForegroundColor Green
Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  Service URLs:" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Frontend:         http://localhost:5000" -ForegroundColor White
Write-Host "  API:              http://localhost:5000/api" -ForegroundColor White
Write-Host "  Health:           http://localhost:5000/api/health" -ForegroundColor White

if (!$SkipML) {
    Write-Host "  ML Service:       http://localhost:8000" -ForegroundColor White
    Write-Host "  ML Docs:          http://localhost:8000/docs" -ForegroundColor White
}

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# Run health check unless skipped
if (!$SkipHealthCheck) {
    Write-Host "[HEALTH CHECK] Running system health check..." -ForegroundColor Cyan
    Write-Host ""
    
    # Wait a bit more for services to fully initialize
    Start-Sleep -Seconds 2
    
    # Run health check
    node scripts/check-hybrid-status.js
    $healthExitCode = $LASTEXITCODE
    
    Write-Host ""
    if ($healthExitCode -eq 0) {
        Write-Host "[SUCCESS] All health checks passed!" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Some health checks failed (see above)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  Services are running!" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Tips:" -ForegroundColor Yellow
Write-Host "     - Services are running in separate windows" -ForegroundColor White
Write-Host "     - View logs in each service window" -ForegroundColor White
Write-Host "     - Stop all services: npm run stop:all" -ForegroundColor White
Write-Host "     - Re-run health check: npm run health:hybrid" -ForegroundColor White
Write-Host ""
Write-Host "  Documentation:" -ForegroundColor Yellow
Write-Host "     - Production Status: PRODUCTION_READY_FINAL_STATUS.md" -ForegroundColor White
Write-Host "     - Hybrid Integration: HYBRID_INTEGRATION_FINAL_SUMMARY.md" -ForegroundColor White
Write-Host "     - Launcher Guide: LAUNCHER_GUIDE.md" -ForegroundColor White
Write-Host ""
Write-Host "  Services are running in background windows." -ForegroundColor Cyan
Write-Host "  Close service windows or run 'npm run stop:all' to stop." -ForegroundColor Cyan
Write-Host ""
