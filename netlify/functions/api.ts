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
  
  // Mount routes at root - Netlify redirect passes only the splat path
  app.use('/', healthRouter);
  app.use('/auth', authRouter);
  app.use('/', createAuthMiddleware({ 
    required: true, 
    skipPaths: ['/health', '/_client-status', '/auth', '/ml/health'] 
  }));
  
  app.use('/fixtures', fixturesRouter);
  app.use('/leagues', leaguesRouter);
  app.use('/standings', standingsRouter);
  app.use('/teams', teamsRouter);
  app.use('/predictions', predictionsRouter);
  app.use('/scraped-data', scrapedDataRouter);
  app.use('/scheduler', schedulerRouter);
  app.use('/football', apiFootballRouter);
  app.use('/ml', mlRouter);
  
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
