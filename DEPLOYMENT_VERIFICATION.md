# Deployment Verification Checklist

Use this checklist to verify that the Football Forecast application has been successfully deployed and is functioning correctly.

## Frontend Deployment (Netlify)

- [ ] **Site is accessible**: Visit https://football-forecast.netlify.app
- [ ] **Assets load correctly**: Check that all images, styles, and scripts load without errors
- [ ] **Responsive design**: Test on mobile, tablet, and desktop viewports
- [ ] **Authentication works**: Test login functionality
- [ ] **Data visualization**: Verify charts and graphs render correctly
- [ ] **Navigation**: Test all navigation links and routes

## Backend API (Netlify Functions)

- [ ] **Health endpoint**: `/api/health` returns 200 OK
- [ ] **Authentication**: Protected endpoints require valid bearer token
- [ ] **Leagues endpoint**: `/api/leagues` returns league data
- [ ] **Teams endpoint**: `/api/teams` returns team data
- [ ] **Fixtures endpoint**: `/api/fixtures` returns fixture data
- [ ] **Predictions endpoint**: `/api/predictions` returns prediction data

Notes:
- If redirects are misconfigured, test functions directly:
  - `/.netlify/functions/api/health`
  - `/.netlify/functions/api/leagues`

## Database (Supabase)

- [ ] **Connection works**: Application can connect to the database
- [ ] **Migrations applied**: All tables are created with correct schema
- [ ] **Sample data loaded**: Initial data is available for testing
- [ ] **Write operations**: Test creating new records
- [ ] **Read operations**: Test retrieving existing records
- [ ] **Update operations**: Test updating existing records

## ML Service (Optional)

- [ ] **Service is accessible**: ML service endpoint is reachable
- [ ] **Prediction API works**: Test generating new predictions
- [ ] **Scraping functionality**: Test data scraping if applicable

## Performance

- [ ] **Load time**: Initial page load under 3 seconds
- [ ] **API response time**: API endpoints respond within 500ms
- [ ] **Resource usage**: Check CPU and memory usage

## Security

- [ ] **HTTPS**: All connections use HTTPS
- [ ] **Authentication**: Bearer token validation works
- [ ] **Rate limiting**: API rate limiting is in effect
- [ ] **CORS**: CORS headers are properly configured

## How to Run Verification Tests

1. **Manual testing**:
   ```bash
   # Visit the deployed site
   open https://football-forecast.netlify.app
   ```

2. **API testing**:
   ```bash
   # Run the API test script
   node test-api.js
   ```

3. **Local Netlify dev (optional)**:
   ```bash
   # Terminal A: Vite dev server
   npm run dev:netlify  # http://localhost:5173

   # Terminal B: Netlify proxy (SPA + Functions)
   npx netlify dev      # http://localhost:8888

   # Test
   curl -i http://localhost:8888/api/health
   curl -i http://localhost:8888/.netlify/functions/api/health
   ```

4. **Database verification**:
   ```bash
   # Connect to Supabase and verify schema
   node verify-database.js
   ```

## Troubleshooting Common Issues

- **404 errors**: Check Netlify redirects configuration
- **API authentication errors**: Verify API_BEARER_TOKEN is set correctly
- **Database connection issues**: Check DATABASE_URL and network connectivity
- **CORS errors**: Ensure CORS_ORIGINS includes the frontend domain
