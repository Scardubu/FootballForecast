/**
 * Centralized error handling middleware with standardized Problem+JSON responses
 */

import type { Request, Response, NextFunction } from 'express';
import logger from './logger';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  timestamp: string;
  requestId?: string;
  errors?: Record<string, string[]>;
}

/**
 * Custom application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly type: string;
  public readonly isOperational: boolean;
  public readonly errors?: Record<string, string[]>;

  constructor(
    message: string,
    statusCode: number = 500,
    type: string = 'about:blank',
    isOperational: boolean = true,
    errors?: Record<string, string[]>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
    this.isOperational = isOperational;
    this.errors = errors;
    
    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error for request validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, errors?: Record<string, string[]>) {
    super(
      message,
      400,
      'https://tools.ietf.org/html/rfc7231#section-6.5.1',
      true,
      errors
    );
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(
      `${resource} not found`,
      404,
      'https://tools.ietf.org/html/rfc7231#section-6.5.4',
      true
    );
  }
}

/**
 * Conflict error for resource conflicts
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(
      message,
      409,
      'https://tools.ietf.org/html/rfc7231#section-6.5.8',
      true
    );
  }
}

/**
 * Service unavailable error for external service failures
 */
export class ServiceUnavailableError extends AppError {
  constructor(service: string, retryAfter?: number) {
    super(
      `${service} is currently unavailable`,
      503,
      'https://tools.ietf.org/html/rfc7231#section-6.6.4',
      true
    );
    
    if (retryAfter) {
      (this as any).retryAfter = retryAfter;
    }
  }
}

/**
 * Convert various error types to standardized Problem+JSON format
 */
function createProblemDetails(error: any, req: Request): ProblemDetails {
  const timestamp = new Date().toISOString();
  const requestId = (req as any).id || 'unknown';
  
  // Handle custom AppError instances
  if (error instanceof AppError) {
    return {
      type: error.type,
      title: getStatusText(error.statusCode),
      status: error.statusCode,
      detail: error.message,
      instance: req.url,
      timestamp,
      requestId,
      errors: error.errors
    };
  }
  
  // Handle Zod validation errors
  if (error.name === 'ZodError') {
    const zodErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const path = issue.path.join('.');
      if (!zodErrors[path]) {
        zodErrors[path] = [];
      }
      zodErrors[path].push(issue.message);
    }
    
    return {
      type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
      title: 'Validation Failed',
      status: 400,
      detail: 'The request body contains validation errors',
      instance: req.url,
      timestamp,
      requestId,
      errors: zodErrors
    };
  }
  
  // Handle Express/HTTP errors
  if (error.status || error.statusCode) {
    const status = error.status || error.statusCode;
    return {
      type: 'about:blank',
      title: getStatusText(status),
      status,
      detail: error.message || 'An error occurred',
      instance: req.url,
      timestamp,
      requestId
    };
  }
  
  // Handle specific known error types
  if (error.code === 'ECONNREFUSED') {
    return {
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.4',
      title: 'Service Unavailable',
      status: 503,
      detail: 'Unable to connect to external service',
      instance: req.url,
      timestamp,
      requestId
    };
  }
  
  if (error.code === 'TIMEOUT') {
    return {
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.5',
      title: 'Request Timeout',
      status: 408,
      detail: 'Request timed out',
      instance: req.url,
      timestamp,
      requestId
    };
  }
  
  // Handle database errors
  if (error.code && (error.code.startsWith('23') || error.code.startsWith('42'))) {
    return {
      type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
      title: 'Database Error',
      status: 400,
      detail: 'Database constraint violation or query error',
      instance: req.url,
      timestamp,
      requestId
    };
  }
  
  // Default to 500 Internal Server Error for unknown errors
  return {
    type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
    title: 'Internal Server Error',
    status: 500,
    detail: 'An unexpected error occurred',
    instance: req.url,
    timestamp,
    requestId
  };
}

/**
 * Get standard HTTP status text
 */
function getStatusText(status: number): string {
  const statusTexts: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    408: 'Request Timeout',
    409: 'Conflict',
    413: 'Payload Too Large',
    415: 'Unsupported Media Type',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout'
  };
  
  return statusTexts[status] || 'Unknown Error';
}

/**
 * Main error handling middleware
 */
export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const problemDetails = createProblemDetails(error, req);
  
  // Log the error with appropriate level
  const logData = {
    requestId: problemDetails.requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    status: problemDetails.status,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    }
  };
  
  if (problemDetails.status >= 500) {
    logger.error(logData, 'Internal server error occurred');
  } else if (problemDetails.status >= 400) {
    logger.warn(logData, 'Client error occurred');
  } else {
    logger.info(logData, 'Request completed with error');
  }
  
  // Set retry-after header for rate limiting and service unavailable errors
  if (problemDetails.status === 429 || problemDetails.status === 503) {
    const retryAfter = (error as any).retryAfter || 60;
    res.set('Retry-After', retryAfter.toString());
  }
  
  // Set content type and send problem details
  res.status(problemDetails.status)
     .type('application/problem+json')
     .json(problemDetails);
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  const problemDetails: ProblemDetails = {
    type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
    title: 'Not Found',
    status: 404,
    detail: `Route ${req.method} ${req.path} not found`,
    instance: req.url,
    timestamp: new Date().toISOString(),
    requestId: (req as any).id || 'unknown'
  };
  
  logger.warn({
    requestId: problemDetails.requestId,
    method: req.method,
    url: req.url,
    ip: req.ip
  }, 'Route not found');
  
  res.status(404)
     .type('application/problem+json')
     .json(problemDetails);
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler<T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<any>
) {
  return (req: T, res: U, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}