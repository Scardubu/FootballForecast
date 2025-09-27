# Football Forecast Deployment Guide

This guide provides step-by-step instructions for deploying the Football Forecast application to production.

## Prerequisites

* Node.js v18.18.0 or higher
* npm v9.8.0 or higher
* Netlify account
* Supabase account (for database)
* API-Football subscription

## Environment Setup

1. **Clone the repository**

```bash
git clone https://github.com/your-username/football-forecast.git
cd football-forecast
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Copy the example environment file and update it with your credentials:

```bash
cp .env.example .env
```

Edit the `.env` file and set the following required variables:

Required in production (set in Netlify → Site settings → Build & deploy → Environment):

* `API_FOOTBALL_KEY`: Your API-Football API key
* `API_BEARER_TOKEN`: A secure random token for API authentication
* `SCRAPER_AUTH_TOKEN`: A secure random token for scraper authentication
* `SESSION_SECRET`: A secure random string for session encryption
* `DATABASE_URL`: PostgreSQL connection string (optional if you accept in-memory fallback)

Optional:

* `ML_SERVICE_URL`: URL of your Python FastAPI ML service (e.g. <https://ml.example.com>)
* `ML_SERVICE_TIMEOUT`: Timeout in ms for ML requests (default 30000)
* `ML_FALLBACK_ENABLED`: `true` to allow statistical fallbacks in production when ML is unavailable (default `false`)
* `API_RATE_LIMIT`, `LOG_LEVEL`, etc. as needed

You can generate secure random tokens using:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Local Development

1. **Start the development server**

```bash
npm run dev
```

2. **Run the Python ML service (optional)**

```bash
npm run dev:python
```

3. **Access the application**

Open your browser and navigate to `http://localhost:5000`

## Production Deployment

### Option 1: Automated Deployment

1. **Create a Netlify site (first time only)**

```bash
npm run netlify:create
```

2. **Deploy to Netlify**

```bash
npm run deploy
```

This will:

* Check environment variables
* Run type checking and linting
* Build the application
* Deploy to Netlify
* Verify the deployment
* Apply caching headers for static assets (`/assets/*`) and no-cache for `index.html`

### Option 2: Manual Deployment Script

If you encounter issues with the automated deployment (such as Netlify CLI interactive prompt errors), use the manual deployment script:

```bash
npm run deploy:manual
```

This script:

* Builds the application
* Deploys to Netlify using non-interactive commands
* Avoids common Netlify CLI issues

### Option 3: Direct Netlify CLI

1. **Build the application**

```bash
npm run build
```

2. **Deploy using Netlify CLI**

```bash
netlify deploy --prod --dir=dist
```

> **Note:** If you encounter issues with Netlify CLI interactive prompts, use the `--json` flag:
>
> ```bash
> netlify deploy --prod --dir=dist --json
> ```

### Troubleshooting

If you encounter any issues during deployment, please refer to the [DEPLOYMENT_TROUBLESHOOTING.md](./DEPLOYMENT_TROUBLESHOOTING.md) guide for solutions to common problems.

### Degraded Mode (Serverless safety)

If required environment variables are missing, the Netlify Function API runs in a safe "degraded" mode that:

* Returns 200 with `{ authenticated: false }` for `/api/auth/status`
* Returns empty arrays/objects for read-only endpoints (e.g., `/api/leagues`, `/api/fixtures/live`, `/api/teams`)
* Returns 404 for dev-only endpoints (e.g., `/api/auth/dev-login`)
* Returns 503 JSON for non-read endpoints

In this mode, the UI remains operational with clear empty states and a subtle banner indicating that configuration is needed. Set environment variables, redeploy, and the degraded banner will disappear automatically.

## Deployment Verification

After deployment, you can verify that all components are working correctly:

```bash
npm run verify-deployment
```

This will check:

* Frontend accessibility
* API endpoints
* ML service
* Authentication
* Degraded mode banner disappears after environment variables are set
* SEO/PWA basic checks (manifest present, canonical link, robots.txt, sitemap.xml)

## Troubleshooting Deployment Issues

### Common Issues

1. **Environment Variables**

If you see errors related to missing environment variables, check your `.env` file and ensure all required variables are set.

For Netlify deployments, make sure environment variables are also set in the Netlify dashboard:

* Go to Site settings > Build & deploy > Environment
* Add all required environment variables

2. **Database Connection**

If you see database connection errors:

* Check your `DATABASE_URL` is correct
* Ensure your database is running and accessible
* Verify that your IP is allowed in the database firewall rules

3. **API-Football Issues**

If you see errors related to the API-Football service:

* Verify your API key is valid and has not expired
* Check your subscription plan limits
* Test the API directly using a tool like Postman

4. **Netlify Deployment Failures**

If your Netlify deployment fails:

* Check the Netlify build logs for specific errors
* Ensure your build command is correct
* Verify that all dependencies are installed

## Rollback Procedure

If you need to roll back to a previous version:

1. Go to the Netlify dashboard
2. Navigate to Deploys
3. Find the previous working deployment
4. Click "Publish deploy"

## Monitoring and Logging

* Application logs are available in the Netlify dashboard
* Health checks can be accessed at `/api/health`
* Detailed diagnostics are available at `/api/diagnostics/status`

## Support

If you encounter any issues not covered in this guide, please contact the development team or open an issue on GitHub.

---

Happy forecasting!
