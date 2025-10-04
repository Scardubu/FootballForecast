# Netlify Environment Variables - Complete Setup Guide

**Status:** ✅ Variables Generated - Ready for Manual Setup  
**Date:** 2025-10-04 13:56 UTC

---

## 🎯 Issue Resolved

The Netlify CLI `account_id` error has been bypassed. All environment variables have been extracted and formatted for easy manual setup.

---

## 📋 Environment Variables Ready

✅ **23 production variables** extracted from `.env`  
✅ Saved to: `netlify-env-vars.txt`  
✅ Ready for Netlify UI import

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Open Netlify Settings

Click this link or copy to browser:
```
https://app.netlify.com/sites/resilient-souffle-0daafe/settings/env
```

### Step 2: Add Variables

**Option A: Bulk Import (If Available)**
1. Look for "Import from .env" or "Bulk add" button
2. Copy content from `netlify-env-vars.txt`
3. Paste and import

**Option B: Manual Entry (Recommended)**

Add each variable one by one. Here are the **REQUIRED** variables:

#### 1. API_FOOTBALL_KEY
```
Key:   API_FOOTBALL_KEY
Value: 8c46c6ff5fd2085b06b9ea29b3efa5f4
```

#### 2. DATABASE_URL
```
Key:   DATABASE_URL
Value: postgresql://neondb_owner:npg_6oDAyrCWd0lK@ep-bitter-frost-a-ddp6o5c-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
```

#### 3. OPENWEATHER_API_KEY
```
Key:   OPENWEATHER_API_KEY
Value: 807ce810a5362ba47f11db65fe338144
```

#### 4. SCRAPER_AUTH_TOKEN
```
Key:   SCRAPER_AUTH_TOKEN
Value: WyrIUJKZ1vfi7aSh7JAgoC8eCV-y3TJqHwY6LgG2luM
```

#### 5. API_BEARER_TOKEN
```
Key:   API_BEARER_TOKEN
Value: JWeUkU6C-Pl-R6ls9DyJTgyZ4vybBYSBBskboe3Vz4s
```

### Step 3: Add Optional Variables

For full functionality, also add:

```
ENABLE_SCRAPING=true
ML_FALLBACK_ENABLED=true
API_RATE_LIMIT=100
SCRAPE_ODDS_INTERVAL_MS=600000
SCRAPE_INJURY_INTERVAL_MS=3600000
```

### Step 4: Deploy

1. Go to: https://app.netlify.com/sites/resilient-souffle-0daafe/deploys
2. Click: **Trigger deploy** → **Deploy site**
3. Wait ~1-2 minutes for deployment

---

## ✅ Verification Checklist

After deployment completes:

- [ ] Visit: https://resilient-souffle-0daafe.netlify.app
- [ ] No "degraded mode" warning
- [ ] Data loads correctly
- [ ] Predictions work
- [ ] No console errors

---

## 📊 All Variables Reference

See `netlify-env-vars.txt` for complete list of all 23 variables with values.

### Core Services (Required)
- ✅ API_FOOTBALL_KEY
- ✅ DATABASE_URL
- ✅ OPENWEATHER_API_KEY
- ✅ SCRAPER_AUTH_TOKEN
- ✅ API_BEARER_TOKEN

### Configuration (Optional but Recommended)
- ✅ ENABLE_SCRAPING
- ✅ ML_FALLBACK_ENABLED
- ✅ API_RATE_LIMIT
- ✅ SCRAPE_ODDS_INTERVAL_MS
- ✅ SCRAPE_INJURY_INTERVAL_MS
- ✅ SCRAPE_ODDS_WINDOW_MS
- ✅ SCRAPE_INJURY_WINDOW_MS

### Stack Auth (Optional - for authentication)
- ✅ STACK_AUTH_PROJECT_ID
- ✅ STACK_AUTH_API_URL
- ✅ STACK_AUTH_JWKS_URL

### Session Management (Optional)
- ✅ SESSION_SECRET
- ✅ SESSION_MAX_AGE
- ✅ SESSION_SECURE

### Logging (Optional)
- ✅ LOG_LEVEL
- ✅ LOG_PRETTY

### External Services (Optional)
- ✅ ML_SERVICE_URL
- ✅ API_FOOTBALL_HOST
- ✅ NEON_API_KEY

---

## 🔧 Why Manual Setup?

The Netlify CLI has a known issue with `account_id` when using `netlify env:set`. The workaround is:

1. ✅ **Manual UI setup** (what we're doing) - Most reliable
2. ❌ CLI with account_id - Requires additional configuration
3. ❌ API direct - Requires correct site access tokens

---

## 🎯 Expected Results

### Before Setup
```
⚠️ Running in degraded mode
⚠️ Some features unavailable
⚠️ Missing API keys warning
```

### After Setup
```
✅ Full production mode
✅ All features enabled
✅ Live data working
✅ Predictions functional
```

---

## 📚 Related Documentation

- **NETLIFY_QUICK_FIX.md** - Quick reference
- **NETLIFY_ENV_SETUP.md** - Detailed setup guide
- **EXECUTIVE_FIX_SUMMARY.md** - All fixes summary

---

## 🐛 Troubleshooting

### Issue: Variables not taking effect

**Solution:**
1. Verify all variables are saved in Netlify UI
2. Trigger a new deployment (don't just save)
3. Clear browser cache after deployment

### Issue: Database connection errors

**Solution:**
1. Verify `DATABASE_URL` is exactly as shown (no line breaks)
2. Check Neon database is active
3. Ensure connection string includes `?sslmode=require`

### Issue: API errors

**Solution:**
1. Verify `API_FOOTBALL_KEY` is correct
2. Check API plan limits (free plan = 2021-2023 seasons)
3. Ensure `API_FOOTBALL_HOST` is set

---

## ✅ Final Checklist

Before marking as complete:

- [ ] All 5 required variables added to Netlify
- [ ] Optional variables added (recommended)
- [ ] New deployment triggered
- [ ] Deployment completed successfully
- [ ] Site loads without warnings
- [ ] Data displays correctly
- [ ] No console errors

---

## 🎉 Success Criteria

Your deployment is successful when:

1. ✅ No "degraded mode" message
2. ✅ Live matches display
3. ✅ Predictions load
4. ✅ League standings show
5. ✅ No API errors in console

---

**Once all variables are set and deployed, your Football Forecast application will be fully operational in production!** 🚀

---

*Last Updated: 2025-10-04 13:56 UTC*  
*Variables Generated: 23*  
*Setup Method: Manual UI (CLI workaround)*
