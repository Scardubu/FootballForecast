/**
 * Render Deployment Script
 * Deploys Football Forecast application to Render using API
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RENDER_API_KEY = process.env.RENDER_API_KEY || 'rnd_QTYxc8BlcCDyoaeWFpurddfXiUGi';
const RENDER_API_URL = 'https://api.render.com/v1';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = COLORS.reset) {
  console.log(`${color}${message}${COLORS.reset}`);
}

async function makeRequest(endpoint, options = {}) {
  const url = `${RENDER_API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${RENDER_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText}\n${error}`);
  }

  return response.json();
}

async function getOwner() {
  log('\n📋 Fetching account information...', COLORS.cyan);
  const owners = await makeRequest('/owners');
  
  if (owners.length === 0) {
    throw new Error('No owners found. Please check your API key.');
  }

  const owner = owners[0];
  log(`✅ Account: ${owner.name || owner.email}`, COLORS.green);
  return owner;
}

async function createOrGetService(ownerId, serviceName, serviceConfig) {
  log(`\n📋 Checking for existing service: ${serviceName}...`, COLORS.cyan);
  
  try {
    const services = await makeRequest(`/services?ownerId=${ownerId}`);
    const existing = services.find(s => s.service.name === serviceName);
    
    if (existing) {
      log(`✅ Found existing service: ${serviceName}`, COLORS.yellow);
      return existing.service;
    }
  } catch (error) {
    log(`⚠️  Could not check existing services: ${error.message}`, COLORS.yellow);
  }

  log(`📦 Creating new service: ${serviceName}...`, COLORS.cyan);
  const result = await makeRequest('/services', {
    method: 'POST',
    body: JSON.stringify({
      ...serviceConfig,
      ownerId,
    }),
  });

  log(`✅ Created service: ${serviceName}`, COLORS.green);
  return result;
}

async function createOrGetDatabase(ownerId, dbName) {
  log(`\n📋 Checking for existing database: ${dbName}...`, COLORS.cyan);
  
  try {
    const databases = await makeRequest(`/postgres?ownerId=${ownerId}`);
    const existing = databases.find(db => db.postgres.name === dbName);
    
    if (existing) {
      log(`✅ Found existing database: ${dbName}`, COLORS.yellow);
      return existing.postgres;
    }
  } catch (error) {
    log(`⚠️  Could not check existing databases: ${error.message}`, COLORS.yellow);
  }

  log(`📦 Creating new database: ${dbName}...`, COLORS.cyan);
  const result = await makeRequest('/postgres', {
    method: 'POST',
    body: JSON.stringify({
      ownerId,
      name: dbName,
      databaseName: 'football_forecast',
      plan: 'starter',
      region: 'oregon',
    }),
  });

  log(`✅ Created database: ${dbName}`, COLORS.green);
  return result;
}

async function deployFromBlueprint() {
  log('\n🚀 Starting Render Deployment from Blueprint', COLORS.cyan);
  log('='.repeat(60), COLORS.cyan);

  try {
    // Get owner information
    const owner = await getOwner();
    const ownerId = owner.id;

    // Read render.yaml
    const blueprintPath = path.join(__dirname, 'render.yaml');
    if (!fs.existsSync(blueprintPath)) {
      throw new Error('render.yaml not found. Please ensure it exists in the project root.');
    }

    log('\n📄 Blueprint file found: render.yaml', COLORS.green);

    // Create database first
    const database = await createOrGetDatabase(ownerId, 'football-forecast-db');
    const dbConnectionString = database.connectionString || `postgresql://user:pass@${database.hostname}:${database.port}/${database.databaseName}`;

    // Create ML Service
    const mlService = await createOrGetService(ownerId, 'football-forecast-ml', {
      type: 'web_service',
      name: 'football-forecast-ml',
      runtime: 'docker',
      plan: 'starter',
      region: 'oregon',
      dockerfilePath: './Dockerfile.python',
      dockerContext: '.',
      autoDeploy: 'yes',
      envVars: [
        { key: 'PORT', value: '8000' },
        { key: 'PYTHONUNBUFFERED', value: '1' },
      ],
      healthCheckPath: '/',
    });

    const mlServiceUrl = mlService.serviceDetails?.url || `https://${mlService.slug}.onrender.com`;

    // Create Web Service
    const webService = await createOrGetService(ownerId, 'football-forecast-web', {
      type: 'web_service',
      name: 'football-forecast-web',
      runtime: 'node',
      plan: 'starter',
      region: 'oregon',
      buildCommand: 'npm ci && npm run build',
      startCommand: 'npm start',
      autoDeploy: 'yes',
      envVars: [
        { key: 'NODE_ENV', value: 'production' },
        { key: 'PORT', value: '10000' },
        { key: 'ML_SERVICE_URL', value: mlServiceUrl },
        { key: 'DATABASE_URL', value: dbConnectionString },
        { key: 'SESSION_SECRET', generateValue: true },
        { key: 'DISABLE_DATABASE_STORAGE', value: 'false' },
        { key: 'ML_FALLBACK_ENABLED', value: 'true' },
      ],
      healthCheckPath: '/api/health',
    });

    const webServiceUrl = webService.serviceDetails?.url || `https://${webService.slug}.onrender.com`;

    // Print deployment summary
    log('\n' + '='.repeat(60), COLORS.cyan);
    log('✅ DEPLOYMENT SUCCESSFUL!', COLORS.green);
    log('='.repeat(60), COLORS.cyan);
    
    log('\n📊 Deployed Services:', COLORS.cyan);
    log(`\n🌐 Web Service (Node.js):`, COLORS.blue);
    log(`   URL: ${webServiceUrl}`, COLORS.green);
    log(`   Name: ${webService.name}`);
    log(`   Status: ${webService.serviceDetails?.buildStatus || 'Deploying...'}`);
    
    log(`\n🤖 ML Service (Python):`, COLORS.blue);
    log(`   URL: ${mlServiceUrl}`, COLORS.green);
    log(`   Name: ${mlService.name}`);
    log(`   Status: ${mlService.serviceDetails?.buildStatus || 'Deploying...'}`);
    
    log(`\n💾 Database (PostgreSQL):`, COLORS.blue);
    log(`   Name: ${database.name}`);
    log(`   Database: ${database.databaseName}`);
    log(`   Status: ${database.status || 'Available'}`);

    log('\n📝 Next Steps:', COLORS.yellow);
    log('1. Wait for services to finish building (5-10 minutes)');
    log('2. Check deployment status in Render Dashboard');
    log(`3. Visit your application: ${webServiceUrl}`);
    log('4. Run database migrations if needed:');
    log(`   DATABASE_URL="${dbConnectionString}" npm run db:push`);
    
    log('\n🔗 Render Dashboard:', COLORS.cyan);
    log('   https://dashboard.render.com', COLORS.blue);
    
    log('\n' + '='.repeat(60) + '\n', COLORS.cyan);

    return {
      webService,
      mlService,
      database,
      webServiceUrl,
      mlServiceUrl,
    };

  } catch (error) {
    log('\n❌ Deployment Failed!', COLORS.red);
    log(`Error: ${error.message}`, COLORS.red);
    console.error(error);
    process.exit(1);
  }
}

async function checkDeploymentStatus(serviceId) {
  try {
    const service = await makeRequest(`/services/${serviceId}`);
    return service;
  } catch (error) {
    log(`⚠️  Could not check service status: ${error.message}`, COLORS.yellow);
    return null;
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  deployFromBlueprint().catch(error => {
    log(`\n💥 Deployment script crashed: ${error.message}`, COLORS.red);
    console.error(error);
    process.exit(1);
  });
}

export { deployFromBlueprint, checkDeploymentStatus };
