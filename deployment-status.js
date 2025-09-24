/**
 * Comprehensive Deployment Status Checker
 * Monitors GitHub Actions, Netlify build status, and service health
 */

import axios from 'axios';

const GITHUB_REPO = 'Scardubu/FootballForecast';
const NETLIFY_SITE_ID = 'c7ba4ccd-9c4d-4492-a8fc-2c2c1bb79a82';
const FRONTEND_URL = 'https://football-forecast.netlify.app';

async function checkGitHubActions() {
  try {
    const response = await axios.get(`https://api.github.com/repos/${GITHUB_REPO}/actions/runs?per_page=1`);
    const latestRun = response.data.workflow_runs[0];
    
    return {
      status: latestRun.status,
      conclusion: latestRun.conclusion,
      created_at: latestRun.created_at,
      html_url: latestRun.html_url
    };
  } catch (error) {
    return { error: 'Failed to fetch GitHub Actions status' };
  }
}

async function checkNetlifyBuild() {
  try {
    // Note: This would require Netlify API token for full status
    // For now, we'll check if the site is reachable
    const response = await axios.get(FRONTEND_URL, { timeout: 10000 });
    return { 
      status: response.status === 200 ? 'deployed' : 'failed',
      url: FRONTEND_URL
    };
  } catch (error) {
    return { 
      status: 'building_or_failed',
      error: error.message 
    };
  }
}

async function checkServices() {
  const services = {
    frontend: false,
    api_health: false,
    api_leagues: false,
    ml_service: false
  };

  try {
    // Frontend
    const frontendRes = await axios.get(FRONTEND_URL, { timeout: 5000 });
    services.frontend = frontendRes.status === 200;
  } catch (e) {
    services.frontend = false;
  }

  try {
    // API Health
    const healthRes = await axios.get(`${FRONTEND_URL}/api/health`, { timeout: 5000 });
    services.api_health = healthRes.status === 200;
  } catch (e) {
    services.api_health = false;
  }

  try {
    // API Leagues (with auth)
    const leaguesRes = await axios.get(`${FRONTEND_URL}/api/leagues`, {
      headers: { Authorization: `Bearer ${process.env.API_BEARER_TOKEN || 'test'}` },
      timeout: 5000
    });
    services.api_leagues = leaguesRes.status === 200;
  } catch (e) {
    services.api_leagues = false;
  }

  try {
    // ML Service
    const mlRes = await axios.get(`${FRONTEND_URL}/.netlify/functions/ml-health`, { timeout: 5000 });
    services.ml_service = mlRes.status === 200;
  } catch (e) {
    services.ml_service = false;
  }

  return services;
}

async function main() {
  console.log('🔍 Football Forecast Deployment Status Check');
  console.log('=' .repeat(50));
  
  console.log('\n📋 GitHub Actions Status:');
  const githubStatus = await checkGitHubActions();
  if (githubStatus.error) {
    console.log(`❌ ${githubStatus.error}`);
  } else {
    console.log(`Status: ${githubStatus.status}`);
    console.log(`Conclusion: ${githubStatus.conclusion || 'In progress'}`);
    console.log(`Started: ${new Date(githubStatus.created_at).toLocaleString()}`);
    console.log(`URL: ${githubStatus.html_url}`);
  }

  console.log('\n🌐 Netlify Deployment:');
  const netlifyStatus = await checkNetlifyBuild();
  console.log(`Status: ${netlifyStatus.status}`);
  if (netlifyStatus.error) {
    console.log(`Error: ${netlifyStatus.error}`);
  }

  console.log('\n🔧 Service Health Check:');
  const services = await checkServices();
  
  Object.entries(services).forEach(([service, healthy]) => {
    const status = healthy ? '✅' : '❌';
    const name = service.replace(/_/g, ' ').toUpperCase();
    console.log(`${status} ${name}: ${healthy ? 'OK' : 'FAIL'}`);
  });

  const allHealthy = Object.values(services).every(Boolean);
  
  console.log('\n' + '=' .repeat(50));
  if (allHealthy) {
    console.log('🎉 All services are healthy! Deployment successful.');
  } else {
    console.log('⚠️  Some services are not ready. Check build status and try again.');
  }
  
  console.log(`\n🔗 Access your application: ${FRONTEND_URL}`);
}

main().catch(console.error);
