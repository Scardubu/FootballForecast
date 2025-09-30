# Render Deployment Guide

This guide describes how to deploy Football Forecast to Render using the provided `render.yaml` blueprint.

## Prerequisites
- Render account
- GitHub repository connected to Render
- PostgreSQL data import (optional)

## Architecture on Render
- Web service: Node + Express serving API and SPA (`football-forecast-web`)
- ML service: Python FastAPI real-time inference (`football-forecast-ml`)
- Database: Render PostgreSQL (`football-forecast-db`)
- Optional: Redis cache (`football-forecast-cache`)

## One-click Blueprint Deploy
1. Push `render.yaml` to `main`.
2. In Render, click New + From Blueprint and select your repo.
3. Confirm services and environment variables.
4. Deploy.

## Environment Variables
- `NODE_ENV=production`
- `PORT=5000`
- `DATABASE_URL` (auto-wired to Render Postgres via blueprint)
- `ML_SERVICE_URL` (auto-wired to ML service host via blueprint)
- `API_BEARER_TOKEN`, `SCRAPER_AUTH_TOKEN`, `SESSION_SECRET` (set in Render dashboard)
- `API_FOOTBALL_KEY` (if using API-Football)

## Build & Start Commands
- Web: `npm install && npm run build`, then `npm start`
- ML: Dockerfile.python builds and starts FastAPI on port 8000

## Health Checks
- Web: `/api/health`
- ML: `GET /health` (FastAPI)

## Logs & Monitoring
- Use Render Logs for both services
- Add external uptime checks to `/api/health`

## Post-Deployment Verification
- Hit `https://<web-service>.onrender.com/api/health`
- Verify SPA loads and telemetry badges render
- Verify ML endpoint via server calling ML service

## Migrations
Use Drizzle CLI from your local machine:
```bash
DATABASE_URL=<render-postgres-connection-string> npx drizzle-kit push
```

## Rollbacks
- Use Render Deploys tab to rollback to a previous build

## Costs
- Starter plans for web + ML + Postgres
- Optional Redis if caching enabled
