#!/usr/bin/env node

/**
 * Netlify Environment Setup Script
 * 
 * IMPORTANT: DO NOT include actual secrets in this file.
 * This script is designed to help set environment variables in Netlify
 * via the Netlify CLI, which should be authenticated separately.
 * 
 * Usage:
 * 1. Install Netlify CLI: npm install -g netlify-cli
 * 2. Login: netlify login
 * 3. Run this script: node netlify-setup.js
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Color codes for better terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

console.log(`${colors.blue}========================================${colors.reset}`);
console.log(`${colors.blue}Netlify Environment Setup for Football Forecast${colors.reset}`);
console.log(`${colors.blue}========================================${colors.reset}`);
console.log(`${colors.yellow}This script will help you set up environment variables in Netlify${colors.reset}`);
console.log(`${colors.red}WARNING: Never commit secrets or API keys to your repository${colors.reset}`);
console.log();

// Function to run a Netlify CLI command
function runNetlifyCommand(command) {
  try {
    return execSync(command, { stdio: 'pipe' }).toString();
  } catch (error) {
    console.error(`${colors.red}Error running command: ${command}${colors.reset}`);
    console.error(error.message);
    return null;
  }
}

// Check if Netlify CLI is installed and user is logged in
function checkNetlifyCLI() {
  try {
    console.log(`${colors.cyan}Checking Netlify CLI installation...${colors.reset}`);
    const version = execSync('netlify --version', { stdio: 'pipe' }).toString();
    console.log(`${colors.green}Netlify CLI is installed: ${version.trim()}${colors.reset}`);
    
    console.log(`${colors.cyan}Checking Netlify login status...${colors.reset}`);
    const user = execSync('netlify status', { stdio: 'pipe' }).toString();
    if (user.includes('Logged in')) {
      console.log(`${colors.green}You are logged in to Netlify${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.yellow}Not logged in to Netlify. Please run 'netlify login' first.${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.error(`${colors.red}Netlify CLI is not installed. Please install it with 'npm install -g netlify-cli'${colors.reset}`);
    return false;
  }
}

// Set up environment variables
async function setupEnvironmentVariables() {
  if (!checkNetlifyCLI()) {
    process.exit(1);
  }

  console.log(`${colors.blue}========================================${colors.reset}`);
  console.log(`${colors.blue}Setting up environment variables${colors.reset}`);
  console.log(`${colors.blue}========================================${colors.reset}`);

  const promptForVariable = (name, description) => {
    return new Promise((resolve) => {
      rl.question(`${colors.yellow}Enter ${name}${description ? ' (' + description + ')' : ''}: ${colors.reset}`, (value) => {
        resolve(value);
      });
    });
  };

  // Define required environment variables
  const envVars = [
    { name: 'DATABASE_URL', description: 'Supabase PostgreSQL connection string' },
    { name: 'API_FOOTBALL_KEY', description: 'API-Football key' },
    { name: 'SESSION_SECRET', description: 'Secret for session encryption' },
    { name: 'SUPABASE_URL', description: 'Supabase project URL' },
    { name: 'SUPABASE_ANON_KEY', description: 'Supabase anonymous key' },
    { name: 'NODE_VERSION', description: 'Node.js version (recommend 18.18.0+)', defaultValue: '18.18.0' }
  ];

  let siteId = await promptForVariable('Netlify site ID or name', 'Create one in Netlify dashboard first');
  
  // Link to Netlify site if needed
  console.log(`${colors.cyan}Linking to Netlify site...${colors.reset}`);
  runNetlifyCommand(`netlify link --name ${siteId}`);

  // Set each environment variable
  for (const envVar of envVars) {
    const value = envVar.defaultValue || await promptForVariable(envVar.name, envVar.description);
    
    if (value) {
      console.log(`${colors.cyan}Setting ${envVar.name}...${colors.reset}`);
      runNetlifyCommand(`netlify env:set ${envVar.name} "${value}"`);
      console.log(`${colors.green}✓ Set ${envVar.name}${colors.reset}`);
    } else {
      console.log(`${colors.yellow}Skipping ${envVar.name} (empty value)${colors.reset}`);
    }
  }

  console.log(`${colors.green}Environment variables have been set successfully!${colors.reset}`);
  console.log(`${colors.yellow}Note: Some variables might need to be set as build environment variables.${colors.reset}`);
  console.log(`${colors.yellow}You can do this in the Netlify UI under Site settings > Build & deploy > Environment.${colors.reset}`);

  rl.close();
}

// Run the setup
setupEnvironmentVariables().catch(error => {
  console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  rl.close();
  process.exit(1);
});
