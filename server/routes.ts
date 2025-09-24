import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeWebSocket } from "./websocket";
import {
  httpLogger,
  logger,
  generalRateLimit,
  errorHandler,
  notFoundHandler
} from "./middleware";
import { apiRouter } from "./routers";
import cookieParser from 'cookie-parser';
import { runDataSeeder } from './lib/data-seeder';
import { initializeSchedulers } from './lib/scheduler';

// Data initialization utility functions moved to focused routers

export async function registerRoutes(app: Express): Promise<Server> {
  // Trust proxy for rate limiting and IP detection behind load balancers
  app.set('trust proxy', 1);
  
  // Apply global middleware stack
  logger.info('Applying global middleware stack');
  app.use(cookieParser()); // Parse cookies for session authentication
  app.use(httpLogger); // Structured request logging with request IDs
  app.use(generalRateLimit); // Rate limiting protection (100 req/15min per IP)
  
  // Mount the consolidated API router
  app.use('/api', apiRouter);

  // On startup, run the data seeder and initialize the schedulers.
  // The seeder will only run if the database is empty.
  // The scheduler will keep the data fresh.
  if (process.env.NODE_ENV !== 'test') { // Do not run during tests
    (async () => {
      await runDataSeeder();
      initializeSchedulers();
    })();
  }

  // Apply centralized error handling middleware after all routes
  // Handle 404s for API routes specifically (before SPA fallbacks)
  app.use('/api', notFoundHandler);
  app.use(errorHandler); // Centralized error handling with proper logging and Problem+JSON format
  
  logger.info('All routes and middleware configured successfully with centralized error handling');

  const httpServer = createServer(app);
  
  // Initialize WebSocket server for real-time updates
  logger.info('Initializing WebSocket server for real-time updates');
  initializeWebSocket(httpServer);
  
  return httpServer;
}