# Netlify "Degraded Mode" - Quick Fix Guide

**Issue:** "Running in degraded mode. Some live features are unavailable until configuration is completed."

---

## 🚀 Quick Fix (2 Minutes)

### Option 1: Automated Setup (Recommended)

```powershell
# Run the automated setup script
npm run netlify:env
```

This will:
1. ✅ Read your local `.env` file
2. ✅ Set all variables in Netlify
3. ✅ Optionally deploy immediately

### Option 2: Manual Setup (Netlify Dashboard)

1. **Go to Netlify Dashboard:**
   - Visit: https://app.netlify.com/sites/resilient-souffle-0daafe/settings/env

2. **Add these variables** (copy from your `.env` file):

   ```
   API_FOOTBALL_KEY=your_key_here
   DATABASE_URL=your_database_url_here
   OPENWEATHER_API_KEY=your_key_here
   SCRAPER_AUTH_TOKEN=your_token_here
   API_BEARER_TOKEN=your_token_here
   ```

3. **Trigger new deployment:**
   - Go to: https://app.netlify.com/sites/resilient-souffle-0daafe/deploys
   - Click: **Trigger deploy** → **Deploy site**

4. **Wait ~1-2 minutes** for deployment to complete

---

## ✅ Verification

After setup, visit your site:
- **URL:** https://resilient-souffle-0daafe.netlify.app

**Expected:**
- ✅ No "degraded mode" warning
- ✅ Live data loading
- ✅ All features working

---

## 📋 Required Environment Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `API_FOOTBALL_KEY` | Sports data API | [API-Football](https://www.api-football.com) |
| `DATABASE_URL` | PostgreSQL connection | [Neon Console](https://console.neon.tech) |
| `OPENWEATHER_API_KEY` | Weather data | [OpenWeather](https://openweathermap.org/api) |
| `SCRAPER_AUTH_TOKEN` | Scraper auth | Your `.env` file |
| `API_BEARER_TOKEN` | API auth | Your `.env` file |

---

## 🔧 Commands Reference

```powershell
# Setup environment variables
npm run netlify:env

# Deploy to production
npm run deploy:netlify

# Check deployment status
netlify status

# View environment variables
netlify env:list
```

---

## 🐛 Troubleshooting

### Still showing "degraded mode"?

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Hard refresh** (Ctrl+F5)
3. **Check all env vars are set:**
   ```powershell
   netlify env:list
   ```
4. **Redeploy:**
   ```powershell
   netlify deploy --prod
   ```

### Can't find `.env` file?

Your `.env` file should be in the root directory:
```
c:\Users\USR\Documents\FootballForecast\.env
```

If missing, copy from `.env.example`:
```powershell
cp .env.example .env
# Then edit .env with your actual keys
```

---

## 📚 Full Documentation

For detailed setup instructions, see:
- **NETLIFY_ENV_SETUP.md** - Complete setup guide
- **EXECUTIVE_FIX_SUMMARY.md** - All fixes summary

---

**Once environment variables are configured, your Netlify deployment will run in full production mode!** 🎉
