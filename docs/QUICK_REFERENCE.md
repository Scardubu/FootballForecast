# Quick Reference Guide

## Common Commands

### Development
```bash
# Start all services (Node + Vite + ML)
npm run dev:full

# Start Node.js backend only
npm run dev:node

# Start Python ML service only
npm run dev:python

# Start with service launcher (Windows)
npm run start:all
```

### Production
```bash
# Build frontend
npm run build

# Start production server
npm start

# Stop all services (Windows)
npm run stop:all
```

### Health Checks
```bash
# Check all services
npm run health:hybrid

# Check WebSocket status
curl http://localhost:5000/api/websocket/status

# Check ML service
curl http://localhost:8000/health
```

## Port Reference

| Service | Port | URL |
|---------|------|-----|
| Node.js Backend | 5000 | <http://localhost:5000> |
| Vite Dev Server | 5173 | <http://localhost:5173> |
| Python ML Service | 8000 | <http://localhost:8000> |
| WebSocket (prod only) | 5000 | ws://localhost:5000/ws |

## Environment Modes

### Development Mode
- WebSocket: ❌ Disabled (Vite HMR priority)
- Live Updates: ✅ HTTP Polling (30s intervals)
- Hot Reload: ✅ Enabled
- Source Maps: ✅ Enabled
- Minification: ❌ Disabled

### Production Mode
- WebSocket: ✅ Enabled (platform-dependent)
- Live Updates: ✅ WebSocket + HTTP Polling fallback
- Hot Reload: ❌ Disabled
- Source Maps: ❌ Disabled
- Minification: ✅ Enabled

## API Endpoints

### Health & Status
- `GET /api/health` - Service health check
- `GET /api/websocket/status` - WebSocket availability
- `GET /api/diagnostics` - System diagnostics

### Football Data
- `GET /api/fixtures` - All fixtures
- `GET /api/fixtures/live` - Live matches
- `GET /api/teams` - All teams
- `GET /api/leagues` - All leagues
- `GET /api/standings` - League standings

### Predictions
- `GET /api/predictions` - All predictions
- `POST /api/predictions` - Create prediction
- `GET /api/ml/predict` - ML prediction endpoint

### ML Service (Python)
- `GET /health` - ML service health
- `POST /predict` - Match prediction
- `POST /train` - Train model
- `GET /model/info` - Model information

## Common Issues

### WebSocket Connection Errors in Development
**Expected behavior** - WebSocket is intentionally disabled in development.

**Solution:** No action needed. The app uses HTTP polling automatically.

### Port Already in Use
```bash
# Windows - Kill process on port 5000
npx kill-port 5000

# Or use the stop script
npm run stop:all
```

### Build Errors
```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

### Database Connection Issues
```bash
# Check DATABASE_URL in .env
# Verify PostgreSQL is running
# Run migrations
npm run db:push
```

### ML Service Not Starting
```bash
# Check Python version (3.11+)
python --version

# Install dependencies
cd src
pip install -r requirements.txt

# Start manually
python -m uvicorn api.ml_endpoints:app --reload
```

## File Locations

### Configuration
- `.env` - Environment variables
- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `drizzle.config.ts` - Database configuration

### Source Code
- `client/src/` - React frontend
- `server/` - Node.js backend
- `src/` - Python ML service
- `shared/` - Shared TypeScript types

### Documentation
- `README.md` - Main documentation
- `docs/` - Detailed documentation
- `WEBSOCKET_FIXES_COMPLETE.md` - WebSocket architecture
- `DEPLOYMENT.md` - Deployment guide

## Performance Optimization

### Bundle Size
- Total: ~805 KB (optimized)
- Main: 0.71 KB
- CSS: 64.17 KB
- Lazy-loaded chunks: 20+

### Caching Strategy
- Live data: 30 seconds
- Predictions: 10 minutes
- Static data: On-demand
- Assets: 1 year (immutable)

### Loading States
- Skeleton components for all data
- Progressive loading
- Optimistic updates
- Error boundaries

## Security

### Headers
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: no-referrer
- Content-Security-Policy: Strict

### Rate Limiting
- API: 100 requests/15 minutes
- Auth: 5 requests/15 minutes
- ML: 20 requests/minute

### Authentication
- Session-based with secure cookies
- HttpOnly, Secure, SameSite flags
- CSRF protection
- Password hashing with bcrypt

## Testing

### Unit Tests
```bash
# Run all tests
npm test

# Run client tests
npm run test:client

# Run server tests
npm run test:server

# Watch mode
npm run test:watch
```

### Integration Tests
```bash
# Test ML integration
npm run test:integration

# Test offline mode
# (Use browser console: window.offlineTest.test())
```

### Production Verification
```bash
# Verify deployment
npm run verify-production

# Check deployment status
npm run deployment-status
```

## Deployment

### Netlify (Frontend)
```bash
# Deploy to Netlify
npm run deploy:netlify

# Create new site
npm run netlify:create

# Setup environment variables
npm run netlify:env
```

### Railway (ML Service)
```bash
# Deploy via Railway CLI
railway up

# Or push to GitHub (auto-deploy)
git push origin main
```

### Environment Variables
```bash
# Required for production
DATABASE_URL=postgresql://...
SESSION_SECRET=...
ML_SERVICE_URL=https://...
API_BEARER_TOKEN=...
```

## Monitoring

### Logs
- Development: Console output
- Production: Pino structured logging
- ML Service: Uvicorn logs

### Metrics
- Response times
- Error rates
- Cache hit rates
- WebSocket connections

### Alerts
- Service health checks
- Error monitoring
- Performance degradation
- Database connection issues

## Support

### Documentation
- [Architecture](architecture.md)
- [WebSocket Architecture](websocket-architecture.md)
- [Deployment Guide](../DEPLOYMENT.md)
- [Operational Runbook](runbooks/operational-runbook.md)

### Troubleshooting
- Check console for errors
- Verify environment variables
- Review server logs
- Test API endpoints manually

### Resources
- GitHub Repository
- Production URL: <https://sabiscore.netlify.app>
- ML Service: <https://sabiscore-production.up.railway.app>

---

**Last Updated:** 2025-10-05  
**Version:** 1.0.0  
**Status:** Production Ready
