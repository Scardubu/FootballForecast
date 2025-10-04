/**
 * Simplified rate limiting middleware with sliding window protection
 */

import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import logger from './logger.js';

/**
 * General API rate limiter - 300 requests per 15 minutes per IP (relaxed for development)
 */
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Increased from 100 to 300 for better development experience
  standardHeaders: true, // Include rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  skipSuccessfulRequests: false, // Count all requests
  skipFailedRequests: false, // Count failed requests too
  skip: (req: Request) => {
    const p = req.path || '';
    // Skip health checks in both direct server and Netlify function contexts
    return p === '/api/health' ||
           p === '/health' ||
           p === '/.netlify/functions/api/health' ||
           p.endsWith('/health');
  },
  handler: (req: Request, res: Response) => {
    const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
    const retryAfter = 900; // 15 minutes in seconds
    
    logger.warn({
      ip: clientIP,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
      rateLimitType: 'general'
    }, 'General rate limit exceeded');
    
    res.set('Retry-After', retryAfter.toString());
    res.status(429)
       .type('application/problem+json')
       .json({
         type: 'https://tools.ietf.org/html/rfc6585#section-4',
         title: 'Too Many Requests',
         status: 429,
         detail: 'Too many requests from this IP. Please try again in 15 minutes.',
         instance: req.url,
         timestamp: new Date().toISOString(),
         requestId: (req as any).id || 'unknown',
         retryAfter
       });
  }
});

/**
 * Strict rate limiter for sensitive operations - 20 requests per hour per IP
 */
export const strictRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
    const retryAfter = 3600; // 1 hour in seconds
    
    logger.error({
      ip: clientIP,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
      rateLimitType: 'strict',
      severity: 'high'
    }, 'Strict rate limit exceeded on sensitive endpoint');
    
    res.set('Retry-After', retryAfter.toString());
    res.status(429)
       .type('application/problem+json')
       .json({
         type: 'https://tools.ietf.org/html/rfc6585#section-4',
         title: 'Rate Limit Exceeded',
         status: 429,
         detail: 'Too many requests to sensitive endpoints. Please try again in 1 hour.',
         instance: req.url,
         timestamp: new Date().toISOString(),
         requestId: (req as any).id || 'unknown',
         retryAfter
       });
  }
});

/**
 * Create custom rate limiter
 */
export function createRateLimit(options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) {
  return rateLimit({
    ...options,
    message: options.message ? {
      type: 'https://tools.ietf.org/html/rfc6585#section-4',
      title: 'Rate Limit Exceeded',
      status: 429,
      detail: options.message,
      retryAfter: Math.ceil(options.windowMs / 1000),
      timestamp: new Date().toISOString()
    } : undefined,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => req.ip || req.socket.remoteAddress || 'unknown'
  });
}

/**
 * Log rate limit violations
 */
export function logRateLimitViolation(req: Request, type: string = 'general') {
  const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
  
  logger.warn({
    ip: clientIP,
    userAgent: req.get('User-Agent'),
    url: req.url,
    method: req.method,
    rateLimitType: type
  }, `Rate limit exceeded: ${type}`);
}

/**
 * Get rate limit status for monitoring
 */
export function getRateLimitStats() {
  return {
    config: {
      generalLimit: { windowMs: 15 * 60 * 1000, max: 100 },
      strictLimit: { windowMs: 60 * 60 * 1000, max: 20 }
    }
  };
}