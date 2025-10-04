# 🚀 Service Launcher Guide

**Quick Start**: Automated scripts to start and stop all Football Forecast services seamlessly.

---

## 📋 Available Scripts

### 1. Start All Services
```powershell
npm run start:all
```
**or**
```powershell
.\start-all-services.ps1
```

**What it does**:
- ✅ Validates environment variables
- ✅ Stops any existing processes on ports 5000 and 8000
- ✅ Starts Node.js backend in new window (port 5000)
- ✅ Starts Python ML service in new window (port 8000)
- ✅ Waits for services to initialize
- ✅ Runs health check automatically
- ✅ Services run in separate PowerShell windows

**Options**:
```powershell
# Skip health check
.\start-all-services.ps1 -SkipHealthCheck

# Skip ML service (Node only)
.\start-all-services.ps1 -SkipML

# Combine options
.\start-all-services.ps1 -SkipHealthCheck -SkipML
```

### 2. Stop All Services
```powershell
npm run stop:all
```
**or**
```powershell
.\stop-all-services.ps1
```

**What it does**:
- ✅ Stops all background jobs
- ✅ Kills processes on port 5000 (Node)
- ✅ Kills processes on port 8000 (Python)
- ✅ Cleans up orphaned processes
- ✅ Provides confirmation

### 3. Health Check Only
```powershell
npm run health:hybrid
```
**or**
```powershell
npm run check:hybrid
```

**What it does**:
- ✅ Checks environment configuration
- ✅ Verifies Node backend connectivity
- ✅ Verifies Python ML service connectivity
- ✅ Checks scraped data availability
- ✅ Validates scraping scheduler
- ✅ Provides summary report

---

## 🎯 Usage Examples

### Example 1: Fresh Start
```powershell
# Stop any existing services
npm run stop:all

# Start all services with health check
npm run start:all
```

### Example 2: Quick Restart
```powershell
# One-liner restart
npm run stop:all; npm run start:all
```

### Example 3: Development Mode (Node Only)
```powershell
# Start Node backend only (skip ML service)
.\start-all-services.ps1 -SkipML
```

### Example 4: Silent Start
```powershell
# Start without health check
.\start-all-services.ps1 -SkipHealthCheck
```

---

## 📊 Service Status

### After Starting Services

**Node Backend**:
- URL: http://localhost:5000
- Health: http://localhost:5000/api/health
- Metrics: http://localhost:5000/api/metrics

**Python ML Service**:
- URL: http://localhost:8000
- Docs: http://localhost:8000/docs
- Model Status: http://localhost:8000/model/status

**Frontend**:
- URL: http://localhost:5000
- Served by Node backend (Vite dev server)

---

## 🔍 Monitoring Services

### View Service Logs

**Services run in separate windows** - view logs directly in each window:
- Node Backend window shows Node.js logs
- Python ML Service window shows Python/Uvicorn logs

**Check Service Status**:
```powershell
# Check what's running on port 5000 (Node)
Get-NetTCPConnection -LocalPort 5000

# Check what's running on port 8000 (Python)
Get-NetTCPConnection -LocalPort 8000

# View all Node processes
Get-Process node

# View all Python processes
Get-Process python
```

### Manual Service Control

**Stop Specific Service**:
```powershell
# Stop Node backend
Get-NetTCPConnection -LocalPort 5000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Stop Python ML service
Get-NetTCPConnection -LocalPort 8000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

**Check Port Usage**:
```powershell
# Check what's running on port 5000
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue

# Check what's running on port 8000
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
```

---

## 🛠️ Troubleshooting

### Issue: Services Won't Start

**Solution 1 - Port Already in Use**:
```powershell
# Force stop all services
npm run stop:all

# Wait a moment
Start-Sleep -Seconds 2

# Try starting again
npm run start:all
```

**Solution 2 - Permission Denied**:
```powershell
# Run PowerShell as Administrator
# Then execute:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
npm run start:all
```

**Solution 3 - Environment Variables Missing**:
```powershell
# Check .env file exists
Test-Path .env

# If missing, copy from example
Copy-Item .env.example .env

# Edit .env and add required values
notepad .env
```

### Issue: Health Check Fails

**Check Services Manually**:
```powershell
# Test Node backend
curl http://localhost:5000/api/health

# Test Python ML service
curl http://localhost:8000/
```

**View Detailed Logs**:
```powershell
# Node logs
Get-Job | Where-Object {$_.Name -like '*node*'} | Receive-Job -Keep

# Python logs
Get-Job | Where-Object {$_.Name -like '*python*'} | Receive-Job -Keep
```

### Issue: Services Stop Unexpectedly

**Check for Errors**:
```powershell
# View all job output
Get-Job | Receive-Job

# Check specific job state
Get-Job | Select-Object Id, Name, State, HasMoreData
```

**Restart Failed Service**:
```powershell
# If Node failed
npm run dev

# If Python failed
npm run dev:python
```

---

## 📝 Script Details

### start-all-services.ps1

**Features**:
- Environment validation
- Port conflict resolution
- Automatic service initialization in separate windows
- Health check integration
- Process monitoring with retry logic
- Comprehensive error handling and logging

**Exit Codes**:
- `0`: Success
- `1`: Missing .env or required variables
- `1`: Service failed to start

### stop-all-services.ps1

**Features**:
- Graceful job termination
- Port-based process cleanup
- Orphaned process detection
- Comprehensive cleanup

**Always exits with code `0`** (uses Continue error action)

### check-hybrid-status.js

**Features**:
- Environment configuration check
- Service connectivity validation
- Scraped data availability check
- Scheduler status verification
- Summary report generation

**Exit Codes**:
- `0`: All checks passed (100%)
- `0`: Most checks passed (≥80%)
- `1`: Critical issues detected (<80%)

---

## 🎯 Best Practices

### Daily Development Workflow

**Morning Startup**:
```powershell
# Start fresh
npm run stop:all
npm run start:all
```

**During Development**:
```powershell
# Quick health check
npm run health:hybrid

# View logs if needed
Get-Job | Receive-Job
```

**End of Day**:
```powershell
# Clean shutdown
npm run stop:all
```

### Production Deployment

**Pre-Deployment Check**:
```powershell
# Ensure everything works locally
npm run start:all

# Wait for services to initialize
Start-Sleep -Seconds 10

# Run comprehensive health check
npm run health:hybrid

# If all green, proceed with deployment
```

---

## 📚 Related Documentation

- **Production Status**: `PRODUCTION_READY_FINAL_STATUS.md`
- **Hybrid Integration**: `HYBRID_INTEGRATION_FINAL_SUMMARY.md`
- **Quick Start**: `QUICK_START_HYBRID_INGESTION.md`
- **Environment Setup**: `.env.example`

---

## ✅ Quick Reference

| Command | Description |
|---------|-------------|
| `npm run start:all` | Start all services with health check |
| `npm run stop:all` | Stop all services gracefully |
| `npm run health:hybrid` | Run health check only |
| `npm run dev` | Start Node backend only |
| `npm run dev:python` | Start Python ML service only |
| `Get-Job` | View background jobs |
| `Get-Job \| Receive-Job` | View job output |
| `Get-Job \| Stop-Job` | Stop all jobs |

---

*Last Updated: 2025-10-04 06:01 UTC*
