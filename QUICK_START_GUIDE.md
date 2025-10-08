# Quick Start Guide - Football Forecast

## 🚀 Get Started in 5 Minutes

### 1. Clone & Install
```bash
git clone <repository-url>
cd FootballForecast
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

**For Free API Plan (Recommended):**
```bash
# Edit .env
DISABLE_PREDICTION_SYNC=true
API_FOOTBALL_KEY=your_free_api_key
DATABASE_URL=your_neon_database_url
```

**For Paid API Plan:**
```bash
# Edit .env
DISABLE_PREDICTION_SYNC=false
API_FOOTBALL_KEY=your_paid_api_key
DATABASE_URL=your_neon_database_url
```

### 3. Run Development Server

**Full Stack (Recommended - includes ML service):**

```bash
npm run dev:full
```

**Without ML service:**

```bash
npm run dev:netlify
```

**Access:**

- Frontend: <http://localhost:5173>
- Backend: <http://localhost:5000>
- ML Service: <http://127.0.0.1:8000> (when using `dev:full`)

### 4. Build for Production
```bash
npm run build
```

### 5. Deploy to Netlify
```bash
npm run deploy
```

---

## 🔧 Common Commands

### Development

```bash
npm run dev:full       # Start all services: Node + Vite + ML (recommended)
npm run dev:netlify    # Start Node + Vite only (no ML)
npm run dev:node       # Start backend only
npm run dev:python     # Start ML service only
```

### Building
```bash
npm run build          # Build client and server
npm run build:client   # Build frontend only
npm run build:server   # Build backend only
```

### Testing
```bash
npm test               # Run all tests
npm run test:watch     # Run tests in watch mode
```

### Database
```bash
npm run db:push        # Push schema changes
npm run db:studio      # Open Drizzle Studio
```

---

## ⚙️ Configuration Quick Reference

### Essential Environment Variables

```bash
# Database (Required)
DATABASE_URL=postgresql://...

# API Football (Required)
API_FOOTBALL_KEY=your_key_here

# Prediction Sync (Important!)
DISABLE_PREDICTION_SYNC=true  # Set to true for free plans

# Authentication (Required)
API_BEARER_TOKEN=your_secure_token
SCRAPER_AUTH_TOKEN=your_scraper_token
```

### Optional Configuration

```bash
# ML Service
ML_SERVICE_URL=http://127.0.0.1:8000
ML_FALLBACK_ENABLED=false

# Logging
LOG_LEVEL=info
LOG_PRETTY=true

# Development
ENABLE_DEV_TOOLS=true
ENABLE_HOT_RELOAD=true
```

---

## 🎯 API Plan Configuration

### Free Plan Setup
**Best for:** Development, testing, low-traffic sites

```bash
DISABLE_PREDICTION_SYNC=true
PREDICTION_SYNC_INTERVAL_MINUTES=60
```

**Features:**
- ✅ Historical data (2021-2023)
- ✅ Fallback predictions
- ✅ Mock data for current fixtures
- ✅ Full UI functionality
- ❌ Real-time current fixtures
- ❌ Live match updates

### Paid Plan Setup
**Best for:** Production, high-traffic sites

```bash
DISABLE_PREDICTION_SYNC=false
PREDICTION_SYNC_INTERVAL_MINUTES=15
```

**Features:**
- ✅ Current season data (2024-2025)
- ✅ Real-time fixtures
- ✅ Live match updates
- ✅ Comprehensive statistics
- ✅ Higher rate limits

---

## 🐛 Troubleshooting

### Build Fails
```bash
# Clear dist and rebuild
rm -rf dist
npm run build
```

### Dev Server Won't Start
```bash
# Kill any running processes
# Windows:
taskkill /f /im node.exe
# Unix:
killall node

# Restart
npm run dev:netlify
```

### ML Service Not Detected
```bash
# Start the Python ML service (runs FastAPI on 127.0.0.1:8000)
npm run dev:python

# Verify health
curl http://127.0.0.1:8000/

# Ensure ML_SERVICE_URL uses 127.0.0.1 to avoid IPv6 (::1) issues on Windows
```

### API Errors
```bash
# Check API key
echo $API_FOOTBALL_KEY

# Verify environment loaded
npm run dev:netlify | grep "API_FOOTBALL_KEY found"
```

### Database Issues
```bash
# Reset database
npm run db:push

# Check connection
# Visit: http://localhost:5000/api/health
```

---

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Circuit Breaker Status
```bash
curl http://localhost:5000/api/diagnostics/circuit-breaker
```

### Cache Status
```bash
curl http://localhost:5000/api/diagnostics/cache
```

---

## 🎨 Development Tips

### Hot Reload
- Frontend changes: Instant HMR via Vite
- Backend changes: Auto-restart via tsx
- Database changes: Run `npm run db:push`

### Debugging
```bash
# Enable debug logs
LOG_LEVEL=debug npm run dev:netlify

# Check browser console for frontend errors
# Check terminal for backend errors
```

### Testing Offline Mode
```javascript
// In browser console
window.offlineTest.goOffline()  // Enable offline mode
window.offlineTest.goOnline()   // Restore online mode
window.offlineTest.toggle()     // Toggle mode
```

---

## 📦 Project Structure

```
FootballForecast/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── hooks/       # Custom hooks
│   │   └── lib/         # Utilities
│   └── index.html
├── server/              # Node.js backend
│   ├── routers/         # API routes
│   ├── services/        # Business logic
│   ├── middleware/      # Express middleware
│   └── index.ts
├── shared/              # Shared types
│   └── schema.ts
├── src/                 # Python ML service
│   ├── api/
│   └── ml/
└── docs/                # Documentation
```

---

## 🚢 Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Build completes successfully
- [ ] Health check passes
- [ ] API key valid
- [ ] DISABLE_PREDICTION_SYNC set correctly
- [ ] Netlify credentials configured

---

## 📚 Documentation

- `API_INTEGRATION_FIXES.md` - API integration details
- `INTEGRATION_COMPLETE_FINAL.md` - Complete status report
- `docs/architecture.md` - System architecture
- `docs/operational-runbook.md` - Operations guide
- `.env.example` - Environment configuration

---

## 🆘 Getting Help

1. Check logs for specific errors
2. Review documentation
3. Verify environment configuration
4. Check API plan status
5. Consult troubleshooting section

---

## ✅ Success Indicators

**Development Server:**
- ✅ Server starts without errors
- ✅ Frontend accessible at localhost:5173
- ✅ Backend accessible at localhost:5000
- ✅ No API_EMPTY_RESPONSE errors (with fixes)
- ✅ Clean logs with INFO level messages

**Production Build:**
- ✅ Build completes in ~1-2 minutes
- ✅ No compilation errors
- ✅ Optimized bundle sizes
- ✅ All assets generated

**Deployment:**
- ✅ Netlify deploy succeeds
- ✅ Site accessible at production URL
- ✅ Health check returns 200
- ✅ No console errors
- ✅ Features working as expected

---

**Status:** ✅ Ready for Development and Production
**Last Updated:** 2025-10-05
