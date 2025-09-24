# Environment Setup Guide

This document provides detailed instructions for setting up the environment variables required for the Football Forecast application.

## Required Environment Variables

The following environment variables are required for the application to function properly. You should always start by copying `.env.example` to `.env` and editing it for your environment. Never commit `.env` to version control.

### Database Configuration

- `DATABASE_URL`: PostgreSQL connection string
  - Format: `postgresql://username:password@host:port/database`
  - Example for local PostgreSQL: `postgresql://postgres:password@localhost:5432/football_forecast`
  - Example for Supabase: `postgresql://postgres:password@db.mokwkueoqemmcfxownxt.supabase.co:5432/postgres`

### API Configuration

- `API_FOOTBALL_KEY`: API key for the API-Football service
  - Get your API key from: [API-Football](https://www.api-football.com/)
  - Example: `nfp_K5vxAHjYMvsA2EtKRkxuYR6etLxmzvoad9fe`

### Authentication Tokens (Required for all environments)

- `API_BEARER_TOKEN`: Secure random token for API authentication (required for both local and production)
  - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  - Example: `JWeUkU6C-Pl-R6ls9DyJTgyZ4vybBYSBBskboe3Vz4s`

- `SCRAPER_AUTH_TOKEN`: Secure random token for scraper authentication (required for both local and production)
  - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  - Example: `WyrIUJKZ1vfi7aSh7JAgoC8eCV-y3TJqHwY6LgG2luM`

## Optional Environment Variables

The following environment variables are optional and have default values:

- `PORT`: Port for the main application server (default: 5000)
- `NODE_ENV`: Node.js environment (default: development)
- `LOG_LEVEL`: Log level (default: info)
- `LOG_PRETTY`: Enable pretty printing for logs (default: true in development)

## Setting Up Environment Variables

### Local Development

1. Create a `.env` file in the root directory of the project
2. Add the required environment variables to the file
3. Start the application with `npm run dev`

Example `.env` file:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/football_forecast

# API Configuration
API_FOOTBALL_KEY=your_api_football_key

# Authentication Tokens
API_BEARER_TOKEN=your_secure_random_token
SCRAPER_AUTH_TOKEN=your_secure_random_token

# Application Configuration
PORT=5000
NODE_ENV=development
LOG_LEVEL=info
LOG_PRETTY=true
```

### Production Deployment

For production deployment, set the environment variables in your hosting platform's environment configuration.

#### Netlify

1. Go to Site settings > Build & deploy > Environment
2. Add the required environment variables

#### Supabase

1. Use the connection string provided by Supabase for the `DATABASE_URL` variable
2. Format: `postgresql://postgres:password@db.your-project-ref.supabase.co:5432/postgres`

## Generating Secure Tokens

For security, generate random tokens for `API_BEARER_TOKEN` and `SCRAPER_AUTH_TOKEN`:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32
```

## Troubleshooting

If you encounter the error "Missing required environment variable: DATABASE_URL", ensure that:

1. You have created a `.env` file in the root directory
2. The `.env` file contains the `DATABASE_URL` variable
3. The connection string is correctly formatted

For other environment-related issues, check the application logs for specific error messages.

## Security Best Practices

1. Never commit your `.env` file to version control (use `.env.example` as a template for sharing config)
2. Rotate your authentication tokens regularly (at least every 90 days)
3. Use different tokens for development and production environments
4. Ensure your database connection uses SSL in production
