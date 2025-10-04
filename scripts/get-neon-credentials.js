/**
 * Fetch Neon database credentials using the Neon API
 * This script retrieves the connection string for your Neon project
 */

import 'dotenv/config';
import https from 'https';

const NEON_API_KEY = process.env.NEON_API_KEY;

if (!NEON_API_KEY) {
  console.error('❌ NEON_API_KEY not found in environment');
  console.error('Please ensure NEON_API_KEY is set in your .env file');
  process.exit(1);
}

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'console.neon.tech',
      path: `/api/v2${path}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse response: ${e.message}`));
          }
        } else {
          reject(new Error(`API request failed: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.end();
  });
}

async function getNeonCredentials() {
  try {
    console.log('🔍 Fetching Neon projects...\n');

    // Get projects
    const projectsData = await makeRequest('/projects');
    const projects = projectsData.projects;

    if (!projects || projects.length === 0) {
      console.error('❌ No Neon projects found');
      console.error('Please create a project at: https://console.neon.tech');
      process.exit(1);
    }

    console.log(`✅ Found ${projects.length} project(s)\n`);

    // Use the first project (or you can filter by name)
    const project = projects[0];
    console.log(`📦 Project: ${project.name} (ID: ${project.id})`);

    // Get project details with branches
    const projectDetails = await makeRequest(`/projects/${project.id}`);
    const defaultBranch = projectDetails.project.default_branch_id;

    console.log(`🌿 Default branch: ${defaultBranch}\n`);

    // Get connection string for the default branch
    const connectionData = await makeRequest(`/projects/${project.id}/connection_uri?branch_id=${defaultBranch}&database_name=neondb&role_name=neondb_owner`);

    if (connectionData.uri) {
      console.log('✅ Connection string retrieved successfully!\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📝 DATABASE_URL for your .env file:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log(connectionData.uri);
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('📋 Copy the above connection string to your .env file:');
      console.log('   DATABASE_URL=<paste-here>\n');
      
      // Parse and show details
      const url = new URL(connectionData.uri);
      console.log('📊 Connection Details:');
      console.log(`   Host:     ${url.hostname}`);
      console.log(`   Database: ${url.pathname.slice(1).split('?')[0]}`);
      console.log(`   User:     ${url.username}`);
      console.log(`   SSL:      ${url.searchParams.get('sslmode') || 'enabled'}\n`);
    } else {
      console.error('❌ Failed to retrieve connection string');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Verify NEON_API_KEY is correct in .env');
    console.error('   2. Check API key has not expired');
    console.error('   3. Visit https://console.neon.tech to verify your project\n');
    process.exit(1);
  }
}

// Run the script
getNeonCredentials();
