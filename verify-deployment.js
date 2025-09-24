/**
 * Automated Deployment Verification Script for Football Forecast
 * This script checks the health and readiness of all production services.
 * Usage: node verify-deployment.js
 */

import axios from 'axios';

const FRONTEND_URL = 'https://football-forecast.netlify.app';
const API_BASE = `${FRONTEND_URL}/api`;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || `${FRONTEND_URL}/.netlify/functions/ml-health`;
const API_BEARER_TOKEN = process.env.API_BEARER_TOKEN || '<your_token_here>';

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
  console.log('--- Deployment Verification ---');

  // Frontend
  process.stdout.write('Frontend reachable... ');
  console.log(await checkFrontend() ? 'OK' : 'FAIL');

  // API endpoints
  process.stdout.write('/api/health... ');
  console.log(await checkApi('/health') ? 'OK' : 'FAIL');

  process.stdout.write('/api/leagues... ');
  console.log(await checkApi('/leagues', true) ? 'OK' : 'FAIL');

  process.stdout.write('/api/fixtures... ');
  console.log(await checkApi('/fixtures', true) ? 'OK' : 'FAIL');

  process.stdout.write('/api/predictions... ');
  console.log(await checkApi('/predictions', true) ? 'OK' : 'FAIL');

  // ML service
  process.stdout.write('ML service health... ');
  console.log(await checkMLService() ? 'OK' : 'FAIL');

  console.log('--- Verification Complete ---');
}

main();
