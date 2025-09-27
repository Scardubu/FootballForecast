#!/usr/bin/env node

/**
 * Manual Netlify Deployment Script
 * 
 * This script provides a more direct approach to deploying to Netlify
 * without relying on the interactive CLI features that may cause issues.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const NETLIFY_AUTH_TOKEN = process.env.NETLIFY_AUTH_TOKEN;
const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID || 'football-forecast';
const SITE_DIR = 'dist/public';

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

/**
 * Run a command and return its output
 */
function runCommand(command, options = {}) {
  console.log(`${colors.blue}Running: ${command}${colors.reset}`);
  try {
    return execSync(command, { 
      encoding: 'utf-8',
      ...options 
    });
  } catch (error) {
    console.error(`${colors.red}Command failed: ${command}${colors.reset}`);
    if (error.stdout) console.error(error.stdout);
    if (error.stderr) console.error(error.stderr);
    throw error;
  }
}

/**
 * Check if Netlify CLI is installed
 */
function checkNetlifyCLI() {
  try {
    runCommand('netlify --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Install Netlify CLI
 */
function installNetlifyCLI() {
  console.log(`${colors.yellow}Installing Netlify CLI...${colors.reset}`);
  runCommand('npm install -g netlify-cli', { stdio: 'inherit' });
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
 * Build the application
 */
function buildApplication() {
  console.log(`${colors.cyan}Building application...${colors.reset}`);
  runCommand('npm run build', { stdio: 'inherit' });
}

/**
 * Deploy to Netlify using direct API approach
 */
function deployToNetlify() {
  console.log(`${colors.cyan}Deploying to Netlify...${colors.reset}`);
  
  // Set auth token for Netlify CLI
  process.env.NETLIFY_AUTH_TOKEN = NETLIFY_AUTH_TOKEN;
  
  // Check if build directory exists
  if (!fs.existsSync(SITE_DIR)) {
    console.error(`${colors.red}Build directory '${SITE_DIR}' not found. Run build first.${colors.reset}`);
    process.exit(1);
  }
  
  try {
    // Try to deploy using the site ID if it exists
    console.log(`${colors.blue}Attempting to deploy to existing site: ${NETLIFY_SITE_ID}${colors.reset}`);
    
    try {
      // Prevent Netlify from running an additional build; we've already built locally
      runCommand(`netlify deploy --prod --dir=${SITE_DIR} --site=${NETLIFY_SITE_ID} --no-build`, { stdio: 'inherit' });
      console.log(`${colors.green}✓ Deployment successful!${colors.reset}`);
      return;
    } catch (error) {
      console.log(`${colors.yellow}Site may not exist yet, trying to create and deploy...${colors.reset}`);
    }
    
    // If that fails, try to create a new site and deploy
    console.log(`${colors.blue}Creating new site: ${NETLIFY_SITE_ID}${colors.reset}`);
    
    // Use the non-interactive deploy command without site ID to create new site
    const deployCommand = `netlify deploy --prod --dir=${SITE_DIR} --json --no-build`;
    const result = runCommand(deployCommand);
    
    // Parse the JSON result to get the site URL
    try {
      const deployData = JSON.parse(result);
      console.log(`${colors.green}✓ Deployment successful!${colors.reset}`);
      console.log(`${colors.green}✓ Site URL: ${deployData.url}${colors.reset}`);
    } catch (e) {
      console.log(`${colors.green}✓ Deployment completed, but couldn't parse response.${colors.reset}`);
    }
    
  } catch (error) {
    console.error(`${colors.red}Deployment failed${colors.reset}`);
    console.error(`${colors.yellow}Try deploying manually with:${colors.reset}`);
    console.error(`${colors.yellow}netlify deploy --prod --dir=${SITE_DIR}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Main function
 */
function main() {
  console.log(`${colors.magenta}=== Football Forecast Manual Netlify Deployment ===${colors.reset}`);
  
  // Check for Netlify auth token
  if (!NETLIFY_AUTH_TOKEN) {
    console.error(`${colors.red}Error: NETLIFY_AUTH_TOKEN not set in environment variables${colors.reset}`);
    console.error(`${colors.yellow}Please set NETLIFY_AUTH_TOKEN in your .env file${colors.reset}`);
    process.exit(1);
  }
  
  // Check for Netlify CLI
  if (!checkNetlifyCLI()) {
    installNetlifyCLI();
  }
  
  // Clean the build directory before building
  cleanBuildDirectory();
  
  // Build the application
  buildApplication();
  
  // Deploy to Netlify
  deployToNetlify();
}

// Run the main function
main();
