# 🚀 Deployment Quick Reference

## Current Production Site

**URL:** https://sabiscore.netlify.app  
**Site ID:** `a4ba3cd3-9376-4d79-8a3f-f376b2b57cc1`  
**Status:** ✅ Active

---

## Quick Deploy Commands

### Standard Deployment
```bash
# Build and deploy in one command
npm run build && netlify deploy --prod --dir=dist/public
```

### Draft Deployment (Test First)
```bash
# Deploy to draft URL for testing
npm run build && netlify deploy --dir=dist/public
```

### Force Clean Build
```bash
# Clean, build, and deploy
npm run clean && npm run build && netlify deploy --prod --dir=dist/public
```

---

## Environment Variables

### Required in Netlify Dashboard
Navigate to: https://app.netlify.com/sites/sabiscore/configuration/env

```bash
# Database
DATABASE_URL=postgresql://...
NEON_API_KEY=napi_...

# API Keys
API_FOOTBALL_KEY=cb9865ca7ef44cb985fee4cf03f37f67
API_BEARER_TOKEN=JWeUkU6C-Pl-R6ls9DyJTgyZ4vybBYSBBskboe3Vz4s
SCRAPER_AUTH_TOKEN=WyrIUJKZ1vfi7aSh7JAgoC8eCV-y3TJqHwY6LgG2luM

# Session
SESSION_SECRET=faf2acdde83fb101cf9f5132f74cd8188239860bddf37f1c422f838a2b674fbe
SESSION_SECURE=true

# Stack Auth
STACK_AUTH_PROJECT_ID=8b0648c2-f267-44c1-b4c2-a64eccb6f737
VITE_STACK_AUTH_PROJECT_ID=8b0648c2-f267-44c1-b4c2-a64eccb6f737

# ML Service
ML_SERVICE_URL=https://sabiscore-production.up.railway.app
ML_FALLBACK_ENABLED=false

# Node Environment
NODE_ENV=production
```

---

## Verification Checklist

### After Deployment
- [ ] Site loads: https://sabiscore.netlify.app
- [ ] Health check: https://sabiscore.netlify.app/api/health
- [ ] No console errors in browser DevTools
- [ ] All API endpoints return 200 OK
- [ ] Service worker activates successfully
- [ ] Fonts load correctly
- [ ] Images display properly

### Quick Tests
```bash
# Health check
curl https://sabiscore.netlify.app/api/health

# Auth status
curl https://sabiscore.netlify.app/api/auth/status

# Teams endpoint
curl https://sabiscore.netlify.app/api/teams

# Predictions telemetry
curl https://sabiscore.netlify.app/api/predictions/telemetry
```

---

## Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf node_modules dist .netlify
npm install
npm run build
```

### Functions Not Working
```bash
# Check function logs
netlify functions:list
netlify logs:functions

# Test function locally
netlify dev
```

### Environment Variables Not Loading
1. Check Netlify dashboard: https://app.netlify.com/sites/sabiscore/configuration/env
2. Verify variable names match exactly
3. Redeploy after adding/updating variables

### 404 Errors
1. Check `netlify.toml` redirects
2. Verify function names match routes
3. Check function logs for errors
4. Ensure `dist/public` contains built files

---

## Rollback

### Quick Rollback
```bash
# Rollback to previous deployment
netlify rollback
```

### Manual Rollback
1. Go to: https://app.netlify.com/sites/sabiscore/deploys
2. Find last working deployment
3. Click "Publish deploy"

---

## Monitoring

### Netlify Dashboard
- **Site Overview:** https://app.netlify.com/sites/sabiscore
- **Deploys:** https://app.netlify.com/sites/sabiscore/deploys
- **Functions:** https://app.netlify.com/sites/sabiscore/functions
- **Logs:** https://app.netlify.com/sites/sabiscore/logs

### Key Metrics
- Build time: ~3 minutes
- Deploy time: ~30 seconds
- Function cold start: <1 second
- CDN cache: Global edge network

---

## Support Links

- **Netlify Docs:** https://docs.netlify.com
- **Netlify CLI:** https://cli.netlify.com
- **Status Page:** https://www.netlifystatus.com
- **Community:** https://answers.netlify.com

---

*Last Updated: January 24, 2025*
