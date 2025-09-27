#!/usr/bin/env node

/**
 * Environment Variable Checker
 * This script checks for required environment variables and provides guidance for setup.
 */

// Import required modules
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config();

// Define required environment variables
const requiredVars = [
  { name: 'API_FOOTBALL_KEY', description: 'API-Football API key', example: '8c46c6ff5fd2085b06b9ea29b3efa5f4' },
  { name: 'API_BEARER_TOKEN', description: 'API Bearer token', example: crypto.randomBytes(32).toString('hex') },
  { name: 'SCRAPER_AUTH_TOKEN', description: 'Scraper authentication token', example: crypto.randomBytes(32).toString('hex') },
  { name: 'SESSION_SECRET', description: 'Session secret', example: crypto.randomBytes(32).toString('hex') }
];

// Optional but recommended variables
const optionalVars = [
  { name: 'DATABASE_URL', description: 'PostgreSQL connection string', example: 'postgresql://postgres:password@localhost:5432/football_forecast' },
  { name: 'PORT', description: 'Server port', example: '5000' },
  { name: 'NODE_ENV', description: 'Node environment', example: 'development' },
  { name: 'LOG_LEVEL', description: 'Logging level', example: 'info' }
];

// Check for required variables
const missingVars = requiredVars.filter(v => !process.env[v.name]);
const missingOptionalVars = optionalVars.filter(v => !process.env[v.name]);

// Print status
console.log('\n🔍 Environment Variable Checker');
console.log('==============================\n');

if (missingVars.length === 0) {
  console.log('✅ All required environment variables are set!\n');
} else {
  console.log('❌ Missing required environment variables:');
  missingVars.forEach(v => {
    console.log(`   - ${v.name}: ${v.description}`);
  });
  console.log('\n');
}

if (missingOptionalVars.length > 0) {
  console.log('⚠️  Missing optional environment variables:');
  missingOptionalVars.forEach(v => {
    console.log(`   - ${v.name}: ${v.description}`);
  });
  console.log('\n');
}

// Provide guidance for fixing issues
if (missingVars.length > 0) {
  console.log('📝 How to fix:');
  console.log('1. Open your .env file');
  console.log('2. Add the following lines:\n');
  
  missingVars.forEach(v => {
    console.log(`${v.name}=${v.example}`);
  });
  
  console.log('\n3. Save the file and restart the application');
  console.log('\nFor security tokens, you can generate secure random values with:');
  console.log('node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  
  process.exit(1);
} else {
  console.log('🚀 Your environment is correctly configured!');
  
  if (missingOptionalVars.length > 0) {
    console.log('💡 Consider adding these optional variables for better configuration:');
    missingOptionalVars.forEach(v => {
      console.log(`${v.name}=${v.example}`);
    });
  }
  
  process.exit(0);
}
