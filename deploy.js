/**
 * Production deployment script for Football Forecast
 * 
 * This script automates the deployment process to Netlify
 * and performs pre-deployment checks to ensure everything is ready.
 */

// Import required modules
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID || 'football-forecast';
const NETLIFY_AUTH_TOKEN = process.env.NETLIFY_AUTH_TOKEN;
const NETLIFY_TEAM_SLUG = process.env.NETLIFY_TEAM_SLUG || '';
const REQUIRED_ENV_VARS = [
  'API_FOOTBALL_KEY',
  'API_BEARER_TOKEN',
  'SCRAPER_AUTH_TOKEN',
  'SESSION_SECRET'
  // DATABASE_URL is optional as we have in-memory fallback
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

/**
 * Run a command and return its output
 */
function runCommand(command, options = {}) {
  console.log(`${colors.blue}Running: ${command}${colors.reset}`);
  try {
    return execSync(command, { 
      stdio: 'inherit', 
      encoding: 'utf-8',
      ...options 
    });
  } catch (error) {
    console.error(`${colors.red}Command failed: ${command}${colors.reset}`);
    throw error;
  }
}

/**
 * Check if all required environment variables are set
 */
function checkEnvironmentVariables() {
  console.log(`${colors.cyan}Checking environment variables...${colors.reset}`);
  
  const missingVars = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`${colors.red}Missing required environment variables: ${missingVars.join(', ')}${colors.reset}`);
    console.error(`${colors.yellow}Please set these variables in your .env file or deployment environment.${colors.reset}`);
    process.exit(1);
  }
  
  if (!NETLIFY_SITE_ID || !NETLIFY_AUTH_TOKEN) {
    console.error(`${colors.red}Missing Netlify configuration: NETLIFY_SITE_ID and/or NETLIFY_AUTH_TOKEN${colors.reset}`);
    console.error(`${colors.yellow}Please set these variables in your .env file or deployment environment.${colors.reset}`);
    process.exit(1);
  }
  
  console.log(`${colors.green}✓ All required environment variables are set${colors.reset}`);
}

/**
 * Clean the build directory
 */
function cleanBuildDirectory() {
  console.log(`${colors.cyan}Cleaning build directory...${colors.reset}`);
  // Check if the directory exists first
  if (fs.existsSync('dist')) {
    try {
      // On Windows, we need to be careful with file locks
      // Use rimraf-style recursive deletion manually
      if (process.platform === 'win32') {
        // Handle Windows directory deletion more carefully
        runCommand('rmdir /s /q dist', { stdio: 'ignore', shell: true });
      } else {
        // On Unix systems, this is simpler
        runCommand('rm -rf dist', { stdio: 'ignore' });
      }
      console.log(`${colors.green}✓ Successfully cleaned build directory${colors.reset}`);
    } catch (error) {
      console.warn(`${colors.yellow}Warning: Could not clean build directory. Continuing anyway...${colors.reset}`);
      console.warn(error.message);
    }
  }
}

/**
 * Run pre-deployment checks
 */
function runPreDeploymentChecks() {
  console.log(`${colors.cyan}Running pre-deployment checks...${colors.reset}`);
  
  // Check TypeScript types
  try {
    runCommand('npm run check');
    console.log(`${colors.green}✓ TypeScript type checking passed${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ TypeScript type checking failed${colors.reset}`);
    process.exit(1);
  }
  
  // Run linting
  try {
    runCommand('npm run lint');
    console.log(`${colors.green}✓ Linting passed${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ Linting failed${colors.reset}`);
    process.exit(1);
  }
  
  // Clean the build directory before building
  cleanBuildDirectory();
  
  // Check for production build
  try {
    runCommand('npm run build');
    console.log(`${colors.green}✓ Production build successful${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ Production build failed${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Deploy to Netlify
 */
function deployToNetlify() {
  console.log(`${colors.cyan}Deploying to Netlify...${colors.reset}`);
  
  try {
    // Check if Netlify CLI is installed
    try {
      runCommand('netlify --version', { stdio: 'ignore' });
    } catch (error) {
      console.log(`${colors.yellow}Installing Netlify CLI...${colors.reset}`);
      runCommand('npm install -g netlify-cli');
    }
    
    // Authenticate with Netlify
    console.log(`${colors.blue}Authenticating with Netlify...${colors.reset}`);
    process.env.NETLIFY_AUTH_TOKEN = NETLIFY_AUTH_TOKEN;
    
    // Check if site exists or needs to be created
    console.log(`${colors.blue}Checking Netlify site: ${NETLIFY_SITE_ID}...${colors.reset}`);
    let siteExists = false;
    
    try {
      // Use a less error-prone approach to check if site exists
      const result = execSync(`netlify sites:list --json`, { encoding: 'utf-8', stdio: 'pipe' });
      const sites = JSON.parse(result);
      siteExists = sites.some(site => site.id === NETLIFY_SITE_ID || site.name === NETLIFY_SITE_ID);
      
      if (siteExists) {
        console.log(`${colors.green}✓ Netlify site exists${colors.reset}`);
      } else {
        console.log(`${colors.yellow}Site not found, will create during deployment${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.yellow}Could not verify if site exists, will attempt deployment anyway${colors.reset}`);
    }
    
    // Build the deploy command
    // Deploy pre-built static assets; avoid triggering Netlify build
    let deployCommand = `netlify deploy --prod --dir=dist/public --no-build`;
    
    // Add site ID if site exists
    if (siteExists) {
      deployCommand += ` --site=${NETLIFY_SITE_ID}`;
    } else {
      // Create new site
      deployCommand += ` --name=${NETLIFY_SITE_ID}`;
      
      // Add team if specified
      if (NETLIFY_TEAM_SLUG) {
        deployCommand += ` --team=${NETLIFY_TEAM_SLUG}`;
      }
    }
    
    // Deploy to Netlify
    console.log(`${colors.blue}Deploying to Netlify...${colors.reset}`);
    console.log(`${colors.blue}Running: ${deployCommand}${colors.reset}`);
    runCommand(deployCommand);
    
    console.log(`${colors.green}✓ Deployment to Netlify successful${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ Deployment to Netlify failed${colors.reset}`);
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Verify deployment
 */
function verifyDeployment() {
  console.log(`${colors.cyan}Verifying deployment...${colors.reset}`);
  
  try {
    runCommand('node verify-deployment.js');
    console.log(`${colors.green}✓ Deployment verification successful${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ Deployment verification failed${colors.reset}`);
    console.error(`${colors.yellow}Please check the deployment manually.${colors.reset}`);
  }
}

/**
 * Main function
 */
function main() {
  console.log(`${colors.magenta}Starting deployment process for Football Forecast...${colors.reset}`);
  
  try {
    // Step 1: Check environment variables
    checkEnvironmentVariables();
    
    // Step 2: Run pre-deployment checks
    runPreDeploymentChecks();
    
    // Step 3: Deploy to Netlify
    deployToNetlify();
    
    // Step 4: Wait for deployment to propagate
    console.log(`${colors.cyan}Waiting for deployment to propagate (30 seconds)...${colors.reset}`);
    // Use setTimeout for cross-platform compatibility
    const waitTime = 30000; // 30 seconds
    const startTime = Date.now();
    while (Date.now() - startTime < waitTime) {
      // Wait in a loop to block execution
      execSync('node -e "setTimeout(() => {}, 1000)"', { stdio: 'ignore' });
      process.stdout.write('.');
    }
    console.log('');
    
    // Step 5: Verify deployment
    verifyDeployment();
    
    console.log(`${colors.green}Deployment completed successfully!${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}Deployment failed: ${error.message}${colors.reset}`);
    return false;
  }
}

// Run the main function and handle exit code
const success = main();
process.exit(success ? 0 : 1);
