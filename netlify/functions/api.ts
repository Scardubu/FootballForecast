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
  // Import route setup but adapt for serverless
  const { apiRouter } = await import('../../server/routers/api');
  const { httpLogger, generalRateLimit, errorHandler, notFoundHandler } = await import('../../server/middleware');
  
  // Trust proxy for Netlify
  app.set('trust proxy', 1);
  
  // Apply middleware
  app.use(httpLogger);
  app.use(generalRateLimit);
  app.use(cookieParser());
  
  // Mount the consolidated API router at the Netlify Functions base path.
  // In production, requests are forwarded to /.netlify/functions/api/:splat
  app.use('/.netlify/functions/api', apiRouter);
  
  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  // Catch-all 404 for unmatched routes, logs the path for diagnostics
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
