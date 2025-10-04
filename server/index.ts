// Load environment variables first
import 'dotenv/config';

// Set console encoding for Windows
if (process.platform === 'win32' && process.stdout.isTTY) {
  try {
    // @ts-ignore - Windows-specific API
    process.stdout.setEncoding?.('utf8');
  } catch (e) {
    // Ignore if not supported
  }
}

console.log('[*] Bootstrapping server entry');

import { server as serverConfig } from './config/index';
import { validateConfigOrExit } from './lib/config-validator';
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

// Dynamically import WebSocket if the file exists
type WebSocketModule = {
  initializeWebSocket?: (server: any) => void;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadWebSocketModule(): Promise<WebSocketModule | null> {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (isDevelopment) {
    try {
      console.log('[INFO] Attempting to load WebSocket module from ./websocket');
      const module = await import('./websocket');
      console.log('[OK] WebSocket module resolved from ./websocket');
      return module as WebSocketModule;
    } catch (error: any) {
      const isModuleMissing =
        error?.code === 'ERR_MODULE_NOT_FOUND' ||
        typeof error?.message === 'string' && /Cannot find module/i.test(error.message);

      if (!isModuleMissing) {
        console.warn('[WARN] Failed to load WebSocket module from ./websocket:', error);
        return null;
      }

      console.warn('[WARN] ./websocket not found, attempting to load compiled module');
    }
  }

  try {
    console.log('[INFO] Attempting to load WebSocket module from ./websocket');
    const module = await import('./websocket');
    console.log('[OK] WebSocket module resolved from ./websocket');
    return module as WebSocketModule;
  } catch (error: any) {
    const isModuleMissing =
      error?.code === 'ERR_MODULE_NOT_FOUND' ||
      typeof error?.message === 'string' && /Cannot find module/i.test(error.message);

    if (isModuleMissing) {
      console.warn('[WARN] WebSocket module not found, real-time updates will be disabled');
      return null;
    }

    console.warn('[WARN] Failed to load WebSocket module:', error);
    return null;
  }
}

import { setupVite, serveStatic } from './vite';
import { apiRouter } from './routers/api';
import { httpLogger, errorHandler, notFoundHandler, securityHeaders, generalRateLimit } from './middleware/index';
import logger from './middleware/logger';
import { runDataSeeder } from './lib/data-seeder.js';
import { updateLiveFixtures } from './routers/fixtures.js';
import { mlClient } from './lib/ml-client.js';
import { storageReady, storage as storageInstance } from './storage.js';
import { startPredictionSyncScheduler } from './services/prediction-sync.js';

// NOTE: Netlify does NOT support WebSockets. For production, deploy this server (with /ws) on a suitable Node.js host (e.g., Render, DigitalOcean, AWS, etc.) for real-time features.

async function bootstrap() {
  try {
    // Validate environment configuration before starting
    validateConfigOrExit({
      strict: serverConfig.nodeEnv === 'production',
      environment: serverConfig.nodeEnv as any
    });

    const app = express();
    const server = createServer(app);

    // IMPORTANT: Load WebSocket module early, but DON'T initialize yet
    // In development, Vite needs to set up HMR WebSocket first
    const websocketModule = await loadWebSocketModule();

    // Middleware (order matters)
    app.use(httpLogger);
    app.use(securityHeaders);
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

  // Attach storage instance to app for routers that access req.app.get('storage')
  try {
    await storageReady;
    app.set('storage', storageInstance);
    logger.info('[DB] Storage initialized and attached to app');
  } catch (err) {
    logger.warn({ err }, '[WARN] Failed to initialize storage; continuing with in-memory storage if available');
  }

  // API Routes with rate limiting (skip in development for faster DX)
  if (serverConfig.nodeEnv === 'production') {
    app.use('/api', generalRateLimit);
  }
  app.use('/api', apiRouter);

  // Environment-specific setup
  if (serverConfig.nodeEnv === 'development') {
    try {
      // CRITICAL: Set up Vite FIRST in development (needs HMR WebSocket)
      await setupVite(app, server);
      logger.info('[OK] Vite development server initialized with HMR');
      
      // DISABLE Application WebSocket in development to prevent HMR conflicts
      // Vite's HMR WebSocket takes priority - app features will use polling/HTTP fallback
      logger.info('[INFO] Application WebSocket disabled in development (Vite HMR priority)');
      logger.info('[INFO] Real-time features will use HTTP polling fallback')
    } catch (error) {
      logger.error({ error }, '[ERROR] Failed to initialize Vite development server');
      throw error; // Re-throw to abort server startup
    }
  } else {
    // In production, initialize WebSocket first (no Vite HMR conflict)
    if (websocketModule) {
      try {
        if (websocketModule.initializeWebSocket) {
          websocketModule.initializeWebSocket(server);
          logger.info('[OK] Application WebSocket server initialized on /ws');
        } else {
          logger.warn('[WARN] WebSocket module loaded but initializeWebSocket function not found');
        }
      } catch (error) {
        logger.warn({ error }, '[WARN] Failed to initialize application WebSocket server');
      }
    } else {
      logger.info('[INFO] Application WebSocket disabled - real-time updates will not be available');
    }
    try {
      serveStatic(app);
      logger.info('[OK] Static file serving initialized');
    } catch (error) {
      logger.error({ error }, '[ERROR] Failed to initialize static file serving');
      throw error; // Re-throw to abort server startup
    }
  }

  // Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  // Start server with graceful EADDRINUSE handling when PORT is not explicitly set
  const explicitPort = !!process.env.PORT && process.env.PORT.trim() !== '';
  let currentPort = serverConfig.port;

  const listen = (port: number, remainingRetries: number, resolve: () => void) => {
    const onError = (err: any) => {
      if (err && err.code === 'EADDRINUSE') {
        if (explicitPort) {
          logger.error(`🔴 Port ${port} is already in use and PORT is explicitly set. Exiting.`);
          process.exit(1);
        }
        if (remainingRetries > 0) {
          const nextPort = port + 1;
          logger.warn(`⚠️ Port ${port} in use. Retrying on ${nextPort} (${remainingRetries - 1} retries left)...`);
          currentPort = nextPort;
          // Remove the error listener before retrying
          server.removeListener('error', onError);
          // Retry after a short delay to allow port release
          setTimeout(() => listen(nextPort, remainingRetries - 1, resolve), 200);
          return;
        }
        logger.error('[ERROR] Exhausted port retries. Exiting.');
        process.exit(1);
      } else {
        logger.error({ err }, '[ERROR] Server error');
        process.exit(1);
      }
    };

    server.once('error', onError);
    server.listen(port, () => {
      // Successful bind; stop listening for startup error
      server.removeListener('error', onError);
      logger.info(`[START] Server listening on http://0.0.0.0:${port}`);
      logger.info(`[WEB] Frontend available at: http://localhost:${port}`);
      if (serverConfig.nodeEnv === 'development') {
        logger.info(`[WS] WebSocket endpoint: ws://localhost:${port}/ws`);
      }
      resolve();
    });
  };

  return new Promise<void>((resolve) => {
    // Up to 10 retries if PORT not explicitly set
    const retries = explicitPort ? 0 : 10;
    listen(currentPort, retries, async () => {
      // Run data seeder after server starts
      if (process.env.NODE_ENV !== 'test') {
        try {
          await runDataSeeder();
          logger.info('[OK] Data seeding completed');
        } catch (error) {
          logger.error({ error }, '[ERROR] Data seeding failed');
        }

        try {
          startPredictionSyncScheduler();
          logger.info('[SCHEDULE] Prediction sync scheduler started');
        } catch (error) {
          logger.warn({ error }, '[WARN] Failed to start prediction sync scheduler');
        }

        // Schedule live fixture updates every 2 minutes
        setInterval(async () => {
          try {
            await updateLiveFixtures();
            logger.debug('[OK] Live fixtures updated');
          } catch (error) {
            logger.warn({ error }, '[WARN] Live fixtures update failed');
          }
        }, 2 * 60 * 1000);
        logger.info('[SCHEDULE] Live fixture updates scheduled every 2 minutes');

        // Optional: Trigger ML model training for historical data on startup
        // This ensures the model is trained on recent seasons (3+ years)
        if (process.env.ML_TRAIN_ON_STARTUP === 'true') {
          logger.info('[TRAIN] Triggering ML model training for historical data...');
          const currentYear = new Date().getFullYear();
          setTimeout(async () => {
            try {
              await mlClient.trainModel({
                start_date: `${currentYear - 3}-01-01`,
                end_date: `${currentYear}-12-31`,
                retrain: true
              });
              logger.info('[OK] ML model training completed');
            } catch (error) {
              logger.warn({ error }, '[WARN] ML model training failed - predictions will use existing model');
            }
          }, 10000); // Delay 10s to avoid startup congestion
        }
      }
      resolve();
    });
  });
  } catch (error) {
    logger.error({ error }, '[ERROR] Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('[SHUTDOWN] SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('[SHUTDOWN] SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error({ error }, '[ERROR] Uncaught exception');
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason }, '[ERROR] Unhandled promise rejection');
  process.exit(1);
});

// Start the server
bootstrap().catch((error) => {
  logger.error({ error }, '[ERROR] Failed to start server');
  process.exit(1);
});
