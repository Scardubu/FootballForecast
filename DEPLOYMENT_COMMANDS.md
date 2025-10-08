# Deployment Commands - Quick Reference

## 🚀 Essential Commands

### Development

```bash
# Start all services: Node + Vite + ML (recommended)
npm run dev:full

# Start Node + Vite only (no ML)
npm run dev:netlify

# Start backend only
npm run dev:node

# Start frontend only (Vite)
npm run dev

# Start ML service only
npm run dev:python
```

### Building

```bash
# Full production build
npm run build

# Client build only
npm run build:client

# Server build only
npm run build:server
```

### Deployment

```bash
# Deploy to Netlify
npm run deploy

# Deploy with specific site ID
netlify deploy --prod --site=<site-id>
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run verification script
.\scripts\verify-deployment.ps1
```

### Database

```bash
# Push schema changes
npm run db:push

# Open database studio
npm run db:studio

# Generate migrations
npm run db:generate
```

---

## 🔧 Troubleshooting Commands

### Clean Build

```bash
# Windows
Remove-Item -Recurse -Force dist
npm run build

# Unix
rm -rf dist
npm run build
```

### Kill Processes

```bash
# Windows - Kill all Node processes
taskkill /f /im node.exe

# Unix - Kill all Node processes
killall node
```

### Reset Environment

```bash
# Reinstall dependencies
Remove-Item -Recurse -Force node_modules
npm install

# Clear npm cache
npm cache clean --force
npm install
```

### Check Health

```bash
# Local health check
curl http://localhost:5000/api/health

# Local ML service health (if running)
curl http://127.0.0.1:8000/

# Production health check
curl https://resilient-souffle-0daafe.netlify.app/api/health

# Circuit breaker status
curl http://localhost:5000/api/diagnostics/circuit-breaker
```

---

## 📦 Environment Setup

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd FootballForecast

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Recommended for Windows: use IPv4 for ML service
# ML_SERVICE_URL=http://127.0.0.1:8000

# Push database schema
npm run db:push

# Start development
npm run dev:netlify
```

### Update Environment

```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm install

# Update database schema
npm run db:push

# Rebuild
npm run build
```

---

## 🌐 Netlify Commands

### Deploy

```bash
# Production deploy
netlify deploy --prod

# Preview deploy
netlify deploy

# Deploy with build
netlify deploy --prod --build
```

### Site Management

```bash
# Link to existing site
netlify link

# Create new site
netlify init

# Open site in browser
netlify open

# View site info
netlify status
```

### Environment Variables

```bash
# List environment variables
netlify env:list

# Set environment variable
netlify env:set KEY value

# Import from .env file
netlify env:import .env
```

---

## 🔍 Diagnostic Commands

### Logs

```bash
# View Netlify logs
netlify logs

# View function logs
netlify logs:function api

# Stream logs
netlify logs --stream
```

### Status Checks

```bash
# Check build status
netlify status

# Check site health
curl https://resilient-souffle-0daafe.netlify.app/api/health

# Check API status
curl https://resilient-souffle-0daafe.netlify.app/api/diagnostics/status
```

### Performance

```bash
# Analyze bundle size
npm run build
# Check dist/public/assets for file sizes

# Run Lighthouse
npx lighthouse https://resilient-souffle-0daafe.netlify.app --view
```

---

## 🐛 Debug Commands

### Development Debug

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev:netlify

# Run with Node inspector
node --inspect server/index.ts

# Check TypeScript compilation
npx tsc --noEmit
```

### Production Debug

```bash
# Test production build locally
npm run build
npm run preview

# Check for TypeScript errors
npx tsc --noEmit

# Validate environment
node -e "console.log(process.env)"
```

---

## 📊 Monitoring Commands

### Real-time Monitoring

```bash
# Watch logs
netlify logs --stream

# Monitor health endpoint
watch -n 5 'curl -s http://localhost:5000/api/health | jq'

# Monitor circuit breaker
watch -n 10 'curl -s http://localhost:5000/api/diagnostics/circuit-breaker | jq'
```

### Performance Monitoring

```bash
# Check bundle sizes
npm run build
ls -lh dist/public/assets

# Analyze dependencies
npx depcheck

# Check for updates
npm outdated
```

---

## 🔄 CI/CD Commands

### GitHub Actions

```bash
# Trigger workflow manually
gh workflow run deploy.yml

# View workflow runs
gh run list

# View workflow logs
gh run view <run-id> --log
```

### Local CI Simulation

```bash
# Run full CI pipeline locally
npm install
npm run build
npm test
.\scripts\verify-deployment.ps1
```

---

## 🛠️ Maintenance Commands

### Updates

```bash
# Update dependencies
npm update

# Update specific package
npm update <package-name>

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

### Cleanup

```bash
# Clean build artifacts
npm run clean

# Clean node_modules
Remove-Item -Recurse -Force node_modules
npm install

# Clean cache
npm cache clean --force
```

---

## 🔐 Security Commands

### Token Management

```bash
# Generate secure token
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate base64 token
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"

# Verify environment security
.\scripts\verify-deployment.ps1
```

### Secrets Management

```bash
# Set Netlify environment variable
netlify env:set API_FOOTBALL_KEY "your-key-here"

# Set GitHub secret
gh secret set API_FOOTBALL_KEY

# List secrets (names only)
netlify env:list
```

---

## 📱 Quick Actions

### Start Fresh

```bash
Remove-Item -Recurse -Force node_modules, dist
npm install
npm run build
npm run dev:netlify
```

### Deploy Now

```bash
npm run build
npm test
netlify deploy --prod
```

### Emergency Rollback

```bash
# Rollback to previous deploy
netlify rollback

# Or deploy specific version
git checkout <previous-commit>
npm run build
netlify deploy --prod
```

### Health Check

```bash
# Quick health check
curl http://localhost:5000/api/health && echo "✅ Healthy" || echo "❌ Unhealthy"
```

---

## 🎯 Common Workflows

### Feature Development

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes and test
npm run dev:netlify

# 3. Build and verify
npm run build
npm test

# 4. Commit and push
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# 5. Create PR and merge
```

### Bug Fix

```bash
# 1. Create fix branch
git checkout -b fix/bug-description

# 2. Fix and test
npm run dev:netlify

# 3. Verify fix
npm test
.\scripts\verify-deployment.ps1

# 4. Deploy
git add .
git commit -m "fix: resolve bug"
git push origin fix/bug-description
```

### Production Deploy

```bash
# 1. Ensure main is up to date
git checkout main
git pull origin main

# 2. Build and test
npm run build
npm test
.\scripts\verify-deployment.ps1

# 3. Deploy
npm run deploy

# 4. Verify deployment
curl https://resilient-souffle-0daafe.netlify.app/api/health
```

---

## 📞 Support Commands

### Get Help

```bash
# npm help
npm help

# Netlify help
netlify help

# Command-specific help
netlify deploy --help
```

### Version Info

```bash
# Node version
node --version

# npm version
npm --version

# Netlify CLI version
netlify --version

# Project version
npm version
```

---

## 🔧 Plugin Management (October 8, 2025)

### Fix Netlify Plugin Errors

```bash
# If netlify-plugin-image-optim fails:
# 1. Remove from Netlify UI: Site Settings > Build Plugins
# 2. Or deploy with current netlify.toml (plugin list configured)
netlify deploy --prod --dir=dist/public

# Clear cache and redeploy
netlify deploy --prod --dir=dist/public --clear-cache
```

### Remove UI-Installed Plugins

1. Go to: <https://app.netlify.com>
2. Select site: `resilient-souffle-0daafe`
3. Navigate to: **Site Settings** → **Build & deploy** → **Build plugins**
4. Remove problematic plugins:
   - `netlify-plugin-image-optim` (causing errors)
   - `netlify-plugin-html-validate` (optional)

---

**Last Updated:** October 8, 2025
**Status:** ✅ Production Ready (Plugin Fixes Applied)
