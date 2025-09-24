import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import express from 'express';
import serverless from 'serverless-http';
import { registerRoutes } from '../../server/routes';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set up routes (without WebSocket and server creation)
async function setupApp() {
  // Import route setup but adapt for serverless
  const { healthRouter, fixturesRouter, leaguesRouter, standingsRouter, teamsRouter, predictionsRouter, scrapedDataRouter, schedulerRouter, apiFootballRouter, authRouter, mlRouter } = await import('../../server/routers');
  const { httpLogger, generalRateLimit, createAuthMiddleware, errorHandler, notFoundHandler } = await import('../../server/middleware');
  
  // Trust proxy for Netlify
  app.set('trust proxy', 1);
  
  // Apply middleware
  app.use(httpLogger);
  app.use(generalRateLimit);
  
  // Mount routes
  app.use('/api', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api', createAuthMiddleware({ 
    required: true, 
    skipPaths: ['/health', '/_client-status', '/auth', '/ml/health'] 
  }));
  
  app.use('/api/fixtures', fixturesRouter);
  app.use('/api/leagues', leaguesRouter);
  app.use('/api/standings', standingsRouter);
  app.use('/api/teams', teamsRouter);
  app.use('/api/predictions', predictionsRouter);
  app.use('/api/scraped-data', scrapedDataRouter);
  app.use('/api/scheduler', schedulerRouter);
  app.use('/api/football', apiFootballRouter);
  app.use('/api/ml', mlRouter);
  
  // Error handling
  app.use('/api', notFoundHandler);
  app.use(errorHandler);
  
  return app;
}

let appPromise: Promise<express.Application> | null = null;

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Initialize app once and reuse
  if (!appPromise) {
    appPromise = setupApp();
  }
  
  const app = await appPromise;
  const serverlessHandler = serverless(app);
  
  return serverlessHandler(event, context);
};
