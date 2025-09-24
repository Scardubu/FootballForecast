#!/usr/bin/env node

/**
 * Test script for Football Forecast API
 * 
 * This script tests the API endpoints to verify the deployment is working correctly.
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

console.log(`${colors.blue}========================================${colors.reset}`);
console.log(`${colors.blue}Football Forecast API Test${colors.reset}`);
console.log(`${colors.blue}========================================${colors.reset}`);

const API_URL = 'https://football-forecast.netlify.app';
const API_BEARER_TOKEN = process.env.API_BEARER_TOKEN;

if (!API_BEARER_TOKEN) {
  console.error(`${colors.red}Error: API_BEARER_TOKEN is not defined in .env${colors.reset}`);
  process.exit(1);
}

async function testEndpoint(endpoint, method = 'GET', body = null) {
  console.log(`${colors.cyan}Testing ${method} ${endpoint}...${colors.reset}`);
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${API_BEARER_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });
    
    const status = response.status;
    let data;
    
    try {
      data = await response.json();
    } catch (e) {
      data = await response.text();
    }
    
    if (status >= 200 && status < 300) {
      console.log(`${colors.green}✓ ${status} Success${colors.reset}`);
      console.log(data);
      return { success: true, data };
    } else {
      console.log(`${colors.red}✗ ${status} Error${colors.reset}`);
      console.log(data);
      return { success: false, data };
    }
  } catch (error) {
    console.error(`${colors.red}✗ Request failed: ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  // Test health endpoint (doesn't require auth)
  await testEndpoint('/api/health');
  
  // Test leagues endpoint
  await testEndpoint('/api/leagues');
  
  // Test teams endpoint
  await testEndpoint('/api/teams');
  
  // Test fixtures endpoint
  await testEndpoint('/api/fixtures');
  
  console.log(`${colors.blue}========================================${colors.reset}`);
  console.log(`${colors.blue}API Test Complete${colors.reset}`);
  console.log(`${colors.blue}========================================${colors.reset}`);
}

runTests().catch(error => {
  console.error(`${colors.red}Unhandled error: ${error.message}${colors.reset}`);
  process.exit(1);
});
