/**
 * Centralized middleware exports and configuration
 */

export { httpLogger, logger } from './logger';
export { authenticateToken, optionalAuth, createAuthMiddleware } from './auth';
export type { AuthenticatedRequest } from './auth';
export { generalRateLimit, strictRateLimit, createRateLimit, logRateLimitViolation } from './rateLimiting';
export {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  ServiceUnavailableError
} from './errorHandler';
export type { ProblemDetails } from './errorHandler';