/**
 * Automated Deployment Verification Script for Football Forecast
 * This script checks the health and readiness of all production services.
 * Usage: node verify-deployment.js
 */

import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID || 'football-forecast';
const FRONTEND_URL = `https://${NETLIFY_SITE_ID}.netlify.app`;
const API_BASE = `${FRONTEND_URL}/api`;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || `${FRONTEND_URL}/.netlify/functions/ml-health`;
const API_BEARER_TOKEN = process.env.API_BEARER_TOKEN;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

async function checkFrontend() {
  try {
    const res = await axios.get(FRONTEND_URL);
    return res.status === 200;
  } catch (e) {
    return false;
  }
}

async function checkApi(path, tokenRequired = false) {
  try {
    const headers = tokenRequired ? { Authorization: `Bearer ${API_BEARER_TOKEN}` } : {};
    const res = await axios.get(`${API_BASE}${path}`, { headers });
    return res.status === 200;
  } catch (e) {
    if (e.response) {
      console.error(`FAIL ${path}: ${e.response.status} ${e.response.statusText}`);
      if (e.response.data) console.error(e.response.data);
    } else {
      console.error(`FAIL ${path}:`, e.message);
    }
    return false;
  }
}

async function checkMLService() {
  try {
    const res = await axios.get(ML_SERVICE_URL);
    return res.status === 200;
  } catch (e) {
    return false;
  }
}

async function main() {
  console.log(`${colors.magenta}=== Football Forecast Deployment Verification ===${colors.reset}`);
  console.log(`${colors.blue}Target URL: ${FRONTEND_URL}${colors.reset}`);
  console.log();

  let allPassed = true;
  const results = [];

  // Frontend
  process.stdout.write(`${colors.cyan}Frontend reachable...${colors.reset} `);
  const frontendResult = await checkFrontend();
  console.log(frontendResult ? `${colors.green}OK${colors.reset}` : `${colors.red}FAIL${colors.reset}`);
  results.push({ name: 'Frontend', passed: frontendResult });
  if (!frontendResult) allPassed = false;

  // API endpoints
  process.stdout.write(`${colors.cyan}/api/health...${colors.reset} `);
  const healthResult = await checkApi('/health');
  console.log(healthResult ? `${colors.green}OK${colors.reset}` : `${colors.red}FAIL${colors.reset}`);
  results.push({ name: 'API Health', passed: healthResult });
  if (!healthResult) allPassed = false;

  process.stdout.write(`${colors.cyan}/api/leagues...${colors.reset} `);
  const leaguesResult = await checkApi('/leagues');
  console.log(leaguesResult ? `${colors.green}OK${colors.reset}` : `${colors.red}FAIL${colors.reset}`);
  results.push({ name: 'API Leagues', passed: leaguesResult });
  if (!leaguesResult) allPassed = false;

  process.stdout.write(`${colors.cyan}/api/fixtures...${colors.reset} `);
  const fixturesResult = await checkApi('/fixtures');
  console.log(fixturesResult ? `${colors.green}OK${colors.reset}` : `${colors.red}FAIL${colors.reset}`);
  results.push({ name: 'API Fixtures', passed: fixturesResult });
  if (!fixturesResult) allPassed = false;

  process.stdout.write(`${colors.cyan}/api/predictions...${colors.reset} `);
  const predictionsResult = await checkApi('/predictions');
  console.log(predictionsResult ? `${colors.green}OK${colors.reset}` : `${colors.red}FAIL${colors.reset}`);
  results.push({ name: 'API Predictions', passed: predictionsResult });
  if (!predictionsResult) allPassed = false;

  // Diagnostics endpoints
  process.stdout.write(`${colors.cyan}/api/diagnostics/version...${colors.reset} `);
  const versionResult = await checkApi('/diagnostics/version');
  console.log(versionResult ? `${colors.green}OK${colors.reset}` : `${colors.red}FAIL${colors.reset}`);
  results.push({ name: 'API Version', passed: versionResult });
  if (!versionResult) allPassed = false;
  
  process.stdout.write(`${colors.cyan}/api/diagnostics/status...${colors.reset} `);
  const statusResult = await checkApi('/diagnostics/status');
  console.log(statusResult ? `${colors.green}OK${colors.reset}` : `${colors.red}FAIL${colors.reset}`);
  results.push({ name: 'API Status', passed: statusResult });
  if (!statusResult) allPassed = false;

  // ML service
  process.stdout.write(`${colors.cyan}ML service health...${colors.reset} `);
  const mlResult = await checkMLService();
  console.log(mlResult ? `${colors.green}OK${colors.reset}` : `${colors.red}FAIL${colors.reset}`);
  results.push({ name: 'ML Service', passed: mlResult });
  if (!mlResult) allPassed = false;

  console.log();
  console.log(`${colors.magenta}=== Verification Summary ===${colors.reset}`);
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);
  
  console.log(`${colors.blue}Tests passed: ${passed}/${total} (${percentage}%)${colors.reset}`);
  
  if (allPassed) {
    console.log(`${colors.green}✓ All verification checks passed!${colors.reset}`);
    return true;
  } else {
    console.log(`${colors.red}✗ Some verification checks failed${colors.reset}`);
    return false;
  }
}

// Run the main function and handle exit code
main()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error(`${colors.red}Verification failed with error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
