/**
 * Stack Auth JWT verification middleware
 * Verifies JWT tokens from Stack Auth using JWKS
 */

import type { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import logger from './logger.js';
import { AppError } from './errorHandler.js';
import { auth } from '../config/index.js';

export interface StackAuthUser {
  id: string;
  email?: string;
  projectId: string;
  [key: string]: any;
}

export interface AuthenticatedRequest extends Request {
  user?: StackAuthUser;
  stackAuthToken?: string;
}

// Create JWKS instance for JWT verification
const JWKS = createRemoteJWKSet(new URL(auth.stackAuth.jwksUrl));

/**
 * Verify Stack Auth JWT token
 */
async function verifyStackAuthToken(token: string): Promise<StackAuthUser> {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: auth.stackAuth.apiUrl,
      audience: auth.stackAuth.projectId,
    });

    // Extract user information from JWT payload
    const user: StackAuthUser = {
      id: payload.sub || '',
      email: payload.email as string | undefined,
      projectId: payload.aud as string,
      ...payload,
    };

    return user;
  } catch (error) {
    logger.warn({ error }, 'Stack Auth token verification failed');
    throw new Error('Invalid or expired authentication token');
  }
}

/**
 * Stack Auth middleware - validates JWT tokens from Authorization header
 */
export async function stackAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn({
      requestId: req.id,
      ip: req.ip,
      url: req.url,
    }, 'No Bearer token found in request');

    return next(
      new AppError(
        'Authentication required. Please provide a valid Bearer token.',
        401,
        'https://tools.ietf.org/html/rfc7235#section-3.1'
      )
    );
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // Verify Stack Auth JWT token
    const user = await verifyStackAuthToken(token);

    // Attach user info to request
    req.user = user;
    req.stackAuthToken = token;

    logger.debug({
      requestId: req.id,
      userId: user.id,
      email: user.email,
      url: req.url,
    }, 'Request authenticated via Stack Auth');

    next();
  } catch (error) {
    logger.warn({
      requestId: req.id,
      ip: req.ip,
      url: req.url,
      error,
    }, 'Stack Auth token verification failed');

    return next(
      new AppError(
        'Invalid or expired authentication token',
        401,
        'https://tools.ietf.org/html/rfc7235#section-3.1'
      )
    );
  }
}

/**
 * Optional Stack Auth middleware - validates token if present, allows through if absent
 */
export async function optionalStackAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    // No auth header - proceed without authentication
    return next();
  }

  // Auth header present - validate it
  return stackAuthMiddleware(req, res, next);
}

/**
 * Hybrid middleware - supports both Stack Auth JWT and legacy Bearer token
 * Tries Stack Auth first, falls back to legacy if needed
 */
export async function hybridAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(
      new AppError(
        'Authentication required',
        401,
        'https://tools.ietf.org/html/rfc7235#section-3.1'
      )
    );
  }

  const token = authHeader.substring(7);

  // Try Stack Auth JWT verification first
  try {
    const user = await verifyStackAuthToken(token);
    req.user = user;
    req.stackAuthToken = token;

    logger.debug({
      requestId: req.id,
      userId: user.id,
      authType: 'stack-auth',
    }, 'Request authenticated via Stack Auth');

    return next();
  } catch (stackAuthError) {
    // Stack Auth failed, try legacy Bearer token
    if (token === auth.bearerToken) {
      req.user = {
        id: 'legacy-bearer-user',
        projectId: auth.stackAuth.projectId,
      };

      logger.debug({
        requestId: req.id,
        authType: 'legacy-bearer',
      }, 'Request authenticated via legacy Bearer token');

      return next();
    }

    // Both methods failed
    logger.warn({
      requestId: req.id,
      ip: req.ip,
    }, 'Authentication failed for both Stack Auth and legacy token');

    return next(
      new AppError(
        'Invalid authentication token',
        401,
        'https://tools.ietf.org/html/rfc7235#section-3.1'
      )
    );
  }
}

export type { AuthenticatedRequest as StackAuthRequest };
