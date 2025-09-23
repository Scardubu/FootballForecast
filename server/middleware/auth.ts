/**
 * Authentication middleware for Bearer token validation
 */

import type { Request, Response, NextFunction } from 'express';
import logger from './logger';
import { AppError } from './errorHandler';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    token: string;
  };
}

const VALID_BEARER_TOKEN = process.env.API_BEARER_TOKEN || process.env.AUTH_TOKEN || 'dev-token-12345';

/**
 * Authentication middleware - validates Bearer tokens
 */
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Extract token from 'Bearer TOKEN'

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn({ 
      requestId: req.id,
      ip: req.ip,
      url: req.url 
    }, 'Missing or invalid Authorization header');
    
    return next(new AppError(
      'Missing or invalid Authorization header. Expected format: Bearer <token>',
      401,
      'https://tools.ietf.org/html/rfc7235#section-3.1'
    ));
  }

  if (token !== VALID_BEARER_TOKEN) {
    logger.warn({ 
      requestId: req.id,
      ip: req.ip,
      url: req.url
    }, 'Invalid bearer token provided');
    
    return next(new AppError(
      'Invalid bearer token provided',
      401,
      'https://tools.ietf.org/html/rfc7235#section-3.1'
    ));
  }

  // Attach user info to request for downstream middleware
  req.user = {
    id: 'api-user',
    token: token
  };

  logger.debug({
    requestId: req.id,
    userId: req.user.id,
    url: req.url
  }, 'Request authenticated successfully');

  next();
}

/**
 * Optional authentication middleware - validates token if present, allows through if absent
 */
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    // No auth header - proceed without authentication
    return next();
  }
  
  // Auth header present - validate it
  return authenticateToken(req, res, next);
}

/**
 * Create context-specific auth middleware
 */
export function createAuthMiddleware(options: {
  required?: boolean;
  skipPaths?: string[];
  customTokenValidator?: (token: string) => boolean;
} = {}) {
  const { required = true, skipPaths = [], customTokenValidator } = options;
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Check if current path should skip auth
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }
    
    if (required) {
      return authenticateToken(req, res, next);
    } else {
      return optionalAuth(req, res, next);
    }
  };
}

export type { AuthenticatedRequest };