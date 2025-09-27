#!/usr/bin/env node

/**
 * Simple script to clean the dist directory before build
 * Works on both Windows and Unix systems
 */

// Use CommonJS syntax for direct Node execution
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Path to clean
const distDir = path.join(process.cwd(), 'dist');

console.log('🧹 Cleaning dist directory before build...');
console.log(`Target directory: ${distDir}`);

try {
  // Check if directory exists
  if (fs.existsSync(distDir)) {
    console.log(`Removing ${distDir}...`);
    
    // Detect platform and use appropriate command
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      // Windows - use PowerShell
      const command = `powershell -Command "Remove-Item -Path '${distDir.replace(/'/g, "''")}' -Recurse -Force -ErrorAction SilentlyContinue"`;
      console.log(`Executing: ${command}`);
      execSync(command);
    } else {
      // Unix - use rm -rf
      const command = `rm -rf "${distDir}"`;
      console.log(`Executing: ${command}`);
      execSync(command);
    }
    
    console.log('✅ Dist directory removed successfully');
  } else {
    console.log('✅ Dist directory does not exist, nothing to clean');
  }
} catch (err) {
  console.error('❌ Error cleaning dist directory:', err);
  console.log('Continuing with build despite cleaning error...');
}

