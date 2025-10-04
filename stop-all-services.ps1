# Football Forecast - Stop All Services
# Gracefully stops all running services

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  Football Forecast - Stop All Services" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# Stop all background jobs
Write-Host "[CLEANUP] Stopping background jobs..." -ForegroundColor Yellow
$jobs = Get-Job
if ($jobs) {
    foreach ($job in $jobs) {
        Write-Host "   Stopping job: $($job.Name) (ID: $($job.Id))" -ForegroundColor Yellow
        Stop-Job -Job $job -ErrorAction SilentlyContinue
        Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
    }
    Write-Host "[OK] All background jobs stopped" -ForegroundColor Green
} else {
    Write-Host "[INFO] No background jobs found" -ForegroundColor Cyan
}

# Stop processes on port 5000 (Node)
Write-Host "`n[CLEANUP] Checking port 5000 (Node backend)..." -ForegroundColor Yellow
$nodePort = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($nodePort) {
    $nodePid = $nodePort.OwningProcess
    Write-Host "   Stopping Node process (PID: $nodePid)..." -ForegroundColor Yellow
    Stop-Process -Id $nodePid -Force -ErrorAction SilentlyContinue
    Write-Host "[OK] Node backend stopped" -ForegroundColor Green
} else {
    Write-Host "[INFO] No process found on port 5000" -ForegroundColor Cyan
}

# Stop processes on port 8000 (Python)
Write-Host "`n[CLEANUP] Checking port 8000 (Python ML service)..." -ForegroundColor Yellow
$pythonPort = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($pythonPort) {
    $pythonPid = $pythonPort.OwningProcess
    Write-Host "   Stopping Python process (PID: $pythonPid)..." -ForegroundColor Yellow
    Stop-Process -Id $pythonPid -Force -ErrorAction SilentlyContinue
    Write-Host "[OK] Python ML service stopped" -ForegroundColor Green
} else {
    Write-Host "[INFO] No process found on port 8000" -ForegroundColor Cyan
}

# Additional cleanup - stop any orphaned node.exe or python.exe processes
Write-Host "`n[CLEANUP] Checking for orphaned processes..." -ForegroundColor Yellow

$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*FootballForecast*"
}

if ($nodeProcesses) {
    foreach ($proc in $nodeProcesses) {
        Write-Host "   Stopping orphaned Node process (PID: $($proc.Id))..." -ForegroundColor Yellow
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "[OK] Orphaned Node processes stopped" -ForegroundColor Green
} else {
    Write-Host "[INFO] No orphaned Node processes found" -ForegroundColor Cyan
}

$pythonProcesses = Get-Process -Name python -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*FootballForecast*" -or $_.CommandLine -like "*uvicorn*"
}

if ($pythonProcesses) {
    foreach ($proc in $pythonProcesses) {
        Write-Host "   Stopping orphaned Python process (PID: $($proc.Id))..." -ForegroundColor Yellow
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "[OK] Orphaned Python processes stopped" -ForegroundColor Green
} else {
    Write-Host "[INFO] No orphaned Python processes found" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  All services stopped successfully!" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  To restart services, run: .\start-all-services.ps1" -ForegroundColor Cyan
Write-Host ""
