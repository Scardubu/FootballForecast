/**
 * Centralized middleware exports and configuration
 */

export { httpLogger, logger } from './logger';
export { authenticateToken, optionalAuth, createAuthMiddleware } from './auth';
export type { AuthenticatedRequest } from './auth';
export { generalRateLimit, strictRateLimit, createRateLimit, logRateLimitViolation } from './rateLimiting';
export { 
  reportError, 
  monitorPromise, 
  createMonitoredFunction as createErrorMonitoredFunction,
  ErrorSeverity,
  ErrorCategory
} from './errorMonitoring';

export {
  measurePerformance,
  measurePerformanceAsync,
  createMonitoredFunction,
  createMonitoredAsyncFunction,
  getPerformanceMetrics,
  resetPerformanceMetrics,
  getMemoryUsage
} from './performance';
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