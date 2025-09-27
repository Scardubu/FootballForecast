// Load environment variables first
import 'dotenv/config';

import { server as serverConfig } from './config';
import { validateConfigOrExit } from './lib/config-validator';
import express from 'express';
import { createServer } from 'http';
import { initializeWebSocket } from './websocket'; // <-- Use production WebSocket server
import { setupVite, serveStatic } from './vite';
import { apiRouter } from './routers/api';
import { httpLogger, errorHandler, notFoundHandler } from './middleware';

// NOTE: Netlify does NOT support WebSockets. For production, deploy this server (with /ws) on a suitable Node.js host (e.g., Render, DigitalOcean, AWS, etc.) for real-time features.

async function bootstrap() {
  // Validate environment configuration before starting
  validateConfigOrExit({
    strict: serverConfig.nodeEnv === 'production',
    environment: serverConfig.nodeEnv as any
  });

  const app = express();
  const server = createServer(app);

  // Initialize production-grade WebSocket server at /ws
  initializeWebSocket(server);

  // Middleware
  app.use(httpLogger);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  app.use('/api', apiRouter);

  // Environment-specific setup
  if (serverConfig.nodeEnv === 'development') {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  // Start server with error handling
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`🔴 Port ${serverConfig.port} is already in use. Please try a different port or stop the conflicting process.`);
      console.error('💡 You can change the port by setting the PORT environment variable.');
      process.exit(1);
    } else {
      console.error('🔴 Server error:', err);
      process.exit(1);
    }
  });

  server.listen(serverConfig.port, '0.0.0.0', () => {
    console.log(`🚀 Server listening on http://0.0.0.0:${serverConfig.port}`);
    console.log(`📱 Frontend available at: http://localhost:${serverConfig.port}`);
    console.log(`🔌 WebSocket endpoint: ws://localhost:${serverConfig.port}/ws`);
  });
}


bootstrap().catch((err) => {
  console.error('🔴 Failed to bootstrap server:', err);
  process.exit(1);
});
