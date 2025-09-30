// Load environment variables first
import 'dotenv/config';

console.log('🟡 Bootstrapping server entry');

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
      console.log('ℹ️ Attempting to load WebSocket module from ./websocket');
      const module = await import('./websocket');
      console.log('✅ WebSocket module resolved from ./websocket');
      return module as WebSocketModule;
    } catch (error: any) {
      const isModuleMissing =
        error?.code === 'ERR_MODULE_NOT_FOUND' ||
        typeof error?.message === 'string' && /Cannot find module/i.test(error.message);

      if (!isModuleMissing) {
        console.warn('⚠️ Failed to load WebSocket module from ./websocket:', error);
        return null;
      }

      console.warn('⚠️ ./websocket not found, attempting to load compiled module');
    }
  }

  try {
    console.log('ℹ️ Attempting to load WebSocket module from ./websocket');
    const module = await import('./websocket');
    console.log('✅ WebSocket module resolved from ./websocket');
    return module as WebSocketModule;
  } catch (error: any) {
    const isModuleMissing =
      error?.code === 'ERR_MODULE_NOT_FOUND' ||
      typeof error?.message === 'string' && /Cannot find module/i.test(error.message);

    if (isModuleMissing) {
      console.warn('⚠️ WebSocket module not found, real-time updates will be disabled');
      return null;
    }

    console.warn('⚠️ Failed to load WebSocket module:', error);
    return null;
  }
}

import { setupVite, serveStatic } from './vite';
import { apiRouter } from './routers/api';
import { httpLogger, errorHandler, notFoundHandler, securityHeaders, generalRateLimit } from './middleware/index';
import logger from './middleware/logger';

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

    const websocketModule = await loadWebSocketModule();

    // Initialize WebSocket if available
    if (websocketModule) {
      try {
        if (websocketModule.initializeWebSocket) {
          websocketModule.initializeWebSocket(server);
          logger.info('✅ WebSocket server initialized');
        } else {
          logger.warn('⚠️ WebSocket module loaded but initializeWebSocket function not found');
        }
      } catch (error) {
        logger.warn({ error }, '⚠️ Failed to initialize WebSocket server');
      }
    } else {
      logger.info('ℹ️ WebSocket disabled - real-time updates will not be available');
    }

    // Middleware (order matters)
    app.use(httpLogger);
    app.use(securityHeaders);
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

  // Health check endpoint that doesn't require authentication
  app.get('/api/health', (req, res) => {
    const status = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime()
    };
    res.json(status);
  });

  // API Routes with rate limiting (skip in development for faster DX)
  if (serverConfig.nodeEnv === 'production') {
    app.use('/api', generalRateLimit);
  }
  app.use('/api', apiRouter);

  // Environment-specific setup
  if (serverConfig.nodeEnv === 'development') {
    try {
      await setupVite(app, server);
      logger.info('✅ Vite development server initialized');
    } catch (error) {
      logger.error({ error }, '❌ Failed to initialize Vite development server');
      throw error; // Re-throw to abort server startup
    }
  } else {
    try {
      serveStatic(app);
      logger.info('✅ Static file serving initialized');
    } catch (error) {
      logger.error({ error }, '❌ Failed to initialize static file serving');
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
        logger.error('🔴 Exhausted port retries. Exiting.');
        process.exit(1);
      } else {
        logger.error({ err }, '🔴 Server error');
        process.exit(1);
      }
    };

    server.once('error', onError);
    server.listen(port, () => {
      // Successful bind; stop listening for startup error
      server.removeListener('error', onError);
      logger.info(`🚀 Server listening on http://0.0.0.0:${port}`);
      logger.info(`📱 Frontend available at: http://localhost:${port}`);
      if (serverConfig.nodeEnv === 'development') {
        logger.info(`🔌 WebSocket endpoint: ws://localhost:${port}/ws`);
      }
      resolve();
    });
  };

  return new Promise<void>((resolve) => {
    // Up to 10 retries if PORT not explicitly set
    const retries = explicitPort ? 0 : 10;
    listen(currentPort, retries, resolve);
  });
  } catch (error) {
    logger.error({ error }, '💥 Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error({ error }, '💥 Uncaught exception');
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason }, '💥 Unhandled promise rejection');
  process.exit(1);
});

// Start the server
bootstrap().catch((error) => {
  logger.error({ error }, '🔴 Failed to start server');
  process.exit(1);
});
