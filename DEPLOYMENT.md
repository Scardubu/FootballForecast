# Football Forecast Deployment Guide

This document provides step-by-step instructions for deploying Football Forecast to Netlify (frontend) and Supabase (database).

## Security Warning

**IMPORTANT: Never commit API keys, tokens, or other secrets to your repository.**

All sensitive information should be set as environment variables in your deployment platform or passed securely during CI/CD processes.

## Deployment Credentials

### Netlify Credentials

- **Redirect URI:** `urn:ietf:wg:oauth:2.0:oob`
- **Client ID:** `JWeUkU6C-Pl-R6ls9DyJTgyZ4vybBYSBBskboe3Vz4s`

### Supabase Credentials

- **Project URL:** `https://mokwkueoqemmcfxownxt.supabase.co`

## Prerequisites

- Node.js 18.18.0 or higher
- npm 8.19.0 or higher
- Netlify account
- Supabase account
- Netlify CLI (install with `npm install -g netlify-cli`)

## 1. Supabase Setup

### Database Configuration

1. Log in to your Supabase account at [https://app.supabase.com](https://app.supabase.com)

2. Go to your project: [https://mokwkueoqemmcfxownxt.supabase.co](https://mokwkueoqemmcfxownxt.supabase.co)

3. Navigate to the SQL Editor section

4. Create the necessary database tables using the schema from our migration script

### Database Migration

Run the migration script to set up your database schema:

```bash
# Install dependencies
npm install dotenv pg

# Set up environment variables
cp .env.production.supabase .env.supabase

# Run migration script
node supabase-migrate.js
```

## 2. Netlify Setup

### Authentication Setup

1. Install Netlify CLI if you haven't already:

   ```bash
   npm install -g netlify-cli
   ```

2. Authenticate with Netlify using the provided credentials:

   ```bash
   netlify login
   ```

3. When prompted, use the following credentials:
   - **Client ID:** `JWeUkU6C-Pl-R6ls9DyJTgyZ4vybBYSBBskboe3Vz4s`
   - **Redirect URI:** `urn:ietf:wg:oauth:2.0:oob`

### Environment Variables Setup

1. Create a new site or link to an existing one:

   ```bash
   netlify sites:create --name football-forecast
   # OR
   netlify link
   ```

2. Set up environment variables using our script:

   ```bash
   node netlify-setup.js
   ```

3. Alternatively, set these variables manually in the Netlify UI:
   - Go to Site settings > Build & deploy > Environment
   - Add the following environment variables:

     ```env
     DATABASE_URL=postgresql://postgres:postgres@db.mokwkueoqemmcfxownxt.supabase.co:5432/postgres
     API_FOOTBALL_KEY=nfp_K5vxAHjYMvsA2EtKRkxuYR6etLxmzvoad9fe
     API_BEARER_TOKEN=JWeUkU6C-Pl-R6ls9DyJTgyZ4vybBYSBBskboe3Vz4s
     SCRAPER_AUTH_TOKEN=WyrIUJKZ1vfi7aSh7JAgoC8eCV-y3TJqHwY6LgG2luM
     SUPABASE_URL=https://mokwkueoqemmcfxownxt.supabase.co
     NODE_VERSION=18.18.0
     ```

### Deploy to Netlify

```bash
# Make sure the build works locally first
npm run build

# Deploy to Netlify
netlify deploy --prod
```

### Netlify Configuration

The `netlify.toml` file has been created with the following configuration:

```toml
[build]
  base = "."
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18.18.0"
  NPM_VERSION = "9.8.0"

[dev]
  command = "npm run dev"
  port = 3000
  targetPort = 5173
  publish = "dist"
  framework = "vite"

[[redirects]]
  from = "/api/*"
  to = "https://mokwkueoqemmcfxownxt.supabase.co/api/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## 3. Python ML Service Deployment (Optional)

If you're using the Python ML service, you'll need to deploy it separately:

### Option 1: Deploy to Heroku

1. Create a new Heroku app
2. Set up the required buildpacks (Python)
3. Deploy the Python service from the `src` directory

### Option 2: Deploy to a VPS

1. Set up a VPS with Python 3.9+
2. Install dependencies: `pip install -r requirements.txt`
3. Run with gunicorn: `gunicorn -w 4 -k uvicorn.workers.UvicornWorker src.api.main:app`

## 4. Verify Deployment

After deployment:

1. Check that your frontend is accessible via Netlify
2. Test API endpoints to ensure they connect to Supabase
3. Verify that predictions and football data are loading properly

## 5. CI/CD Setup (Optional)

For continuous deployment:

1. Connect your GitHub repository to Netlify
2. Set up automatic deployments for the `main` branch
3. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`

## Troubleshooting

- **Database Connection Issues**: Check that your DATABASE_URL is correctly formatted and includes the correct credentials
- **Build Failures**: Make sure NODE_VERSION is set correctly in Netlify
- **API Connection Issues**: Verify that all environment variables are set correctly
- **CORS Errors**: Update CORS_ORIGINS in your environment variables to include your Netlify domain

## Security Best Practices

1. Rotate secrets regularly
2. Use environment-specific variables
3. Implement proper authentication and authorization
4. Set up proper CORS restrictions
5. Enable rate limiting

---

For any issues, refer to the project documentation or open a GitHub issue.
