/**
 * Structured logging middleware using Pino
 */

import pino from 'pino';
import { pinoHttp } from 'pino-http';

// Create base logger instance
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss.l',
      ignore: 'pid,hostname'
    }
  } : undefined,
  base: {
    service: 'sabiscore-api',
    version: process.env.npm_package_version || '1.0.0'
  }
});

// Create HTTP request logger middleware
export const httpLogger = pinoHttp({
  logger,
  genReqId: () => {
    // Generate short request ID for tracing
    return Math.random().toString(36).substring(2, 8);
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
        'authorization': req.headers.authorization ? '[REDACTED]' : undefined
      },
      remoteAddress: req.remoteAddress,
      remotePort: req.remotePort
    })
    // Using default Pino response serializer to avoid getHeader issues
  },
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 400 && res.statusCode < 500) {
      return 'warn';
    } else if (res.statusCode >= 500 || err) {
      return 'error';
    }
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    const responseTime = (res as any).responseTime || 0;
    return `${req.method} ${req.url} ${res.statusCode} in ${responseTime}ms`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} ${res.statusCode} ERROR: ${err.message}`;
  }
});

// Export typed logger for use throughout the application
export default logger;