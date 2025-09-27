# Netlify Deployment Troubleshooting Guide

This guide provides solutions for common issues encountered when deploying the Football Forecast application to Netlify.

## Common Issues and Solutions

### 1. Netlify CLI Interactive Prompt Errors

**Issue:** The Netlify CLI crashes when it tries to show interactive prompts, such as team selection.

**Solution:**
- Use the manual deployment script which avoids interactive prompts:
  ```bash
  npm run deploy:manual
  ```
- Or deploy directly using the Netlify CLI with the `--json` flag:
  ```bash
  netlify deploy --prod --dir=dist --json
  ```

### 2. Missing Environment Variables

**Issue:** Deployment fails due to missing environment variables.

**Solution:**
- Check that all required variables are set in your `.env` file:
  ```
  API_FOOTBALL_KEY=your_api_key
  API_BEARER_TOKEN=your_bearer_token
  SCRAPER_AUTH_TOKEN=your_scraper_token
  SESSION_SECRET=your_session_secret
  NETLIFY_AUTH_TOKEN=your_netlify_token
  NETLIFY_SITE_ID=your_site_id
  ```
- For Netlify deployments, also set these in the Netlify dashboard:
  1. Go to Site settings > Build & deploy > Environment
  2. Add all required environment variables

### 3. Build Failures

**Issue:** The build process fails during deployment.

**Solution:**
- Check for TypeScript errors:
  ```bash
  npm run check
  ```
- Check for linting errors:
  ```bash
  npm run lint
  ```
- Try building locally first:
  ```bash
  npm run build
  ```
- Check the build output directory (`dist`) to ensure files are generated correctly

### 4. Netlify Site Creation Failures

**Issue:** Creating a new Netlify site fails.

**Solution:**
- Create the site manually in the Netlify dashboard:
  1. Go to [Netlify](https://app.netlify.com/)
  2. Click "New site from Git" or "Import an existing project"
  3. Follow the prompts to create a new site
  4. Update your `.env` file with the new site ID

### 5. Netlify "Project not found" / linking issues

**Issue:**

```
Error: Project not found. Please rerun "netlify link"
```

**Fix:** Link the repository to the correct Netlify site or set the site ID.

- Option A: Link via CLI (interactive):

```bash
netlify link
```

- Option B: Link non-interactively if you know the site ID (recommended for CI):

```bash
netlify link --id <YOUR_SITE_ID>
```

- Option C: Set `NETLIFY_SITE_ID` in your `.env` and rerun the deploy script:

```
NETLIFY_SITE_ID=<YOUR_SITE_ID>
```

### 6. Deployment Verification Failures

**Issue:** The deployment verification script reports failures.

**Solution:**
- Check that the site is fully deployed and accessible
- Verify that all API endpoints are working
- Check that environment variables are correctly set in Netlify
- Look for specific errors in the verification output

## Manual Deployment Steps

If automated deployment scripts are not working, follow these manual steps:

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy using Netlify CLI**
   ```bash
   netlify deploy --prod --dir=dist/public --no-build
   ```

3. **Verify the deployment**
   ```bash
   node verify-deployment.js
   ```

## Getting Help

If you continue to experience issues with deployment:

1. Check the Netlify documentation: [https://docs.netlify.com/](https://docs.netlify.com/)
2. Review the Netlify CLI documentation: [https://cli.netlify.com/](https://cli.netlify.com/)
3. Contact the development team for assistance

---

Remember that deployment issues are often environment-specific. What works on one machine may not work on another due to differences in operating systems, Node.js versions, or network configurations.
