import { Router } from 'express';
import { getErrorStats, getRecentErrors } from '../middleware/errorMonitoring.js';
import { storage } from '../storage.js';

const DEFAULT_EVENT_LIMIT = 20;

function sanitizeLimit(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, 100);
}

const diagnosticsRouter = Router();

// Basic diagnostics endpoint
diagnosticsRouter.get('/', async (req, res) => {
  const errorStats = getErrorStats();
  const eventLimit = sanitizeLimit(req.query.events, DEFAULT_EVENT_LIMIT);

  const ingestionEvents = await storage.getRecentIngestionEvents(eventLimit);

  const fallbackEvents = ingestionEvents.filter(event => event.fallbackUsed);
  const failedEvents = ingestionEvents.filter(event => event.status === 'failed');

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    errors: {
      total: errorStats.totalErrors,
      recent: errorStats.recentErrors,
      critical: errorStats.criticalErrors,
      errorRate: errorStats.errorRate
    },
    ingestion: {
      totalEvents: ingestionEvents.length,
      failedEvents: failedEvents.length,
      fallbackEvents: fallbackEvents.length,
      recent: ingestionEvents
    }
  });
});

// Detailed error statistics
diagnosticsRouter.get('/errors', (req, res) => {
  const stats = getErrorStats();
  res.json(stats);
});

// Recent errors for debugging (limit access in production)
diagnosticsRouter.get('/errors/recent', (req, res) => {
  if (process.env.NODE_ENV === 'production' && !req.headers.authorization) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  
  const limit = parseInt(req.query.limit as string) || 50;
  const recentErrors = getRecentErrors(Math.min(limit, 100)); // Max 100 errors
  
  res.json({
    errors: recentErrors,
    count: recentErrors.length
  });
});

diagnosticsRouter.get('/ingestion', async (req, res) => {
  const limit = sanitizeLimit(req.query.limit, DEFAULT_EVENT_LIMIT);
  const events = await storage.getRecentIngestionEvents(limit);

  res.json({
    count: events.length,
    limit,
    events
  });
});

export { diagnosticsRouter };
