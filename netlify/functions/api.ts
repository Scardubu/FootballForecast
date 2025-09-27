import type { Handler, HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions';
import express from 'express';
import serverless from 'serverless-http';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Log all incoming requests for diagnostics
app.use((req, res, next) => {
  console.log(`[Netlify API] ${req.method} ${req.originalUrl}`);
  next();
});

// Set up routes (without WebSocket and server creation)
async function setupApp() {
  // Trust proxy for Netlify
  app.set('trust proxy', 1);

  // Always available common middleware
  app.use(cookieParser());

  try {
    // Import route setup but adapt for serverless. This may throw if config/env is missing.
    const { apiRouter } = await import('../../server/routers/api');
    const { httpLogger, generalRateLimit, errorHandler, notFoundHandler } = await import('../../server/middleware');

    // Apply middleware
    app.use(httpLogger);
    app.use(generalRateLimit);

    // Mount the consolidated API router at the Netlify Functions base path.
    // In production, requests are forwarded to /.netlify/functions/api/:splat
    app.use('/', apiRouter);

    // Error handling
    app.use(notFoundHandler);
    app.use(errorHandler);
  } catch (e) {
    // Degraded mode: configuration likely missing in serverless environment
    console.error('[Netlify API] Running in degraded mode:', (e as Error).message);

    // Minimal health endpoint
    app.get(['/', '/health', '/api/health'], (_req, res) => {
      res.json({ status: 'degraded', message: 'Serverless API in degraded mode', timestamp: new Date().toISOString() });
    });

    // Auth status should not 500; return unauthenticated instead
    app.get(['/auth/status', '/api/auth/status'], (_req, res) => {
      res.json({ authenticated: false, user: null });
    });

    // Dev login is not available in production/serverless degraded mode
    app.post(['/auth/dev-login', '/api/auth/dev-login'], (_req, res) => {
      res.status(404).json({ error: 'Endpoint not available', message: 'Dev login only available in development mode' });
    });

    // Provide safe empty responses for common read-only endpoints to avoid UI crashes
    app.get(['/leagues', '/api/leagues'], (_req, res) => res.json([]));
    app.get(['/teams', '/api/teams'], (_req, res) => res.json([]));
    app.get(['/standings/:league', '/api/standings/:league'], (_req, res) => res.json([]));
    app.get(['/fixtures/live', '/api/fixtures/live'], (_req, res) => res.json([]));
    app.get(['/stats', '/api/stats'], (_req, res) => res.json({}));
    // Football proxy-like routes
    app.get(['/football/*','/api/football/*'], (_req, res) => res.json({ results: [], paging: { current: 1, total: 1 } }));

    // Fallback handler for other routes: return 503 with guidance
    app.use((req, res) => {
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'API is running in degraded mode. Configure environment variables on Netlify to enable full functionality.',
        path: req.originalUrl,
        required_env: ['API_FOOTBALL_KEY', 'API_BEARER_TOKEN', 'SCRAPER_AUTH_TOKEN']
      });
    });
  }

  // Catch-all 404 for unmatched routes (should be rare here)
  app.use((req, res) => {
    console.error(`[Netlify API] 404 Not Found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: 'Not Found', path: req.originalUrl });
  });

  return app;
}

let appPromise: Promise<express.Application> | null = null;

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  try {
    // Initialize app once and reuse
    if (!appPromise) {
      appPromise = setupApp();
    }
    const app = await appPromise;
    const serverlessHandler = serverless(app) as unknown as (e: HandlerEvent, c: HandlerContext) => Promise<HandlerResponse>;
    const response = await serverlessHandler(event, context);
    return response;
  } catch (error) {
    console.error('[FATAL] Netlify function handler crashed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'A critical server error occurred.',
        // Only include error details in non-production environments for security
        details: process.env.NODE_ENV !== 'production' ? (error as Error).message : undefined,
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};
