#!/usr/bin/env node

/**
 * Robust script to clean the dist directory before build
 * Handles Windows file locking issues with retry logic and process termination
 */

// Use ES module syntax since package.json has "type": "module"
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to clean
const distDir = path.join(process.cwd(), 'dist');

console.log('🧹 Cleaning dist directory before build...');
console.log(`Target directory: ${distDir}`);

/**
 * Kill any processes that might be locking files in the dist directory
 */
function killLockingProcesses() {
  const isWindows = process.platform === 'win32';
  
  if (isWindows) {
    try {
      // Find and kill any Node.js processes that might be locking files
      console.log('🔍 Checking for locking processes...');
      
      // Kill any development servers or build processes
      const commands = [
        'taskkill /f /im node.exe /t 2>nul || echo "No node processes to kill"',
        'taskkill /f /im tsx.exe /t 2>nul || echo "No tsx processes to kill"',
        'taskkill /f /im vite.exe /t 2>nul || echo "No vite processes to kill"'
      ];
      
      commands.forEach(cmd => {
        try {
          execSync(cmd, { stdio: 'inherit' });
        } catch (err) {
          // Ignore errors - process might not exist
        }
      });
      
      // Wait a moment for processes to fully terminate
      console.log('⏳ Waiting for processes to terminate...');
      execSync('timeout /t 2 /nobreak >nul', { stdio: 'ignore' });
      
    } catch (err) {
      console.log('⚠️  Could not kill all processes, continuing...');
    }
  }
}

/**
 * Recursively remove directory with retry logic
 */
async function removeDirectoryWithRetry(dirPath, maxRetries = 5) {
  const isWindows = process.platform === 'win32';
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (!fs.existsSync(dirPath)) {
        console.log('✅ Directory does not exist, nothing to clean');
        return true;
      }
      
      console.log(`🗑️  Attempt ${attempt}/${maxRetries} to remove ${dirPath}...`);
      
      if (isWindows) {
        // Windows - use multiple strategies
        try {
          // Strategy 1: PowerShell with force and error handling
          const psCommand = `
            $ErrorActionPreference = 'SilentlyContinue'
            if (Test-Path '${dirPath.replace(/'/g, "''")}') {
              Get-ChildItem -Path '${dirPath.replace(/'/g, "''")}' -Recurse | ForEach-Object {
                $_.Attributes = 'Normal'
              }
              Remove-Item -Path '${dirPath.replace(/'/g, "''")}' -Recurse -Force
            }
          `.replace(/\s+/g, ' ').trim();
          
          execSync(`powershell -Command "${psCommand}"`, { stdio: 'inherit' });
        } catch (psErr) {
          // Strategy 2: CMD with rmdir
          try {
            execSync(`rmdir /s /q "${dirPath}"`, { stdio: 'inherit' });
          } catch (cmdErr) {
            // Strategy 3: Node.js recursive removal
            await removeDirectoryRecursive(dirPath);
          }
        }
      } else {
        // Unix - use rm -rf
        execSync(`rm -rf "${dirPath}"`, { stdio: 'inherit' });
      }
      
      // Verify removal
      if (!fs.existsSync(dirPath)) {
        console.log('✅ Directory removed successfully');
        return true;
      } else {
        throw new Error('Directory still exists after removal attempt');
      }
      
    } catch (err) {
      console.log(`⚠️  Attempt ${attempt} failed:`, err.message);
      
      if (attempt === maxRetries) {
        console.log('❌ All removal attempts failed');
        return false;
      }
      
      // Wait before retry, with exponential backoff
      const waitTime = attempt * 1000;
      console.log(`⏳ Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  return false;
}

/**
 * Node.js recursive directory removal (fallback)
 */
async function removeDirectoryRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      await removeDirectoryRecursive(fullPath);
    } else {
      // Remove read-only attribute on Windows
      try {
        fs.chmodSync(fullPath, 0o666);
      } catch (err) {
        // Ignore chmod errors
      }
      fs.unlinkSync(fullPath);
    }
  }
  
  fs.rmdirSync(dirPath);
}

// Main execution
async function main() {
  try {
    // Step 1: Kill any locking processes
    killLockingProcesses();
    
    // Step 2: Remove directory with retry logic
    const success = await removeDirectoryWithRetry(distDir);
    
    if (!success) {
      console.log('⚠️  Could not completely clean dist directory, but continuing with build...');
      console.log('💡 This might cause some files to be overwritten instead of recreated');
    }
    
    // Step 3: Ensure directory exists for build
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
      console.log('📁 Created fresh dist directory');
    }
    
  } catch (err) {
    console.error('❌ Error during cleanup:', err);
    console.log('🚀 Continuing with build despite cleanup issues...');
  }
}

// Run the main function
main().catch(err => {
  console.error('💥 Unexpected error:', err);
  process.exit(0); // Don't fail the build
});

