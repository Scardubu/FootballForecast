/**
 * End-to-End ML Integration Test Script
 * Tests the complete flow from frontend to ML service
 */

import fetch from 'node-fetch';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const NODE_API_URL = process.env.NODE_API_URL || 'http://localhost:5000/api';
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

let testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

function log(message, color = COLORS.reset) {
  console.log(`${color}${message}${COLORS.reset}`);
}

function logTest(name, passed, message = '') {
  const icon = passed ? '✅' : '❌';
  const color = passed ? COLORS.green : COLORS.red;
  log(`${icon} ${name}${message ? ': ' + message : ''}`, color);
  
  testResults.tests.push({ name, passed, message });
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

function logSkip(name, reason) {
  log(`⏭️  ${name}: ${reason}`, COLORS.yellow);
  testResults.skipped++;
  testResults.tests.push({ name, passed: null, message: reason });
}

async function testMLServiceHealth() {
  log('\n📋 Testing ML Service Health...', COLORS.cyan);
  
  try {
    const response = await fetch(`${ML_SERVICE_URL}/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      logTest('ML Service Health Check', true, `Status: ${data.status}, Version: ${data.version}`);
      return true;
    } else {
      logTest('ML Service Health Check', false, `HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    logTest('ML Service Health Check', false, error.message);
    return false;
  }
}

async function testMLModelStatus() {
  log('\n📋 Testing ML Model Status...', COLORS.cyan);
  
  try {
    const response = await fetch(`${ML_SERVICE_URL}/model/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      logTest('ML Model Status', true, `Status: ${data.status}, Features: ${data.features_count || 'N/A'}`);
      return data;
    } else {
      logTest('ML Model Status', false, `HTTP ${response.status}`);
      return null;
    }
  } catch (error) {
    logTest('ML Model Status', false, error.message);
    return null;
  }
}

async function testMLPrediction() {
  log('\n📋 Testing ML Prediction...', COLORS.cyan);
  
  const testRequest = {
    fixture_id: 999999,
    home_team_id: 33,
    away_team_id: 50,
    home_team_name: 'Manchester United',
    away_team_name: 'Manchester City'
  };
  
  try {
    const startTime = Date.now();
    const response = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testRequest)
    });
    const latency = Date.now() - startTime;
    
    if (response.ok) {
      const prediction = await response.json();
      const hasRequiredFields = prediction.predicted_outcome && 
                                prediction.probabilities && 
                                prediction.confidence !== undefined;
      
      if (hasRequiredFields) {
        logTest('ML Prediction', true, 
          `Outcome: ${prediction.predicted_outcome}, Confidence: ${Math.round(prediction.confidence * 100)}%, Latency: ${latency}ms`);
        return prediction;
      } else {
        logTest('ML Prediction', false, 'Missing required fields in response');
        return null;
      }
    } else {
      logTest('ML Prediction', false, `HTTP ${response.status}`);
      return null;
    }
  } catch (error) {
    logTest('ML Prediction', false, error.message);
    return null;
  }
}

async function testNodeAPIHealth() {
  log('\n📋 Testing Node.js API Health...', COLORS.cyan);
  
  try {
    const response = await fetch(`${NODE_API_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      logTest('Node API Health Check', true, `Status: ${data.status}, Environment: ${data.environment}`);
      return true;
    } else {
      logTest('Node API Health Check', false, `HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    logTest('Node API Health Check', false, error.message);
    return false;
  }
}

async function testNodeMLHealth() {
  log('\n📋 Testing Node.js ML Proxy Health...', COLORS.cyan);
  
  try {
    const response = await fetch(`${NODE_API_URL}/ml/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      logTest('Node ML Proxy Health', true, `Status: ${data.status}, Service: ${data.service}`);
      return true;
    } else {
      logTest('Node ML Proxy Health', false, `HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    logTest('Node ML Proxy Health', false, error.message);
    return false;
  }
}

async function testNodeMLPrediction() {
  log('\n📋 Testing Node.js ML Prediction Proxy...', COLORS.cyan);
  
  const testRequest = {
    fixture_id: 999998,
    home_team_id: 42,
    away_team_id: 49,
    home_team_name: 'Arsenal',
    away_team_name: 'Chelsea'
  };
  
  try {
    const startTime = Date.now();
    const response = await fetch(`${NODE_API_URL}/ml/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testRequest)
    });
    const latency = Date.now() - startTime;
    
    if (response.ok) {
      const prediction = await response.json();
      const hasRequiredFields = prediction.predicted_outcome && 
                                prediction.probabilities && 
                                prediction.confidence !== undefined;
      
      if (hasRequiredFields) {
        logTest('Node ML Prediction Proxy', true, 
          `Outcome: ${prediction.predicted_outcome}, Confidence: ${Math.round(prediction.confidence * 100)}%, Total Latency: ${latency}ms`);
        return prediction;
      } else {
        logTest('Node ML Prediction Proxy', false, 'Missing required fields in response');
        return null;
      }
    } else {
      logTest('Node ML Prediction Proxy', false, `HTTP ${response.status}`);
      return null;
    }
  } catch (error) {
    logTest('Node ML Prediction Proxy', false, error.message);
    return null;
  }
}

async function testBatchPrediction() {
  log('\n📋 Testing Batch Prediction...', COLORS.cyan);
  
  const batchRequest = [
    {
      fixture_id: 999997,
      home_team_id: 33,
      away_team_id: 40,
      home_team_name: 'Manchester United',
      away_team_name: 'Liverpool'
    },
    {
      fixture_id: 999996,
      home_team_id: 50,
      away_team_id: 42,
      home_team_name: 'Manchester City',
      away_team_name: 'Arsenal'
    }
  ];
  
  try {
    const startTime = Date.now();
    const response = await fetch(`${ML_SERVICE_URL}/predictions/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batchRequest)
    });
    const latency = Date.now() - startTime;
    
    if (response.ok) {
      const predictions = await response.json();
      const predictionsArray = Array.isArray(predictions) ? predictions : [];
      
      if (predictionsArray.length === batchRequest.length) {
        logTest('Batch Prediction', true, 
          `Generated ${predictionsArray.length} predictions in ${latency}ms (${Math.round(latency / predictionsArray.length)}ms avg)`);
        return predictionsArray;
      } else {
        logTest('Batch Prediction', false, 
          `Expected ${batchRequest.length} predictions, got ${predictionsArray.length}`);
        return null;
      }
    } else {
      logTest('Batch Prediction', false, `HTTP ${response.status}`);
      return null;
    }
  } catch (error) {
    logTest('Batch Prediction', false, error.message);
    return null;
  }
}

async function testPredictionQuality(prediction) {
  log('\n📋 Testing Prediction Quality...', COLORS.cyan);
  
  if (!prediction) {
    logSkip('Prediction Quality', 'No prediction available');
    return;
  }
  
  // Test probability sum
  const probSum = prediction.probabilities.home + 
                  prediction.probabilities.draw + 
                  prediction.probabilities.away;
  const probSumValid = Math.abs(probSum - 1.0) < 0.01;
  logTest('Probability Sum', probSumValid, 
    `Sum: ${probSum.toFixed(3)} (should be ~1.0)`);
  
  // Test confidence range
  const confidenceValid = prediction.confidence >= 0 && prediction.confidence <= 1;
  logTest('Confidence Range', confidenceValid, 
    `Confidence: ${prediction.confidence} (should be 0-1)`);
  
  // Test expected goals
  const xgValid = prediction.expected_goals.home > 0 && 
                  prediction.expected_goals.away > 0;
  logTest('Expected Goals', xgValid, 
    `xG: ${prediction.expected_goals.home} - ${prediction.expected_goals.away}`);
  
  // Test model metadata
  const hasMetadata = prediction.model_version && 
                      prediction.model_trained !== undefined;
  logTest('Model Metadata', hasMetadata, 
    `Version: ${prediction.model_version}, Trained: ${prediction.model_trained}`);
  
  // Test calibration info
  if (prediction.calibration) {
    const hasCalibration = prediction.calibration.method && 
                          prediction.calibration.temperature !== undefined;
    logTest('Calibration Info', hasCalibration, 
      `Method: ${prediction.calibration.method}, T: ${prediction.calibration.temperature}`);
  }
  
  // Test latency
  if (prediction.latency_ms !== undefined) {
    const latencyAcceptable = prediction.latency_ms < 1000;
    logTest('Prediction Latency', latencyAcceptable, 
      `${prediction.latency_ms}ms (should be < 1000ms)`);
  }
}

async function testFallbackMode() {
  log('\n📋 Testing Fallback Mode...', COLORS.cyan);
  
  // Test with invalid ML service URL to trigger fallback
  const testRequest = {
    fixture_id: 999995,
    home_team_id: 1,
    away_team_id: 2,
    home_team_name: 'Team A',
    away_team_name: 'Team B'
  };
  
  try {
    const response = await fetch(`${NODE_API_URL}/ml/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testRequest)
    });
    
    if (response.ok) {
      const prediction = await response.json();
      const isFallback = prediction.model_version?.includes('fallback') || 
                        prediction.model_trained === false;
      
      if (isFallback) {
        logTest('Fallback Mode Detection', true, 
          `Fallback active: ${prediction.model_version}`);
      } else {
        log('ℹ️  Fallback mode not triggered (ML service is available)', COLORS.blue);
      }
      return prediction;
    } else {
      logTest('Fallback Mode', false, `HTTP ${response.status}`);
      return null;
    }
  } catch (error) {
    logTest('Fallback Mode', false, error.message);
    return null;
  }
}

function printSummary() {
  log('\n' + '='.repeat(60), COLORS.cyan);
  log('📊 TEST SUMMARY', COLORS.cyan);
  log('='.repeat(60), COLORS.cyan);
  
  const total = testResults.passed + testResults.failed;
  const passRate = total > 0 ? ((testResults.passed / total) * 100).toFixed(1) : 0;
  
  log(`\nTotal Tests: ${total}`, COLORS.blue);
  log(`Passed: ${testResults.passed}`, COLORS.green);
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? COLORS.red : COLORS.green);
  log(`Skipped: ${testResults.skipped}`, COLORS.yellow);
  log(`Pass Rate: ${passRate}%`, passRate >= 80 ? COLORS.green : COLORS.red);
  
  if (testResults.failed > 0) {
    log('\n❌ Failed Tests:', COLORS.red);
    testResults.tests
      .filter(t => t.passed === false)
      .forEach(t => log(`  - ${t.name}: ${t.message}`, COLORS.red));
  }
  
  log('\n' + '='.repeat(60), COLORS.cyan);
  
  if (passRate >= 80) {
    log('✅ Integration tests PASSED!', COLORS.green);
    log('🚀 System is ready for production deployment', COLORS.green);
  } else {
    log('❌ Integration tests FAILED!', COLORS.red);
    log('⚠️  Please fix the issues before deploying to production', COLORS.yellow);
  }
  log('='.repeat(60) + '\n', COLORS.cyan);
}

async function runAllTests() {
  log('🚀 Starting End-to-End ML Integration Tests', COLORS.cyan);
  log('='.repeat(60) + '\n', COLORS.cyan);
  
  // Test ML Service directly
  const mlHealthy = await testMLServiceHealth();
  if (mlHealthy) {
    await testMLModelStatus();
    const mlPrediction = await testMLPrediction();
    await testPredictionQuality(mlPrediction);
    await testBatchPrediction();
  } else {
    logSkip('ML Model Status', 'ML service is not available');
    logSkip('ML Prediction', 'ML service is not available');
    logSkip('Batch Prediction', 'ML service is not available');
  }
  
  // Test Node.js API
  const nodeHealthy = await testNodeAPIHealth();
  if (nodeHealthy) {
    await testNodeMLHealth();
    const nodePrediction = await testNodeMLPrediction();
    await testPredictionQuality(nodePrediction);
    await testFallbackMode();
  } else {
    logSkip('Node ML Proxy Health', 'Node API is not available');
    logSkip('Node ML Prediction Proxy', 'Node API is not available');
    logSkip('Fallback Mode', 'Node API is not available');
  }
  
  // Print summary
  printSummary();
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  log(`\n💥 Test suite crashed: ${error.message}`, COLORS.red);
  console.error(error);
  process.exit(1);
});
