#!/usr/bin/env node

/**
 * Production Status Verification Script
 * 
 * Validates that all critical endpoints and features are working correctly
 * after deployment to production. This script should be run after each
 * deployment to ensure the application is functioning properly.
 */

import fetch from 'node-fetch';
import { performance } from 'perf_hooks';

// Configuration
const BASE_URL = process.env.PRODUCTION_URL || 'https://resilient-souffle-0daafe.netlify.app';
const TIMEOUT_MS = 10000; // 10 seconds
const MAX_RESPONSE_TIME_MS = 3000; // 3 seconds for acceptable response time

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Utility functions
function logSuccess(message) {
  console.log(`✅ ${message}`);
  results.passed++;
}

function logError(message) {
  console.log(`❌ ${message}`);
  results.failed++;
}

function logWarning(message) {
  console.log(`⚠️  ${message}`);
  results.warnings++;
}

function logInfo(message) {
  console.log(`ℹ️  ${message}`);
}

async function makeRequest(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  
  const startTime = performance.now();
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Production-Verification-Script/1.0',
        ...options.headers
      }
    });
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    clearTimeout(timeoutId);
    
    return {
      response,
      responseTime,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Test functions
async function testHealthEndpoint() {
  logInfo('Testing health endpoint...');
  
  try {
    const { response, responseTime } = await makeRequest(`${BASE_URL}/api/health`);
    
    if (response.ok) {
      const data = await response.json();
      logSuccess(`Health endpoint responding (${Math.round(responseTime)}ms)`);
      
      if (responseTime > MAX_RESPONSE_TIME_MS) {
        logWarning(`Health endpoint response time is slow: ${Math.round(responseTime)}ms`);
      }
      
      // Check health status
      if (data.status === 'healthy') {
        logSuccess('Application status: healthy');
      } else if (data.status === 'degraded') {
        logWarning('Application status: degraded - some features may be limited');
      } else {
        logError(`Application status: ${data.status}`);
      }
      
      return true;
    } else {
      logError(`Health endpoint failed: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    logError(`Health endpoint error: ${error.message}`);
    return false;
  }
}

async function testStaticAssets() {
  logInfo('Testing static assets...');
  
  const assets = [
    '/',
    '/favicon.svg',
    '/manifest.webmanifest'
  ];
  
  let allPassed = true;
  
  for (const asset of assets) {
    try {
      const { response, responseTime } = await makeRequest(`${BASE_URL}${asset}`);
      
      if (response.ok) {
        logSuccess(`Static asset ${asset} loaded (${Math.round(responseTime)}ms)`);
        
        if (responseTime > MAX_RESPONSE_TIME_MS) {
          logWarning(`Asset ${asset} response time is slow: ${Math.round(responseTime)}ms`);
        }
      } else {
        logError(`Static asset ${asset} failed: ${response.status}`);
        allPassed = false;
      }
    } catch (error) {
      logError(`Static asset ${asset} error: ${error.message}`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

async function testAPIEndpoints() {
  logInfo('Testing API endpoints...');
  
  const endpoints = [
    { path: '/api/auth/status', method: 'GET', expectStatus: [200, 401] },
    { path: '/api/leagues', method: 'GET', expectStatus: [200, 401] },
    { path: '/api/teams', method: 'GET', expectStatus: [200, 401] },
    { path: '/api/fixtures/live', method: 'GET', expectStatus: [200, 401] },
    { path: '/api/standings/39', method: 'GET', expectStatus: [200, 401, 404] }
  ];
  
  let allPassed = true;
  
  for (const endpoint of endpoints) {
    try {
      const { response, responseTime } = await makeRequest(`${BASE_URL}${endpoint.path}`, {
        method: endpoint.method
      });
      
      if (endpoint.expectStatus.includes(response.status)) {
        logSuccess(`API ${endpoint.method} ${endpoint.path} responding (${response.status}, ${Math.round(responseTime)}ms)`);
        
        if (responseTime > MAX_RESPONSE_TIME_MS) {
          logWarning(`API ${endpoint.path} response time is slow: ${Math.round(responseTime)}ms`);
        }
      } else {
        logError(`API ${endpoint.method} ${endpoint.path} unexpected status: ${response.status}`);
        allPassed = false;
      }
    } catch (error) {
      logError(`API ${endpoint.method} ${endpoint.path} error: ${error.message}`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

async function testWebSocketFallback() {
  logInfo('Testing WebSocket fallback behavior...');
  
  // Since WebSockets are disabled on Netlify, we just verify the frontend
  // handles this gracefully by checking if the main page loads without errors
  try {
    const { response } = await makeRequest(`${BASE_URL}/`);
    
    if (response.ok) {
      const html = await response.text();
      
      // Check if the page contains expected content
      if (html.includes('Football Forecast') || html.includes('dashboard')) {
        logSuccess('Frontend loads correctly (WebSocket fallback working)');
        return true;
      } else {
        logWarning('Frontend loaded but content may be missing');
        return false;
      }
    } else {
      logError(`Frontend failed to load: ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Frontend loading error: ${error.message}`);
    return false;
  }
}

async function testSecurityHeaders() {
  logInfo('Testing security headers...');
  
  try {
    const { response } = await makeRequest(`${BASE_URL}/`);
    
    const securityHeaders = [
      'strict-transport-security',
      'x-content-type-options',
      'x-frame-options',
      'referrer-policy'
    ];
    
    let allPresent = true;
    
    for (const header of securityHeaders) {
      if (response.headers.get(header)) {
        logSuccess(`Security header present: ${header}`);
      } else {
        logWarning(`Security header missing: ${header}`);
        allPresent = false;
      }
    }
    
    return allPresent;
  } catch (error) {
    logError(`Security headers test error: ${error.message}`);
    return false;
  }
}

// Main verification function
async function runVerification() {
  console.log('🚀 Starting production verification...');
  console.log(`📍 Target URL: ${BASE_URL}`);
  console.log('');
  
  const tests = [
    { name: 'Health Endpoint', fn: testHealthEndpoint },
    { name: 'Static Assets', fn: testStaticAssets },
    { name: 'API Endpoints', fn: testAPIEndpoints },
    { name: 'WebSocket Fallback', fn: testWebSocketFallback },
    { name: 'Security Headers', fn: testSecurityHeaders }
  ];
  
  for (const test of tests) {
    console.log(`\n📋 Running ${test.name} tests...`);
    const passed = await test.fn();
    results.tests.push({ name: test.name, passed });
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Warnings: ${results.warnings}`);
  
  const overallSuccess = results.failed === 0;
  
  if (overallSuccess) {
    console.log('\n🎉 Production verification PASSED! Application is ready.');
  } else {
    console.log('\n💥 Production verification FAILED! Please address the issues above.');
  }
  
  // Exit with appropriate code
  process.exit(overallSuccess ? 0 : 1);
}

// Handle unhandled errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run verification
runVerification().catch((error) => {
  console.error('❌ Verification script failed:', error);
  process.exit(1);
});
