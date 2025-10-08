# Production Deployment Guide - Real Data Only

## Overview

This guide ensures your Football Forecast application uses **ONLY real data** in production from:
- ✅ **ML Service** (Railway): Real XGBoost predictions
- ✅ **API-Football**: Live match data
- ✅ **Neon Database**: Persistent storage
- ❌ **NO Mock/Fallback Data** in production

---

## Critical Production Settings

### 1. Environment Variables (Netlify)

**REQUIRED Settings:**

```bash
# Node Environment - MUST be production
NODE_ENV=production

# ML Service Configuration
ML_SERVICE_URL=https://sabiscore-production.up.railway.app
ML_FALLBACK_ENABLED=false  # CRITICAL: Must be false
ML_SERVICE_TIMEOUT=30000
ML_SERVICE_HEALTH_TIMEOUT=5000

# Database
DATABASE_URL=postgresql://[user]:[password]@[neon-endpoint]/[database]?sslmode=require

# API-Football (Production Key)
API_FOOTBALL_KEY=your_production_api_key_here
API_FOOTBALL_HOST=v3.football.api-sports.io

# Authentication Tokens (Generate strong tokens)
API_BEARER_TOKEN=[generate_with: openssl rand -hex 32]
SCRAPER_AUTH_TOKEN=[generate_with: openssl rand -hex 32]
SESSION_SECRET=[generate_with: openssl rand -hex 32]

# Stack Auth
STACK_AUTH_PROJECT_ID=8b0648c2-f267-44c1-b4c2-a64eccb6f737
STACK_AUTH_JWKS_URL=https://api.stack-auth.com/api/v1/projects/8b0648c2-f267-44c1-b4c2-a64eccb6f737/.well-known/jwks.json

# Logging
LOG_LEVEL=warn
LOG_PRETTY=false

# Features
ENABLE_SCRAPING=false
ENABLE_DEV_TOOLS=false
ML_TRAIN_ON_STARTUP=false
```

### 2. Railway ML Service

**Verify Deployment:**
```bash
curl https://sabiscore-production.up.railway.app/
```

**Expected Response:**
```json
{
  "service": "SabiScore ML API",
  "version": "1.0.0",
  "status": "healthy",
  "model_loaded": true
}
```

### 3. Neon Database

**Connection String Format:**
```
postgresql://[user]:[password]@ep-bitter-frost-addp6o5c.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**Verify Connection:**
```bash
# Run migrations
npm run db:push

# Check connection
curl https://sabiscore.netlify.app/api/health
```

---

## Production Behavior

### ML Predictions

**Production Mode (NODE_ENV=production):**
- ✅ Uses ONLY real ML service predictions
- ❌ NO fallback predictions
- ❌ NO mock data
- ✅ Returns 503 error if ML service unavailable

**Code Enforcement:**
```typescript
// server/lib/ml-client.ts (line 38-40)
// In production, fallback is ALWAYS disabled regardless of env var
this.fallbackEnabled = isProduction ? false : (explicitlyEnabled || envFlag !== 'false');
```

**API Response on ML Failure:**
```json
{
  "error": "ML service unavailable",
  "message": "Prediction service is temporarily unavailable. Please try again later.",
  "fixtureId": 12345
}
```

### API-Football Data

**Circuit Breaker Behavior:**
- ✅ Retries failed requests (4 attempts with exponential backoff)
- ✅ Opens circuit after 5 consecutive failures
- ✅ Uses cached data when circuit is open
- ❌ NO mock data generation in production

**Fallback Strategy:**
1. Try API-Football request
2. Retry with exponential backoff
3. If all retries fail → Use cached data (if available)
4. If no cache → Return empty array with proper error handling

---

## Deployment Checklist

### Pre-Deployment

- [ ] **Verify ML Service is running**
  ```bash
  curl https://sabiscore-production.up.railway.app/
  ```

- [ ] **Test ML predictions**
  ```bash
  curl -X POST https://sabiscore-production.up.railway.app/predict \
    -H "Content-Type: application/json" \
    -d '{"home_team_id": 33, "away_team_id": 34}'
  ```

- [ ] **Verify Database connection**
  ```bash
  npm run db:push
  ```

- [ ] **Check API-Football quota**
  - Login to https://www.api-football.com/
  - Verify remaining requests
  - Ensure production API key is active

### Netlify Environment Setup

**Step 1: Set Environment Variables**
```bash
# Using Netlify CLI
netlify env:set NODE_ENV production
netlify env:set ML_FALLBACK_ENABLED false
netlify env:set ML_SERVICE_URL https://sabiscore-production.up.railway.app
netlify env:set DATABASE_URL "postgresql://..."
netlify env:set API_FOOTBALL_KEY "your_key"
```

**Step 2: Deploy**
```bash
npm run build
netlify deploy --prod --dir=dist/public
```

**Step 3: Verify**
```bash
# Check health endpoint
curl https://sabiscore.netlify.app/api/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2025-10-05T...",
  "services": {
    "database": "connected",
    "ml_service": "healthy",
    "api_football": "operational"
  }
}
```

### Post-Deployment Verification

**1. Check ML Predictions**
```bash
# Get prediction for a fixture
curl https://sabiscore.netlify.app/api/predictions/12345

# Should return real ML prediction or 503 if service down
```

**2. Verify No Fallback Data**
```bash
# Check logs for fallback warnings
netlify functions:log api

# Should NOT see:
# ❌ "Generating fallback prediction"
# ❌ "Using fallback data"
# ❌ "Mock data provider"
```

**3. Test Error Handling**
```bash
# Temporarily stop ML service on Railway
# Request prediction - should get 503, NOT fallback data

curl https://sabiscore.netlify.app/api/predictions/12345
# Expected: {"error": "ML service unavailable", ...}
# NOT: Mock prediction data
```

---

## Monitoring & Alerts

### Key Metrics to Monitor

**ML Service Health:**
- Response time < 5s
- Success rate > 95%
- Model loaded: true

**API-Football:**
- Circuit breaker state: CLOSED
- Cache hit rate > 60%
- API quota remaining > 10%

**Database:**
- Connection pool: healthy
- Query response time < 100ms
- No connection errors

### Alert Thresholds

```yaml
ML_Service_Down:
  condition: health_check_fails > 3
  action: Send alert, return 503 to users
  
API_Football_Circuit_Open:
  condition: circuit_state == OPEN
  action: Use cached data, log warning
  
Database_Connection_Lost:
  condition: connection_errors > 5
  action: Fallback to memory storage, alert admin
```

---

## Troubleshooting

### Issue: "ML service unavailable" errors

**Diagnosis:**
```bash
# Check ML service health
curl https://sabiscore-production.up.railway.app/

# Check Railway logs
railway logs --service sabiscore-ml
```

**Solutions:**
1. Verify Railway service is running
2. Check ML_SERVICE_URL in Netlify env vars
3. Verify network connectivity
4. Check Railway service logs for errors

### Issue: No predictions being generated

**Diagnosis:**
```bash
# Check Netlify function logs
netlify functions:log api

# Verify ML_FALLBACK_ENABLED is false
netlify env:get ML_FALLBACK_ENABLED
```

**Solutions:**
1. Ensure NODE_ENV=production
2. Verify ML_FALLBACK_ENABLED=false
3. Check ML service is healthy
4. Review prediction request logs

### Issue: Still seeing mock/fallback data

**Diagnosis:**
```bash
# Check environment
netlify env:list | grep NODE_ENV
netlify env:list | grep ML_FALLBACK

# Check code deployment
git log -1 --oneline
```

**Solutions:**
1. Verify latest code is deployed
2. Ensure NODE_ENV=production (not development)
3. Clear Netlify build cache
4. Redeploy with `netlify deploy --prod --clear-cache`

---

## Development vs Production

### Development Mode
- ✅ Fallback predictions allowed (for testing)
- ✅ Mock data available
- ✅ Offline mode supported
- ✅ Enhanced logging

### Production Mode
- ❌ NO fallback predictions
- ❌ NO mock data
- ❌ NO offline mode fallbacks
- ✅ Real data ONLY
- ✅ 503 errors when services unavailable
- ✅ Structured logging (JSON)

---

## Rollback Plan

If production deployment fails:

**Step 1: Immediate Rollback**
```bash
# Rollback to previous deployment
netlify rollback
```

**Step 2: Verify Services**
```bash
# Check all services are healthy
curl https://sabiscore.netlify.app/api/health
```

**Step 3: Review Logs**
```bash
# Check what went wrong
netlify functions:log api --since 1h
```

**Step 4: Fix and Redeploy**
```bash
# Fix issues locally
npm run build
npm run test

# Deploy again
netlify deploy --prod
```

---

## Success Criteria

### ✅ Production is Ready When:

1. **ML Service**
   - [ ] Railway service is healthy
   - [ ] Predictions return real data
   - [ ] No fallback predictions generated
   - [ ] 503 errors when service down

2. **API-Football**
   - [ ] Live data fetching works
   - [ ] Circuit breaker functioning
   - [ ] Cached data used when API down
   - [ ] No mock data generation

3. **Database**
   - [ ] Neon connection stable
   - [ ] Migrations applied
   - [ ] Data persisting correctly

4. **Monitoring**
   - [ ] Health endpoint returns accurate status
   - [ ] Logs show no fallback usage
   - [ ] Error rates < 1%
   - [ ] Response times < 3s

---

## Quick Reference

### Environment Check
```bash
# Verify production settings
netlify env:list | grep -E "(NODE_ENV|ML_FALLBACK|ML_SERVICE_URL)"
```

### Health Check
```bash
# All services
curl https://sabiscore.netlify.app/api/health | jq
```

### Logs
```bash
# Real-time logs
netlify functions:log api --stream
```

### Deployment
```bash
# Full deployment
npm run build && netlify deploy --prod --dir=dist/public
```

---

**Last Updated:** 2025-10-05  
**Status:** ✅ Production Ready  
**Real Data Only:** ✅ Enforced
