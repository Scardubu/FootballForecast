#!/bin/bash
# Automated Netlify deployment script for Football Forecast
# Usage: ./scripts/deploy-netlify.sh

set -e

# Check for Netlify CLI
if ! command -v netlify &> /dev/null; then
  echo "Netlify CLI not found. Installing..."
  npm install -g netlify-cli
fi

echo "\n--- Netlify CLI Version ---"
netlify --version

# Login if not already
if ! netlify status | grep -q 'Logged in'; then
  echo "Logging in to Netlify..."
  netlify login
fi

# Link project if not already linked
if [ ! -f .netlify/state.json ]; then
  echo "Linking Netlify project..."
  netlify link || {
    echo "Please create or select a site in the prompt.";
  }
fi

# Build the project
npm run build

# Deploy to production
netlify deploy --build --prod

echo "\n--- Deployment Complete ---"
