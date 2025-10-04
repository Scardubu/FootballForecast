# Netlify Environment Variables Setup Guide

**Issue:** "Running in degraded mode. Some live features are unavailable until configuration is completed."

**Cause:** Environment variables (API keys) are not configured in Netlify deployment.

---

## 🔧 Quick Fix - Set Environment Variables in Netlify

### Step 1: Access Netlify Dashboard

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site: **resilient-souffle-0daafe**
3. Navigate to: **Site settings** → **Environment variables**

### Step 2: Add Required Environment Variables

Copy these from your local `.env` file and add them to Netlify:

#### Required Variables

```bash
# API Football (Sports Data)
API_FOOTBALL_KEY=8c46c6ff5fd2085b06b9...
API_BEARER_TOKEN=your_bearer_token_here

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://neondb_owner:...@ep-...

# Weather Data
OPENWEATHER_API_KEY=807ce810a5362ba47f11...

# Scraper Authentication
SCRAPER_AUTH_TOKEN=WyrIUJKZ1vfi7aSh7JAg...

# ML Service URL (if using external ML service)
ML_SERVICE_URL=http://localhost:8000
```

#### Optional Variables

```bash
# Scraping Configuration
ENABLE_SCRAPING=true
SCRAPE_ODDS_INTERVAL_MS=600000
SCRAPE_INJURY_INTERVAL_MS=3600000

# Prediction Configuration
PREDICTION_FIXTURE_LOOKAHEAD=5
PREDICTION_REFRESH_MINUTES=90
PREDICTION_RECENT_MATCH_SAMPLE=8
PREDICTION_SYNC_INTERVAL_MINUTES=15
```

### Step 3: Deploy with Environment Variables

1. After adding all variables, click **Save**
2. Trigger a new deployment:
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Deploy site**
3. Wait for deployment to complete (~1-2 minutes)

---

## 📋 Environment Variables Checklist

### Core Services
- [ ] `API_FOOTBALL_KEY` - Sports data API key
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `OPENWEATHER_API_KEY` - Weather data API key
- [ ] `SCRAPER_AUTH_TOKEN` - Scraper authentication

### Optional Services
- [ ] `ML_SERVICE_URL` - ML service endpoint (if external)
- [ ] `ENABLE_SCRAPING` - Enable/disable scraping
- [ ] Scraping intervals (odds, injuries)
- [ ] Prediction configuration

---

## 🔍 How to Get Your Environment Variables

### From Local Development

1. Open your local `.env` file:
   ```powershell
   notepad .env
   ```

2. Copy the values (keep them secure!)

3. Paste into Netlify dashboard

### From Neon Database

If you need to regenerate `DATABASE_URL`:

1. Go to [Neon Console](https://console.neon.tech)
2. Select your project
3. Go to **Connection Details**
4. Copy the connection string
5. Add to Netlify as `DATABASE_URL`

### From API Football

If you need a new API key:

1. Go to [API-Football](https://www.api-football.com)
2. Sign up or log in
3. Get your API key from dashboard
4. Add to Netlify as `API_FOOTBALL_KEY`

---

## 🚀 Alternative: Deploy with Environment Variables

### Option 1: Netlify CLI (Recommended)

```powershell
# Install Netlify CLI (if not already installed)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Link to your site
netlify link

# Set environment variables
netlify env:set API_FOOTBALL_KEY "your_key_here"
netlify env:set DATABASE_URL "your_db_url_here"
netlify env:set OPENWEATHER_API_KEY "your_key_here"
netlify env:set SCRAPER_AUTH_TOKEN "your_token_here"

# Deploy
netlify deploy --prod
```

### Option 2: Update Deployment Script

Update `scripts/deploy-netlify.ps1` to include env vars:

```powershell
# Add environment variables during deployment
netlify env:import .env
netlify deploy --prod
```

---

## ✅ Verification

### After Setting Environment Variables

1. **Check Deployment Logs:**
   - Go to Netlify **Deploys** tab
   - Click on latest deployment
   - Check **Deploy log** for any errors

2. **Test the Application:**
   ```
   Visit: https://resilient-souffle-0daafe.netlify.app
   
   Expected:
   ✅ No "degraded mode" warning
   ✅ Live data loading
   ✅ Predictions working
   ✅ All features operational
   ```

3. **Check Browser Console:**
   - Open DevTools (F12)
   - Look for any API errors
   - Verify data is loading

---

## 🔒 Security Best Practices

### DO:
✅ Use Netlify's environment variables (encrypted)
✅ Never commit `.env` to Git
✅ Rotate API keys periodically
✅ Use different keys for dev/prod

### DON'T:
❌ Hardcode API keys in code
❌ Share API keys publicly
❌ Commit `.env` file to repository
❌ Use production keys in development

---

## 🐛 Troubleshooting

### Issue: "Environment variable not found"

**Solution:**
1. Check variable name spelling (case-sensitive)
2. Ensure variable is set in Netlify dashboard
3. Redeploy after adding variables

### Issue: "Database connection failed"

**Solution:**
1. Verify `DATABASE_URL` is correct
2. Check Neon database is active
3. Ensure connection string includes password

### Issue: "API rate limit exceeded"

**Solution:**
1. Check API-Football plan limits
2. Verify API key is valid
3. Consider upgrading plan if needed

### Issue: Still showing "degraded mode"

**Solution:**
1. Clear browser cache
2. Hard refresh (Ctrl+F5)
3. Check all required env vars are set
4. Redeploy the site

---

## 📊 Current Deployment Status

### Local Development
```
✅ All environment variables configured
✅ Services running on localhost
✅ Full functionality available
```

### Netlify Production
```
⚠️ Environment variables missing
⚠️ Running in degraded mode
⚠️ Some features unavailable
```

### After Configuration
```
✅ Environment variables set
✅ Full functionality enabled
✅ Production-ready deployment
```

---

## 🎯 Quick Start Commands

### Set All Variables at Once (Netlify CLI)

```powershell
# Create a script to set all env vars
$envVars = @{
    "API_FOOTBALL_KEY" = "your_key"
    "DATABASE_URL" = "your_db_url"
    "OPENWEATHER_API_KEY" = "your_key"
    "SCRAPER_AUTH_TOKEN" = "your_token"
    "API_BEARER_TOKEN" = "your_token"
    "ENABLE_SCRAPING" = "true"
}

foreach ($key in $envVars.Keys) {
    netlify env:set $key $envVars[$key]
}

# Deploy
netlify deploy --prod
```

### Or Use Web Interface

1. Go to: https://app.netlify.com/sites/resilient-souffle-0daafe/settings/env
2. Click **Add a variable**
3. Add each variable one by one
4. Click **Save**
5. Trigger new deployment

---

## 📚 Related Documentation

- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [Neon Database Connection](https://neon.tech/docs/connect/connect-from-any-app)
- [API-Football Documentation](https://www.api-football.com/documentation-v3)

---

## ✅ Final Checklist

Before marking as complete:

- [ ] All required env vars added to Netlify
- [ ] New deployment triggered
- [ ] Deployment successful (no errors)
- [ ] Application loads without warnings
- [ ] Live data is working
- [ ] Predictions are functional
- [ ] No console errors

---

**Once environment variables are configured, the application will run in full production mode with all features enabled!** 🚀

---

*Last Updated: 2025-10-04 13:09 UTC*  
*Guide Created By: Cascade AI Code Assistant*
