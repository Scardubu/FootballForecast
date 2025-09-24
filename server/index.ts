import { server as serverConfig } from './config';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { setupVite, serveStatic } from './vite';
import { apiRouter } from './routers/api';
import { httpLogger, errorHandler, notFoundHandler } from './middleware';

async function bootstrap() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  // Middleware
  app.use(httpLogger);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  app.use('/api', apiRouter);

  // Environment-specific setup
  if (serverConfig.nodeEnv === 'development') {
    await setupVite(app);
  } else {
    serveStatic(app);
  }

  // Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  // WebSocket connections
  wss.on('connection', (ws) => {
    console.log('Client connected');
    ws.on('close', () => console.log('Client disconnected'));
  });

  // Start server
  server.listen(serverConfig.port, '0.0.0.0', () => {
    console.log(`🚀 Server listening on http://0.0.0.0:${serverConfig.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('🔴 Failed to bootstrap server:', err);
  process.exit(1);
});
