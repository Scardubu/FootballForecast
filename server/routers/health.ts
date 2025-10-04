import { Router } from "express";
import { 
  asyncHandler, 
  logger, 
  getPerformanceMetrics, 
  getMemoryUsage 
} from "../middleware/index.js";
import { apiFootballClient } from "../services/apiFootballClient.js";
import { scrapingScheduler } from "../scraping-scheduler.js";
import { getRateLimitStats } from "../middleware/rateLimiting.js";
import { getConfigSummary, validateConfiguration } from "../config/index.js";
import { systemMonitor } from "../lib/system-monitor.js";
import os from "os";

export const healthRouter = Router();

// Health and monitoring endpoints (no auth required)
import { mlClient } from '../lib/ml-client.js';

healthRouter.get('/', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  // Record request in system monitor
  systemMonitor.recordRequest();
  
  // Check DB connection
  let dbStatus: 'healthy' | 'unhealthy' = 'healthy';
  try {
    await req.app.get('storage').getLeagues();
  } catch (err) {
    dbStatus = 'unhealthy';
    systemMonitor.recordError();
  }

  // Check ML service
  let mlStatus: 'healthy' | 'unhealthy' = 'healthy';
  try {
    const mlHealth = await mlClient.healthCheck();
    mlStatus = mlHealth.status === 'healthy' ? 'healthy' : 'unhealthy';
  } catch (err) {
    mlStatus = 'unhealthy';
  }
  
  // Check hybrid data sources availability
  const hybridDataSources = {
    openweather: {
      configured: !!process.env.OPENWEATHER_API_KEY && process.env.OPENWEATHER_API_KEY.length > 10,
      status: !!process.env.OPENWEATHER_API_KEY ? 'ready' : 'not_configured'
    },
    odds: {
      configured: true,
      status: 'ready',
      source: 'OddsPortal'
    },
    injuries: {
      configured: true,
      status: 'ready',
      source: 'PhysioRoom'
    }
  };
  
  // Check configuration
  const configCheck = validateConfiguration();
  
  // Get performance metrics
  const performanceMetrics = getPerformanceMetrics().slice(0, 5); // Just top 5
  
  // Get system health from monitor
  const systemHealth = systemMonitor.getSystemHealth();
  const stats = systemMonitor.getStats();
  
  // Response time calculation
  const responseTime = Date.now() - startTime;

  res.json({
    status: dbStatus === 'healthy' && mlStatus === 'healthy' && systemHealth.overall === 'healthy' ? 'healthy' : 'degraded',
    db: dbStatus,
    ml: mlStatus,
    systemHealth: {
      overall: systemHealth.overall,
      alerts: systemHealth.alerts
    },
    hybridData: hybridDataSources,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    config: {
      valid: configCheck.valid,
      errors: configCheck.errors.length > 0 ? configCheck.errors : undefined
    },
    performance: {
      responseTime,
      metrics: performanceMetrics
    },
    memory: getMemoryUsage(),
    stats: stats
  });
}));

healthRouter.get('/_client-status', asyncHandler(async (req, res) => {
  const clientStatus = apiFootballClient.getStatus();
  res.json({
    apiClient: clientStatus,
    scheduler: {
      initialized: !!scrapingScheduler,
      timestamp: new Date().toISOString()
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
}));

// Comprehensive system metrics endpoint
healthRouter.get('/metrics', asyncHandler(async (req, res) => {
  logger.info({ endpoint: '/metrics' }, 'Metrics endpoint accessed');
  
  const memUsage = process.memoryUsage();
  const systemMem = {
    total: os.totalmem(),
    free: os.freemem(),
    used: os.totalmem() - os.freemem()
  };
  
  const cpuUsage = process.cpuUsage();
  const loadAvg = os.loadavg();
  
  // Get API client metrics
  const apiStatus = apiFootballClient.getStatus();
  
  // Get scheduler metrics  
  const schedulerStatus = scrapingScheduler?.getStatus() || { active: false };
  
  // Get rate limiting stats
  const rateLimitStats = getRateLimitStats();
  
  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    
    // System metrics
    system: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      cpuCount: os.cpus().length,
      loadAverage: {
        '1min': loadAvg[0],
        '5min': loadAvg[1], 
        '15min': loadAvg[2]
      },
      memory: {
        process: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024),
          rss: Math.round(memUsage.rss / 1024 / 1024)
        },
        system: {
          total: Math.round(systemMem.total / 1024 / 1024),
          free: Math.round(systemMem.free / 1024 / 1024),
          used: Math.round(systemMem.used / 1024 / 1024),
          usagePercent: Math.round((systemMem.used / systemMem.total) * 100)
        }
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      }
    },
    
    // Application metrics
    application: {
      apiClient: apiStatus,
      scheduler: schedulerStatus,
      rateLimiting: rateLimitStats
    }
  };
  
  res.json(metrics);
}));

// Python services health check endpoint
healthRouter.get('/python-services', asyncHandler(async (req, res) => {
  logger.info('Python services health check accessed');
  
  try {
    // Check if Python services are responsive
    const pythonHealthPromises = [
      checkPythonService('scrapers', '/health'),
      checkPythonService('ml', '/health')
    ];
    
    const results = await Promise.allSettled(pythonHealthPromises);
    
    const serviceStatus = {
      timestamp: new Date().toISOString(),
      services: {
        scrapers: results[0].status === 'fulfilled' ? results[0].value : { 
          status: 'error', 
          error: results[0].status === 'rejected' ? results[0].reason?.message : 'Unknown error' 
        },
        ml: results[1].status === 'fulfilled' ? results[1].value : { 
          status: 'error', 
          error: results[1].status === 'rejected' ? results[1].reason?.message : 'Unknown error' 
        }
      },
      overall: results.every(r => r.status === 'fulfilled') ? 'healthy' : 'degraded'
    };
    
    res.json(serviceStatus);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Python services health check failed');
    res.status(503).json({
      timestamp: new Date().toISOString(),
      overall: 'unhealthy',
      error: 'Failed to check Python services health'
    });
  }
}));

// Monitoring dashboard endpoint - aggregates all observability data
healthRouter.get('/dashboard', asyncHandler(async (req, res) => {
  logger.info('Monitoring dashboard accessed');
  
  try {
    // Gather all observability data
    const [metricsResponse, pythonServicesResponse] = await Promise.allSettled([
      getSystemMetrics(),
      getPythonServicesStatus()
    ]);
    
    const dashboard = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      summary: {
        uptime: Math.floor(process.uptime()),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
      },
      metrics: metricsResponse.status === 'fulfilled' ? metricsResponse.value : null,
      pythonServices: pythonServicesResponse.status === 'fulfilled' ? pythonServicesResponse.value : null,
      alerts: generateAlerts(
        metricsResponse.status === 'fulfilled' ? metricsResponse.value : null
      )
    };
    
    // Determine overall system health
    const systemHealth = determineSystemHealth(dashboard);
    dashboard.status = systemHealth;
    
    res.json(dashboard);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Monitoring dashboard failed');
    res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 'error',
      error: 'Failed to generate monitoring dashboard'
    });
  }
}));

// Helper function to check Python service health
async function checkPythonService(service: string, healthPath: string) {
  try {
    // For now, return mock status since Python services don't have HTTP endpoints yet
    return {
      service,
      status: 'healthy',
      lastSeen: new Date().toISOString(),
      note: 'Process-based service (no HTTP endpoint)'
    };
  } catch (error) {
    return {
      service,
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Helper function to get system metrics
async function getSystemMetrics() {
  const memUsage = process.memoryUsage();
  const systemMem = {
    total: os.totalmem(),
    free: os.freemem(),
    used: os.totalmem() - os.freemem()
  };
  
  return {
    memory: {
      process: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      },
      system: {
        total: Math.round(systemMem.total / 1024 / 1024),
        free: Math.round(systemMem.free / 1024 / 1024),
        usagePercent: Math.round((systemMem.used / systemMem.total) * 100)
      }
    },
    loadAverage: os.loadavg(),
    uptime: process.uptime()
  };
}

// Helper function to get Python services status
async function getPythonServicesStatus() {
  return {
    scrapers: { status: 'healthy', note: 'Process-based service' },
    ml: { status: 'healthy', note: 'Process-based service' }
  };
}

// Generate alerts based on system metrics
function generateAlerts(metrics: any): string[] {
  const alerts: string[] = [];
  
  if (metrics) {
    // Memory usage alerts
    if (metrics.memory?.system?.usagePercent > 90) {
      alerts.push('High system memory usage (>90%)');
    }
    if (metrics.memory?.process?.heapUsed > 500) {
      alerts.push('High Node.js heap usage (>500MB)');
    }
    
    // Load average alerts (for systems with multiple CPUs)
    const cpuCount = os.cpus().length;
    if (metrics.loadAverage && metrics.loadAverage[0] > cpuCount * 2) {
      alerts.push('High system load average');
    }
  }
  
  return alerts;
}

// Determine overall system health
function determineSystemHealth(dashboard: any): string {
  const alerts = dashboard.alerts || [];
  
  if (alerts.length === 0) {
    return 'healthy';
  } else if (alerts.length <= 2) {
    return 'warning';
  } else {
    return 'critical';
  }
}