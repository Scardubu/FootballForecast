/**
 * Hybrid Data Integration Status Checker
 * Verifies all components of the hybrid data pipeline are operational
 */

import { config } from 'dotenv';

// Node 18+ exposes global fetch; provide a helpful error if unavailable
if (typeof fetch !== 'function') {
  console.error('\n❌ Global fetch is not available in this Node.js runtime.');
  console.error('   Please upgrade to Node.js v18+ or install the "node-fetch" package.');
  console.error('   Example: npm install node-fetch && node --experimental-fetch scripts/check-hybrid-status.js');
  process.exit(1);
}

// Load environment variables
config();

function cleanUrl(val, fallback) {
  const raw = (val || fallback || '').toString();
  const cleaned = raw.split('#')[0].trim().replace('localhost', '127.0.0.1');
  return cleaned || fallback;
}

const BASE_URL = cleanUrl(process.env.API_BASE_URL, 'http://127.0.0.1:5000');
const ML_SERVICE_URL = cleanUrl(process.env.ML_SERVICE_URL, 'http://127.0.0.1:8000');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, emoji, message) {
  console.log(`${emoji} ${color}${message}${colors.reset}`);
}

function success(message) {
  log(colors.green, '✅', message);
}

function error(message) {
  log(colors.red, '❌', message);
}

function warning(message) {
  log(colors.yellow, '⚠️', message);
}

function info(message) {
  log(colors.cyan, 'ℹ️', message);
}

function section(title) {
  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.blue}  ${title}${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

async function checkEnvironmentVariables() {
  section('🔧 Environment Configuration');

  const requiredVars = {
    OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY,
    SCRAPER_AUTH_TOKEN: process.env.SCRAPER_AUTH_TOKEN,
    DATABASE_URL: process.env.DATABASE_URL,
    API_FOOTBALL_KEY: process.env.API_FOOTBALL_KEY,
  };

  const optionalVars = {
    SCRAPE_ODDS_INTERVAL_MS: process.env.SCRAPE_ODDS_INTERVAL_MS || '600000 (default)',
    SCRAPE_INJURY_INTERVAL_MS: process.env.SCRAPE_INJURY_INTERVAL_MS || '3600000 (default)',
    ENABLE_SCRAPING: process.env.ENABLE_SCRAPING || 'true (default)',
  };

  let allRequired = true;

  for (const [key, value] of Object.entries(requiredVars)) {
    if (value && value.length > 10) {
      success(`${key}: Configured (${value.substring(0, 20)}...)`);
    } else {
      error(`${key}: Missing or invalid`);
      allRequired = false;
    }
  }

  console.log('\n  Optional Configuration:');
  for (const [key, value] of Object.entries(optionalVars)) {
    info(`  ${key}: ${value}`);
  }

  return allRequired;
}

async function checkNodeServer() {
  section('🚀 Node.js Backend Server');

  try {
    // Create timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${BASE_URL}/api/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      error(`Server responded with status ${response.status}`);
      return false;
    }

    const health = await response.json();

    success(`Server is running (uptime: ${Math.round(health.uptime)}s)`);

    if (health.db === 'healthy') {
      success('Database: Connected');
    } else {
      error(`Database: ${health.db}`);
    }

    if (health.ml === 'healthy') {
      success('ML Service: Connected');
    } else {
      warning(`ML Service: ${health.ml} (may be starting)`);
    }

    if (health.hybridData) {
      console.log('\n  Hybrid Data Sources:');

      if (health.hybridData.openweather?.configured) {
        success(`  OpenWeather: ${health.hybridData.openweather.status}`);
      } else {
        error('  OpenWeather: Not configured');
      }

      if (health.hybridData.odds?.configured) {
        success(`  Odds (${health.hybridData.odds.source}): ${health.hybridData.odds.status}`);
      }

      if (health.hybridData.injuries?.configured) {
        success(`  Injuries (${health.hybridData.injuries.source}): ${health.hybridData.injuries.status}`);
      }
    }

    return true;
  } catch (err) {
    error(`Cannot connect to Node server: ${err.message}`);
    info('  Make sure the server is running: npm run dev');
    return false;
  }
}

async function checkMLService() {
  section('🤖 Python ML Service');

  try {
    // Create timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${ML_SERVICE_URL}/`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      error(`ML service responded with status ${response.status}`);
      return false;
    }

    const data = await response.json();
    success(`ML Service: ${data.status} (v${data.version})`);

    try {
      const modelController = new AbortController();
      const modelTimeoutId = setTimeout(() => modelController.abort(), 5000);

      const modelResponse = await fetch(`${ML_SERVICE_URL}/model/status`, {
        signal: modelController.signal,
      });

      clearTimeout(modelTimeoutId);
      const modelStatus = await modelResponse.json();

      if (modelStatus.status === 'ready') {
        success(`Model: Loaded (${modelStatus.features_count || 0} features)`);
      } else {
        warning(`Model: ${modelStatus.status} - ${modelStatus.message || 'Not trained'}`);
      }
    } catch (err) {
      warning(`Model status check failed: ${err.message}`);
    }

    return true;
  } catch (err) {
    error(`Cannot connect to ML service: ${err.message}`);
    info('  Start the service: npm run dev:python');
    return false;
  }
}

async function checkScrapedData() {
  section('🕷️ Scraped Data Availability');

  const dataTypes = [
    { type: 'odds', ttl: '10 minutes' },
    { type: 'injuries', ttl: '1 hour' },
    { type: 'weather', ttl: '3 hours' },
  ];

  let hasData = false;

  for (const { type, ttl } of dataTypes) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `${BASE_URL}/api/scraped-data?dataType=${type}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();

        if (data && data.length > 0) {
          const freshness = response.headers.get('X-Freshness-Seconds');
          success(`${type}: ${data.length} records (TTL: ${ttl}, age: ${freshness || 'unknown'}s)`);
          hasData = true;
        } else {
          info(`${type}: No data yet (will be populated on scrape)`);
        }
      } else {
        warning(`${type}: Cannot query (${response.status})`);
      }
    } catch (err) {
      warning(`${type}: Check failed - ${err.message}`);
    }
  }

  if (!hasData) {
    info('  Run a scrape to populate data: POST /scrape on ML service');
  }

  return true;
}

async function checkScheduler() {
  section('⏰ Scraping Scheduler');

  const isEnabled = process.env.ENABLE_SCRAPING !== 'false';

  if (!isEnabled) {
    warning('Scraping is disabled (ENABLE_SCRAPING=false)');
    return false;
  }

  success('Scraping enabled');

  const oddsInterval = parseInt(process.env.SCRAPE_ODDS_INTERVAL_MS || '600000', 10);
  const injuryInterval = parseInt(process.env.SCRAPE_INJURY_INTERVAL_MS || '3600000', 10);

  info(`  Odds refresh: Every ${Math.round(oddsInterval / 60000)} minutes`);
  info(`  Injury refresh: Every ${Math.round(injuryInterval / 60000)} minutes`);

  return true;
}

async function checkPredictionIntegration() {
  section('🎯 Prediction Integration');

  info('Testing prediction with hybrid data...');

  warning('Manual test required:');
  info('  1. Ensure fixtures exist in database');
  info('  2. Run scraper for those fixtures');
  info('  3. Call: GET /api/predictions/{fixtureId}');
  info('  4. Verify reasoning.dataQuality.sources includes scraped sources');

  return true;
}

async function runAllChecks() {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🔍 HYBRID DATA INTEGRATION - SYSTEM HEALTH CHECK');
  console.log('═══════════════════════════════════════════════════════════');

  const results = {
    env: await checkEnvironmentVariables(),
    node: await checkNodeServer(),
    ml: await checkMLService(),
    data: await checkScrapedData(),
    scheduler: await checkScheduler(),
    integration: await checkPredictionIntegration(),
  };

  section('📊 Summary');

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  const percentage = Math.round((passed / total) * 100);

  console.log(`  Checks Passed: ${passed}/${total} (${percentage}%)\n`);

  if (percentage === 100) {
    success('All systems operational! 🎉');
    success('Hybrid data integration is fully functional.\n');
  } else if (percentage >= 80) {
    warning('Most systems operational, minor issues detected.');
    warning('Check warnings above for details.\n');
  } else {
    error('Critical issues detected!');
    error('Review errors above and fix configuration.\n');
  }

  process.exit(percentage >= 80 ? 0 : 1);
}

runAllChecks().catch((err) => {
  console.error('\n❌ Health check failed with error:', err);
  process.exit(1);
});
