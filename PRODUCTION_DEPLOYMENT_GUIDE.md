# Production Deployment Guide

## ✅ Pre-Deployment Checklist

### **1. Environment Configuration**

#### **Get Neon Database Credentials**
```powershell
# Automatically fetch your Neon connection string
npm run neon:credentials
```

This will output your production-ready `DATABASE_URL`. Copy it to your deployment platform's environment variables.

#### **Required Environment Variables**

**Database:**
```bash
DATABASE_URL=postgresql://user:pass@ep-bitter-frost-addp6o5c.us-east-1.aws.neon.tech/neondb?sslmode=require
NEON_API_KEY=napi_2lv04r1pas134aqnp9s2qhlygsmq1ha11nvtp61xojnzgk9jm1hhukc53w06pdea
```

**Authentication:**
```bash
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
API_BEARER_TOKEN=GENERATE_UNIQUE_TOKEN
SCRAPER_AUTH_TOKEN=GENERATE_UNIQUE_TOKEN
SESSION_SECRET=GENERATE_64_CHAR_HEX

# Stack Auth (already configured)
STACK_AUTH_PROJECT_ID=8b0648c2-f267-44c1-b4c2-a64eccb6f737
STACK_AUTH_JWKS_URL=https://api.stack-auth.com/api/v1/projects/8b0648c2-f267-44c1-b4c2-a64eccb6f737/.well-known/jwks.json
VITE_STACK_AUTH_PROJECT_ID=8b0648c2-f267-44c1-b4c2-a64eccb6f737
```

**API Keys:**
```bash
API_FOOTBALL_KEY=your_production_api_key
API_FOOTBALL_HOST=v3.football.api-sports.io
```

**Application:**
```bash
NODE_ENV=production
PORT=5000
LOG_LEVEL=warn
LOG_PRETTY=false
```

---

## 🚀 Deployment Steps

### **Option 1: Netlify (Recommended)**

#### **Step 1: Build the Application**
```powershell
npm run build
```

#### **Step 2: Set Environment Variables**
```powershell
# Run get-neon-credentials first
npm run neon:credentials

# Then set all variables
netlify env:set DATABASE_URL "your-neon-connection-string"
netlify env:set NEON_API_KEY "your-neon-api-key"
netlify env:set STACK_AUTH_PROJECT_ID "8b0648c2-f267-44c1-b4c2-a64eccb6f737"
netlify env:set VITE_STACK_AUTH_PROJECT_ID "8b0648c2-f267-44c1-b4c2-a64eccb6f737"
netlify env:set API_FOOTBALL_KEY "your-api-key"
netlify env:set NODE_ENV "production"

# Generate and set secure tokens
netlify env:set API_BEARER_TOKEN "$(node -e \"console.log(require('crypto').randomBytes(32).toString('base64url'))\")"
netlify env:set SCRAPER_AUTH_TOKEN "$(node -e \"console.log(require('crypto').randomBytes(32).toString('base64url'))\")"
netlify env:set SESSION_SECRET "$(node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\")"
```

#### **Step 3: Deploy**
```powershell
netlify deploy --prod
```

---

### **Option 2: Render**

#### **Step 1: Create Web Service**
1. Go to Render Dashboard
2. Click "New" → "Web Service"
3. Connect your GitHub repository

#### **Step 2: Configure Build Settings**
- **Build Command:** `npm run build:client`
- **Start Command:** `npm start`
- **Environment:** Node

#### **Step 3: Add Environment Variables**
Go to Environment tab and add all variables from `.env.production.example`

#### **Step 4: Deploy**
Render will automatically deploy on git push.

---

### **Option 3: Vercel**

#### **Step 1: Install Vercel CLI**
```powershell
npm i -g vercel
```

#### **Step 2: Deploy**
```powershell
vercel --prod
```

Follow prompts and add environment variables when requested.

---

## 🔧 Post-Deployment Configuration

### **1. Database Migration**
After deployment, push your schema to Neon:

```powershell
# Set DATABASE_URL to production value temporarily
$env:DATABASE_URL="your-production-neon-url"
npm run db:push
```

### **2. Verify Deployment**

#### **Health Check**
```bash
curl https://your-app.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-03T23:00:00.000Z",
  "environment": "production",
  "version": "1.0.0",
  "database": {
    "connected": true,
    "provider": "neon"
  }
}
```

#### **Auth Check**
```bash
curl https://your-app.com/api/auth/status
```

Expected (unauthenticated):
```json
{
  "authenticated": false
}
```

#### **Stack Auth Check**
```bash
curl -H "Authorization: Bearer YOUR_JWT" \
  https://your-app.com/api/auth/status
```

Expected (authenticated):
```json
{
  "authenticated": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com"
  }
}
```

---

## 🔒 Security Checklist

### **Before Production**
- [ ] All `API_BEARER_TOKEN` values are unique and strong (32+ chars)
- [ ] `SESSION_SECRET` is cryptographically random (64+ chars)
- [ ] `NODE_ENV=production` is set
- [ ] `LOG_LEVEL=warn` or `error` (not `debug`)
- [ ] `SESSION_SECURE=true` for HTTPS
- [ ] Database credentials are production-specific
- [ ] No development tokens or keys in production
- [ ] CORS origins are properly configured
- [ ] Rate limiting is enabled
- [ ] HTTPS/SSL is enforced

### **Post-Deployment**
- [ ] Test authentication flow end-to-end
- [ ] Verify database connectivity
- [ ] Check error logging and monitoring
- [ ] Test API rate limits
- [ ] Verify predictions endpoint
- [ ] Check betting insights functionality
- [ ] Test offline mode graceful degradation

---

## 📊 Monitoring & Observability

### **Built-in Endpoints**

#### **Health Check**
```
GET /api/health
```
Returns system health status, database connectivity, and version info.

#### **Performance Metrics**
```
GET /api/telemetry/performance
```
Returns performance metrics for API endpoints.

#### **Error Statistics**
```
GET /api/telemetry/errors
```
Returns error rates and categories.

### **Recommended External Monitoring**

#### **Sentry (Error Tracking)**
```bash
# Add to environment
SENTRY_DSN=your_sentry_dsn_here
```

#### **Application Insights (Azure)**
```bash
APPLICATIONINSIGHTS_CONNECTION_STRING=your_connection_string
```

---

## 🐛 Troubleshooting

### **Issue: Database Connection Failed**

**Symptoms:**
- 500 errors on all API endpoints
- Health check shows `database.connected: false`

**Solutions:**
1. Verify `DATABASE_URL` format includes `?sslmode=require`
2. Check Neon project is not paused (free tier auto-pauses)
3. Test connection manually:
   ```powershell
   psql "$env:DATABASE_URL"
   ```
4. Run `npm run neon:credentials` to get fresh connection string

---

### **Issue: Authentication Not Working**

**Symptoms:**
- 401 errors on protected endpoints
- JWT verification fails

**Solutions:**
1. Verify `STACK_AUTH_PROJECT_ID` matches frontend and backend
2. Check JWKS URL is accessible:
   ```bash
   curl https://api.stack-auth.com/api/v1/projects/8b0648c2-f267-44c1-b4c2-a64eccb6f737/.well-known/jwks.json
   ```
3. Ensure JWT is not expired (check `exp` claim)
4. For legacy tokens, verify `API_BEARER_TOKEN` matches

---

### **Issue: High Response Times**

**Symptoms:**
- Slow API responses
- Timeouts

**Solutions:**
1. Enable caching in production:
   ```bash
   ENABLE_CACHE=true
   CACHE_TTL=3600
   ```
2. Use Neon connection pooling (included by default)
3. Check Neon compute tier (upgrade if needed)
4. Monitor query performance in Neon dashboard

---

## 📈 Performance Optimization

### **Client-Side Caching**
Environment variables for production:
```bash
VITE_CACHE_ENABLED=true
VITE_CACHE_TTL=3600000  # 1 hour
VITE_API_TIMEOUT=10000  # 10 seconds
```

### **Server-Side Optimizations**
- **Connection Pooling:** Enabled by default with Neon
- **Query Caching:** Use `ENABLE_CACHE=true`
- **Rate Limiting:** Configured per endpoint
- **Compression:** Enabled in production mode

---

## 🔄 Continuous Deployment

### **GitHub Actions (Example)**
```yaml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          STACK_AUTH_PROJECT_ID: ${{ secrets.STACK_AUTH_PROJECT_ID }}
          API_FOOTBALL_KEY: ${{ secrets.API_FOOTBALL_KEY }}
      
      - name: Deploy to Netlify
        run: netlify deploy --prod
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

---

## 📞 Support & Resources

### **Your Project**
- **Email:** scardubu@gmail.com
- **Stack Auth Project:** `8b0648c2-f267-44c1-b4c2-a64eccb6f737`
- **Neon Endpoint:** `ep-bitter-frost-addp6o5c.us-east-1.aws.neon.tech`

### **Dashboards**
- **Neon:** https://console.neon.tech
- **Stack Auth:** https://app.stack-auth.com/projects/8b0648c2-f267-44c1-b4c2-a64eccb6f737
- **Netlify:** https://app.netlify.com

### **Documentation**
- **Migration Guide:** `NEON_STACK_AUTH_MIGRATION.md`
- **Quick Start:** `QUICK_START_NEON_STACK.md`
- **Betting Insights:** `BETTING_INSIGHTS_IMPLEMENTATION.md`

---

## ✅ Production Readiness Checklist

### **Infrastructure**
- [x] Neon.tech database configured
- [x] Stack Auth JWT verification integrated
- [x] Hybrid auth middleware (backward compatible)
- [x] Environment configuration centralized
- [x] Automated credential retrieval

### **Security**
- [x] JWT-based authentication
- [x] Secure session management
- [x] Rate limiting enabled
- [x] HTTPS enforced in production
- [x] Secure token generation

### **Performance**
- [x] Client-side caching implemented
- [x] Server-side connection pooling
- [x] Optimized bundle sizes
- [x] Lazy loading for components
- [x] Performance monitoring

### **Reliability**
- [x] Error handling middleware
- [x] Graceful degradation
- [x] Health check endpoints
- [x] Database reconnection logic
- [x] Offline mode support

### **Observability**
- [x] Structured logging
- [x] Performance metrics
- [x] Error tracking
- [x] Health monitoring
- [x] Diagnostic endpoints

---

**Status:** ✅ **PRODUCTION READY**

Your Football Forecast application is now fully configured and ready for production deployment!
