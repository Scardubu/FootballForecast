#!/usr/bin/env node

/**
 * Supabase Migration Script for Football Forecast
 * 
 * IMPORTANT: DO NOT include actual secrets in this file.
 * This script assists with migrating your schema to Supabase.
 * 
 * Usage:
 * 1. Install dependencies: npm install dotenv pg
 * 2. Create .env.production.supabase with your credentials
 * 3. Run: node supabase-migrate.js
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exec } from 'child_process';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: '.env.production.supabase' });

const { Client } = pg;

// Color codes for better terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

console.log(`${colors.cyan}Loaded environment variables:${colors.reset}`);
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '✓ Set' : '✗ Not set'}`);
console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '✓ Set' : '✗ Not set'}`);
console.log(`SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? '✓ Set' : '✗ Not set'}`);


console.log(`${colors.blue}========================================${colors.reset}`);
console.log(`${colors.blue}Supabase Migration for Football Forecast${colors.reset}`);
console.log(`${colors.blue}========================================${colors.reset}`);

async function runMigration() {
  // Check for required environment variables
  if (!process.env.DATABASE_URL) {
    console.error(`${colors.red}Error: DATABASE_URL is not defined in .env.production.supabase${colors.reset}`);
    process.exit(1);
  }

  // Extract schema.sql from Drizzle
  console.log(`${colors.cyan}Generating schema from Drizzle...${colors.reset}`);
  
  try {
    exec('npx drizzle-kit generate', (error, stdout, stderr) => {
      if (error) {
        console.error(`${colors.red}Error generating schema: ${error.message}${colors.reset}`);
        return;
      }
      console.log(`${colors.green}Schema generated successfully${colors.reset}`);
      
      // Now connect to Supabase and run migrations
      runDatabaseMigrations();
    });
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

async function runDatabaseMigrations() {
  console.log(`${colors.cyan}Connecting to Supabase PostgreSQL...${colors.reset}`);
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Required for Supabase connections
    }
  });

  try {
    await client.connect();
    console.log(`${colors.green}Connected to Supabase PostgreSQL${colors.reset}`);
    
    // Get migration files
    const migrationDir = path.join(__dirname, 'migrations');
    console.log(`${colors.cyan}Looking for migration files in: ${migrationDir}${colors.reset}`);
    
    let migrationFiles = [];
    try {
      const files = fs.readdirSync(migrationDir);
      console.log(`${colors.cyan}Found ${files.length} files in directory${colors.reset}`);
      console.log(files);
      
      migrationFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort();
      console.log(`${colors.cyan}Filtered to ${migrationFiles.length} SQL files${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}Error reading migration directory: ${error.message}${colors.reset}`);
      process.exit(1);
    }
    
    if (migrationFiles.length === 0) {
      console.log(`${colors.yellow}No migration files found in ${migrationDir}${colors.reset}`);
      process.exit(0);
    }
    
    console.log(`${colors.cyan}Found ${migrationFiles.length} migration files${colors.reset}`);
    
    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Get applied migrations
    const { rows: appliedMigrations } = await client.query('SELECT name FROM migrations');
    const appliedMigrationNames = appliedMigrations.map(m => m.name);
    
    // Apply pending migrations
    for (const file of migrationFiles) {
      if (appliedMigrationNames.includes(file)) {
        console.log(`${colors.yellow}Migration ${file} already applied, skipping${colors.reset}`);
        continue;
      }
      
      console.log(`${colors.cyan}Applying migration: ${file}...${colors.reset}`);
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`${colors.green}Migration ${file} applied successfully${colors.reset}`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`${colors.red}Error applying migration ${file}: ${error.message}${colors.reset}`);
        process.exit(1);
      }
    }
    
    console.log(`${colors.green}All migrations have been applied${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}Database error: ${error.message}${colors.reset}`);
  } finally {
    await client.end();
  }
}

runMigration().catch(console.error);
