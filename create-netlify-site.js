#!/usr/bin/env node

/**
 * Netlify Site Creation Script
 * This script creates a new Netlify site if it doesn't exist
 */

import { execSync } from 'child_process';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Configuration
const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID || 'football-forecast';
const NETLIFY_AUTH_TOKEN = process.env.NETLIFY_AUTH_TOKEN;
const NETLIFY_TEAM_SLUG = process.env.NETLIFY_TEAM_SLUG || '';

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
      encoding: 'utf-8',
      ...options 
    });
  } catch (error) {
    console.error(`${colors.red}Command failed: ${command}${colors.reset}`);
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
 * Install Netlify CLI if not installed
 */
function installNetlifyCLI() {
  console.log(`${colors.yellow}Installing Netlify CLI...${colors.reset}`);
  runCommand('npm install -g netlify-cli', { stdio: 'inherit' });
}

/**
 * Check if site exists
 */
function checkSiteExists(siteId) {
  try {
    const result = runCommand(`netlify api getSite --data='{"site_id":"${siteId}"}'`, { stdio: 'pipe' });
    return result && result.trim() !== '';
  } catch (error) {
    return false;
  }
}

/**
 * Create a new Netlify site
 */
function createNetlifySite() {
  console.log(`${colors.cyan}Creating Netlify site: ${NETLIFY_SITE_ID}...${colors.reset}`);
  
  try {
    // Check if Netlify CLI is installed
    if (!checkNetlifyCLI()) {
      installNetlifyCLI();
    }
    
    // Authenticate with Netlify
    console.log(`${colors.blue}Authenticating with Netlify...${colors.reset}`);
    process.env.NETLIFY_AUTH_TOKEN = NETLIFY_AUTH_TOKEN;
    
    // Check if site already exists
    if (checkSiteExists(NETLIFY_SITE_ID)) {
      console.log(`${colors.green}✓ Netlify site ${NETLIFY_SITE_ID} already exists${colors.reset}`);
      return;
    }
    
    // Create site using direct API call instead of interactive CLI command
    // This avoids the bug in Netlify CLI that causes it to crash when prompting for team selection
    console.log(`${colors.blue}Creating site using Netlify API...${colors.reset}`);
    
    // Prepare the API payload
    const siteData = {
      name: NETLIFY_SITE_ID,
      custom_domain: `${NETLIFY_SITE_ID}.netlify.app`,
      force_ssl: true
    };
    
    // Add team if specified
    if (NETLIFY_TEAM_SLUG) {
      siteData.account_slug = NETLIFY_TEAM_SLUG;
    }
    
    // Convert to JSON string for the command
    const siteDataJson = JSON.stringify(siteData).replace(/"/g, '\\"');
    
    // Create site using Netlify API
    try {
      runCommand(`netlify api createSite --data="${siteDataJson}"`, { stdio: 'inherit' });
      console.log(`${colors.green}✓ Site created successfully${colors.reset}`);
    } catch (error) {
      console.log(`${colors.yellow}Site creation via API failed, trying manual deployment instead${colors.reset}`);
      console.log(`${colors.yellow}You can manually create a site in the Netlify dashboard and then update your .env file${colors.reset}`);
    }
    
    // Link site to local project
    console.log(`${colors.blue}Linking site to local project...${colors.reset}`);
    runCommand(`netlify link --name=${NETLIFY_SITE_ID}`, { stdio: 'inherit' });
    
    // Set up environment variables
    console.log(`${colors.blue}Setting up environment variables...${colors.reset}`);
    
    // Read .env file
    const envFile = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envFile)) {
      const envContent = fs.readFileSync(envFile, 'utf-8');
      const envVars = dotenv.parse(envContent);
      
      // Set environment variables on Netlify
      Object.entries(envVars).forEach(([key, value]) => {
        // Skip local-only variables
        if (key.startsWith('NETLIFY_')) return;
        
        console.log(`${colors.blue}Setting ${key}...${colors.reset}`);
        runCommand(`netlify env:set ${key} "${value}"`, { stdio: 'ignore' });
      });
    }
    
    console.log(`${colors.green}✓ Netlify site created successfully${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ Failed to create Netlify site${colors.reset}`);
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run the script
createNetlifySite();
