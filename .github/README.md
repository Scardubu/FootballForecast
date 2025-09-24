# GitHub Actions CI/CD Setup

This directory contains GitHub Actions workflows for continuous integration and deployment of the Football Forecast application.

## Required Secrets

To use these workflows, you need to set up the following secrets in your GitHub repository:

### Netlify Deployment Secrets

- `NETLIFY_AUTH_TOKEN`: Your Netlify personal access token
- `NETLIFY_SITE_ID`: The ID of your Netlify site (c7ba4ccd-9c4d-4492-a8fc-2c2c1bb79a82)

### Supabase Database Secrets

- `DATABASE_URL`: Your Supabase PostgreSQL connection string
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key

## Setting Up Secrets

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Add each of the required secrets

## Workflows

- `deploy.yml`: Deploys the application to Netlify and runs database migrations on push to main branch
